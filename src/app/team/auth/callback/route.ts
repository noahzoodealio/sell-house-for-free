import { createHash } from "node:crypto";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { trackAuthEvent } from "@/lib/auth/events";
import { createServerAuthClient } from "@/lib/supabase/server-auth";
import {
  findTeamMemberByAuthUserId,
  findTeamMemberByEmail,
  linkTeamMemberToAuthUser,
  recordTeamLoginEvent,
} from "@/lib/team/auth";
import { emitTeamPortalEvent } from "@/lib/team/telemetry";

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
  const fallback = new URL("/team", origin);
  if (!rawRedirect) return fallback;
  try {
    const parsed = new URL(rawRedirect, origin);
    if (parsed.origin !== origin) return fallback;
    return parsed;
  } catch {
    return fallback;
  }
}

function loginErrorUrl(
  request: NextRequest,
  error: "expired" | "inactive" | "error",
): URL {
  const url = new URL("/team/login", request.nextUrl.origin);
  url.searchParams.set("error", error);
  return url;
}

function expiredUrl(
  request: NextRequest,
  reason: "expired" | "used" | "error",
): URL {
  const url = new URL("/team/auth/expired", request.nextUrl.origin);
  url.searchParams.set("reason", reason);
  return url;
}

function hashIp(ip: string | null): string | undefined {
  if (!ip) return undefined;
  // SHA-256 prefix is plenty of entropy for ops correlation while keeping
  // the raw IP out of the audit row.
  return createHash("sha256").update(ip).digest("hex").slice(0, 16);
}

function clientIp(request: NextRequest): string | null {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() ?? null;
  return request.headers.get("x-real-ip");
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

  let userId: string | null = null;
  let userEmail: string | null = null;

  try {
    if (code) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        const reason = mapSupabaseErrorReason(error.message);
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
        userId = data.user.id;
        userEmail = data.user.email ?? null;
      }
    } else if (tokenHash) {
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
        userId = data.user.id;
        userEmail = data.user.email ?? null;
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

  if (!userId || !userEmail) {
    return noIndexHeaders(NextResponse.redirect(expiredUrl(request, "error")));
  }

  // Defense in depth: between magic-link send and click, an admin could
  // deactivate this team member. Re-check the roster here. If they're not
  // active (or never were on the roster), sign them out and bounce.
  let member = await findTeamMemberByAuthUserId(userId);
  if (!member) {
    // First-login backfill: the team_members row was created with email
    // but no auth_user_id (S9 admin invite, or a manual seed). Link them.
    member = await findTeamMemberByEmail(userEmail);
    if (member && member.active && !member.authUserId) {
      await linkTeamMemberToAuthUser(userEmail, userId);
      member = { ...member, authUserId: userId };
    }
  }

  if (!member || !member.active) {
    const ipHash = hashIp(clientIp(request));
    const userAgent = request.headers.get("user-agent") ?? undefined;
    await recordTeamLoginEvent({
      type: "login_rejected_inactive",
      authUserId: userId,
      ipHash,
      userAgent,
    });
    emitTeamPortalEvent({
      event: "team_login_rejected_inactive",
      severity: "warning",
      tags: { teamUserId: userId, hadRosterRow: !!member },
    });
    await supabase.auth.signOut();
    return noIndexHeaders(
      NextResponse.redirect(loginErrorUrl(request, "inactive")),
    );
  }

  const ipHash = hashIp(clientIp(request));
  const userAgent = request.headers.get("user-agent") ?? undefined;
  await recordTeamLoginEvent({
    type: "login",
    authUserId: userId,
    ipHash,
    userAgent,
  });

  trackAuthEvent({
    type: "seller_login_succeeded",
    method: "magic_link",
    userId,
  });

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

export function POST() {
  return new NextResponse(null, { status: 405, headers: { Allow: "GET" } });
}
export const PUT = POST;
export const PATCH = POST;
export const DELETE = POST;
