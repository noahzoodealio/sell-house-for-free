import { describe, expect, it, vi } from "vitest";
import {
  IDEMPOTENCY_TTL_MS,
  lookupIdempotent,
  storeIdempotent,
} from "@/lib/offervana/idempotency";

type Captured = {
  table: string;
  filters: Record<string, unknown>;
  selected?: string;
  upserted?: unknown;
  upsertOptions?: Record<string, unknown>;
};

function makeClient(
  lookupResult: { data: unknown; error: unknown },
  upsertResult: { error: unknown } = { error: null },
): { client: unknown; captured: Captured } {
  const captured: Captured = { table: "", filters: {} };

  const selectBuilder = {
    select(cols: string) {
      captured.selected = cols;
      return selectBuilder;
    },
    eq(col: string, val: unknown) {
      captured.filters[`eq:${col}`] = val;
      return selectBuilder;
    },
    gte(col: string, val: unknown) {
      captured.filters[`gte:${col}`] = val;
      return selectBuilder;
    },
    async maybeSingle() {
      return lookupResult;
    },
  };

  const client = {
    from(table: string) {
      captured.table = table;
      return {
        ...selectBuilder,
        async upsert(row: unknown, options: Record<string, unknown>) {
          captured.upserted = row;
          captured.upsertOptions = options;
          return upsertResult;
        },
      };
    },
  };

  return { client, captured };
}

describe("lookupIdempotent", () => {
  const submissionId = "11111111-1111-4111-8111-111111111111";
  const now = new Date("2026-04-23T15:00:00.000Z");

  it("returns normalized payload on a fresh row", async () => {
    const { client, captured } = makeClient({
      data: {
        submission_id: submissionId,
        customer_id: 42,
        user_id: 1337,
        referral_code: "REF-XYZ",
        created_at: "2026-04-23T14:00:00.000Z",
      },
      error: null,
    });

    const result = await lookupIdempotent(submissionId, {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      client: client as any,
      now: () => now,
    });

    expect(result).toEqual({
      customerId: 42,
      userId: 1337,
      referralCode: "REF-XYZ",
    });
    expect(captured.table).toBe("offervana_idempotency");
    expect(captured.filters["eq:submission_id"]).toBe(submissionId);
    expect(captured.filters["gte:created_at"]).toBe(
      new Date(now.getTime() - IDEMPOTENCY_TTL_MS).toISOString(),
    );
  });

  it("returns null when no row exists within TTL", async () => {
    const { client } = makeClient({ data: null, error: null });
    const result = await lookupIdempotent(submissionId, {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      client: client as any,
      now: () => now,
    });
    expect(result).toBeNull();
  });

  it("throws when Supabase reports an error", async () => {
    const { client } = makeClient({
      data: null,
      error: { message: "connection reset" },
    });
    await expect(
      lookupIdempotent(submissionId, {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        client: client as any,
        now: () => now,
      }),
    ).rejects.toThrow(/connection reset/);
  });
});

describe("storeIdempotent", () => {
  const submissionId = "22222222-2222-4222-8222-222222222222";
  const payload = { customerId: 7, userId: 9, referralCode: "R-7" };
  const now = new Date("2026-04-23T15:30:00.000Z");

  it("upserts with ignoreDuplicates for concurrent-replay safety", async () => {
    const { client, captured } = makeClient(
      { data: null, error: null },
      { error: null },
    );
    await storeIdempotent(submissionId, payload, {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      client: client as any,
      now: () => now,
    });
    expect(captured.table).toBe("offervana_idempotency");
    expect(captured.upserted).toEqual({
      submission_id: submissionId,
      customer_id: 7,
      user_id: 9,
      referral_code: "R-7",
      created_at: now.toISOString(),
    });
    expect(captured.upsertOptions).toEqual({
      onConflict: "submission_id",
      ignoreDuplicates: true,
    });
  });

  it("throws when Supabase reports an error", async () => {
    const { client } = makeClient(
      { data: null, error: null },
      { error: { message: "pg fail" } },
    );
    await expect(
      storeIdempotent(submissionId, payload, {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        client: client as any,
      }),
    ).rejects.toThrow(/pg fail/);
  });
});

describe("concurrent replay semantics", () => {
  it("second submit with same submissionId still finds cached payload", async () => {
    const submissionId = "33333333-3333-4333-8333-333333333333";
    const payload = { customerId: 1, userId: 2, referralCode: "R-1" };
    const firstCall = makeClient(
      { data: null, error: null },
      { error: null },
    );

    await storeIdempotent(submissionId, payload, {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      client: firstCall.client as any,
    });

    const secondCall = makeClient({
      data: {
        submission_id: submissionId,
        customer_id: 1,
        user_id: 2,
        referral_code: "R-1",
        created_at: new Date().toISOString(),
      },
      error: null,
    });
    const cached = await lookupIdempotent(submissionId, {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      client: secondCall.client as any,
    });
    expect(cached).toEqual(payload);
  });
});
