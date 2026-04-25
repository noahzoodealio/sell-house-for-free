import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

interface InsertedRow {
  id: string;
  table: string;
  payload: Record<string, unknown>;
}

interface UpdatedRow {
  table: string;
  payload: Record<string, unknown>;
  rowId: string;
}

interface MockState {
  inserts: InsertedRow[];
  updates: UpdatedRow[];
  forceInsertError: boolean;
}

function makeMockSupabase(state: MockState) {
  return {
    from(table: string) {
      return {
        insert(payload: Record<string, unknown>) {
          if (state.forceInsertError) {
            return {
              select() {
                return {
                  single: async () => ({ data: null, error: { message: "boom" } }),
                };
              },
            };
          }
          const id = crypto.randomUUID();
          state.inserts.push({ id, table, payload });
          return {
            select() {
              return {
                single: async () => ({ data: { id }, error: null }),
              };
            },
          };
        },
        update(payload: Record<string, unknown>) {
          return {
            eq: async (_column: string, value: string) => {
              state.updates.push({ table, payload, rowId: value });
              return { error: null };
            },
          };
        },
      };
    },
  };
}

const SESSION = { id: "session-uuid-fixture" };

describe("src/lib/ai/tools/_define — defineTool", () => {
  let state: MockState;

  beforeEach(() => {
    vi.resetModules();
    state = { inserts: [], updates: [], forceInsertError: false };
    vi.doMock("@/lib/supabase/server", () => ({
      getSupabaseAdmin: () => makeMockSupabase(state),
    }));
  });

  afterEach(() => {
    vi.resetModules();
  });

  it("inserts a running ai_tool_runs row, runs the handler, then finalizes ok", async () => {
    const { defineTool } = await import("../_define");
    const t = defineTool({
      name: "test_tool",
      description: "test",
      inputSchema: z.object({ q: z.string() }),
      handler: async () => ({ answer: 42 }),
    })(SESSION);

    const result = await (t.execute as Function)({ q: "hi" });
    expect(result).toEqual({ answer: 42 });

    expect(state.inserts).toHaveLength(1);
    expect(state.inserts[0]).toMatchObject({
      table: "ai_tool_runs",
      payload: {
        session_id: "session-uuid-fixture",
        tool_name: "test_tool",
        status: "running",
        input_json: { q: "hi" },
      },
    });

    expect(state.updates).toHaveLength(1);
    expect(state.updates[0]).toMatchObject({
      table: "ai_tool_runs",
      rowId: state.inserts[0].id,
      payload: {
        status: "ok",
        output_json: { answer: 42 },
        error_detail: null,
      },
    });
    expect(state.updates[0].payload.latency_ms).toEqual(expect.any(Number));
  });

  it("redacts PII from input_json on insert", async () => {
    const { defineTool } = await import("../_define");
    const t = defineTool({
      name: "test_tool",
      description: "test",
      inputSchema: z.object({ email: z.string(), phone: z.string() }),
      handler: async () => ({ ok: true }),
    })(SESSION);

    await (t.execute as Function)({
      email: "noah@example.com",
      phone: "602-555-1234",
    });

    expect(state.inserts[0].payload.input_json).toEqual({
      email: "[redacted-email]",
      phone: "[redacted-phone]",
    });
  });

  it("returns a tool-error envelope when handler throws and finalizes as error with redacted message", async () => {
    const { defineTool } = await import("../_define");
    const t = defineTool({
      name: "test_tool",
      description: "test",
      inputSchema: z.object({}),
      handler: async () => {
        throw new Error("upstream call to noah@leak.com failed");
      },
    })(SESSION);

    const result = await (t.execute as Function)({});
    expect(result).toMatchObject({
      kind: "tool-error",
      safe: true,
    });

    expect(state.updates).toHaveLength(1);
    const errDetail = state.updates[0].payload.error_detail as Record<
      string,
      unknown
    >;
    expect(errDetail).toMatchObject({
      kind: "tool-error",
      safe: true,
      stage: "handler",
      cause: "handler_threw",
    });
    expect(errDetail.message).toContain("[redacted-email]");
    expect(errDetail.message).not.toContain("noah@leak.com");
  });

  it("treats a tool-error return as the error path and finalizes accordingly", async () => {
    const { defineTool } = await import("../_define");
    const t = defineTool({
      name: "test_tool",
      description: "test",
      inputSchema: z.object({}),
      handler: async () => ({
        kind: "tool-error" as const,
        safe: true as const,
        message: "handled gracefully",
      }),
    })(SESSION);

    const result = await (t.execute as Function)({});
    expect(result).toMatchObject({ kind: "tool-error", message: "handled gracefully" });

    expect(state.updates[0].payload.status).toBe("error");
    expect(state.updates[0].payload.error_detail).toMatchObject({
      safe: true,
      message: "handled gracefully",
    });
  });

  it("throws DisclaimerMissingError when outputSchema declares disclaimer but handler omits it", async () => {
    const { defineTool, DisclaimerMissingError } = await import("../_define");
    const t = defineTool({
      name: "test_tool",
      description: "test",
      inputSchema: z.object({}),
      outputSchema: z.object({
        data: z.string(),
        disclaimer: z.string().min(1),
      }),
      handler: async () => ({ data: "x" }) as never,
    })(SESSION);

    const result = await (t.execute as Function)({});
    // The throw is caught by defineTool and converted to tool-error envelope;
    // we verify via the error_detail message that DisclaimerMissingError fired.
    expect(result).toMatchObject({ kind: "tool-error" });
    const errDetail = state.updates[0].payload.error_detail as Record<
      string,
      unknown
    >;
    expect(errDetail.message).toContain("disclaimer");
    expect(new DisclaimerMissingError("x")).toBeInstanceOf(Error);
  });

  it("accepts disclaimer when present in handler output", async () => {
    const { defineTool } = await import("../_define");
    const t = defineTool({
      name: "test_tool",
      description: "test",
      inputSchema: z.object({}),
      outputSchema: z.object({
        data: z.string(),
        disclaimer: z.string().min(1),
      }),
      handler: async () => ({ data: "x", disclaimer: "AI not licensed RE / not fiduciary" }),
    })(SESSION);

    const result = await (t.execute as Function)({});
    expect(result).toMatchObject({ data: "x" });
    expect(state.updates[0].payload.status).toBe("ok");
  });

  it("threads abortSignal into ctx and reports cause:'aborted' when handler throws AbortError", async () => {
    const { defineTool } = await import("../_define");
    const seen: { signalSeen: boolean } = { signalSeen: false };
    const t = defineTool({
      name: "test_tool",
      description: "test",
      inputSchema: z.object({}),
      handler: async (_input, ctx) => {
        seen.signalSeen = !!ctx.signal;
        const err = new Error("the call was aborted");
        err.name = "AbortError";
        throw err;
      },
    })(SESSION);

    const ac = new AbortController();
    await (t.execute as Function)({}, { abortSignal: ac.signal });

    expect(seen.signalSeen).toBe(true);
    const errDetail = state.updates[0].payload.error_detail as Record<
      string,
      unknown
    >;
    expect(errDetail.cause).toBe("aborted");
  });

  it("skipAutoFinalize: true does not finalize on success", async () => {
    const { defineTool } = await import("../_define");
    const t = defineTool({
      name: "test_tool",
      description: "test",
      inputSchema: z.object({}),
      skipAutoFinalize: true,
      handler: async () => ({ deferred: true }),
    })(SESSION);

    await (t.execute as Function)({});
    expect(state.inserts).toHaveLength(1);
    expect(state.updates).toHaveLength(0);
  });

  it("skipAutoFinalize: true exposes ctx.finalize for manual call", async () => {
    const { defineTool } = await import("../_define");
    const t = defineTool({
      name: "test_tool",
      description: "test",
      inputSchema: z.object({}),
      skipAutoFinalize: true,
      handler: async (_input, ctx) => {
        await ctx.finalize("ok", { manual: true });
        return { deferred: true };
      },
    })(SESSION);

    await (t.execute as Function)({});
    expect(state.updates).toHaveLength(1);
    expect(state.updates[0].payload.output_json).toEqual({ manual: true });
  });

  it("plumbs telemetry metadata into ctx (persistence deferred to S7)", async () => {
    const { defineTool } = await import("../_define");
    let capturedTelemetry: unknown = null;
    const t = defineTool({
      name: "test_tool",
      description: "test",
      inputSchema: z.object({}),
      telemetry: { cost_class: "priced", budget_bucket: "attom" },
      handler: async (_input, ctx) => {
        capturedTelemetry = ctx.telemetry;
        return { ok: true };
      },
    })(SESSION);

    await (t.execute as Function)({});
    expect(capturedTelemetry).toEqual({
      cost_class: "priced",
      budget_bucket: "attom",
    });
  });

  it("when ai_tool_runs insert fails, handler still runs but no row update is attempted", async () => {
    state.forceInsertError = true;
    const { defineTool } = await import("../_define");
    const t = defineTool({
      name: "test_tool",
      description: "test",
      inputSchema: z.object({}),
      handler: async () => ({ ok: true }),
    })(SESSION);

    const result = await (t.execute as Function)({});
    expect(result).toEqual({ ok: true });
    expect(state.updates).toHaveLength(0);
  });

  it("redacts output_json on success finalize", async () => {
    const { defineTool } = await import("../_define");
    const t = defineTool({
      name: "test_tool",
      description: "test",
      inputSchema: z.object({}),
      handler: async () => ({ note: "Call jane@example.com" }),
    })(SESSION);

    await (t.execute as Function)({});
    expect(state.updates[0].payload.output_json).toEqual({
      note: "Call [redacted-email]",
    });
  });
});
