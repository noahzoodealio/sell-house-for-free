import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { createMiddlewareSupabaseClient } from "@/lib/supabase/middleware";

export const runtime = "nodejs";

export const config = {
  // Matcher catches everything under /portal. The handler exempts
  // /portal/login + /portal/auth/* in-code (Next's matcher doesn't do
  // negative lookahead cleanly; in-handler early-return is clearer).
  matcher: ["/portal/:path*"],
};

function noIndex(response: NextResponse): NextResponse {
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  if (
    path === "/portal/login" ||
    path.startsWith("/portal/login/") ||
    path.startsWith("/portal/auth/")
  ) {
    return noIndex(NextResponse.next({ request }));
  }

  const { supabase, response } = createMiddlewareSupabaseClient(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const originalPathWithQuery = request.nextUrl.pathname + request.nextUrl.search;
    const url = request.nextUrl.clone();
    url.pathname = "/portal/login";
    url.search = "";
    url.searchParams.set("redirect", originalPathWithQuery);
    const redirect = NextResponse.redirect(url, 307);
    return noIndex(redirect);
  }

  return noIndex(response);
}
