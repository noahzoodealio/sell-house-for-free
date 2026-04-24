import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  ProfileRow,
  SubmissionOfferRow,
  SubmissionRow,
} from "@/lib/supabase/schema";

export interface PortalSnapshot {
  profile: ProfileRow | null;
  submission: SubmissionRow | null;
  offers: SubmissionOfferRow[];
}

const EMPTY_SNAPSHOT: PortalSnapshot = {
  profile: null,
  submission: null,
  offers: [],
};

/**
 * Pulls the authenticated seller's profile, most-recent submission, and
 * offers for that submission — all gated by RLS (E10-S4 policies). Pass
 * an SSR client (`createServerAuthClient()`) so `auth.uid()` in the
 * policies matches the current session.
 */
export async function getPortalSnapshot(
  supabase: SupabaseClient,
): Promise<PortalSnapshot> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return EMPTY_SNAPSHOT;

  // Profile — RLS narrows to the seller's own row; .single() is safe.
  const { data: profileRow } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  // Submission — pick the seller's newest (most sellers have only one;
  // repeat submissions surface as additional rows and the portal shows
  // the active one).
  const { data: submissionRows } = await supabase
    .from("submissions")
    .select("*")
    .eq("seller_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1);
  const submission =
    Array.isArray(submissionRows) && submissionRows.length > 0
      ? (submissionRows[0] as SubmissionRow)
      : null;

  if (!submission) {
    return {
      profile: (profileRow as ProfileRow) ?? null,
      submission: null,
      offers: [],
    };
  }

  // Offers — RLS filters again via the submissions.seller_id exists()
  // subquery (E10-S4 policy). The repeat filter by submission_id keeps
  // the query cheap and documents intent.
  const { data: offerRows } = await supabase
    .from("submission_offers")
    .select("*")
    .eq("submission_id", submission.id)
    .order("created_at", { ascending: true });

  return {
    profile: (profileRow as ProfileRow) ?? null,
    submission,
    offers: (offerRows as SubmissionOfferRow[] | null) ?? [],
  };
}
