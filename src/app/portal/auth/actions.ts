"use server";

import { getSupabaseAdmin } from "@/lib/supabase/server";
import {
  checkResendRateLimit,
  recordResendAttempt,
} from "@/lib/auth/resend-rate-limit";
import type { IdentifierType } from "@/lib/auth/resend-rate-limit";

export type ResendResult =
  | { ok: true }
  | { ok: false; reason: "rate_limited"; retryAfterMs: number }
  | { ok: false; reason: "tcpa_missing" }
  | { ok: false; reason: "invalid_input" }
  | { ok: false; reason: "unknown_error" };

function siteOrigin(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit;
  // Vercel sets VERCEL_URL in preview/prod. Fall back to localhost for dev.
  const vercel = process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}

function isEmail(value: string): boolean {
  // Narrow, conservative RFC-ish check. The real validation is
  // Supabase's server-side reject; this guards against obviously-wrong
  // input before we spend a send.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isPhoneLike(value: string): boolean {
  // Accept anything with 8+ digits; E10-S3 adds libphonenumber-js for
  // strict E.164 normalization when the login form lands.
  const digits = value.replace(/\D/g, "");
  return digits.length >= 8;
}

export async function resendMagicLink(input: {
  identifier: string;
  identifierType: IdentifierType;
}): Promise<ResendResult> {
  const identifier = input.identifier.trim();
  const identifierType = input.identifierType;

  if (identifierType === "email" && !isEmail(identifier)) {
    return { ok: false, reason: "invalid_input" };
  }
  if (identifierType === "phone" && !isPhoneLike(identifier)) {
    return { ok: false, reason: "invalid_input" };
  }

  const rate = await checkResendRateLimit(identifier);
  if (!rate.allowed) {
    return {
      ok: false,
      reason: "rate_limited",
      retryAfterMs: rate.retryAfterMs,
    };
  }

  const supabase = getSupabaseAdmin();

  try {
    if (identifierType === "email") {
      const { error } = await supabase.auth.admin.generateLink({
        type: "magiclink",
        email: identifier,
        options: { redirectTo: `${siteOrigin()}/portal/auth/callback` },
      });
      if (error) return { ok: false, reason: "unknown_error" };
    } else {
      // TCPA pre-check: phone OTP requires a profile with a recorded
      // tcpa_version. The login surface (E10-S3) enforces the same gate
      // before first OTP send; here it blocks re-sends too.
      const { data: profileRows } = await supabase
        .from("profiles")
        .select("tcpa_version")
        .eq("phone", identifier)
        .limit(1);
      const tcpaOk =
        Array.isArray(profileRows) &&
        profileRows.length > 0 &&
        (profileRows[0] as { tcpa_version: string | null }).tcpa_version !=
          null;
      if (!tcpaOk) return { ok: false, reason: "tcpa_missing" };

      const { error } = await supabase.auth.signInWithOtp({
        phone: identifier,
        options: { shouldCreateUser: false, channel: "sms" },
      });
      if (error) return { ok: false, reason: "unknown_error" };
    }
  } catch {
    return { ok: false, reason: "unknown_error" };
  }

  await recordResendAttempt(identifier, identifierType);
  return { ok: true };
}
