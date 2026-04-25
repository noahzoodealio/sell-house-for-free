/**
 * Reference list of AZ coverage regions for the team-member roster.
 * Hardcoded here (vs. a `coverage_regions` reference table) because the
 * cadence of change is glacial + free-text breeds typos that pollute
 * the assign_next_pm matching path. Add a region by editing this file +
 * shipping a migration if any active rows need backfill.
 */

export const COVERAGE_REGIONS = [
  "phoenix-metro",
  "tucson",
  "flagstaff",
  "yuma",
  "prescott",
  "rural-az",
] as const;

export type CoverageRegion = (typeof COVERAGE_REGIONS)[number];

export function isValidCoverageRegion(value: string): value is CoverageRegion {
  return (COVERAGE_REGIONS as readonly string[]).includes(value);
}

export const COVERAGE_REGION_LABELS: Record<CoverageRegion, string> = {
  "phoenix-metro": "Phoenix metro",
  tucson: "Tucson",
  flagstaff: "Flagstaff",
  yuma: "Yuma",
  prescott: "Prescott",
  "rural-az": "Rural AZ",
};
