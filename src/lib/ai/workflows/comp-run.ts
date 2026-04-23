import "server-only";

/**
 * comp-run — durable comping pipeline.
 *
 * Six-step pipeline per architecture §4.5:
 *   1. find_comps       — search MLS for candidate comps near the subject
 *   2. hydrate          — fetch details + images per candidate (parallel)
 *   3. review_photos    — Claude vision pass per comp (parallel; S17)
 *   4. apply_deviations — deterministic bed/bath/condition/sqft math (S18)
 *   5. aggregate        — Opus judge rolls up to low/mid/high (S19)
 *   6. persist          — write comp_report artifact + resolve start_comp_job
 *
 * This file lands the skeleton for S16 with steps 1-2 implemented and
 * 3-6 as identity pass-throughs. S17 / S18 / S19 replace the bodies of
 * steps 3-5 without touching the step graph.
 *
 * WDK wiring: the `workflow` package uses directive-driven compilation
 * (function-level "use workflow" / "use step" markers) + the AI_WORKFLOW_
 * QUEUE_KEY env for queue auth. The workflow runtime is not yet enabled
 * on this project's Vercel deployment — S20 will opt in via `vercel
 * workflows enable` and flip the `start_comp_job` tool from an in-process
 * fallback to workflow.trigger(). Until then, this module exposes the
 * pipeline as a plain async function so tests and the fallback path can
 * exercise it end-to-end.
 */

import type { AddressFields } from "@/lib/seller-form/types";
import { searchByAddress, getImages } from "@/lib/enrichment/mls-client";
import type { PropertySearchResultDto } from "@/lib/enrichment/types";

export interface CompRunInput {
  sessionId: string;
  subjectAddress: AddressFields;
  subjectAvm?: { low?: number; high?: number };
}

export interface CandidateComp {
  mlsRecordId: string;
  address: string;
  soldPrice: number | null;
  closedDate: string | null;
  beds: number | null;
  baths: number | null;
  sqft: number | null;
  distanceMiles: number | null;
}

export interface HydratedComp extends CandidateComp {
  photoUrls: string[];
  listingRaw: PropertySearchResultDto;
}

export interface PhotoAssessment {
  mlsRecordId: string;
  condition: "poor" | "fair" | "good" | "excellent" | "unknown";
  notableFeatures: string[];
  concerns: string[];
  disclaimer: string;
}

export interface AdjustedComp extends HydratedComp {
  adjustments: {
    bedsDelta: number;
    bathsDelta: number;
    conditionDelta: number;
    sqftDelta: number;
    totalDelta: number;
  };
  adjustedSoldPrice: number | null;
  kept: boolean;
  dropReason?: string;
}

export interface Valuation {
  low: number;
  mid: number;
  high: number;
  confidence: number;
  methodology: {
    deviationsUsed: Record<string, number>;
    candidatePoolSize: number;
    pickedCompsCount: number;
    discardedCompsCount: number;
  };
  pickedComps: AdjustedComp[];
  discardedComps: AdjustedComp[];
  disclaimer: string;
}

export interface CompRunResult {
  candidates: CandidateComp[];
  hydrated: HydratedComp[];
  photoAssessments: PhotoAssessment[];
  adjusted: AdjustedComp[];
  valuation: Valuation | null;
  persistedArtifactId: string | null;
}

// ---------------------------------------------------------------------------
// Step 1 — find_comps

function computeBaths(
  listing: PropertySearchResultDto,
): number | null {
  const full = listing.bathroomsFull ?? 0;
  const half = listing.bathroomsHalf ?? 0;
  const total = full + half * 0.5;
  return total > 0 ? total : null;
}

export async function findCompsStep(
  input: CompRunInput,
): Promise<CandidateComp[]> {
  const match = await searchByAddress(input.subjectAddress);
  if (!match?.history) return [];

  const subject = match.match;
  const candidates: CandidateComp[] = [];
  for (const listing of match.history) {
    if (listing.mlsRecordId === subject.mlsRecordId) continue;
    if (!listing.mlsRecordId || !listing.latestListingPrice) continue;
    candidates.push({
      mlsRecordId: listing.mlsRecordId,
      address:
        listing.propertyAddressFull ??
        `${listing.propertyAddressHouseNumber ?? ""} ${
          listing.propertyAddressStreetName ?? ""
        }`.trim(),
      soldPrice: listing.latestListingPrice ?? null,
      closedDate: listing.statusChangeDate ?? null,
      beds: listing.bedroomsTotal ?? null,
      baths: computeBaths(listing),
      sqft: listing.livingAreaSquareFeet ?? null,
      distanceMiles: null,
    });
    if (candidates.length >= 8) break;
  }
  return candidates;
}

// ---------------------------------------------------------------------------
// Step 2 — hydrate (parallel per candidate)

export async function hydrateStep(
  candidates: CandidateComp[],
): Promise<HydratedComp[]> {
  const results = await Promise.all(
    candidates.map(async (c): Promise<HydratedComp | null> => {
      try {
        const images = await getImages(c.mlsRecordId);
        const urls = (images ?? [])
          .slice(0, 6)
          .map((img) => img.url)
          .filter((u): u is string => typeof u === "string" && u.length > 0);
        return {
          ...c,
          photoUrls: urls,
          listingRaw: {} as PropertySearchResultDto,
        };
      } catch {
        return null;
      }
    }),
  );
  return results.filter((x): x is HydratedComp => x !== null);
}

// ---------------------------------------------------------------------------
// Steps 3-6 — identity pass-throughs in S16 scope; S17-S20 replace bodies.

export async function reviewPhotosStep(
  hydrated: HydratedComp[],
): Promise<PhotoAssessment[]> {
  // S17 replaces this body with Claude vision.
  return hydrated.map((h) => ({
    mlsRecordId: h.mlsRecordId,
    condition: "unknown" as const,
    notableFeatures: [],
    concerns: [],
    disclaimer:
      "AI photo assessment pending — S17 lights up the vision pass.",
  }));
}

export async function applyDeviationsStep(
  _input: CompRunInput,
  hydrated: HydratedComp[],
  _assessments: PhotoAssessment[],
): Promise<AdjustedComp[]> {
  // S18 replaces this body with the deterministic math.
  return hydrated.map((h) => ({
    ...h,
    adjustments: {
      bedsDelta: 0,
      bathsDelta: 0,
      conditionDelta: 0,
      sqftDelta: 0,
      totalDelta: 0,
    },
    adjustedSoldPrice: h.soldPrice,
    kept: true,
  }));
}

export async function aggregateStep(
  _input: CompRunInput,
  _adjusted: AdjustedComp[],
): Promise<Valuation | null> {
  // S19 replaces this body with the Opus judge + ValuationSchema.
  return null;
}

export async function persistStep(
  _sessionId: string,
  _valuation: Valuation | null,
): Promise<string | null> {
  // S20 replaces this body with the comp_report artifact write + workflow
  // status update.
  return null;
}

// ---------------------------------------------------------------------------
// Entry point

export async function runCompPipeline(
  input: CompRunInput,
): Promise<CompRunResult> {
  const candidates = await findCompsStep(input);
  const hydrated = await hydrateStep(candidates);
  const [photoAssessments, adjusted] = await Promise.all([
    reviewPhotosStep(hydrated),
    applyDeviationsStep(input, hydrated, []),
  ]);
  const adjustedWithAssessments = await applyDeviationsStep(
    input,
    hydrated,
    photoAssessments,
  );
  const valuation = await aggregateStep(input, adjustedWithAssessments);
  const persistedArtifactId = await persistStep(input.sessionId, valuation);

  return {
    candidates,
    hydrated,
    photoAssessments,
    adjusted: adjustedWithAssessments,
    valuation,
    persistedArtifactId,
  };
}
