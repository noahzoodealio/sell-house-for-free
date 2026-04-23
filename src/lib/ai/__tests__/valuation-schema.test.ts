import { describe, expect, it } from "vitest";

import {
  ValuationSchema,
  computeRubricConfidence,
} from "../schemas/valuation";

describe("ValuationSchema", () => {
  const valid = {
    low: 380_000,
    mid: 400_000,
    high: 420_000,
    confidence: 0.72,
    methodology: {
      deviationsUsed: { BED_DELTA: 15000, BATH_DELTA: 8000 },
      candidatePoolSize: 6,
      pickedCompsCount: 4,
      discardedCompsCount: 2,
      rubricNotes: "Tight sqft band + 3 recent closes.",
    },
    pickedComps: [
      {
        mlsRecordId: "m1",
        address: "123 Main",
        soldPrice: 395_000,
        adjustedSoldPrice: 405_000,
        totalDelta: 10_000,
        condition: "good" as const,
        whyThisComp: "Matching beds/baths, 1.2 mi, closed 4 months ago.",
      },
    ],
    discardedComps: [
      { mlsRecordId: "m2", address: "999 Other", reason: "closed > 18mo" },
    ],
    disclaimer:
      "AI-authored valuation, not an appraisal. Not advice from a licensed real-estate professional or from your fiduciary. Treat as input, not gospel.",
  };

  it("accepts a full payload", () => {
    expect(ValuationSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects empty disclaimer", () => {
    expect(
      ValuationSchema.safeParse({ ...valid, disclaimer: "" }).success,
    ).toBe(false);
  });

  it("rejects confidence outside [0,1]", () => {
    expect(ValuationSchema.safeParse({ ...valid, confidence: 1.2 }).success).toBe(
      false,
    );
    expect(ValuationSchema.safeParse({ ...valid, confidence: -0.1 }).success).toBe(
      false,
    );
  });

  it("rejects negative low/mid/high", () => {
    expect(ValuationSchema.safeParse({ ...valid, low: -1 }).success).toBe(false);
  });
});

describe("computeRubricConfidence", () => {
  it("returns 0 for zero picked comps", () => {
    expect(computeRubricConfidence({ pickedCount: 0, discardedCount: 0 })).toBeCloseTo(
      0,
      2,
    );
  });

  it("rewards higher picked counts and AVM match", () => {
    const low = computeRubricConfidence({ pickedCount: 2, discardedCount: 4 });
    const high = computeRubricConfidence({
      pickedCount: 6,
      discardedCount: 0,
      hasAvmMatch: true,
      sqftSpreadPct: 0.05,
    });
    expect(high).toBeGreaterThan(low);
  });

  it("clamps to [0, 1]", () => {
    const v = computeRubricConfidence({
      pickedCount: 100,
      discardedCount: 0,
      hasAvmMatch: true,
      sqftSpreadPct: 0,
    });
    expect(v).toBeLessThanOrEqual(1);
    expect(v).toBeGreaterThan(0);
  });
});
