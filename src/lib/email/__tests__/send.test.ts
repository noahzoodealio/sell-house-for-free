import { beforeEach, describe, expect, it, vi } from "vitest";

import { sanitizeError } from "../send";

describe("sanitizeError", () => {
  it("strips sensitive keys from object errors", () => {
    const err = {
      statusCode: 429,
      code: "rate_limited",
      message: "Too many requests",
      to: "victim@leak.test",
      from: "sender@leak.test",
      email: "another@leak.test",
      phone: "+15555550100",
      headers: { authorization: "secret" },
    };
    const out = sanitizeError(err);
    expect(out).not.toContain("victim@leak.test");
    expect(out).not.toContain("sender@leak.test");
    expect(out).not.toContain("another@leak.test");
    expect(out).not.toContain("+15555550100");
    expect(out).not.toContain("secret");
    expect(out).toContain("429");
    expect(out).toContain("Too many requests");
  });

  it("truncates long strings to 500 chars with ellipsis", () => {
    const long = "x".repeat(1000);
    const out = sanitizeError(long);
    expect(out.length).toBeLessThanOrEqual(500);
    expect(out.endsWith("...")).toBe(true);
  });

  it("handles Error instances by extracting the message", () => {
    const err = new Error("kaboom");
    expect(sanitizeError(err)).toBe("kaboom");
  });

  it("renders null/undefined safely", () => {
    expect(sanitizeError(null)).toBe("unknown error");
    expect(sanitizeError(undefined)).toBe("unknown error");
  });
});

// ─── Retry + backoff + notification_log integration ────────────────────

interface SendCall {
  attempt: number;
}

interface SendState {
  calls: SendCall[];
  responses: Array<
    | { data: { id: string }; error: null }
    | { data: null; error: { statusCode: number; message: string } }
    | "throw-retryable"
    | "throw-nonretryable"
    | "throw-timeout"
  >;
  logInserts: Array<Record<string, unknown>>;
  logUpdates: Array<{ id: string; patch: Record<string, unknown> }>;
}

const sendState: SendState = {
  calls: [],
  responses: [],
  logInserts: [],
  logUpdates: [],
};

function resetSendState() {
  sendState.calls = [];
  sendState.responses = [];
  sendState.logInserts = [];
  sendState.logUpdates = [];
}

const mockResend = {
  emails: {
    send: async () => {
      const idx = sendState.calls.length;
      sendState.calls.push({ attempt: idx + 1 });
      const r = sendState.responses[idx];
      if (r === "throw-retryable") {
        const err: Error & { statusCode?: number } = new Error(
          "upstream 503",
        );
        err.statusCode = 503;
        throw err;
      }
      if (r === "throw-nonretryable") {
        const err: Error & { statusCode?: number } = new Error("bad payload");
        err.statusCode = 400;
        throw err;
      }
      if (r === "throw-timeout") {
        const err = new Error("email send timeout");
        err.name = "TimeoutError";
        throw err;
      }
      if (typeof r === "object" && r) {
        return r;
      }
      return { data: { id: "fallback-ok" }, error: null };
    },
  },
};

vi.mock("resend", () => ({
  Resend: class {
    emails = mockResend.emails;
  },
}));

vi.mock("@react-email/render", () => ({
  render: async () => "<html>rendered</html>",
}));

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseAdmin: () => ({
    from: (table: string) => {
      if (table === "submissions") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: { id: "sub-row-1" },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === "notification_log") {
        return {
          insert: (row: Record<string, unknown>) => {
            sendState.logInserts.push(row);
            return {
              select: () => ({
                single: async () => ({
                  data: { id: `log-${sendState.logInserts.length}` },
                  error: null,
                }),
              }),
            };
          },
          update: (patch: Record<string, unknown>) => ({
            eq: async (_col: string, id: string) => {
              sendState.logUpdates.push({ id, patch });
              return { error: null };
            },
          }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
  }),
}));

// Keep real EMAIL_TIMEOUT_MS from pm-service/config but override retries to be quick
vi.mock("@/lib/pm-service/config", async () => {
  return {
    EMAIL_TIMEOUT_MS: 50,
    EMAIL_MAX_ATTEMPTS: 3,
    RPC_TIMEOUT_MS: 5000,
    CONTACT_WINDOW_HOURS: 24,
  };
});

// Required env for the send module to not throw
process.env.RESEND_API_KEY = "re_test";
process.env.EMAIL_FROM = "hello@sellyourhousefree.com";
process.env.EMAIL_REPLY_TO = "ops@sellyourhousefree.com";

import { sendSellerConfirmation } from "../send";

describe("sendSellerConfirmation retry behavior", () => {
  beforeEach(() => {
    resetSendState();
  });

  const baseInput = {
    submissionId: "sub-uuid-001",
    referralCode: "REF-SEND-001",
    to: "seller@example.test",
    sellerFirstName: "Jane",
    pm: { firstName: "Jordan", photoUrl: null },
    contactWindowHours: 24,
    pillarHint: "cash-offers",
  };

  it("first-attempt success: one log insert + one update=sent; no retries", async () => {
    sendState.responses = [{ data: { id: "msg-1" }, error: null }];
    const res = await sendSellerConfirmation(baseInput);
    expect(res).toEqual({ ok: true, messageId: "msg-1" });
    expect(sendState.calls.length).toBe(1);
    expect(sendState.logInserts.length).toBe(1);
    expect(sendState.logUpdates.length).toBe(1);
    expect(sendState.logUpdates[0].patch.status).toBe("sent");
    expect(sendState.logInserts[0].attempt).toBe(1);
    expect(sendState.logInserts[0].template_key).toBe("seller_confirmation");
  });

  it("retries on 503 and succeeds on attempt 2", async () => {
    sendState.responses = [
      "throw-retryable",
      { data: { id: "msg-2" }, error: null },
    ];
    const res = await sendSellerConfirmation(baseInput);
    expect(res).toEqual({ ok: true, messageId: "msg-2" });
    expect(sendState.calls.length).toBe(2);
    expect(sendState.logInserts.length).toBe(2);
    expect(sendState.logInserts[0].attempt).toBe(1);
    expect(sendState.logInserts[1].attempt).toBe(2);
    expect(sendState.logUpdates[0].patch.status).toBe("failed");
    expect(sendState.logUpdates[1].patch.status).toBe("sent");
  });

  it("non-retryable 400 short-circuits after attempt 1", async () => {
    sendState.responses = ["throw-nonretryable"];
    const res = await sendSellerConfirmation(baseInput);
    expect(res.ok).toBe(false);
    expect(sendState.calls.length).toBe(1);
    expect(sendState.logUpdates[0].patch.status).toBe("failed");
  });

  it("exhausts 3 retries on persistent 503 → ok:false", async () => {
    sendState.responses = [
      "throw-retryable",
      "throw-retryable",
      "throw-retryable",
    ];
    const res = await sendSellerConfirmation(baseInput);
    expect(res.ok).toBe(false);
    expect(sendState.calls.length).toBe(3);
    expect(sendState.logInserts.length).toBe(3);
    expect(
      sendState.logUpdates.every((u) => u.patch.status === "failed"),
    ).toBe(true);
  });

  it("timeout is treated as retryable", async () => {
    sendState.responses = [
      "throw-timeout",
      { data: { id: "msg-after-timeout" }, error: null },
    ];
    const res = await sendSellerConfirmation(baseInput);
    expect(res.ok).toBe(true);
    expect(sendState.calls.length).toBe(2);
  });
});
