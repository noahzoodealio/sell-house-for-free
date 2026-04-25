export const HANDOFF_REASONS = [
  "vacation",
  "expertise_mismatch",
  "coverage_region_gap",
  "seller_request",
  "performance_issue",
  "other",
] as const;
export type HandoffReason = (typeof HANDOFF_REASONS)[number];

export interface CandidateTeamMember {
  id: string;
  fullName: string;
  authUserId: string | null;
  active: boolean;
  capacityCurrent: number;
  capacityMax: number;
  coverageRegions: string[];
  isAdmin: boolean;
}
