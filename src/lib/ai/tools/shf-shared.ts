import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export interface ShfSession {
  id: string;
  submissionId?: string | null;
}

interface ResolvedSubmission {
  id: string;
  submission_id: string;
  seller_id: string;
  pm_user_id: string | null;
}

/**
 * Resolves the seller's submission row given the AI session's submissionId.
 * Tries the text `submission_id` column first (matches the bootstrap URL
 * shape from E9-S22), falls back to the uuid `id` for sessions that store
 * the uuid form. Returns null when no row matches.
 *
 * Service-role read — RLS would be the right boundary once E10 portal auth
 * threads `access_token` through to the AI session. Until then, scoping
 * relies on the session.submissionId being trustworthy (set server-side
 * during bootstrap; never user-controllable).
 */
export async function resolveSubmissionForSession(
  session: ShfSession,
  supabase: SupabaseClient,
): Promise<ResolvedSubmission | null> {
  if (!session.submissionId) return null;

  // submission_id (text) is the bootstrap form; try it first.
  const byText = await supabase
    .from("submissions")
    .select("id, submission_id, seller_id, pm_user_id")
    .eq("submission_id", session.submissionId)
    .maybeSingle();
  if (byText.data) return byText.data as ResolvedSubmission;

  // Fall back to uuid id for sessions that stored that form.
  const byUuid = await supabase
    .from("submissions")
    .select("id, submission_id, seller_id, pm_user_id")
    .eq("id", session.submissionId)
    .maybeSingle();
  if (byUuid.data) return byUuid.data as ResolvedSubmission;

  return null;
}
