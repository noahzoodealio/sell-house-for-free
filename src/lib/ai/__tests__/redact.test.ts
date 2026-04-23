import { describe, expect, it } from "vitest";

import { redact, redactObject } from "../redact";

describe("src/lib/ai/redact — email", () => {
  it.each([
    ["noah@example.com", "[redacted-email]"],
    ["NoAh@Example.COM", "[redacted-email]"],
    ["a.b+tag@sub.example.co.uk", "[redacted-email]"],
  ])("redacts %s", (input, token) => {
    const out = redact(`ping ${input} now`);
    expect(out).toContain(token);
    expect(out).not.toContain(input);
    expect(out).not.toContain("@");
  });
});

describe("src/lib/ai/redact — phone", () => {
  it.each([
    "(602) 555-1234",
    "602-555-1234",
    "602.555.1234",
    "602 555 1234",
    "6025551234",
    "+1 602 555 1234",
    "+16025551234",
  ])("redacts %s", (input) => {
    const out = redact(`call ${input} asap`);
    expect(out).toContain("[redacted-phone]");
    expect(out).not.toContain(input);
  });

  it.each([
    ["5 bedrooms", "5 bedrooms"],
    ["2025 was a good year", "2025 was a good year"],
    ["I am 42 years old", "I am 42 years old"],
    ["1234567", "1234567"],
    ["15503201234 is an account", "15503201234 is an account"],
  ])("does not redact %s", (input, expected) => {
    expect(redact(input)).toBe(expected);
  });
});

describe("src/lib/ai/redact — street address", () => {
  it.each([
    "1234 E Camelback Rd",
    "55 Main Street",
    "12345 N 44th Pl",
    "987 Oak Avenue",
    "42 S 16th St",
  ])("redacts %s", (input) => {
    const out = redact(`lives at ${input}, probably`);
    expect(out).toContain("[redacted-address]");
    expect(out).not.toContain(input);
  });

  it.each([
    "85001 zip code",
    "I read 2 Stree articles",
    "2024 prices",
    "Room 101",
  ])("does not redact %s", (input) => {
    expect(redact(input)).toBe(input);
  });
});

describe("src/lib/ai/redact — ordering and objects", () => {
  it("runs address before phone so the leading number token is consumed", () => {
    const out = redact("1234 N 44th St Phoenix AZ 85018");
    expect(out).toContain("[redacted-address]");
    expect(out).not.toContain("[redacted-phone]");
  });

  it("redactObject walks nested structures and skips non-string primitives", () => {
    const result = redactObject({
      a: "call me at 602-555-1234",
      b: { email: "x@y.com", note: "fine" },
      arr: ["1234 Oak Rd", 42, true, null],
    });
    expect(result).toEqual({
      a: "call me at [redacted-phone]",
      b: { email: "[redacted-email]", note: "fine" },
      arr: ["[redacted-address]", 42, true, null],
    });
  });

  it("passes non-string primitives through unchanged", () => {
    expect(redactObject(42)).toBe(42);
    expect(redactObject(null)).toBe(null);
    expect(redactObject(undefined)).toBe(undefined);
    expect(redactObject(true)).toBe(true);
  });
});

describe("src/lib/ai/redact — performance ceiling", () => {
  it("runs 10,000 iterations of a 500-char line under 5 seconds", () => {
    const line =
      "some user said: my email is a@b.com and my phone is 602-555-1234 and I live at 1234 E Camelback Rd, Phoenix, AZ 85018 — " +
      "and the conversation continues with lots of context that has no PII, like numbers 5, 12, 2025, and room 101 references. ".repeat(
        2,
      );
    const start = Date.now();
    for (let i = 0; i < 10_000; i++) {
      redact(line);
    }
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(5000);
  });
});
