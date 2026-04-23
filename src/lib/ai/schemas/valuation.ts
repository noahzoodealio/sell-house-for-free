import { z } from "zod";

export const ValuationMethodologySchema = z.object({
  deviationsUsed: z.record(z.string(), z.number()),
  candidatePoolSize: z.number().int().nonnegative(),
  pickedCompsCount: z.number().int().nonnegative(),
  discardedCompsCount: z.number().int().nonnegative(),
  rubricNotes: z.string().optional(),
});

export const PickedCompSchema = z.object({
  mlsRecordId: z.string().min(1),
  address: z.string().min(1),
  soldPrice: z.number().nullable(),
  adjustedSoldPrice: z.number().nullable(),
  totalDelta: z.number(),
  condition: z.enum(["poor", "fair", "good", "excellent", "unknown"]),
  whyThisComp: z.string().min(1),
});

export const DiscardedCompSchema = z.object({
  mlsRecordId: z.string().min(1),
  address: z.string().min(1),
  reason: z.string().min(1),
});

export const ValuationSchema = z.object({
  low: z.number().nonnegative(),
  mid: z.number().nonnegative(),
  high: z.number().nonnegative(),
  confidence: z.number().min(0).max(1),
  methodology: ValuationMethodologySchema,
  pickedComps: z.array(PickedCompSchema),
  discardedComps: z.array(DiscardedCompSchema),
  disclaimer: z.string().min(1),
});

export type Valuation = z.infer<typeof ValuationSchema>;

/**
 * Pure sanity-check confidence score. Independent of the model's
 * self-reported confidence so S23 chaos tests can catch drift
 * ("model thinks 0.9, rubric says 0.3 -> escalate to pm").
 */
export function computeRubricConfidence(input: {
  pickedCount: number;
  discardedCount: number;
  sqftSpreadPct?: number;
  hasAvmMatch?: boolean;
}): number {
  let score = 0;
  score += Math.min(input.pickedCount, 6) / 6; // up to 1.0 from comp count
  const total = input.pickedCount + input.discardedCount;
  if (total > 0) {
    score += (input.pickedCount / total) * 0.5; // keep-rate contribution
  }
  if (input.sqftSpreadPct != null) {
    score += Math.max(0, 1 - input.sqftSpreadPct / 0.4) * 0.5;
  }
  if (input.hasAvmMatch) score += 0.5;

  const max = 2.5;
  return Math.max(0, Math.min(1, score / max));
}
