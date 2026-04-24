import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/server";

import type { AssignmentView } from "./types";

// Fetches the assignment view (submission + PM preview) for a referral
// code. Consumed by /portal/setup (E6-S6). Returns null when:
//   - The referral code is not a string (upstream typo / missing param)
//   - No submission row matches the referral code
//   - The submission has no assigned team_member yet (pm_user_id is null)
//
// Null is a happy-path fallback: the confirmation UI renders a generic
// "we'll reach out within N hours" message instead of a specific PM.

interface SubmissionWithPm {
  submission_id: string;
  referral_code: string;
  assigned_at: string | null;
  team_members: {
    first_name: string;
    photo_url: string | null;
  } | null;
}

export async function getAssignmentByReferralCode(
  referralCode: unknown,
): Promise<AssignmentView | null> {
  if (typeof referralCode !== "string" || referralCode.length === 0) {
    return null;
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("submissions")
    .select(
      "submission_id, referral_code, assigned_at, team_members(first_name, photo_url)",
    )
    .eq("referral_code", referralCode)
    .maybeSingle();

  if (error || !data) return null;

  const row = data as unknown as SubmissionWithPm;

  const pmPreview = row.team_members
    ? {
        firstName: row.team_members.first_name,
        photoUrl: row.team_members.photo_url,
      }
    : null;

  return {
    submission: {
      submissionId: row.submission_id,
      referralCode: row.referral_code,
      assignedAt: row.assigned_at,
    },
    pmPreview,
  };
}
