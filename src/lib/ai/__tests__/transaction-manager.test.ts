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
});
