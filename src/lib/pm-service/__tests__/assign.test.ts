import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AssignInput } from "../types";

type MockQueryResolution = {
  data?: unknown;
  error?: { code?: string; message?: string } | null;
};

type FromMockBehavior = {
  maybeSingleResult?: MockQueryResolution;
  selectSingleResult?: MockQueryResolution;
  upsertSelectSingleResult?: MockQueryResolution;
  upsertResult?: MockQueryResolution;
  insertResult?: MockQueryResolution;
};

interface MockState {
  fromBehaviors: Map<string, FromMockBehavior>;
  createUserResult:
    | { data: { user: { id: string } }; error?: null }
    | { data: null; error: { message: string } };
  rpcResult: MockQueryResolution | { abort: true };
  seller: { sendResult?: { ok: boolean; error?: string }; throw?: boolean };
  team: { sendResult?: { ok: boolean; error?: string }; throw?: boolean };
}

const state: MockState = resetState();

function resetState(): MockState {
  return {
    fromBehaviors: new Map(),
    createUserResult: {
      data: { user: { id: "user-new-1" } },
      error: null,
    },
    rpcResult: {
      data: [
        {
          assignment_kind: "fresh",
          team_member_id: "tm-1",
          pm_first_name: "Jordan",
          pm_photo_url: null,
        },
      ],
    },
    seller: { sendResult: { ok: true } },
    team: { sendResult: { ok: true } },
  };
}

function chainFor(table: string) {
  const behavior = state.fromBehaviors.get(table) ?? {};
  return {
    select: () => ({
      ilike: () => ({
        maybeSingle: async () =>
          behavior.maybeSingleResult ?? { data: null, error: null },
      }),
      eq: () => ({
        maybeSingle: async () =>
          behavior.maybeSingleResult ?? { data: null, error: null },
      }),
    }),
    insert: async () => behavior.insertResult ?? { error: null, data: null },
    upsert: (_values: unknown, _opts?: unknown) => ({
      select: () => ({
        single: async () =>
          behavior.upsertSelectSingleResult ?? {
            data: { id: "sub-row-1" },
            error: null,
          },
      }),
      // tail-call (no select chained): submission_offers upsert
      then: (fn: (r: MockQueryResolution) => unknown) =>
        Promise.resolve(behavior.upsertResult ?? { error: null }).then(fn),
    }),
  };
}

const mockSupabase = {
  from: (table: string) => chainFor(table),
  auth: {
    admin: {
      createUser: async () => state.createUserResult,
    },
  },
  rpc: () => {
    if ("abort" in state.rpcResult) {
      return {
        abortSignal: () =>
          Promise.reject(
            Object.assign(new Error("aborted"), { name: "AbortError" }),
          ),
      };
    }
    const r = state.rpcResult;
    return {
      abortSignal: async () => r,
    };
  },
};

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseAdmin: () => mockSupabase,
}));

vi.mock("@/lib/email", () => ({
  sendSellerConfirmation: async () => {
    if (state.seller.throw) throw new Error("seller send throw");
    return state.seller.sendResult ?? { ok: true };
  },
  sendTeamMemberNotification: async () => {
    if (state.team.throw) throw new Error("team send throw");
    return state.team.sendResult ?? { ok: true };
  },
}));

import { assignPmAndNotify } from "../assign";
import { sanitizeSentryExtras } from "../observability";

const baseInput: AssignInput = {
  submissionId: "sub-uuid-001",
  referralCode: "REF-TEST-001",
  customerId: 12345,
  userId: 67890,
  propertyId: null,
  pillarHint: "cash-offers",
  seller: {
    fullName: "Jane Doe",
    email: "jane@example.test",
    phone: "+15555550100",
    address: "100 Test Way",
    city: "Phoenix",
    state: "AZ",
    zip: "85001",
    beds: 3,
    baths: 2,
    sqft: 1800,
    timeline: "0-3mo",
    sellerPaths: ["cash", "list"],
    tcpaVersion: "2026-04-17",
    tcpaAcceptedAt: "2026-04-24T19:00:00.000Z",
    termsVersion: "2026-04-17",
    termsAcceptedAt: "2026-04-24T19:00:00.000Z",
  },
  offers: [
    {
      path: "cash",
      lowCents: 30_000_000,
      highCents: 35_000_000,
      rawPayload: { pillar: "cash-offers" },
    },
  ],
};

describe("assignPmAndNotify", () => {
  beforeEach(() => {
    Object.assign(state, resetState());
  });

  it("happy path: creates profile, upserts submission, calls RPC, sends emails", async () => {
    const res = await assignPmAndNotify(baseInput);
    expect(res).toEqual({
      ok: true,
      pmUserId: "tm-1",
      pmFirstName: "Jordan",
      pmPhotoUrl: null,
      profileCreated: true,
      emailsEnqueued: { seller: true, team: true },
    });
  });

  it("returning seller: reuses existing profile; profileCreated=false", async () => {
    state.fromBehaviors.set("profiles", {
      maybeSingleResult: { data: { id: "user-existing-1" }, error: null },
    });

    const res = await assignPmAndNotify(baseInput);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.profileCreated).toBe(false);
  });

  it("RPC raises P0001 → returns ok:false reason=no_active_pms", async () => {
    state.rpcResult = {
      data: null,
      error: { code: "P0001", message: "E6_NO_ACTIVE_PMS" },
    };

    const res = await assignPmAndNotify(baseInput);
    expect(res).toMatchObject({ ok: false, reason: "no_active_pms" });
    if (!res.ok) expect(res.sentryEventId).toBeTruthy();
  });

  it("RPC timeout → returns ok:false reason=timeout", async () => {
    state.rpcResult = { abort: true };

    const res = await assignPmAndNotify(baseInput);
    expect(res).toMatchObject({ ok: false, reason: "timeout" });
  });

  it("submission upsert error → reason=submission_failed", async () => {
    state.fromBehaviors.set("submissions", {
      upsertSelectSingleResult: {
        data: null,
        error: { message: "constraint violation" },
      },
    });

    const res = await assignPmAndNotify(baseInput);
    expect(res).toMatchObject({ ok: false, reason: "submission_failed" });
  });

  it("profile creation failure → reason=profile_failed", async () => {
    state.createUserResult = {
      data: null,
      error: { message: "auth service down" },
    };
    // Also fail the retry lookup so we don't fall into the race-recovery path.
    state.fromBehaviors.set("profiles", {
      maybeSingleResult: { data: null, error: null },
    });

    const res = await assignPmAndNotify(baseInput);
    expect(res).toMatchObject({ ok: false, reason: "profile_failed" });
  });

  it("seller email failure: still returns ok:true; emailsEnqueued.seller=false", async () => {
    state.seller.sendResult = { ok: false, error: "rate limited" };

    const res = await assignPmAndNotify(baseInput);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.emailsEnqueued.seller).toBe(false);
      expect(res.emailsEnqueued.team).toBe(true);
    }
  });

  it("team email throw: still returns ok:true; emailsEnqueued.team=false", async () => {
    state.team.throw = true;

    const res = await assignPmAndNotify(baseInput);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.emailsEnqueued.team).toBe(false);
      expect(res.emailsEnqueued.seller).toBe(true);
    }
  });
});

describe("sanitizeSentryExtras", () => {
  it("drops PII keys", () => {
    const out = sanitizeSentryExtras({
      submissionId: "sub-1",
      referralCode: "ref-1",
      email: "pii@leak.test",
      phone: "+15555550100",
      fullName: "Jane Doe",
      address: "100 Test Way",
      pillarHint: "cash-offers",
    });
    expect(out).toEqual({
      submissionId: "sub-1",
      referralCode: "ref-1",
      pillarHint: "cash-offers",
    });
    expect(out).not.toHaveProperty("email");
    expect(out).not.toHaveProperty("phone");
    expect(out).not.toHaveProperty("fullName");
    expect(out).not.toHaveProperty("address");
  });

  it("drops undefined values", () => {
    const out = sanitizeSentryExtras({
      submissionId: "sub-1",
      pillarHint: undefined,
    });
    expect(out).toEqual({ submissionId: "sub-1" });
  });
});
