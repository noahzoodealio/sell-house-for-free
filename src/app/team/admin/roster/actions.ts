"use server";

import { revalidatePath } from "next/cache";

import { createServerAuthClient } from "@/lib/supabase/server-auth";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { findTeamMemberByAuthUserId } from "@/lib/team/auth";
import {
  COVERAGE_REGIONS,
  isValidCoverageRegion,
} from "@/lib/team/coverage-regions";
import { countActiveAdmins, VALID_ROLES, type RoleBadge } from "@/lib/team/roster";
import { emitTeamPortalEvent } from "@/lib/team/telemetry";

interface AdminContext {
  authUserId: string;
  teamMemberId: string;
}

async function authorizeAdmin(): Promise<AdminContext | null> {
  const supabase = await createServerAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const member = await findTeamMemberByAuthUserId(user.id);
  if (!member || !member.active || !member.isAdmin) return null;
  return { authUserId: user.id, teamMemberId: member.id };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function siteOrigin(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.TEAM_PORTAL_URL ||
    "http://localhost:3000"
  );
}

export interface AddTeamMemberInput {
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: RoleBadge[];
  coverageRegions: string[];
  capacityActiveMax: number;
}

export type AddTeamMemberResult =
  | { ok: true; teamMemberId: string }
  | {
      ok: false;
      reason: "unauthorized" | "validation" | "duplicate" | "internal";
    };

function sanitizeRoles(input: unknown): RoleBadge[] {
  if (!Array.isArray(input)) return [];
  const set = new Set<RoleBadge>();
  for (const value of input) {
    if (typeof value === "string" && (VALID_ROLES as readonly string[]).includes(value)) {
      set.add(value as RoleBadge);
    }
  }
  return Array.from(set);
}

function sanitizeRegions(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const set = new Set<string>();
  for (const value of input) {
    if (typeof value === "string" && isValidCoverageRegion(value)) {
      set.add(value);
    }
  }
  return Array.from(set);
}

export async function addTeamMember(
  input: AddTeamMemberInput,
): Promise<AddTeamMemberResult> {
  const ctx = await authorizeAdmin();
  if (!ctx) return { ok: false, reason: "unauthorized" };

  const email = input.email.trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return { ok: false, reason: "validation" };

  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  if (firstName.length === 0 || lastName.length === 0) {
    return { ok: false, reason: "validation" };
  }

  const role = sanitizeRoles(input.role);
  if (role.length === 0) return { ok: false, reason: "validation" };

  const regions = sanitizeRegions(input.coverageRegions);

  const capacityActiveMax = Math.max(
    1,
    Math.min(50, Math.floor(input.capacityActiveMax)),
  );

  const admin = getSupabaseAdmin();

  // Check duplicate email first.
  const { data: existing } = await admin
    .from("team_members")
    .select("id")
    .ilike("email", email)
    .limit(1);
  if (Array.isArray(existing) && existing.length > 0) {
    return { ok: false, reason: "duplicate" };
  }

  // Provision auth.users.
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
  });
  if (createErr || !created?.user) {
    if (createErr?.message?.toLowerCase().includes("already")) {
      return { ok: false, reason: "duplicate" };
    }
    return { ok: false, reason: "internal" };
  }
  const authUserId = created.user.id;

  // Insert team_members row.
  const { data: insertRow, error: insertErr } = await admin
    .from("team_members")
    .insert({
      auth_user_id: authUserId,
      first_name: firstName,
      last_name: lastName,
      email,
      phone: input.phone?.trim() || null,
      active: true,
      role,
      coverage_regions: regions,
      capacity_active_max: capacityActiveMax,
    })
    .select("id")
    .single();
  if (insertErr || !insertRow) {
    // Rollback: delete the auth user we just created so the admin can retry.
    await admin.auth.admin.deleteUser(authUserId).catch(() => {});
    return { ok: false, reason: "internal" };
  }

  // Send invite magic link.
  await admin.auth
    .signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: `${siteOrigin()}/team/auth/callback`,
      },
    })
    .catch(() => {});

  await admin.from("team_activity_events").insert({
    submission_id: null,
    team_user_id: ctx.authUserId,
    event_type: "team_member_added",
    event_data: {
      target_team_member_id: (insertRow as { id: string }).id,
      target_email: email,
      role,
      coverage_regions: regions,
      capacity_active_max: capacityActiveMax,
    },
  });

  revalidatePath("/team/admin/roster");
  return { ok: true, teamMemberId: (insertRow as { id: string }).id };
}

export type ToggleActiveResult =
  | { ok: true; active: boolean }
  | {
      ok: false;
      reason: "unauthorized" | "not_found" | "last_admin" | "internal";
    };

export async function setTeamMemberActive(
  targetTeamMemberId: string,
  active: boolean,
): Promise<ToggleActiveResult> {
  const ctx = await authorizeAdmin();
  if (!ctx) return { ok: false, reason: "unauthorized" };

  const admin = getSupabaseAdmin();
  const { data: targetRow } = await admin
    .from("team_members")
    .select("id, role, active, auth_user_id")
    .eq("id", targetTeamMemberId)
    .maybeSingle();
  if (!targetRow) return { ok: false, reason: "not_found" };
  const target = targetRow as {
    id: string;
    role: string[] | null;
    active: boolean;
    auth_user_id: string | null;
  };

  if (
    !active &&
    Array.isArray(target.role) &&
    target.role.includes("admin")
  ) {
    const otherAdmins = await countActiveAdmins();
    if (otherAdmins <= 1) {
      emitTeamPortalEvent({
        event: "team_admin_last_admin_protection_tripped",
        severity: "warning",
        tags: {
          teamUserId: ctx.authUserId,
          targetTeamMemberId: target.id,
          attempted: "deactivate",
        },
      });
      return { ok: false, reason: "last_admin" };
    }
  }

  const { error } = await admin
    .from("team_members")
    .update({
      active,
      updated_at: new Date().toISOString(),
    })
    .eq("id", target.id);
  if (error) return { ok: false, reason: "internal" };

  if (!active && target.auth_user_id) {
    // Best-effort revoke of active sessions.
    await admin.auth.admin.signOut(target.auth_user_id).catch(() => {});
  }

  await admin.from("team_activity_events").insert({
    submission_id: null,
    team_user_id: ctx.authUserId,
    event_type: active ? "team_member_reactivated" : "team_member_deactivated",
    event_data: { target_team_member_id: target.id },
  });

  revalidatePath("/team/admin/roster");
  return { ok: true, active };
}

export type UpdateRolesResult =
  | { ok: true }
  | {
      ok: false;
      reason: "unauthorized" | "not_found" | "validation" | "last_admin";
    };

export async function updateRoles(
  targetTeamMemberId: string,
  roles: RoleBadge[],
): Promise<UpdateRolesResult> {
  const ctx = await authorizeAdmin();
  if (!ctx) return { ok: false, reason: "unauthorized" };

  const sanitized = sanitizeRoles(roles);
  if (sanitized.length === 0) return { ok: false, reason: "validation" };

  const admin = getSupabaseAdmin();
  const { data: targetRow } = await admin
    .from("team_members")
    .select("id, role, active")
    .eq("id", targetTeamMemberId)
    .maybeSingle();
  if (!targetRow) return { ok: false, reason: "not_found" };
  const target = targetRow as {
    id: string;
    role: string[] | null;
    active: boolean;
  };

  const wasAdmin =
    Array.isArray(target.role) && target.role.includes("admin") && target.active;
  const willBeAdmin = sanitized.includes("admin");
  if (wasAdmin && !willBeAdmin) {
    const others = await countActiveAdmins();
    if (others <= 1) {
      emitTeamPortalEvent({
        event: "team_admin_last_admin_protection_tripped",
        severity: "warning",
        tags: {
          teamUserId: ctx.authUserId,
          targetTeamMemberId: target.id,
          attempted: "remove_admin_role",
        },
      });
      return { ok: false, reason: "last_admin" };
    }
  }

  await admin
    .from("team_members")
    .update({ role: sanitized, updated_at: new Date().toISOString() })
    .eq("id", target.id);

  await admin.from("team_activity_events").insert({
    submission_id: null,
    team_user_id: ctx.authUserId,
    event_type: "team_member_role_changed",
    event_data: {
      target_team_member_id: target.id,
      before: target.role ?? [],
      after: sanitized,
    },
  });

  revalidatePath("/team/admin/roster");
  return { ok: true };
}

export type UpdateCoverageResult =
  | { ok: true }
  | { ok: false; reason: "unauthorized" | "not_found" | "validation" };

export async function updateCoverageRegions(
  targetTeamMemberId: string,
  regions: string[],
): Promise<UpdateCoverageResult> {
  const ctx = await authorizeAdmin();
  if (!ctx) return { ok: false, reason: "unauthorized" };

  const sanitized = sanitizeRegions(regions);

  const admin = getSupabaseAdmin();
  const { data: targetRow } = await admin
    .from("team_members")
    .select("id, coverage_regions")
    .eq("id", targetTeamMemberId)
    .maybeSingle();
  if (!targetRow) return { ok: false, reason: "not_found" };
  const target = targetRow as {
    id: string;
    coverage_regions: string[] | null;
  };

  await admin
    .from("team_members")
    .update({
      coverage_regions: sanitized,
      updated_at: new Date().toISOString(),
    })
    .eq("id", target.id);

  await admin.from("team_activity_events").insert({
    submission_id: null,
    team_user_id: ctx.authUserId,
    event_type: "team_member_coverage_changed",
    event_data: {
      target_team_member_id: target.id,
      before: target.coverage_regions ?? [],
      after: sanitized,
    },
  });

  revalidatePath("/team/admin/roster");
  return { ok: true };
}

export type UpdateCapacityResult =
  | { ok: true }
  | { ok: false; reason: "unauthorized" | "not_found" | "validation" };

export async function updateCapacityMax(
  targetTeamMemberId: string,
  capacityMax: number,
): Promise<UpdateCapacityResult> {
  const ctx = await authorizeAdmin();
  if (!ctx) return { ok: false, reason: "unauthorized" };

  if (!Number.isFinite(capacityMax) || capacityMax < 1 || capacityMax > 50) {
    return { ok: false, reason: "validation" };
  }
  const value = Math.floor(capacityMax);

  const admin = getSupabaseAdmin();
  const { data: targetRow } = await admin
    .from("team_members")
    .select("id, capacity_active_max")
    .eq("id", targetTeamMemberId)
    .maybeSingle();
  if (!targetRow) return { ok: false, reason: "not_found" };
  const target = targetRow as {
    id: string;
    capacity_active_max: number;
  };

  await admin
    .from("team_members")
    .update({
      capacity_active_max: value,
      updated_at: new Date().toISOString(),
    })
    .eq("id", target.id);

  await admin.from("team_activity_events").insert({
    submission_id: null,
    team_user_id: ctx.authUserId,
    event_type: "team_member_capacity_changed",
    event_data: {
      target_team_member_id: target.id,
      before: target.capacity_active_max,
      after: value,
    },
  });

  revalidatePath("/team/admin/roster");
  return { ok: true };
}

export const SUPPORTED_COVERAGE_REGIONS = COVERAGE_REGIONS;
