import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("src/lib/ai/budget — checkTokenCeilings", () => {
  it("returns ok when usage is under the budget", async () => {
    const { checkTokenCeilings } = await import("../budget");
    expect(
      checkTokenCeilings({
        tokens_used_in: 1000,
        tokens_used_out: 250,
        token_budget_in: 200000,
        token_budget_out: 50000,
      }),
    ).toEqual({ ok: true });
  });

  it("returns 429 with the user-facing reason when input tokens are exhausted", async () => {
    const { checkTokenCeilings, BUDGET_REASONS } = await import("../budget");
    const verdict = checkTokenCeilings({
      tokens_used_in: 200000,
      tokens_used_out: 0,
      token_budget_in: 200000,
      token_budget_out: 50000,
    });
    expect(verdict).toEqual({
      ok: false,
      status: 429,
      reason: BUDGET_REASONS.EXHAUSTED,
    });
  });

  it("returns 429 with the same reason when output tokens are exhausted", async () => {
    const { checkTokenCeilings, BUDGET_REASONS } = await import("../budget");
    const verdict = checkTokenCeilings({
      tokens_used_in: 0,
      tokens_used_out: 50000,
      token_budget_in: 200000,
      token_budget_out: 50000,
    });
    expect(verdict).toEqual({
      ok: false,
      status: 429,
      reason: BUDGET_REASONS.EXHAUSTED,
    });
  });
});

describe("src/lib/ai/budget — enforceBudget IP flow", () => {
  const savedEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    process.env.AI_IP_HASH_SALT = "test-salt";
  });

  afterEach(() => {
    process.env = { ...savedEnv };
    vi.resetModules();
  });

  function mockSupabase(rpc: (args: unknown) => Promise<{ data: number | null; error: null | { message: string } }>) {
    vi.doMock("@/lib/supabase/server", () => ({
      getSupabaseAdmin: () => ({
        rpc: async (_name: string, args: unknown) => rpc(args),
      }),
    }));
  }

  function fakeRequest(ip: string | null): Request {
    const headers = new Headers();
    if (ip) headers.set("x-forwarded-for", ip);
    return new Request("http://test/api/chat", { headers });
  }

  it("returns ok when request has no IP header", async () => {
    mockSupabase(async () => ({ data: 1, error: null }));
    const { enforceBudget } = await import("../budget");
    const verdict = await enforceBudget(
      {
        tokens_used_in: 0,
        tokens_used_out: 0,
        token_budget_in: 200000,
        token_budget_out: 50000,
      },
      fakeRequest(null),
    );
    expect(verdict).toEqual({ ok: true });
  });

  it("returns ok when RPC reports the counter is under the ceiling", async () => {
    mockSupabase(async () => ({ data: 5, error: null }));
    const { enforceBudget } = await import("../budget");
    const verdict = await enforceBudget(
      {
        tokens_used_in: 0,
        tokens_used_out: 0,
        token_budget_in: 200000,
        token_budget_out: 50000,
      },
      fakeRequest("198.51.100.7"),
    );
    expect(verdict).toEqual({ ok: true });
  });

  it("returns rate-limited verdict when RPC reports the counter over the ceiling", async () => {
    mockSupabase(async () => ({ data: 31, error: null }));
    const { enforceBudget, BUDGET_REASONS } = await import("../budget");
    const verdict = await enforceBudget(
      {
        tokens_used_in: 0,
        tokens_used_out: 0,
        token_budget_in: 200000,
        token_budget_out: 50000,
      },
      fakeRequest("198.51.100.7"),
    );
    expect(verdict).toEqual({
      ok: false,
      status: 429,
      reason: BUDGET_REASONS.RATE_LIMITED,
    });
  });

  it("fails open when the RPC returns an error", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    mockSupabase(async () => ({ data: null, error: { message: "connection refused" } }));
    const { enforceBudget } = await import("../budget");
    const verdict = await enforceBudget(
      {
        tokens_used_in: 0,
        tokens_used_out: 0,
        token_budget_in: 200000,
        token_budget_out: 50000,
      },
      fakeRequest("198.51.100.7"),
    );
    expect(verdict).toEqual({ ok: true });
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("returns ok and skips rate-limit when AI_IP_HASH_SALT is unset", async () => {
    delete process.env.AI_IP_HASH_SALT;
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    mockSupabase(async () => {
      throw new Error("RPC should not be called when salt is missing");
    });
    const { enforceBudget } = await import("../budget");
    const verdict = await enforceBudget(
      {
        tokens_used_in: 0,
        tokens_used_out: 0,
        token_budget_in: 200000,
        token_budget_out: 50000,
      },
      fakeRequest("198.51.100.7"),
    );
    expect(verdict).toEqual({ ok: true });
    warn.mockRestore();
  });

  it("short-circuits before IP check when token budget is exhausted", async () => {
    const rpc = vi.fn(async () => ({ data: 1, error: null }));
    mockSupabase(rpc);
    const { enforceBudget, BUDGET_REASONS } = await import("../budget");
    const verdict = await enforceBudget(
      {
        tokens_used_in: 200000,
        tokens_used_out: 0,
        token_budget_in: 200000,
        token_budget_out: 50000,
      },
      fakeRequest("198.51.100.7"),
    );
    expect(verdict).toEqual({
      ok: false,
      status: 429,
      reason: BUDGET_REASONS.EXHAUSTED,
    });
    expect(rpc).not.toHaveBeenCalled();
  });
});
