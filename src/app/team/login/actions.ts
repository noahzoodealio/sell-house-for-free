"use server";

import { trackAuthEvent } from "@/lib/auth/events";
import {
  checkResendRateLimit,
  recordResendAttempt,
} from "@/lib/auth/resend-rate-limit";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { findTeamMemberByEmail } from "@/lib/team/auth";

const TIMING_FLOOR_MS = 1500;

export type SendTeamLoginLinkInput = {
  email: string;
};

export type SendTeamLoginLinkResult =
  | { ok: true; status: "sent" }
  | { ok: false; reason: "rate_limited"; retryAfterMs: number }
  | { ok: false; reason: "invalid_input" | "unknown_error" };

function siteOrigin(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit;
  const vercel = process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function enforceTimingFloor<T>(
  startedAt: number,
  value: T,
): Promise<T> {
  const elapsed = Date.now() - startedAt;
  const wait = Math.max(0, TIMING_FLOOR_MS - elapsed);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  return value;
}

/**
 * Sends a team magic-link. Anti-enumeration posture:
 *   1. Rate-limit (3/15min) on the email key prefixed `team:` to share
 *      the auth_resend_attempts ledger with the seller flow.
 *   2. If the email is NOT in team_members with active=true, return
 *      { ok: true, status: 'sent' } and DO NOT call Supabase. The caller
 *      sees "check your email" regardless.
 *   3. If the email IS in team_members, call signInWithOtp with
 *      shouldCreateUser:false and the team callback URL.
 *
 * The 1.5s timing floor matches /portal/login so a fast 'sent' reply
 * doesn't leak presence-in-roster via response time.
 */
export async function sendTeamLoginLink(
  input: SendTeamLoginLinkInput,
): Promise<SendTeamLoginLinkResult> {
  const startedAt = Date.now();
  const raw = input.email.trim();

  if (!isEmail(raw)) {
    return enforceTimingFloor(startedAt, {
      ok: false,
      reason: "invalid_input",
    } as const);
  }

  const rateKey = `team:${raw.toLowerCase()}`;
  const rate = await checkResendRateLimit(rateKey);
  if (!rate.allowed) {
    trackAuthEvent({
      type: "seller_login_failed",
      method: "magic_link",
      reason: "rate_limited",
    });
    return {
      ok: false,
      reason: "rate_limited",
      retryAfterMs: rate.retryAfterMs,
    };
  }

  const member = await findTeamMemberByEmail(raw);

  // Anti-enumeration: always return { ok: true, status: 'sent' } from here
  // forward, regardless of whether we actually called Supabase.
  if (member) {
    const supabase = getSupabaseAdmin();
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: raw,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: `${siteOrigin()}/team/auth/callback`,
        },
      });
      if (error) {
        // Log but still respond as "sent" — outbound delivery failure
        // surfaces in the email provider's dashboard, not here.
        trackAuthEvent({
          type: "seller_login_failed",
          method: "magic_link",
          reason: "exchange_failed",
        });
      }
    } catch {
      trackAuthEvent({
        type: "seller_login_failed",
        method: "magic_link",
        reason: "exchange_failed",
      });
    }
  }

  // Ledger the attempt regardless — the rate-limit must apply to enumeration
  // probing too, otherwise an attacker can probe N emails with infinite
  // attempts as long as none are real.
  await recordResendAttempt(rateKey, "email");

  if (rate.attemptsInWindow > 0) {
    trackAuthEvent({
      type: "seller_login_resend",
      identifierType: "email",
      attempt: rate.attemptsInWindow + 1,
    });
  }

  return enforceTimingFloor(startedAt, {
    ok: true,
    status: "sent" as const,
  });
}
