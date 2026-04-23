import { describe, it, expect } from "vitest";
import {
  addressCacheKey,
  canonicalizeStatus,
  displayListingStatus,
  isAzZip,
  isMultiUnitPropType,
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

describe("isMultiUnitPropType", () => {
  it.each([
    ["CONDOMINIUM", undefined, true],
    ["APARTMENT", undefined, true],
    ["DUPLEX", undefined, true],
    ["TRIPLEX", undefined, true],
    ["QUADRUPLEX", undefined, true],
    ["MULTI-FAMILY DWELLING", undefined, true],
    ["SFR", "Single Family Residence / Townhouse", false],
    ["SFR", undefined, false],
    ["TOWNHOUSE", undefined, false],
    ["MOBILE HOME", undefined, false],
    [undefined, "Condominium", true],
    [undefined, undefined, false],
    ["", "", false],
  ])("propType=%s propClass=%s → %s", (pt, pc, expected) => {
    expect(isMultiUnitPropType(pt, pc)).toBe(expected);
  });
});

describe("mergeToEnrichmentSlot", () => {
  const search: PropertySearchResultDto = {
    attomId: "a1",
    mlsRecordId: "m1",
    listingStatus: "Closed",
    bedroomsTotal: 3,
    bathroomsFull: 2,
    bathroomsHalf: 0,
    livingAreaSquareFeet: 1600,
    yearBuilt: 1990,
  };

  const ATTOM_ABSENT = {
    status: "fulfilled",
    value: null,
  } as const;

  it("uses details when fulfilled (more authoritative than search)", () => {
    const slot = mergeToEnrichmentSlot({
      search,
      detailsSettled: {
        status: "fulfilled",
        value: {
          bedrooms: 4,
          bathrooms: 2.5,
          squareFootage: 2100,
          yearBuilt: 2000,
          lotSize: 7200,
        },
      },
      imagesSettled: { status: "fulfilled", value: undefined },
      attomProfileSettled: ATTOM_ABSENT,
      sources: ["mls"],
      slotStatus: "ok-partial",
      fetchedAt: "2026-01-01T00:00:00.000Z",
    });
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
    const slot = mergeToEnrichmentSlot({
      search,
      detailsSettled: { status: "rejected", reason: new Error("boom") },
      imagesSettled: { status: "fulfilled", value: undefined },
      attomProfileSettled: ATTOM_ABSENT,
      sources: ["mls"],
      slotStatus: "ok-partial",
      fetchedAt: "2026-01-01T00:00:00.000Z",
    });
    expect(slot.details).toEqual({
      bedrooms: 3,
      bathrooms: 2,
      squareFootage: 1600,
      yearBuilt: 1990,
      lotSize: undefined,
    });
  });

  it("drops photos when images leg rejects", () => {
    const slot = mergeToEnrichmentSlot({
      search,
      detailsSettled: { status: "fulfilled", value: { bedrooms: 3 } },
      imagesSettled: { status: "rejected", reason: new Error("boom") },
      attomProfileSettled: ATTOM_ABSENT,
      sources: ["mls"],
      slotStatus: "ok-partial",
      fetchedAt: "2026-01-01T00:00:00.000Z",
    });
    expect(slot.photos).toBeUndefined();
  });

  it("returns all photos sorted by displayOrder", () => {
    // The submission-flow MLS step drives a carousel over the full set, so
    // normalize no longer slices to 3 — it preserves every image sorted by
    // displayOrder so the carousel can page through them.
    const slot = mergeToEnrichmentSlot({
      search,
      detailsSettled: { status: "fulfilled", value: { bedrooms: 3 } },
      imagesSettled: {
        status: "fulfilled",
        value: [
          { url: "x/3.jpg", displayOrder: 3 },
          { url: "x/1.jpg", displayOrder: 1 },
          { url: "x/2.jpg", displayOrder: 2 },
          { url: "x/4.jpg", displayOrder: 4 },
        ],
      },
      attomProfileSettled: ATTOM_ABSENT,
      sources: ["mls"],
      slotStatus: "ok-partial",
      fetchedAt: "2026-01-01T00:00:00.000Z",
    });
    expect(slot.photos).toHaveLength(4);
    expect(slot.photos?.[0].url).toBe("x/1.jpg");
    expect(slot.photos?.[3].url).toBe("x/4.jpg");
  });

  it("always sets fetchedAt", () => {
    const slot = mergeToEnrichmentSlot({
      search,
      detailsSettled: { status: "fulfilled", value: { bedrooms: 3 } },
      imagesSettled: { status: "fulfilled", value: undefined },
      attomProfileSettled: ATTOM_ABSENT,
      sources: ["mls"],
      slotStatus: "ok-partial",
      fetchedAt: "2026-04-21T00:00:00.000Z",
    });
    expect(slot.fetchedAt).toBe("2026-04-21T00:00:00.000Z");
  });

  it("passes raw listingStatus through + populates display for active", () => {
    const slot = mergeToEnrichmentSlot({
      search: { ...search, listingStatus: "Active" },
      detailsSettled: { status: "fulfilled", value: { bedrooms: 3 } },
      imagesSettled: { status: "fulfilled", value: undefined },
      attomProfileSettled: ATTOM_ABSENT,
      sources: ["mls"],
      slotStatus: "ok-partial",
      fetchedAt: "2026-04-21T00:00:00.000Z",
    });
    expect(slot.rawListingStatus).toBe("Active");
    expect(slot.listingStatusDisplay).toBe("currently listed");
  });

  it("sets listingStatusDisplay undefined for out-of-gate raw statuses", () => {
    const slot = mergeToEnrichmentSlot({
      search: { ...search, listingStatus: "Closed" },
      detailsSettled: { status: "fulfilled", value: { bedrooms: 3 } },
      imagesSettled: { status: "fulfilled", value: undefined },
      attomProfileSettled: ATTOM_ABSENT,
      sources: ["mls"],
      slotStatus: "ok-partial",
      fetchedAt: "2026-04-21T00:00:00.000Z",
    });
    expect(slot.rawListingStatus).toBe("Closed");
    expect(slot.listingStatusDisplay).toBeUndefined();
  });

  it("leaves rawListingStatus undefined when search has no listingStatus", () => {
    const slot = mergeToEnrichmentSlot({
      search: { ...search, listingStatus: undefined },
      detailsSettled: { status: "fulfilled", value: { bedrooms: 3 } },
      imagesSettled: { status: "fulfilled", value: undefined },
      attomProfileSettled: ATTOM_ABSENT,
      sources: ["mls"],
      slotStatus: "ok-partial",
      fetchedAt: "2026-04-21T00:00:00.000Z",
    });
    expect(slot.rawListingStatus).toBeUndefined();
    expect(slot.listingStatusDisplay).toBeUndefined();
  });

  it("ATTOM fills fields not provided by MLS (mls+attom sources)", () => {
    const slot = mergeToEnrichmentSlot({
      search: { ...search, yearBuilt: undefined },
      detailsSettled: { status: "fulfilled", value: { bedrooms: 3 } },
      imagesSettled: { status: "fulfilled", value: undefined },
      attomProfileSettled: {
        status: "fulfilled",
        value: { yearBuilt: 1995, lotSize: 5500 },
      },
      sources: ["mls", "attom"],
      slotStatus: "ok",
      fetchedAt: "2026-04-22T00:00:00.000Z",
    });
    expect(slot.status).toBe("ok");
    expect(slot.details?.yearBuilt).toBe(1995);
    expect(slot.details?.lotSize).toBe(5500);
    expect(slot.sources).toEqual(["mls", "attom"]);
  });

  it("ATTOM-only slot when search is null (no mls ids or listingStatus)", () => {
    const slot = mergeToEnrichmentSlot({
      search: null,
      detailsSettled: null,
      imagesSettled: null,
      attomProfileSettled: {
        status: "fulfilled",
        value: {
          bedrooms: 4,
          bathrooms: 2,
          squareFootage: 2100,
          yearBuilt: 1995,
          lotSize: 6500,
        },
      },
      sources: ["attom"],
      slotStatus: "ok-partial",
      fetchedAt: "2026-04-22T00:00:00.000Z",
    });
    expect(slot.status).toBe("ok-partial");
    expect(slot.attomId).toBeUndefined();
    expect(slot.mlsRecordId).toBeUndefined();
    expect(slot.listingStatus).toBeUndefined();
    expect(slot.rawListingStatus).toBeUndefined();
    expect(slot.details?.bedrooms).toBe(4);
    expect(slot.details?.lotSize).toBe(6500);
    expect(slot.sources).toEqual(["attom"]);
  });

  it("sets isMultiUnit when ATTOM propType matches a multi-unit keyword", () => {
    const slot = mergeToEnrichmentSlot({
      search,
      detailsSettled: { status: "fulfilled", value: { bedrooms: 3 } },
      imagesSettled: { status: "fulfilled", value: undefined },
      attomProfileSettled: {
        status: "fulfilled",
        value: { propType: "CONDOMINIUM" },
      },
      sources: ["mls", "attom"],
      slotStatus: "ok",
      fetchedAt: "2026-04-22T00:00:00.000Z",
    });
    expect(slot.isMultiUnit).toBe(true);
  });

  it("leaves isMultiUnit undefined for single-family ATTOM matches", () => {
    const slot = mergeToEnrichmentSlot({
      search,
      detailsSettled: { status: "fulfilled", value: { bedrooms: 3 } },
      imagesSettled: { status: "fulfilled", value: undefined },
      attomProfileSettled: {
        status: "fulfilled",
        value: { propType: "SFR", propClass: "Single Family Residence" },
      },
      sources: ["mls", "attom"],
      slotStatus: "ok",
      fetchedAt: "2026-04-22T00:00:00.000Z",
    });
    expect(slot.isMultiUnit).toBeUndefined();
  });
});
