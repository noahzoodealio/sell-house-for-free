import "server-only";

/**
 * Deterministic comparable-sales adjustment math. NO LLM imports,
 * NO network calls. This module is the invariant backbone of the
 * comping pipeline: the LLM's role is strictly to assess photos
 * (S17) and roll up the adjusted comps into low/mid/high (S19);
 * the dollar-per-lever math lives here so it can't hallucinate.
 *
 * A grep check in S23's chaos suite asserts this file imports
 * nothing from `@ai-sdk/*` or `ai` or `@/lib/ai/gateway` — the
 * boundary is structural, not advisory.
 */

import type { AdjustedComp, HydratedComp, PhotoAssessment } from "@/lib/ai/workflows/comp-run";

export const BED_DELTA = 15_000;
export const BATH_DELTA = 8_000;
export const CONDITION_DELTA_BY_STEP = 12_000;

export const CONDITION_SCORE: Record<
  PhotoAssessment["condition"],
  number | null
> = {
  poor: -2,
  fair: -1,
  unknown: 0,
  good: 0,
  excellent: 1,
};

/** Arizona zip-code → $/sqft baseline. Seed values; revisit quarterly
 * against MLS median-sold-price-per-sqft. Unknown zips fall back to 250.
 */
export const AZ_REGIONAL_PER_SQFT: Record<string, number> = {
  // Phoenix Metro
  "85003": 470,
  "85004": 520,
  "85006": 380,
  "85007": 420,
  "85008": 310,
  "85013": 390,
  "85014": 360,
  "85015": 320,
  "85016": 430,
  "85018": 560,
  "85020": 310,
  "85021": 300,
  "85022": 290,
  "85023": 280,
  "85024": 300,
  "85028": 390,
  "85029": 270,
  "85031": 240,
  "85032": 290,
  "85033": 230,
  "85034": 260,
  "85040": 240,
  "85041": 250,
  "85042": 260,
  "85044": 290,
  "85050": 320,
  "85051": 240,
  "85053": 260,
  "85054": 400,
  // Scottsdale
  "85250": 480,
  "85251": 540,
  "85254": 440,
  "85255": 520,
  "85257": 410,
  "85258": 510,
  "85259": 560,
  "85260": 430,
  "85262": 580,
  "85266": 600,
  "85268": 420,
  // Tempe / Mesa / Chandler
  "85201": 330,
  "85202": 310,
  "85203": 340,
  "85204": 290,
  "85205": 310,
  "85206": 290,
  "85208": 270,
  "85209": 300,
  "85210": 290,
  "85212": 320,
  "85213": 320,
  "85215": 330,
  "85224": 330,
  "85225": 310,
  "85226": 340,
  "85248": 360,
  "85249": 340,
  // Gilbert / Queen Creek
  "85233": 330,
  "85234": 340,
  "85295": 350,
  "85296": 340,
  "85297": 340,
  "85298": 320,
  "85140": 270,
  "85142": 290,
  // Glendale / Peoria / Surprise
  "85301": 230,
  "85302": 250,
  "85303": 250,
  "85304": 260,
  "85305": 290,
  "85306": 270,
  "85308": 300,
  "85310": 310,
  "85335": 260,
  "85338": 280,
  "85345": 250,
  "85351": 250,
  "85353": 230,
  "85355": 330,
  "85374": 270,
  "85379": 280,
  "85381": 280,
  "85382": 290,
  "85383": 340,
  "85387": 300,
  "85388": 300,
  // Tucson
  "85701": 220,
  "85704": 260,
  "85705": 180,
  "85710": 190,
  "85711": 180,
  "85712": 190,
  "85718": 320,
  "85719": 240,
  "85742": 260,
  "85747": 230,
  "85748": 240,
  "85750": 270,
  "85755": 310,
  // Flagstaff / Sedona / Prescott
  "86001": 420,
  "86004": 360,
  "86336": 540,
  "86301": 350,
  "86305": 400,
};

export const DEFAULT_PER_SQFT = 250;

export function regionalPerSqft(zip: string | null | undefined): number {
  if (!zip) return DEFAULT_PER_SQFT;
  const normalized = zip.trim().slice(0, 5);
  return AZ_REGIONAL_PER_SQFT[normalized] ?? DEFAULT_PER_SQFT;
}

export interface DeviationSubject {
  beds: number | null;
  baths: number | null;
  sqft: number | null;
  conditionAssumed: PhotoAssessment["condition"];
  zip?: string | null;
}

export interface DeviationInputs {
  subject: DeviationSubject;
  comp: HydratedComp;
  compAssessment: PhotoAssessment;
}

export function bedsDelta(
  subjectBeds: number | null,
  compBeds: number | null,
): number {
  if (subjectBeds == null || compBeds == null) return 0;
  return (subjectBeds - compBeds) * BED_DELTA;
}

export function bathsDelta(
  subjectBaths: number | null,
  compBaths: number | null,
): number {
  if (subjectBaths == null || compBaths == null) return 0;
  return Math.round((subjectBaths - compBaths) * BATH_DELTA);
}

export function conditionDelta(
  subject: PhotoAssessment["condition"],
  comp: PhotoAssessment["condition"],
): number {
  const subjScore = CONDITION_SCORE[subject];
  const compScore = CONDITION_SCORE[comp];
  if (subjScore === null || compScore === null) return 0;
  return (subjScore - compScore) * CONDITION_DELTA_BY_STEP;
}

export function sqftDelta(
  subjectSqft: number | null,
  compSqft: number | null,
  zip: string | null | undefined,
): number {
  if (subjectSqft == null || compSqft == null) return 0;
  const rate = regionalPerSqft(zip);
  return Math.round((subjectSqft - compSqft) * rate);
}

export function applyDeviationsImpl(inputs: DeviationInputs): AdjustedComp {
  const { subject, comp, compAssessment } = inputs;

  const bDelta = bedsDelta(subject.beds, comp.beds);
  const baDelta = bathsDelta(subject.baths, comp.baths);
  const cDelta = conditionDelta(subject.conditionAssumed, compAssessment.condition);
  const sDelta = sqftDelta(subject.sqft, comp.sqft, subject.zip);
  const totalDelta = bDelta + baDelta + cDelta + sDelta;

  const adjustedSoldPrice =
    comp.soldPrice != null ? comp.soldPrice + totalDelta : null;

  const tooDissimilar =
    subject.sqft != null &&
    comp.sqft != null &&
    Math.abs(subject.sqft - comp.sqft) / subject.sqft > 0.4;

  const staleComp = comp.closedDate
    ? Date.now() - new Date(comp.closedDate).getTime() > 365 * 86_400_000 * 1.5
    : false;

  const kept = !tooDissimilar && !staleComp;
  const dropReason = tooDissimilar
    ? "sqft diff > 40%"
    : staleComp
      ? "closed > 18 months ago"
      : undefined;

  return {
    ...comp,
    adjustments: {
      bedsDelta: bDelta,
      bathsDelta: baDelta,
      conditionDelta: cDelta,
      sqftDelta: sDelta,
      totalDelta,
    },
    adjustedSoldPrice,
    kept,
    dropReason,
  };
}
