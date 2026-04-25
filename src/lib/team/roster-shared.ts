export const VALID_ROLES = ["pm", "tc", "agent", "admin"] as const;
export type RoleBadge = (typeof VALID_ROLES)[number];

export interface RosterRow {
  id: string;
  authUserId: string | null;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  active: boolean;
  role: RoleBadge[];
  coverageRegions: string[];
  capacityActiveCurrent: number;
  capacityActiveMax: number;
  lastLoginAt: string | null;
  createdAt: string;
}
