import { describe, expect, it } from "vitest";
import { classifyResponse, normalizeOkPayload } from "@/lib/offervana/errors";

describe("classifyResponse", () => {
  it("returns ok for 2xx with ABP envelope unwrapping", () => {
    expect(
      classifyResponse(200, {
        result: { item1: 1, item2: 2, item3: "abc" },
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

  it("detects email-conflict on non-2xx responses (ABP UserFriendlyException)", () => {
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
      error: { code: 0, message: "Validation failed: PropertyZip required." },
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
  it("normalizes lowercase item1/item2/item3 at top level", () => {
    expect(
      normalizeOkPayload({ item1: 42, item2: 1337, item3: "REF-XYZ" }),
    ).toEqual({ customerId: 42, userId: 1337, referralCode: "REF-XYZ" });
  });

  it("unwraps the ABP envelope result wrapper", () => {
    expect(
      normalizeOkPayload({
        result: { item1: 42, item2: 1337, item3: "REF-XYZ" },
        success: true,
        error: null,
        __abp: true,
      }),
    ).toEqual({ customerId: 42, userId: 1337, referralCode: "REF-XYZ" });
  });

  it("also accepts PascalCase Item1/Item2/Item3", () => {
    expect(
      normalizeOkPayload({ Item1: 7, Item2: 8, Item3: "R" }),
    ).toEqual({ customerId: 7, userId: 8, referralCode: "R" });
  });

  it("reports missing customerId", () => {
    expect(
      normalizeOkPayload({ item2: 1, item3: "x" }),
    ).toEqual({ error: "item1 (customerId) missing or non-numeric" });
  });

  it("reports missing userId", () => {
    expect(
      normalizeOkPayload({ item1: 1, item3: "x" }),
    ).toEqual({ error: "item2 (userId) missing or non-numeric" });
  });

  it("reports missing referralCode", () => {
    expect(
      normalizeOkPayload({ item1: 1, item2: 2, item3: "" }),
    ).toEqual({ error: "item3 (referralCode) missing or empty" });
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
