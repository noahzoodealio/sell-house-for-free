import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/server";

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

export async function listRoster(args: {
  includeInactive: boolean;
}): Promise<RosterRow[]> {
  const supabase = getSupabaseAdmin();
  let query = supabase
    .from("team_members")
    .select(
      "id, auth_user_id, first_name, last_name, email, phone, active, role, coverage_regions, capacity_active_current, capacity_active_max, last_login_at, created_at",
    )
    .order("active", { ascending: false })
    .order("first_name", { ascending: true });
  if (!args.includeInactive) {
    query = query.eq("active", true);
  }
  const { data, error } = await query;
  if (error || !data) return [];
  return data.map((row) => {
    const r = row as {
      id: string;
      auth_user_id: string | null;
      first_name: string;
      last_name: string;
      email: string;
      phone: string | null;
      active: boolean;
      role: string[] | null;
      coverage_regions: string[] | null;
      capacity_active_current: number;
      capacity_active_max: number;
      last_login_at: string | null;
      created_at: string;
    };
    return {
      id: r.id,
      authUserId: r.auth_user_id,
      firstName: r.first_name,
      lastName: r.last_name,
      email: r.email,
      phone: r.phone,
      active: r.active,
      role: ((r.role ?? []) as string[]).filter((v): v is RoleBadge =>
        (VALID_ROLES as readonly string[]).includes(v),
      ),
      coverageRegions: r.coverage_regions ?? [],
      capacityActiveCurrent: r.capacity_active_current,
      capacityActiveMax: r.capacity_active_max,
      lastLoginAt: r.last_login_at,
      createdAt: r.created_at,
    };
  });
}

export async function countActiveAdmins(): Promise<number> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("team_members")
    .select("id, role, active");
  if (!data) return 0;
  return data.filter((row) => {
    const r = row as { active: boolean; role: string[] | null };
    return r.active && Array.isArray(r.role) && r.role.includes("admin");
  }).length;
}
