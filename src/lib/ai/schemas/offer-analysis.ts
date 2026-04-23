import { z } from "zod";

export const OfferProConSchema = z.object({
  label: z.string().min(1),
  detail: z.string().min(1),
});

export const PushbackSchema = z.object({
  term: z.string().min(1),
  suggestion: z.string().min(1),
  rationale: z.string().min(1),
});

export const OfferAnalysisSchema = z.object({
  documentId: z.string().uuid().optional(),
  counterparty: z.string().min(1),
  headlinePrice: z.number().nonnegative(),
  net: z.object({
    estimatedCloseProceeds: z.number().nullable(),
    concessions: z.array(z.string()).default([]),
    notes: z.string().optional(),
  }),
  pros: z.array(OfferProConSchema).min(1),
  cons: z.array(OfferProConSchema),
  vsAvm: z.object({
    avmLow: z.number().optional(),
    avmHigh: z.number().optional(),
    positionWord: z.enum([
      "below-low",
      "near-low",
      "mid",
      "near-high",
      "above-high",
      "avm-unavailable",
    ]),
    comment: z.string().min(1),
  }),
  pushbacks: z.array(PushbackSchema),
  friendlyTake: z
    .string()
    .min(1)
    .describe(
      "One-paragraph opinionated take. Product value is in having a take; must not be hedged boilerplate.",
    ),
  disclaimer: z.string().min(1),
});

export type OfferAnalysis = z.infer<typeof OfferAnalysisSchema>;
