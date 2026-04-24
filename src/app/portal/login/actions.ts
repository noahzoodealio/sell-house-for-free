"use server";

import {
  checkResendRateLimit,
  recordResendAttempt,
} from "@/lib/auth/resend-rate-limit";
import { normalizePhoneE164 } from "@/lib/auth/phone";
import { createServerAuthClient } from "@/lib/supabase/server-auth";
import { getSupabaseAdmin } from "@/lib/supabase/server";

const TIMING_FLOOR_MS = 1500;

export type RequestOtpInput =
  | { method: "email"; identifier: string }
  | { method: "phone"; identifier: string };

export type RequestOtpResult =
  | { ok: true; normalizedIdentifier: string; attemptNumber: number }
  | {
      ok: false;
      reason: "rate_limited";
      retryAfterMs: number;
    }
  | {
      ok: false;
      reason: "tcpa_missing" | "user_not_found" | "invalid_input" | "unknown_error";
    };

export type VerifyOtpInput = {
  method: "email" | "phone";
  identifier: string;
  token: string;
  redirect?: string | null;
};

export type VerifyOtpResult =
  | { ok: true; redirect: string }
  | { ok: false; reason: "invalid_code" | "expired" | "unknown_error" };

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

export async function requestOtp(
  input: RequestOtpInput,
): Promise<RequestOtpResult> {
  const startedAt = Date.now();
  const raw = input.identifier.trim();

  // Rate-limit is the only branch allowed to short-circuit the 1500ms
  // timing floor — the retry-after counter is itself the signal to the
  // client, so no enumeration risk from a faster reply.
  if (input.method === "email") {
    if (!isEmail(raw)) {
      return enforceTimingFloor(startedAt, {
        ok: false,
        reason: "invalid_input",
      } as const);
    }
    const rate = await checkResendRateLimit(raw);
    if (!rate.allowed) {
      return {
        ok: false,
        reason: "rate_limited",
        retryAfterMs: rate.retryAfterMs,
      };
    }

    const supabase = getSupabaseAdmin();
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: raw,
        options: {
          shouldCreateUser: false,
          emailRedirectTo: `${siteOrigin()}/portal/auth/callback`,
        },
      });
      if (error) {
        const msg = error.message.toLowerCase();
        if (msg.includes("not found") || msg.includes("does not exist")) {
          return enforceTimingFloor(startedAt, {
            ok: false,
            reason: "user_not_found",
          } as const);
        }
        return enforceTimingFloor(startedAt, {
          ok: false,
          reason: "unknown_error",
        } as const);
      }
    } catch {
      return enforceTimingFloor(startedAt, {
        ok: false,
        reason: "unknown_error",
      } as const);
    }

    await recordResendAttempt(raw, "email");
    return enforceTimingFloor(startedAt, {
      ok: true,
      normalizedIdentifier: raw,
      attemptNumber: rate.attemptsInWindow + 1,
    } as const);
  }

  // Phone path.
  const phone = normalizePhoneE164(raw);
  if (!phone) {
    return enforceTimingFloor(startedAt, {
      ok: false,
      reason: "invalid_input",
    } as const);
  }

  const rate = await checkResendRateLimit(phone);
  if (!rate.allowed) {
    return {
      ok: false,
      reason: "rate_limited",
      retryAfterMs: rate.retryAfterMs,
    };
  }

  // TCPA pre-check lives before the Supabase call. Texting without a
  // recorded consent version is a liability the provider can't see.
  const supabase = getSupabaseAdmin();
  const { data: profileRows } = await supabase
    .from("profiles")
    .select("id, tcpa_version")
    .eq("phone", phone)
    .limit(1);
  const profile = Array.isArray(profileRows) && profileRows.length > 0
    ? (profileRows[0] as { id: string; tcpa_version: string | null })
    : null;

  if (!profile) {
    return enforceTimingFloor(startedAt, {
      ok: false,
      reason: "user_not_found",
    } as const);
  }
  if (!profile.tcpa_version) {
    return enforceTimingFloor(startedAt, {
      ok: false,
      reason: "tcpa_missing",
    } as const);
  }

  try {
    const { error } = await supabase.auth.signInWithOtp({
      phone,
      options: { shouldCreateUser: false, channel: "sms" },
    });
    if (error) {
      return enforceTimingFloor(startedAt, {
        ok: false,
        reason: "unknown_error",
      } as const);
    }
  } catch {
    return enforceTimingFloor(startedAt, {
      ok: false,
      reason: "unknown_error",
    } as const);
  }

  await recordResendAttempt(phone, "phone");
  return enforceTimingFloor(startedAt, {
    ok: true,
    normalizedIdentifier: phone,
    attemptNumber: rate.attemptsInWindow + 1,
  } as const);
}

export async function verifyOtpAndSignIn(
  input: VerifyOtpInput,
): Promise<VerifyOtpResult> {
  if (!/^\d{6}$/.test(input.token)) {
    return { ok: false, reason: "invalid_code" };
  }

  const supabase = await createServerAuthClient();

  try {
    const verifyInput =
      input.method === "email"
        ? ({ email: input.identifier, token: input.token, type: "email" } as const)
        : ({ phone: input.identifier, token: input.token, type: "sms" } as const);
    const { error } = await supabase.auth.verifyOtp(verifyInput);
    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("expired")) return { ok: false, reason: "expired" };
      return { ok: false, reason: "invalid_code" };
    }
  } catch {
    return { ok: false, reason: "unknown_error" };
  }

  return { ok: true, redirect: resolveRedirect(input.redirect ?? null) };
}

function resolveRedirect(raw: string | null): string {
  if (!raw) return "/portal";
  try {
    const decoded = decodeURIComponent(raw);
    // Relative-only, pathless-host rejection. If the decoded value starts
    // with a scheme or protocol-relative slash pair, drop it. This keeps
    // the redirect inside the app and blocks open-redirect attempts.
    if (/^[a-z][a-z0-9+.-]*:/i.test(decoded)) return "/portal";
    if (decoded.startsWith("//")) return "/portal";
    if (!decoded.startsWith("/")) return "/portal";
    return decoded;
  } catch {
    return "/portal";
  }
}
