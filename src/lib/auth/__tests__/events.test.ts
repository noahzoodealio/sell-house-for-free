import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { trackAuthEvent } from "../events";

// Captures every console.error payload the observability helper emits so
// we can assert there's no raw email/phone PII in any serialized event.
let errorCalls: string[] = [];

beforeEach(() => {
  errorCalls = [];
  vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    for (const arg of args) {
      if (typeof arg === "string") errorCalls.push(arg);
    }
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

function lastPayload(): string {
  expect(errorCalls.length).toBeGreaterThan(0);
  return errorCalls[errorCalls.length - 1];
}

describe("trackAuthEvent", () => {
  it("serializes seller_login_succeeded without raw identifier", () => {
    trackAuthEvent({
      type: "seller_login_succeeded",
      method: "email_otp",
      userId: "00000000-0000-0000-0000-000000000000",
    });
    const payload = lastPayload();
    expect(payload).not.toContain("@");
    expect(payload).toContain("seller_login_succeeded");
    expect(payload).toContain("email_otp");
    expect(payload).toContain("00000000-0000-0000-0000-000000000000");
  });

  it("never leaks @ in any failure event", () => {
    for (const reason of [
      "expired",
      "used",
      "invalid_code",
      "rate_limited",
      "user_not_found",
      "tcpa_missing",
      "exchange_failed",
    ] as const) {
      trackAuthEvent({
        type: "seller_login_failed",
        method: "email_otp",
        reason,
      });
    }
    for (const call of errorCalls) {
      expect(call).not.toContain("@");
    }
  });

  it("serializes seller_login_resend with identifierType only", () => {
    trackAuthEvent({
      type: "seller_login_resend",
      identifierType: "phone",
      attempt: 2,
    });
    const payload = lastPayload();
    expect(payload).not.toContain("@");
    expect(payload).toContain("seller_login_resend");
    expect(payload).toContain("phone");
    expect(payload).not.toContain("+1"); // no leaked E.164 numbers
  });

  it("serializes seller_magic_link_expired with identifierType only", () => {
    trackAuthEvent({
      type: "seller_magic_link_expired",
      identifierType: "email",
    });
    const payload = lastPayload();
    expect(payload).not.toContain("@");
    expect(payload).toContain("seller_magic_link_expired");
  });
});
