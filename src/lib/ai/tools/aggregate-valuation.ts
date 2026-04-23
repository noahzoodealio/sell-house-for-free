import "server-only";

import { generateObject } from "ai";

import { gateway, models } from "@/lib/ai/gateway";
import {
  BATH_DELTA,
  BED_DELTA,
  CONDITION_DELTA_BY_STEP,
} from "@/lib/ai/deviations";
import {
  VALUATION_DISCLAIMER,
  compingPrompt,
} from "@/lib/ai/prompts/comping";
import {
  ValuationSchema,
  computeRubricConfidence,
  type Valuation,
} from "@/lib/ai/schemas/valuation";
import type {
  AdjustedComp,
  CompRunInput,
  PhotoAssessment,
} from "@/lib/ai/workflows/comp-run";

export interface AggregateValuationInput {
  subject: CompRunInput;
  adjusted: AdjustedComp[];
  photoAssessments: PhotoAssessment[];
}

export async function aggregateValuationImpl(
  input: AggregateValuationInput,
): Promise<Valuation> {
  const candidatePool = input.adjusted.length;
  const kept = input.adjusted.filter((c) => c.kept && c.adjustedSoldPrice != null);
  const discarded = input.adjusted.filter((c) => !c.kept || c.adjustedSoldPrice == null);

  if (kept.length === 0) {
    const empty: Valuation = {
      low: 0,
      mid: 0,
      high: 0,
      confidence: 0,
      methodology: {
        deviationsUsed: {
          BED_DELTA,
          BATH_DELTA,
          CONDITION_DELTA_BY_STEP,
        },
        candidatePoolSize: candidatePool,
        pickedCompsCount: 0,
        discardedCompsCount: discarded.length,
        rubricNotes: "Zero kept comps — no valuation possible.",
      },
      pickedComps: [],
      discardedComps: discarded.map((c) => ({
        mlsRecordId: c.mlsRecordId,
        address: c.address,
        reason: c.dropReason ?? "ineligible",
      })),
      disclaimer: VALUATION_DISCLAIMER,
    };
    return empty;
  }

  const compSummary = input.adjusted.map((c) => {
    const pa = input.photoAssessments.find(
      (p) => p.mlsRecordId === c.mlsRecordId,
    );
    return {
      mlsRecordId: c.mlsRecordId,
      address: c.address,
      soldPrice: c.soldPrice,
      adjustedSoldPrice: c.adjustedSoldPrice,
      totalDelta: c.adjustments.totalDelta,
      closedDate: c.closedDate,
      beds: c.beds,
      baths: c.baths,
      sqft: c.sqft,
      condition: pa?.condition ?? "unknown",
      kept: c.kept,
      dropReason: c.dropReason,
    };
  });

  const { object } = await generateObject({
    model: gateway(models.judge),
    schema: ValuationSchema,
    system: compingPrompt,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text:
              `Subject: ${JSON.stringify(input.subject.subjectAddress)}. ` +
              `Seller AVM: ${JSON.stringify(input.subject.subjectAvm ?? null)}. ` +
              `Adjusted comps: ${JSON.stringify(compSummary)}.`,
          },
        ],
      },
    ],
  });

  // Belt-and-suspenders: drop any picked comp the judge kept but that lost its
  // adjustedSoldPrice during the round-trip.
  const pickedClean = object.pickedComps.filter(
    (p) => p.adjustedSoldPrice != null,
  );

  const sqftSpreadPct = (() => {
    const subjectSqft = kept.find((k) => k.sqft != null)?.sqft;
    const sqfts = kept
      .map((k) => k.sqft)
      .filter((v): v is number => typeof v === "number");
    if (!subjectSqft || sqfts.length === 0) return undefined;
    const maxDiff = Math.max(
      ...sqfts.map((s) => Math.abs(s - subjectSqft) / subjectSqft),
    );
    return maxDiff;
  })();

  const rubricConfidence = computeRubricConfidence({
    pickedCount: pickedClean.length,
    discardedCount: object.discardedComps.length,
    sqftSpreadPct,
    hasAvmMatch:
      input.subject.subjectAvm?.low != null &&
      input.subject.subjectAvm?.high != null &&
      input.subject.subjectAvm.low <= object.high &&
      input.subject.subjectAvm.high >= object.low,
  });

  return {
    ...object,
    pickedComps: pickedClean,
    confidence: Math.min(object.confidence ?? 0, rubricConfidence),
    disclaimer: object.disclaimer || VALUATION_DISCLAIMER,
  };
}
