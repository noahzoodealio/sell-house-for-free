import { describe, expect, it } from "vitest";

import {
  AZ_REGIONAL_PER_SQFT,
  BATH_DELTA,
  BED_DELTA,
  CONDITION_DELTA_BY_STEP,
  DEFAULT_PER_SQFT,
  applyDeviationsImpl,
  bathsDelta,
  bedsDelta,
  conditionDelta,
  regionalPerSqft,
  sqftDelta,
} from "../deviations";
import type { HydratedComp } from "../workflows/comp-run";

function comp(overrides: Partial<HydratedComp>): HydratedComp {
  return {
    mlsRecordId: "m1",
    address: "123 Main",
    soldPrice: 400_000,
    closedDate: new Date().toISOString(),
    beds: 3,
    baths: 2,
    sqft: 1500,
    distanceMiles: null,
    photoUrls: [],
    listingRaw: {},
    ...overrides,
  };
}

describe("bedsDelta", () => {
  it("returns positive when subject has more beds", () => {
    expect(bedsDelta(4, 3)).toBe(BED_DELTA);
  });
  it("returns negative when subject has fewer beds", () => {
    expect(bedsDelta(2, 3)).toBe(-BED_DELTA);
  });
  it("returns zero when either is null", () => {
    expect(bedsDelta(null, 3)).toBe(0);
    expect(bedsDelta(3, null)).toBe(0);
  });
});

describe("bathsDelta", () => {
  it("pays half-baths at BATH_DELTA/2 rounded", () => {
    expect(bathsDelta(2.5, 2)).toBe(Math.round(0.5 * BATH_DELTA));
    expect(bathsDelta(3, 2)).toBe(BATH_DELTA);
  });
  it("returns zero when either side is null", () => {
    expect(bathsDelta(null, 2)).toBe(0);
    expect(bathsDelta(2, null)).toBe(0);
  });
});

describe("conditionDelta", () => {
  it("gives positive delta when subject is above comp", () => {
    expect(conditionDelta("excellent", "fair")).toBe(
      2 * CONDITION_DELTA_BY_STEP,
    );
  });
  it("gives negative delta when subject is below comp", () => {
    expect(conditionDelta("poor", "excellent")).toBe(
      -3 * CONDITION_DELTA_BY_STEP,
    );
  });
  it("treats unknown as zero-offset from good", () => {
    expect(conditionDelta("good", "unknown")).toBe(0);
    expect(conditionDelta("unknown", "good")).toBe(0);
  });
});

describe("regionalPerSqft", () => {
  it("returns the seed value for a known AZ zip", () => {
    expect(regionalPerSqft("85018")).toBe(AZ_REGIONAL_PER_SQFT["85018"]);
    expect(regionalPerSqft("85255")).toBe(AZ_REGIONAL_PER_SQFT["85255"]);
  });
  it("handles zips with whitespace and 9-digit variants", () => {
    expect(regionalPerSqft(" 85018-1234 ")).toBe(
      AZ_REGIONAL_PER_SQFT["85018"],
    );
  });
  it("falls back to DEFAULT_PER_SQFT for unknown zips", () => {
    expect(regionalPerSqft("99999")).toBe(DEFAULT_PER_SQFT);
    expect(regionalPerSqft("")).toBe(DEFAULT_PER_SQFT);
    expect(regionalPerSqft(null)).toBe(DEFAULT_PER_SQFT);
  });
});

describe("sqftDelta", () => {
  it("uses the zip's rate to scale the sqft difference", () => {
    expect(sqftDelta(2000, 1500, "85018")).toBe(
      Math.round(500 * AZ_REGIONAL_PER_SQFT["85018"]),
    );
  });
  it("returns zero when either sqft is null", () => {
    expect(sqftDelta(null, 1500, "85018")).toBe(0);
    expect(sqftDelta(2000, null, "85018")).toBe(0);
  });
  it("uses DEFAULT_PER_SQFT for unknown zips", () => {
    expect(sqftDelta(2000, 1500, "99999")).toBe(500 * DEFAULT_PER_SQFT);
  });
});

describe("applyDeviationsImpl", () => {
  const baseSubject = {
    beds: 4,
    baths: 3,
    sqft: 2000,
    conditionAssumed: "good" as const,
    zip: "85018",
  };
  const okAssessment = {
    mlsRecordId: "m1",
    condition: "good" as const,
    notableFeatures: [],
    concerns: [],
    disclaimer: "ok",
  };

  it("applies all four deltas and produces an adjustedSoldPrice", () => {
    const result = applyDeviationsImpl({
      subject: baseSubject,
      comp: comp({ soldPrice: 500_000 }),
      compAssessment: okAssessment,
    });
    expect(result.adjustments.bedsDelta).toBe(BED_DELTA);
    expect(result.adjustments.bathsDelta).toBe(BATH_DELTA);
    expect(result.adjustments.sqftDelta).toBe(
      500 * AZ_REGIONAL_PER_SQFT["85018"],
    );
    expect(result.adjustments.conditionDelta).toBe(0);
    expect(result.adjustedSoldPrice).toBe(
      500_000 +
        result.adjustments.bedsDelta +
        result.adjustments.bathsDelta +
        result.adjustments.conditionDelta +
        result.adjustments.sqftDelta,
    );
    expect(result.kept).toBe(true);
  });

  it("drops a comp whose sqft differs by more than 40%", () => {
    const result = applyDeviationsImpl({
      subject: baseSubject,
      comp: comp({ sqft: 3500 }),
      compAssessment: okAssessment,
    });
    expect(result.kept).toBe(false);
    expect(result.dropReason).toMatch(/sqft diff/);
  });

  it("drops a comp closed more than 18 months ago", () => {
    const twoYearsAgo = new Date(
      Date.now() - 2 * 365 * 86_400_000,
    ).toISOString();
    const result = applyDeviationsImpl({
      subject: baseSubject,
      comp: comp({ closedDate: twoYearsAgo }),
      compAssessment: okAssessment,
    });
    expect(result.kept).toBe(false);
    expect(result.dropReason).toMatch(/closed > 18/);
  });

  it("passes adjustedSoldPrice=null through when the comp had no soldPrice", () => {
    const result = applyDeviationsImpl({
      subject: baseSubject,
      comp: comp({ soldPrice: null }),
      compAssessment: okAssessment,
    });
    expect(result.adjustedSoldPrice).toBeNull();
  });

  it("rolls up a condition upgrade into a positive conditionDelta", () => {
    const result = applyDeviationsImpl({
      subject: { ...baseSubject, conditionAssumed: "excellent" },
      comp: comp({}),
      compAssessment: { ...okAssessment, condition: "fair" },
    });
    expect(result.adjustments.conditionDelta).toBe(
      2 * CONDITION_DELTA_BY_STEP,
    );
  });

  it("treats unknown comp condition as a zero condition adjustment", () => {
    const result = applyDeviationsImpl({
      subject: baseSubject,
      comp: comp({}),
      compAssessment: { ...okAssessment, condition: "unknown" },
    });
    expect(result.adjustments.conditionDelta).toBe(0);
  });
});
