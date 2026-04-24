import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { createServerAuthClient } from "@/lib/supabase/server-auth";

export const runtime = "nodejs";

// Sentry-style audit event emitted on exchange failure. E10-S6 replaces
// this with the typed `trackAuthEvent` helper; for now it writes a
// structured console line so infra capture (Vercel logs, Sentry's default
// console integration) has something to match on.
function logAuthFailure(reason: string, code?: string) {
  console.warn(
    JSON.stringify({
      event: "seller_magic_link_exchange_failed",
      reason,
      code: code ?? null,
    }),
  );
}

function noIndexHeaders(response: NextResponse): NextResponse {
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

function resolveRedirect(
  request: NextRequest,
  rawRedirect: string | null,
): URL {
  const origin = request.nextUrl.origin;
  const fallback = new URL("/portal", origin);
  if (!rawRedirect) return fallback;
  try {
    // Only same-origin redirects are honored. The silent collapse to
    // /portal avoids leaking whether a redirect target was intentionally
    // blocked (open-redirect information leak).
    const parsed = new URL(rawRedirect, origin);
    if (parsed.origin !== origin) return fallback;
    return parsed;
  } catch {
    return fallback;
  }
}

function expiredUrl(
  request: NextRequest,
  reason: "expired" | "used" | "error",
): URL {
  const url = new URL("/portal/auth/expired", request.nextUrl.origin);
  url.searchParams.set("reason", reason);
  return url;
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const tokenType = request.nextUrl.searchParams.get("type");
  const rawRedirect =
    request.nextUrl.searchParams.get("redirect_to") ??
    request.nextUrl.searchParams.get("redirect");

  const target = resolveRedirect(request, rawRedirect);

  if (!code && !tokenHash) {
    logAuthFailure("missing_params");
    return noIndexHeaders(NextResponse.redirect(expiredUrl(request, "error")));
  }

  const supabase = await createServerAuthClient();

  try {
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        const reason = mapSupabaseErrorReason(error.message);
        logAuthFailure(reason, error.message);
        return noIndexHeaders(
          NextResponse.redirect(expiredUrl(request, reason)),
        );
      }
    } else if (tokenHash) {
      // Token-hash flow covers the email-delivered variants only; SMS uses
      // `{ phone, token }` (handled by E10-S3 on the login form). The
      // allow-list here mirrors Supabase's EmailOtpType.
      const allowedTypes = new Set([
        "email",
        "magiclink",
        "recovery",
        "invite",
        "signup",
        "email_change",
      ]);
      const type =
        tokenType && allowedTypes.has(tokenType)
          ? (tokenType as
              | "email"
              | "magiclink"
              | "recovery"
              | "invite"
              | "signup"
              | "email_change")
          : "email";
      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type,
      });
      if (error) {
        const reason = mapSupabaseErrorReason(error.message);
        logAuthFailure(reason, error.message);
        return noIndexHeaders(
          NextResponse.redirect(expiredUrl(request, reason)),
        );
      }
    }
  } catch (err) {
    logAuthFailure("exchange_failed", err instanceof Error ? err.message : undefined);
    return noIndexHeaders(NextResponse.redirect(expiredUrl(request, "error")));
  }

  return noIndexHeaders(NextResponse.redirect(target));
}

function mapSupabaseErrorReason(
  message: string,
): "expired" | "used" | "error" {
  const lower = message.toLowerCase();
  if (lower.includes("expired")) return "expired";
  if (lower.includes("used") || lower.includes("consumed")) return "used";
  return "error";
}

// Non-GET methods are not allowed on this route. Explicit 405 lets ops
// spot misrouted requests cleanly.
export function POST() {
  return new NextResponse(null, { status: 405, headers: { Allow: "GET" } });
}
export const PUT = POST;
export const PATCH = POST;
export const DELETE = POST;
