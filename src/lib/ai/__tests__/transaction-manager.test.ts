import { describe, expect, it } from "vitest";

import {
  TRANSACTION_MANAGER_DISCLAIMER,
  transactionManagerPrompt,
} from "../prompts/transaction-manager";

describe("src/lib/ai/prompts/transaction-manager", () => {
  it("contains the verbatim three-part disclaimer", () => {
    const prompt = transactionManagerPrompt({});
    expect(prompt).toContain(TRANSACTION_MANAGER_DISCLAIMER);
    expect(prompt).toContain("AI assistant");
    expect(prompt).toContain("not a licensed real-estate professional");
    expect(prompt).toContain("not your fiduciary");
  });

  it("is pure: same ctx produces the same string", () => {
    const ctx = { address: "123 Main", pillarHint: "cash-fast" };
    expect(transactionManagerPrompt(ctx)).toBe(transactionManagerPrompt(ctx));
  });

  it("grounds on the subject property when address is present", () => {
    const prompt = transactionManagerPrompt({
      address: "123 Main, Phoenix AZ",
      pillarHint: "cash-fast",
      enrichment: { avmLow: 380000, avmHigh: 420000 },
    });
    expect(prompt).toContain("123 Main, Phoenix AZ");
    expect(prompt).toContain("$380,000");
    expect(prompt).toContain("$420,000");
  });

  it("cues the agent to ask for the address when context is empty", () => {
    const prompt = transactionManagerPrompt({});
    expect(prompt).toMatch(/ask for it/i);
  });

  it("carries the tech-platform-not-brokerage posture", () => {
    const prompt = transactionManagerPrompt({});
    expect(prompt).toContain("tech platform, not a brokerage");
    expect(prompt).toContain("JK Realty");
    expect(prompt).toContain("knowledgeable friend");
  });

  it("forbids acting on the seller's behalf", () => {
    const prompt = transactionManagerPrompt({});
    expect(prompt).toMatch(/do not act on the homeowner's behalf/i);
  });

  it("v1 heuristics: names every live tool with a calling heuristic", () => {
    const prompt = transactionManagerPrompt({});
    expect(prompt).toContain("review_pdf");
    expect(prompt).toContain("explain_terms");
    expect(prompt).toContain("analyze_offer");
    expect(prompt).toContain("start_comp_job");
  });

  it("v1 heuristics: instructs briefer framing over card re-prose", () => {
    const prompt = transactionManagerPrompt({});
    expect(prompt).toMatch(/brief spoken framing/i);
    expect(prompt).toMatch(/don't repeat the card's contents/i);
  });

  it("v1 heuristics: surfaces tool-error envelopes verbatim", () => {
    const prompt = transactionManagerPrompt({});
    expect(prompt).toContain("tool-error");
    expect(prompt).toMatch(/surface the message verbatim/i);
  });

  // ---------------------------------------------------------------------------
  // E13-S6 — extended tool surface heuristics + cite-the-source discipline.
  // ---------------------------------------------------------------------------

  it("E13-S6: explicit cite-the-source rule", () => {
    const prompt = transactionManagerPrompt({});
    expect(prompt).toMatch(/cite the source/i);
    expect(prompt).toMatch(/no citation, no number/i);
  });

  it("E13-S6: AVM-routing rule routes valuation through start_comp_job", () => {
    const prompt = transactionManagerPrompt({});
    expect(prompt).toMatch(/avm routing/i);
    expect(prompt).toMatch(/start_comp_job/i);
    expect(prompt).toMatch(/citation only/i);
  });

  it("E13-S6: don't-invent rule on no_data / no_record / no_match", () => {
    const prompt = transactionManagerPrompt({});
    expect(prompt).toMatch(/don't invent/i);
    expect(prompt).toContain("no_data");
    expect(prompt).toContain("no_record");
    expect(prompt).toContain("no_match");
  });

  it("E13-S6: budget_exhausted canonical copy", () => {
    const prompt = transactionManagerPrompt({});
    expect(prompt).toContain("budget_exhausted");
    expect(prompt).toMatch(/data-lookup cap/i);
  });

  it("E13-S6: source-of-truth preference (V2 > local mirror; cache > fresh)", () => {
    const prompt = transactionManagerPrompt({});
    expect(prompt).toMatch(/listMyOffersV2.*listMySubmissionOffers/s);
    expect(prompt).toMatch(/getMyEnrichedProperty.*getPropertyFundamentals/s);
  });

  it("E13-S6: every E13 tool name appears in the prompt", () => {
    const prompt = transactionManagerPrompt({});
    const toolNames = [
      // E9 retrofit tools (5)
      "review_pdf",
      "explain_terms",
      "analyze_offer",
      "review_photos",
      "start_comp_job",
      // ATTOM (12)
      "getPropertyFundamentals",
      "getAttomAvm",
      "getAvmHistory",
      "getLastSale",
      "getSalesHistory",
      "getAssessmentAndTax",
      "getAssessmentHistory",
      "getRentalAvm",
      "getBuildingPermits",
      "getAreaSalesTrend",
      "getNearbySchools",
      "getHomeEquityEstimate",
      // MLS (3)
      "searchListingsByAddress",
      "getListingDetails",
      "getListingHistory",
      // Offervana (4 active + 1 stub registered separately)
      "getMyOffervanaProperty",
      "listMyOffers",
      "listMyOffersV2",
      "getOfferHistory",
      // SHF Supabase (8)
      "getMySubmission",
      "listMySubmissionOffers",
      "getMyAssignedPm",
      "listMyThreadMessages",
      "listMyDocuments",
      "getMyEnrichedProperty",
      "listMyArtifacts",
    ];
    for (const name of toolNames) {
      expect(prompt, `tool ${name} is missing from prompt`).toContain(name);
    }
  });

  it("E13-S6: prompt size stays under 8K tokens (~32K chars cushion)", () => {
    const prompt = transactionManagerPrompt({
      address: "123 Main, Phoenix AZ",
      pillarHint: "cash-fast",
      enrichment: { avmLow: 380000, avmHigh: 420000 },
    });
    // Rough proxy: ~4 chars per token. 8K tokens × 4 = 32,000 char ceiling.
    expect(prompt.length).toBeLessThan(32_000);
  });

  it("E13-S6: original three-part disclaimer still present verbatim", () => {
    const prompt = transactionManagerPrompt({});
    expect(prompt).toContain(TRANSACTION_MANAGER_DISCLAIMER);
  });
});
