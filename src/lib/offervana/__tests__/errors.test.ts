import { describe, expect, it } from "vitest";
import { classifyResponse, normalizeOkPayload } from "@/lib/offervana/errors";

describe("classifyResponse", () => {
  it("returns ok for 2xx with ABP envelope + success: true", () => {
    expect(
      classifyResponse(200, {
        result: { id: 42, referalCode: "abc" },
        success: true,
        error: null,
        __abp: true,
      }).kind,
    ).toBe("ok");
    expect(classifyResponse(201, {}).kind).toBe("ok");
  });

  it("treats 200 with ABP success:false as non-ok", () => {
    expect(
      classifyResponse(200, {
        result: null,
        success: false,
        error: { message: "User friendly fail" },
        __abp: true,
      }).kind,
    ).toBe("permanent-failure");
    expect(
      classifyResponse(200, {
        result: null,
        success: false,
        error: { message: "Email already registered" },
        __abp: true,
      }).kind,
    ).toBe("email-conflict");
  });

  it("detects email-conflict on non-2xx ABP UserFriendlyException", () => {
    expect(
      classifyResponse(500, {
        error: { message: "Email already registered for this tenant." },
      }).kind,
    ).toBe("email-conflict");
    expect(
      classifyResponse(400, { error: { message: "Email already exists" } })
        .kind,
    ).toBe("email-conflict");
    expect(
      classifyResponse(409, { error: { message: "duplicate email detected" } })
        .kind,
    ).toBe("email-conflict");
  });

  it("treats ABP UserFriendly 500 as permanent when not an email conflict", () => {
    const result = classifyResponse(500, {
      error: { code: 0, message: "Validation failed: zipCode required." },
    });
    expect(result.kind).toBe("permanent-failure");
    expect(result.message).toMatch(/Validation failed/);
  });

  it("marks bare 5xx as transient (retryable)", () => {
    expect(classifyResponse(502, null).kind).toBe("transient");
    expect(classifyResponse(503, "Service Unavailable").kind).toBe("transient");
    expect(classifyResponse(504, null).kind).toBe("transient");
  });

  it("marks 408 / 429 as transient", () => {
    expect(classifyResponse(408, null).kind).toBe("transient");
    expect(classifyResponse(429, { error: { message: "Too many" } }).kind).toBe(
      "transient",
    );
  });

  it("marks 4xx (non-408/429) without email signal as permanent", () => {
    expect(classifyResponse(400, null).kind).toBe("permanent-failure");
    expect(classifyResponse(401, null).kind).toBe("permanent-failure");
    expect(classifyResponse(403, null).kind).toBe("permanent-failure");
    expect(classifyResponse(404, null).kind).toBe("permanent-failure");
  });
});

describe("normalizeOkPayload", () => {
  it("unwraps ABP envelope + reads GetCustomersDto id + referalCode", () => {
    expect(
      normalizeOkPayload({
        result: { id: 42, referalCode: "REF-XYZ" },
        success: true,
        error: null,
        __abp: true,
      }),
    ).toEqual({ customerId: 42, referralCode: "REF-XYZ", propertyId: null });
  });

  it("tolerates the corrected `referralCode` spelling if upstream fixes it", () => {
    expect(
      normalizeOkPayload({
        result: { id: 7, referralCode: "REF-FIXED" },
        success: true,
        error: null,
        __abp: true,
      }),
    ).toEqual({ customerId: 7, referralCode: "REF-FIXED", propertyId: null });
  });

  it("accepts a bare (non-envelope) GetCustomersDto", () => {
    expect(
      normalizeOkPayload({ id: 12, referalCode: "R" }),
    ).toEqual({ customerId: 12, referralCode: "R", propertyId: null });
  });

  it("extracts propertyId from result.properties[0].id when present", () => {
    expect(
      normalizeOkPayload({
        result: {
          id: 100,
          referalCode: "REF",
          properties: [{ id: 774902, addressLine: "123 Main St" }],
        },
        success: true,
      }),
    ).toEqual({ customerId: 100, referralCode: "REF", propertyId: 774902 });
  });

  it("reports missing id", () => {
    expect(
      normalizeOkPayload({ result: { referalCode: "x" }, success: true }),
    ).toEqual({ error: "result.id missing or non-numeric" });
  });

  it("reports missing referalCode", () => {
    expect(
      normalizeOkPayload({ result: { id: 1 }, success: true }),
    ).toEqual({ error: "result.referalCode missing or empty" });
  });

  it("rejects non-object bodies", () => {
    expect(normalizeOkPayload(null)).toEqual({
      error: "response body is not an object",
    });
    expect(normalizeOkPayload("plain string")).toEqual({
      error: "response body is not an object",
    });
  });
});
