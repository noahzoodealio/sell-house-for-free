import { describe, it, expect } from "vitest";
import {
  addressCacheKey,
  canonicalizeStatus,
  displayListingStatus,
  isAzZip,
  mergeToEnrichmentSlot,
  normalizeAddress,
  normalizeListingStatus,
} from "../normalize";
import type { PropertySearchResultDto } from "../types";

const base = {
  street1: "123 Main St",
  city: "Phoenix",
  state: "AZ" as const,
  zip: "85004",
};

describe("normalizeAddress", () => {
  it("lowercases, trims, collapses whitespace", () => {
    const n = normalizeAddress({
      ...base,
      street1: "  123   Main  St.  ",
      city: " PHOENIX ",
    });
    expect(n.street1).toBe("123 main st");
    expect(n.city).toBe("phoenix");
  });

  it("normalizes full directionals to 2-letter form", () => {
    const n = normalizeAddress({ ...base, street1: "1234 North Main St" });
    expect(n.street1).toBe("1234 n main st");
    const nw = normalizeAddress({ ...base, street1: "50 Northwest Palm Rd" });
    expect(nw.street1).toBe("50 nw palm rd");
  });

  it("strips #, ., commas", () => {
    const n = normalizeAddress({
      ...base,
      street1: "12, Oak Ave.",
      street2: "#4",
    });
    expect(n.street1).toBe("12 oak ave");
    expect(n.street2).toBe("4");
  });

  it("is deterministic for the same input", () => {
    const a = normalizeAddress(base);
    const b = normalizeAddress(base);
    expect(a).toEqual(b);
  });

  it("handles missing street2", () => {
    const n = normalizeAddress({ ...base, street2: undefined });
    expect(n.street2).toBe("");
  });
});

describe("addressCacheKey", () => {
  it("produces identical keys for semantically identical addresses", () => {
    const a = addressCacheKey({ ...base, street1: "123 MAIN ST." });
    const b = addressCacheKey({ ...base, street1: "123 main st" });
    expect(a).toBe(b);
  });

  it("produces different keys for different apartment numbers", () => {
    const a = addressCacheKey({ ...base, street2: "apt 2" });
    const b = addressCacheKey({ ...base, street2: "apt 3" });
    expect(a).not.toBe(b);
  });

  it("produces different keys for different zips", () => {
    const a = addressCacheKey({ ...base, zip: "85004" });
    const b = addressCacheKey({ ...base, zip: "85014" });
    expect(a).not.toBe(b);
  });
});

describe("isAzZip", () => {
  it("accepts boundary 85001", () => expect(isAzZip("85001")).toBe(true));
  it("accepts boundary 86556", () => expect(isAzZip("86556")).toBe(true));
  it("rejects 85000", () => expect(isAzZip("85000")).toBe(false));
  it("rejects 86557", () => expect(isAzZip("86557")).toBe(false));
  it("accepts string '85004'", () => expect(isAzZip("85004")).toBe(true));
  it("accepts number 85004", () => expect(isAzZip(85004)).toBe(true));
  it("rejects non-numeric", () => expect(isAzZip("abcde")).toBe(false));
});

describe("normalizeListingStatus", () => {
  it.each([
    ["Active", "currently-listed"],
    ["ActiveUnderContract", "currently-listed"],
    ["Pending", "currently-listed"],
    ["ComingSoon", "currently-listed"],
    ["Closed", "previously-listed"],
    ["Expired", "previously-listed"],
    ["Withdrawn", "previously-listed"],
    ["Cancelled", "previously-listed"],
  ])("%s → %s", (input, expected) => {
    expect(normalizeListingStatus(input)).toBe(expected);
  });

  it("null/undefined → not-listed", () => {
    expect(normalizeListingStatus(null)).toBe("not-listed");
    expect(normalizeListingStatus(undefined)).toBe("not-listed");
  });

  it("unknown status → not-listed", () => {
    expect(normalizeListingStatus("WeirdStatus")).toBe("not-listed");
  });

  it("case-insensitive", () => {
    expect(normalizeListingStatus("active")).toBe("currently-listed");
    expect(normalizeListingStatus("CLOSED")).toBe("previously-listed");
  });

  it("Sold → previously-listed", () => {
    expect(normalizeListingStatus("Sold")).toBe("previously-listed");
  });
});

describe("canonicalizeStatus", () => {
  it("lowercases + strips whitespace/underscore/dash", () => {
    expect(canonicalizeStatus("ActiveUnderContract")).toBe("activeundercontract");
    expect(canonicalizeStatus("active under contract")).toBe("activeundercontract");
    expect(canonicalizeStatus("active_under_contract")).toBe("activeundercontract");
    expect(canonicalizeStatus("active-under-contract")).toBe("activeundercontract");
    expect(canonicalizeStatus(" Active ")).toBe("active");
  });

  it("returns empty string for nullish / empty input", () => {
    expect(canonicalizeStatus(null)).toBe("");
    expect(canonicalizeStatus(undefined)).toBe("");
    expect(canonicalizeStatus("")).toBe("");
  });
});

describe("displayListingStatus", () => {
  it.each([
    ["Active", "currently listed"],
    ["active", "currently listed"],
    [" Active ", "currently listed"],
    ["ActiveUnderContract", "listed, currently under contract"],
    ["active_under_contract", "listed, currently under contract"],
    ["active-under-contract", "listed, currently under contract"],
    ["ACTIVE UNDER CONTRACT", "listed, currently under contract"],
    ["ComingSoon", "coming soon"],
    ["coming soon", "coming soon"],
    ["coming_soon", "coming soon"],
    ["Pending", "listed, currently under contract"],
    ["PENDING", "listed, currently under contract"],
  ])("%s → %s", (input, expected) => {
    expect(displayListingStatus(input)).toBe(expected);
  });

  it.each([
    ["Closed"],
    ["Sold"],
    ["Expired"],
    ["Withdrawn"],
    ["Cancelled"],
    ["WeirdStatus"],
    [""],
  ])("%s → undefined", (input) => {
    expect(displayListingStatus(input)).toBeUndefined();
  });

  it("null / undefined → undefined", () => {
    expect(displayListingStatus(null)).toBeUndefined();
    expect(displayListingStatus(undefined)).toBeUndefined();
  });
});

describe("mergeToEnrichmentSlot", () => {
  const search: PropertySearchResultDto = {
    attomId: "a1",
    mlsRecordId: "m1",
    listingStatus: "Closed",
    bedrooms: 3,
    bathrooms: 2,
    squareFootage: 1600,
    yearBuilt: 1990,
  };

  it("uses details when fulfilled (more authoritative than search)", () => {
    const slot = mergeToEnrichmentSlot(
      search,
      {
        status: "fulfilled",
        value: { bedrooms: 4, bathrooms: 2.5, squareFootage: 2100, yearBuilt: 2000, lotSize: 7200 },
      },
      { status: "fulfilled", value: undefined },
      "2026-01-01T00:00:00.000Z",
    );
    expect(slot.details).toEqual({
      bedrooms: 4,
      bathrooms: 2.5,
      squareFootage: 2100,
      yearBuilt: 2000,
      lotSize: 7200,
    });
    expect(slot.photos).toBeUndefined();
    expect(slot.listingStatus).toBe("previously-listed");
  });

  it("falls back to search fields when details reject", () => {
    const slot = mergeToEnrichmentSlot(
      search,
      { status: "rejected", reason: new Error("boom") },
      { status: "fulfilled", value: undefined },
      "2026-01-01T00:00:00.000Z",
    );
    expect(slot.details).toEqual({
      bedrooms: 3,
      bathrooms: 2,
      squareFootage: 1600,
      yearBuilt: 1990,
      lotSize: undefined,
    });
  });

  it("drops photos when images leg rejects", () => {
    const slot = mergeToEnrichmentSlot(
      search,
      { status: "fulfilled", value: { bedrooms: 3 } },
      { status: "rejected", reason: new Error("boom") },
      "2026-01-01T00:00:00.000Z",
    );
    expect(slot.photos).toBeUndefined();
  });

  it("returns first 3 photos sorted by displayOrder", () => {
    const slot = mergeToEnrichmentSlot(
      search,
      { status: "fulfilled", value: { bedrooms: 3 } },
      {
        status: "fulfilled",
        value: [
          { url: "x/3.jpg", displayOrder: 3 },
          { url: "x/1.jpg", displayOrder: 1 },
          { url: "x/2.jpg", displayOrder: 2 },
          { url: "x/4.jpg", displayOrder: 4 },
        ],
      },
      "2026-01-01T00:00:00.000Z",
    );
    expect(slot.photos).toHaveLength(3);
    expect(slot.photos?.[0].url).toBe("x/1.jpg");
    expect(slot.photos?.[2].url).toBe("x/3.jpg");
  });

  it("always sets fetchedAt", () => {
    const slot = mergeToEnrichmentSlot(
      search,
      { status: "fulfilled", value: { bedrooms: 3 } },
      { status: "fulfilled", value: undefined },
      "2026-04-21T00:00:00.000Z",
    );
    expect(slot.fetchedAt).toBe("2026-04-21T00:00:00.000Z");
  });

  it("passes raw listingStatus through + populates display for active", () => {
    const slot = mergeToEnrichmentSlot(
      { ...search, listingStatus: "Active" },
      { status: "fulfilled", value: { bedrooms: 3 } },
      { status: "fulfilled", value: undefined },
      "2026-04-21T00:00:00.000Z",
    );
    expect(slot.rawListingStatus).toBe("Active");
    expect(slot.listingStatusDisplay).toBe("currently listed");
  });

  it("sets listingStatusDisplay undefined for out-of-gate raw statuses", () => {
    const slot = mergeToEnrichmentSlot(
      { ...search, listingStatus: "Closed" },
      { status: "fulfilled", value: { bedrooms: 3 } },
      { status: "fulfilled", value: undefined },
      "2026-04-21T00:00:00.000Z",
    );
    expect(slot.rawListingStatus).toBe("Closed");
    expect(slot.listingStatusDisplay).toBeUndefined();
  });

  it("leaves rawListingStatus undefined when search has no listingStatus", () => {
    const slot = mergeToEnrichmentSlot(
      { ...search, listingStatus: undefined },
      { status: "fulfilled", value: { bedrooms: 3 } },
      { status: "fulfilled", value: undefined },
      "2026-04-21T00:00:00.000Z",
    );
    expect(slot.rawListingStatus).toBeUndefined();
    expect(slot.listingStatusDisplay).toBeUndefined();
  });
});
