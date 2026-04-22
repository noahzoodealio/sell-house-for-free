import { describe, it, expect } from "vitest";
import { devMockEnrich, devMockSuggest } from "../fixtures";

const baseAddr = {
  street1: "123 Main St",
  city: "Phoenix",
  state: "AZ" as const,
  zip: "85004",
};

describe("devMockEnrich", () => {
  it("returns ok with populated slot for a normal street1", () => {
    const env = devMockEnrich({
      kind: "enrich",
      submissionId: "00000000-0000-0000-0000-000000000000",
      address: baseAddr,
    });

    expect(env.status).toBe("ok");
    if (env.status === "ok") {
      expect(env.cacheHit).toBe(false);
      expect(env.slot.status).toBe("ok");
      expect(env.slot.details).toMatchObject({
        bedrooms: 3,
        bathrooms: 2,
      });
    }
  });

  it("triggers timeout via street1 === '__TIMEOUT__'", () => {
    const env = devMockEnrich({
      kind: "enrich",
      submissionId: "00000000-0000-0000-0000-000000000000",
      address: { ...baseAddr, street1: "__TIMEOUT__" },
    });
    expect(env).toEqual({ status: "timeout", retryable: true });
  });

  it("triggers no-match via street1 === '__NOMATCH__'", () => {
    const env = devMockEnrich({
      kind: "enrich",
      submissionId: "00000000-0000-0000-0000-000000000000",
      address: { ...baseAddr, street1: "__NOMATCH__" },
    });
    expect(env).toEqual({ status: "no-match", cacheHit: false });
  });

  it("triggers out-of-area via street1 === '__OUTAREA__'", () => {
    const env = devMockEnrich({
      kind: "enrich",
      submissionId: "00000000-0000-0000-0000-000000000000",
      address: { ...baseAddr, street1: "__OUTAREA__" },
    });
    expect(env).toEqual({ status: "out-of-area" });
  });

  it("triggers error via street1 === '__ERROR__'", () => {
    const env = devMockEnrich({
      kind: "enrich",
      submissionId: "00000000-0000-0000-0000-000000000000",
      address: { ...baseAddr, street1: "__ERROR__" },
    });
    expect(env).toEqual({ status: "error", code: "dev-mock" });
  });

  it("triggers currently-listed with 3 photos via street1 === '__LISTED__'", () => {
    const env = devMockEnrich({
      kind: "enrich",
      submissionId: "00000000-0000-0000-0000-000000000000",
      address: { ...baseAddr, street1: "__LISTED__" },
    });
    expect(env.status).toBe("ok");
    if (env.status === "ok") {
      expect(env.slot.listingStatus).toBe("currently-listed");
      expect(env.slot.photos).toHaveLength(3);
    }
  });
});

describe("devMockSuggest", () => {
  it("returns up to `limit` canned results", () => {
    const env = devMockSuggest({ kind: "suggest", query: "123 Main", limit: 3 });
    expect(env.status).toBe("ok");
    if (env.status === "ok") {
      expect(env.results).toHaveLength(3);
      expect(env.results[0]).toMatchObject({ state: "AZ" });
    }
  });

  it("triggers timeout via query === '__TIMEOUT__'", () => {
    const env = devMockSuggest({
      kind: "suggest",
      query: "__TIMEOUT__",
      limit: 5,
    });
    expect(env).toEqual({ status: "timeout", retryable: true });
  });
});
