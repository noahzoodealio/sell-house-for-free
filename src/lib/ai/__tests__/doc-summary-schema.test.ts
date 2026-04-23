import { describe, expect, it } from "vitest";

import { DocSummarySchema } from "../schemas/doc-summary";

describe("src/lib/ai/schemas/doc-summary", () => {
  const validPayload = {
    documentId: "11111111-1111-4111-8111-111111111111",
    originalName: "offer.pdf",
    headline: "Purchase agreement from Acme Buyer Group, $385k, 30-day close",
    keyTerms: [
      { label: "Price", value: "$385,000", pageRef: 1 },
      { label: "Close date", value: "2026-05-30", pageRef: 2 },
    ],
    concerns: [
      { severity: "caution" as const, note: "Short inspection window", pageRef: 3 },
    ],
    citations: [{ pageRef: 1, excerpt: "Buyer shall pay $385,000 at close" }],
    disclaimer:
      "AI-authored review, not advice from a licensed real-estate professional and not from your fiduciary. Treat as input, not gospel.",
  };

  it("accepts a fully-populated payload", () => {
    const result = DocSummarySchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it("rejects an empty disclaimer", () => {
    const result = DocSummarySchema.safeParse({
      ...validPayload,
      disclaimer: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a missing disclaimer", () => {
    const payload: Record<string, unknown> = { ...validPayload };
    delete payload.disclaimer;
    const result = DocSummarySchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  it("requires at least one keyTerm", () => {
    const result = DocSummarySchema.safeParse({
      ...validPayload,
      keyTerms: [],
    });
    expect(result.success).toBe(false);
  });

  it("accepts an empty concerns array", () => {
    const result = DocSummarySchema.safeParse({
      ...validPayload,
      concerns: [],
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid severity values", () => {
    const result = DocSummarySchema.safeParse({
      ...validPayload,
      concerns: [{ severity: "danger", note: "nope" }],
    });
    expect(result.success).toBe(false);
  });
});
