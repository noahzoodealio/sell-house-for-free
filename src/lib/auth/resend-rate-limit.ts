import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/server";

/**
 * Rate-limit for passwordless auth send attempts. 3 attempts per identifier
 * (email or phone) per 15 minutes, enforced at the server-action layer and
 * shared between `/portal/auth/callback` re-send (E10-S2) and `/portal/login`
 * OTP send (E10-S3). Ledger rows are written by the service-role client;
 * seller sessions never see this table (RLS default-deny).
 */

export const RESEND_WINDOW_MS = 15 * 60 * 1000;
export const RESEND_MAX_ATTEMPTS = 3;

export type IdentifierType = "email" | "phone";

export interface RateLimitState {
  allowed: boolean;
  attemptsInWindow: number;
  /** Milliseconds until the oldest attempt in the window ages out (0 when allowed). */
  retryAfterMs: number;
}

export async function checkResendRateLimit(
  identifier: string,
): Promise<RateLimitState> {
  const supabase = getSupabaseAdmin();
  const windowStart = new Date(Date.now() - RESEND_WINDOW_MS).toISOString();

  const { data, error } = await supabase
    .from("auth_resend_attempts")
    .select("attempted_at")
    .eq("identifier", identifier)
    .gte("attempted_at", windowStart)
    .order("attempted_at", { ascending: true });

  if (error) {
    // Fail-open on ledger unavailability — infra failure shouldn't lock
    // sellers out. The email/SMS provider's own rate limits remain in
    // effect as the outer safety net.
    return { allowed: true, attemptsInWindow: 0, retryAfterMs: 0 };
  }

  const rows = (data ?? []) as Array<{ attempted_at: string }>;
  const attemptsInWindow = rows.length;

  if (attemptsInWindow < RESEND_MAX_ATTEMPTS) {
    return { allowed: true, attemptsInWindow, retryAfterMs: 0 };
  }

  // Rate-limited. Retry-after = time until the OLDEST in-window attempt
  // ages out, which is when the seller would regain one slot.
  const oldest = new Date(rows[0].attempted_at).getTime();
  const retryAfterMs = Math.max(0, oldest + RESEND_WINDOW_MS - Date.now());

  return { allowed: false, attemptsInWindow, retryAfterMs };
}

export async function recordResendAttempt(
  identifier: string,
  identifierType: IdentifierType,
): Promise<void> {
  const supabase = getSupabaseAdmin();
  await supabase.from("auth_resend_attempts").insert({
    identifier,
    identifier_type: identifierType,
  });
}
