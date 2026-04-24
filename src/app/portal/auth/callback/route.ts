import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { trackAuthEvent } from "@/lib/auth/events";
import { createServerAuthClient } from "@/lib/supabase/server-auth";

export const runtime = "nodejs";

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
    trackAuthEvent({
      type: "seller_login_failed",
      method: "magic_link",
      reason: "exchange_failed",
    });
    return noIndexHeaders(NextResponse.redirect(expiredUrl(request, "error")));
  }

  const supabase = await createServerAuthClient();

  try {
    if (code) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        const reason = mapSupabaseErrorReason(error.message);
        if (reason === "expired") {
          trackAuthEvent({
            type: "seller_magic_link_expired",
            identifierType: "email",
          });
        }
        trackAuthEvent({
          type: "seller_login_failed",
          method: "magic_link",
          reason:
            reason === "expired"
              ? "expired"
              : reason === "used"
                ? "used"
                : "exchange_failed",
        });
        return noIndexHeaders(
          NextResponse.redirect(expiredUrl(request, reason)),
        );
      }
      if (data.user) {
        trackAuthEvent({
          type: "seller_login_succeeded",
          method: "magic_link",
          userId: data.user.id,
        });
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
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type,
      });
      if (error) {
        const reason = mapSupabaseErrorReason(error.message);
        if (reason === "expired") {
          trackAuthEvent({
            type: "seller_magic_link_expired",
            identifierType: "email",
          });
        }
        trackAuthEvent({
          type: "seller_login_failed",
          method: "magic_link",
          reason:
            reason === "expired"
              ? "expired"
              : reason === "used"
                ? "used"
                : "exchange_failed",
        });
        return noIndexHeaders(
          NextResponse.redirect(expiredUrl(request, reason)),
        );
      }
      if (data.user) {
        trackAuthEvent({
          type: "seller_login_succeeded",
          method: "magic_link",
          userId: data.user.id,
        });
      }
    }
  } catch {
    trackAuthEvent({
      type: "seller_login_failed",
      method: "magic_link",
      reason: "exchange_failed",
    });
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
