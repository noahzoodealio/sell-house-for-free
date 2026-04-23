import { describe, expect, it } from "vitest";

import { OfferAnalysisSchema } from "../schemas/offer-analysis";

describe("src/lib/ai/schemas/offer-analysis", () => {
  const valid = {
    counterparty: "Acme Buyer Group",
    headlinePrice: 385000,
    net: {
      estimatedCloseProceeds: 362000,
      concessions: ["3% seller credit"],
      notes: "Assumes $23k closing costs + 1% title.",
    },
    pros: [{ label: "Price", detail: "Near top of AVM range." }],
    cons: [{ label: "Inspection", detail: "14-day window is long for AZ market." }],
    vsAvm: {
      avmLow: 380000,
      avmHigh: 420000,
      positionWord: "near-low" as const,
      comment: "Just above the low end of your AVM.",
    },
    pushbacks: [
      {
        term: "Inspection period",
        suggestion: "Shorten to 7 days.",
        rationale: "Market is moving; 14 days gives the buyer too much optionality.",
      },
    ],
    friendlyTake:
      "Honestly, this is a workable offer but not great. The price is fine, but the 14-day inspection with a 3% credit asks reads like a buyer hunting for a post-inspection renegotiation. I'd counter with a 7-day inspection and no pre-emptive credit — make them find something specific before they ask for money.",
    disclaimer:
      "AI-authored offer read, not advice from a licensed real-estate professional and not from your fiduciary. Treat as input, not gospel.",
  };

  it("accepts a fully-populated payload", () => {
    const result = OfferAnalysisSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("requires a non-empty friendlyTake", () => {
    const result = OfferAnalysisSchema.safeParse({ ...valid, friendlyTake: "" });
    expect(result.success).toBe(false);
  });

  it("requires a disclaimer", () => {
    const result = OfferAnalysisSchema.safeParse({ ...valid, disclaimer: "" });
    expect(result.success).toBe(false);
  });

  it("requires at least one pro", () => {
    const result = OfferAnalysisSchema.safeParse({ ...valid, pros: [] });
    expect(result.success).toBe(false);
  });

  it("rejects invalid vsAvm.positionWord values", () => {
    const result = OfferAnalysisSchema.safeParse({
      ...valid,
      vsAvm: { ...valid.vsAvm, positionWord: "great-deal" },
    });
    expect(result.success).toBe(false);
  });

  it("accepts missing AVM range with positionWord='avm-unavailable'", () => {
    const result = OfferAnalysisSchema.safeParse({
      ...valid,
      vsAvm: {
        positionWord: "avm-unavailable" as const,
        comment: "No AVM on file yet.",
      },
    });
    expect(result.success).toBe(true);
  });
});
