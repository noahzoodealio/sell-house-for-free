import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type InsertPayload = Record<string, unknown>;
type UpdatePayload = Record<string, unknown>;

interface MockSupabaseState {
  submissions: Map<string, Record<string, unknown>>;
  sessions: Map<string, Record<string, unknown>>;
  messages: Array<Record<string, unknown>>;
  lastInsert: { table: string; payload: InsertPayload } | null;
  lastUpdate: { table: string; payload: UpdatePayload; filter: string } | null;
}

function makeMockSupabase(state: MockSupabaseState) {
  function from(table: string) {
    const api = {
      insert(payload: InsertPayload) {
        state.lastInsert = { table, payload };
        let inserted: Record<string, unknown> = payload;
        if (table === "ai_sessions") {
          const id = crypto.randomUUID();
          inserted = {
            id,
            token_budget_in: 200000,
            token_budget_out: 50000,
            tokens_used_in: 0,
            tokens_used_out: 0,
            created_at: new Date().toISOString(),
            last_active_at: new Date().toISOString(),
            ended_at: null,
            ...payload,
          };
          state.sessions.set(id, inserted);
        } else if (table === "ai_messages") {
          inserted = { id: state.messages.length + 1, ...payload };
          state.messages.push(inserted);
        }
        return {
          select() {
            return {
              single: async () => ({ data: inserted, error: null }),
            };
          },
        };
      },
      select() {
        const chain = {
          eq(_column: string, _value: string) {
            return {
              maybeSingle: async () => {
                if (table === "submissions") {
                  const row = state.submissions.get(_value) ?? null;
                  return { data: row, error: null };
                }
                if (table === "ai_sessions") {
                  const row = state.sessions.get(_value) ?? null;
                  return { data: row, error: null };
                }
                return { data: null, error: null };
              },
              single: async () => {
                if (table === "ai_sessions") {
                  return {
                    data: state.sessions.get(_value) ?? null,
                    error: null,
                  };
                }
                return { data: null, error: null };
              },
              order() {
                return { data: [], error: null };
              },
            };
          },
        };
        return chain;
      },
      update(payload: UpdatePayload) {
        return {
          eq(_column: string, value: string) {
            state.lastUpdate = { table, payload, filter: value };
            if (table === "ai_sessions") {
              const existing = state.sessions.get(value);
              if (existing) {
                state.sessions.set(value, { ...existing, ...payload });
              }
            }
            return Promise.resolve({ error: null });
          },
        };
      },
    };
    return api;
  }

  return { from };
}

describe("src/lib/ai/session", () => {
  const savedEnv = { ...process.env };
  let state: MockSupabaseState;

  beforeEach(() => {
    vi.resetModules();
    state = {
      submissions: new Map(),
      sessions: new Map(),
      messages: [],
      lastInsert: null,
      lastUpdate: null,
    };
    vi.doMock("@/lib/supabase/server", () => ({
      getSupabaseAdmin: () => makeMockSupabase(state),
    }));
    process.env.AI_IP_HASH_SALT = "test-salt";
  });

  afterEach(() => {
    process.env = { ...savedEnv };
    vi.resetModules();
  });

  it("createSession without submissionId inserts a row with empty context and null submission_id", async () => {
    const { createSession } = await import("../session");
    const result = await createSession({});
    expect(result.sessionId).toMatch(/^[0-9a-f-]{36}$/i);
    expect(result.cookieOptions).toMatchObject({
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 604800,
    });
    expect(state.lastInsert?.table).toBe("ai_sessions");
    expect(state.lastInsert?.payload).toMatchObject({
      submission_id: null,
      context_json: {},
    });
  });

  it("createSession with a resolving submissionId seeds safe-subset context and excludes PII", async () => {
    const subId = crypto.randomUUID();
    state.submissions.set(subId, {
      id: subId,
      address: "123 Main",
      pillarHint: "cash-fast",
      beds: 3,
      baths: 2,
      sqft: 1500,
      motivation: "relocating",
      // PII that must be filtered out:
      email: "jane@example.com",
      phone: "555-123-4567",
      firstName: "Jane",
      lastName: "Doe",
      street1: "123 Main",
      enrichment: {
        attomId: "attom-1",
        mlsRecordId: "mls-1",
        avmLow: 400000,
        avmHigh: 450000,
      },
    });

    const { createSession } = await import("../session");
    await createSession({ submissionId: subId });

    const payload = state.lastInsert?.payload as Record<string, unknown>;
    expect(payload.submission_id).toBe(subId);
    const ctx = payload.context_json as Record<string, unknown>;
    expect(ctx.address).toBe("123 Main");
    expect(ctx.beds).toBe(3);
    expect(ctx.motivation).toBe("relocating");
    expect(ctx.enrichment).toEqual({
      attomId: "attom-1",
      mlsRecordId: "mls-1",
      avmLow: 400000,
      avmHigh: 450000,
    });
    expect(ctx.email).toBeUndefined();
    expect(ctx.phone).toBeUndefined();
    expect(ctx.firstName).toBeUndefined();
    expect(ctx.lastName).toBeUndefined();
    expect(ctx.street1).toBeUndefined();
  });

  it("createSession with unresolved submissionId falls back to empty context", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { createSession } = await import("../session");
    await createSession({ submissionId: crypto.randomUUID() });
    const payload = state.lastInsert?.payload as Record<string, unknown>;
    expect(payload.submission_id).toBeNull();
    expect(payload.context_json).toEqual({});
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("createSession computes ip_hash deterministically when salt + ip are present", async () => {
    const { createSession } = await import("../session");
    await createSession({ ip: "198.51.100.7" });
    const payload1 = state.lastInsert?.payload as Record<string, unknown>;
    const hash1 = payload1.ip_hash as string;

    await createSession({ ip: "198.51.100.7" });
    const payload2 = state.lastInsert?.payload as Record<string, unknown>;
    const hash2 = payload2.ip_hash as string;

    expect(hash1).toMatch(/^[0-9a-f]{64}$/);
    expect(hash1).toBe(hash2);
  });

  it("createSession records null ip_hash when salt is unset", async () => {
    delete process.env.AI_IP_HASH_SALT;
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { createSession } = await import("../session");
    await createSession({ ip: "198.51.100.7" });
    const payload = state.lastInsert?.payload as Record<string, unknown>;
    expect(payload.ip_hash).toBeNull();
    warn.mockRestore();
  });

  it("createSession cookieOptions.secure toggles on NODE_ENV", async () => {
    const ogNodeEnv = process.env.NODE_ENV;
    Object.defineProperty(process.env, "NODE_ENV", { value: "production" });
    const { createSession } = await import("../session");
    const result = await createSession({});
    expect(result.cookieOptions.secure).toBe(true);
    Object.defineProperty(process.env, "NODE_ENV", {
      value: ogNodeEnv ?? "test",
    });
  });
});
