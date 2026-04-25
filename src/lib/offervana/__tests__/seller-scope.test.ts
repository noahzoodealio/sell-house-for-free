import { describe, expect, it } from "vitest";

import { assertScopeMatches } from "../seller-scope";

const SCOPE = { submissionId: "sub-uuid", customerId: 42 };

describe("src/lib/offervana/seller-scope — assertScopeMatches", () => {
  it("returns ok on customerId match", () => {
    const result = assertScopeMatches(SCOPE, { customerId: 42 });
    expect(result).toEqual({ ok: true, customerId: 42 });
  });

  it("returns scope_violation on customerId mismatch", () => {
    const result = assertScopeMatches(SCOPE, { customerId: 99 });
    expect(result).toEqual({
      ok: false,
      reason: "scope_violation",
      expectedCustomerId: 42,
      actualCustomerId: 99,
    });
  });

  it("returns no_record when customerId is missing", () => {
    const result = assertScopeMatches(SCOPE, {});
    expect(result.ok).toBe(false);
    expect((result as { reason: string }).reason).toBe("no_record");
  });

  it("returns no_record when response is null/undefined", () => {
    expect(assertScopeMatches(SCOPE, null).ok).toBe(false);
    expect(assertScopeMatches(SCOPE, undefined).ok).toBe(false);
  });

  it("coerces stringified customerId before comparing", () => {
    const result = assertScopeMatches(SCOPE, {
      customerId: "42" as unknown as number,
    });
    expect(result.ok).toBe(true);
  });

  it("string customerId mismatch surfaces as scope_violation", () => {
    const result = assertScopeMatches(SCOPE, {
      customerId: "99" as unknown as number,
    });
    expect(result).toEqual({
      ok: false,
      reason: "scope_violation",
      expectedCustomerId: 42,
      actualCustomerId: 99,
    });
  });
});
