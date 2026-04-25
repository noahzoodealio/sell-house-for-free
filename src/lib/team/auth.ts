import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/server";

/**
 * Team-portal auth helpers. Roster check + auth_user_id backfill +
 * activity audit. Used by both the /team/login server action and the
 * /team/auth/callback Route Handler.
 *
 * The roster check is done with the service-role client because RLS on
 * team_members is default-deny (E6-S1) and team_members.auth_user_id may
 * not yet be set — the row predates the auth.users creation by design.
 */

export type TeamMemberLookup = {
  id: string;
  email: string;
  active: boolean;
  authUserId: string | null;
  isAdmin: boolean;
};

export async function findTeamMemberByEmail(
  email: string,
): Promise<TeamMemberLookup | null> {
  const supabase = getSupabaseAdmin();
  const normalized = email.trim().toLowerCase();
  const { data } = await supabase
    .from("team_members")
    .select("id, email, active, auth_user_id, role")
    .eq("active", true)
    .ilike("email", normalized)
    .limit(1)
    .maybeSingle();

  if (!data) return null;
  const row = data as {
    id: string;
    email: string;
    active: boolean;
    auth_user_id: string | null;
    role: string[] | null;
  };
  return {
    id: row.id,
    email: row.email,
    active: row.active,
    authUserId: row.auth_user_id,
    isAdmin: Array.isArray(row.role) && row.role.includes("admin"),
  };
}

export async function findTeamMemberByAuthUserId(
  authUserId: string,
): Promise<TeamMemberLookup | null> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("team_members")
    .select("id, email, active, auth_user_id, role")
    .eq("auth_user_id", authUserId)
    .limit(1)
    .maybeSingle();

  if (!data) return null;
  const row = data as {
    id: string;
    email: string;
    active: boolean;
    auth_user_id: string | null;
    role: string[] | null;
  };
  return {
    id: row.id,
    email: row.email,
    active: row.active,
    authUserId: row.auth_user_id,
    isAdmin: Array.isArray(row.role) && row.role.includes("admin"),
  };
}

/**
 * Backfill team_members.auth_user_id from auth.users.id on first login.
 * Idempotent — calling with the same pair is a no-op. Keyed on the
 * lowercased email so the team_members row created via S9 admin roster
 * (which inserts with email but no auth_user_id) gets linked the first
 * time the team member clicks their magic link.
 */
export async function linkTeamMemberToAuthUser(
  email: string,
  authUserId: string,
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const normalized = email.trim().toLowerCase();
  await supabase
    .from("team_members")
    .update({ auth_user_id: authUserId, updated_at: new Date().toISOString() })
    .ilike("email", normalized)
    .is("auth_user_id", null);
}

export type TeamActivityLoginEvent = {
  type: "login" | "login_rejected_inactive";
  authUserId: string;
  ipHash?: string;
  userAgent?: string;
};

export async function recordTeamLoginEvent(
  event: TeamActivityLoginEvent,
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const trimmedUa = event.userAgent
    ? event.userAgent.slice(0, 200)
    : undefined;
  await supabase.from("team_activity_events").insert({
    submission_id: null,
    team_user_id: event.authUserId,
    event_type: event.type,
    event_data: {
      ip_hash: event.ipHash ?? null,
      user_agent: trimmedUa ?? null,
    },
  });
  if (event.type === "login") {
    await supabase
      .from("team_members")
      .update({ last_login_at: new Date().toISOString() })
      .eq("auth_user_id", event.authUserId);
  }
}
