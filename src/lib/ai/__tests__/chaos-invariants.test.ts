import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { DocSummarySchema } from "../schemas/doc-summary";
import { OfferAnalysisSchema } from "../schemas/offer-analysis";
import { PhotoAssessmentSchema } from "../schemas/photo-assessment";
import { ValuationSchema } from "../schemas/valuation";
import { DOC_SUMMARY_DISCLAIMER } from "../prompts/pdf-reviewer";
import { OFFER_ANALYSIS_DISCLAIMER } from "../prompts/offer-analyzer";
import { PHOTO_ASSESSMENT_DISCLAIMER } from "../prompts/photo-reviewer";
import { VALUATION_DISCLAIMER } from "../prompts/comping";
import { CHAT_DISCLAIMER } from "@/app/(app)/chat/components/disclaimer-banner";
import { TRANSACTION_MANAGER_DISCLAIMER } from "../prompts/transaction-manager";

/**
 * Structural chaos + smoke invariants for the AI agent suite. These tests
 * do not require a live gateway or applied DB — they lock the invariants
 * that integration + golden tests would also catch, but do so now so a
 * regression surfaces in CI before anyone runs the live suite.
 */

describe("structural invariant: no LLM imports in deterministic math module", () => {
  it("src/lib/ai/deviations.ts imports nothing from ai / @ai-sdk/* / gateway", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/lib/ai/deviations.ts"),
      "utf8",
    );
    expect(source).not.toMatch(/from\s+["']ai["']/);
    expect(source).not.toMatch(/from\s+["']@ai-sdk\//);
    expect(source).not.toMatch(/from\s+["']@\/lib\/ai\/gateway/);
  });
});

describe("structural invariant: every artifact schema requires a disclaimer", () => {
  it("DocSummarySchema rejects empty disclaimer", () => {
    const base = {
      documentId: "11111111-1111-4111-8111-111111111111",
      originalName: "x.pdf",
      headline: "h",
      keyTerms: [{ label: "L", value: "V" }],
      concerns: [],
      citations: [],
      disclaimer: "",
    };
    expect(DocSummarySchema.safeParse(base).success).toBe(false);
  });

  it("OfferAnalysisSchema rejects empty disclaimer", () => {
    const base = {
      counterparty: "C",
      headlinePrice: 400000,
      net: { estimatedCloseProceeds: null, concessions: [], notes: "" },
      pros: [{ label: "p", detail: "d" }],
      cons: [],
      vsAvm: { positionWord: "mid" as const, comment: "mid" },
      pushbacks: [],
      friendlyTake: "x".repeat(40),
      disclaimer: "",
    };
    expect(OfferAnalysisSchema.safeParse(base).success).toBe(false);
  });

  it("PhotoAssessmentSchema rejects empty disclaimer", () => {
    expect(
      PhotoAssessmentSchema.safeParse({
        mlsRecordId: "m1",
        condition: "good",
        notableFeatures: [],
        concerns: [],
        disclaimer: "",
      }).success,
    ).toBe(false);
  });

  it("ValuationSchema rejects empty disclaimer", () => {
    expect(
      ValuationSchema.safeParse({
        low: 0,
        mid: 0,
        high: 0,
        confidence: 0,
        methodology: {
          deviationsUsed: {},
          candidatePoolSize: 0,
          pickedCompsCount: 0,
          discardedCompsCount: 0,
        },
        pickedComps: [],
        discardedComps: [],
        disclaimer: "",
      }).success,
    ).toBe(false);
  });
});

describe("structural invariant: disclaimer strings contain all three claims", () => {
  it.each([
    ["DOC_SUMMARY_DISCLAIMER", DOC_SUMMARY_DISCLAIMER],
    ["OFFER_ANALYSIS_DISCLAIMER", OFFER_ANALYSIS_DISCLAIMER],
    ["PHOTO_ASSESSMENT_DISCLAIMER", PHOTO_ASSESSMENT_DISCLAIMER],
    ["VALUATION_DISCLAIMER", VALUATION_DISCLAIMER],
    ["CHAT_DISCLAIMER", CHAT_DISCLAIMER],
    ["TRANSACTION_MANAGER_DISCLAIMER", TRANSACTION_MANAGER_DISCLAIMER],
  ])(
    "%s mentions AI, not-licensed-real-estate-professional, not-fiduciary",
    (_name, text) => {
      expect(text).toMatch(/AI/);
      expect(text).toMatch(/licensed real-estate professional/i);
      expect(text).toMatch(/fiduciary/i);
    },
  );
});

describe("structural invariant: friendlyTake required on OfferAnalysis", () => {
  it("schema rejects empty friendlyTake even if everything else is valid", () => {
    const base = {
      counterparty: "C",
      headlinePrice: 400000,
      net: { estimatedCloseProceeds: 380000, concessions: [], notes: "" },
      pros: [{ label: "p", detail: "d" }],
      cons: [],
      vsAvm: { positionWord: "mid" as const, comment: "mid" },
      pushbacks: [],
      friendlyTake: "",
      disclaimer: OFFER_ANALYSIS_DISCLAIMER,
    };
    expect(OfferAnalysisSchema.safeParse(base).success).toBe(false);
  });
});

describe("structural invariant: valuation sanity on zero-kept-comps path", () => {
  it("aggregateValuationImpl returns an empty valuation shape without calling the gateway", async () => {
    const { aggregateValuationImpl } = await import(
      "../tools/aggregate-valuation"
    );
    const v = await aggregateValuationImpl({
      subject: {
        sessionId: "s1",
        subjectAddress: {
          street1: "100 Main",
          city: "Phoenix",
          state: "AZ",
          zip: "85018",
        },
        subjectAvm: {},
      },
      adjusted: [],
      photoAssessments: [],
    });
    expect(v.low).toBe(0);
    expect(v.mid).toBe(0);
    expect(v.high).toBe(0);
    expect(v.confidence).toBe(0);
    expect(v.methodology.pickedCompsCount).toBe(0);
    expect(v.disclaimer).toBe(VALUATION_DISCLAIMER);
  });
});

describe("structural invariant: deviations table surface", () => {
  it("AZ_REGIONAL_PER_SQFT contains at least 70 zip entries and is valid shape", async () => {
    const { AZ_REGIONAL_PER_SQFT } = await import("../deviations");
    const entries = Object.entries(AZ_REGIONAL_PER_SQFT);
    expect(entries.length).toBeGreaterThanOrEqual(70);
    for (const [zip, rate] of entries) {
      expect(zip).toMatch(/^\d{5}$/);
      expect(rate).toBeGreaterThan(100);
      expect(rate).toBeLessThan(1000);
    }
  });
});
