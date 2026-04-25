import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { createMiddlewareSupabaseClient } from "@/lib/supabase/middleware";

export const runtime = "nodejs";

export const config = {
  // Matcher catches everything under /portal and /team. Both surfaces are
  // session-gated; the handler exempts each surface's login + auth routes
  // in-code (Next's matcher doesn't do negative lookahead cleanly).
  matcher: ["/portal/:path*", "/team/:path*"],
};

function noIndex(response: NextResponse): NextResponse {
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

function loginPathFor(path: string): string {
  return path.startsWith("/team") ? "/team/login" : "/portal/login";
}

function isPublicAuthPath(path: string): boolean {
  if (
    path === "/portal/login" ||
    path.startsWith("/portal/login/") ||
    path.startsWith("/portal/auth/")
  ) {
    return true;
  }
  if (
    path === "/team/login" ||
    path.startsWith("/team/login/") ||
    path.startsWith("/team/auth/")
  ) {
    return true;
  }
  return false;
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  if (isPublicAuthPath(path)) {
    return noIndex(NextResponse.next({ request }));
  }

  const { supabase, response } = createMiddlewareSupabaseClient(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const originalPathWithQuery = request.nextUrl.pathname + request.nextUrl.search;
    const url = request.nextUrl.clone();
    url.pathname = loginPathFor(path);
    url.search = "";
    url.searchParams.set("redirect", originalPathWithQuery);
    const redirect = NextResponse.redirect(url, 307);
    return noIndex(redirect);
  }

  return noIndex(response);
}
