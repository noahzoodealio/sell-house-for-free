---
slug: e10-s5-portal-auth-middleware
ado-story-id: 7927
ado-url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7927
parent-epic-id: 7919
branch: feature/e10-passwordless-auth
status: implemented
started-at: 2026-04-24T02:15:00Z
---

# E10-S5 — Portal auth middleware

## Scope delivered

1. **`middleware.ts`** at repo root
   - Explicit `runtime = "nodejs"` (Fluid Compute) — documents the choice rather than leaving it implicit.
   - `matcher: ["/portal/:path*"]`.
   - In-handler early-return for `/portal/login` + `/portal/auth/*` (these surfaces establish the session; guarding would cause redirect loops).
   - Calls `supabase.auth.getUser()` (JWT validation, not cookie-only).
   - No session → 307 to `/portal/login?redirect=<encoded originalPath+query>`.
   - Session present → returns the response with refreshed cookies attached (Supabase token refresh propagates).
   - `X-Robots-Tag: noindex, nofollow` on every matched response (defense in depth on top of per-page `robots` metadata).
2. **Helper** — `src/lib/supabase/middleware.ts`
   - `createMiddlewareSupabaseClient(request)` returns `{ supabase, response }`.
   - Cookie plumbing uses `request.cookies` + response cookies per `@supabase/ssr` middleware docs; the same response instance is threaded through so cookie-set in the Supabase client is preserved.
   - Throws at factory time if `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` are missing (loud failure beats silent pass-through when auth is meant to gate the route).

## Acceptance criteria mapping

| AC | Status | Evidence |
|---|---|---|
| 1 | ✅ | `middleware` function + `config.matcher = ['/portal/:path*']`. |
| 2 | ✅ | Early-return for `/portal/login` and `/portal/auth/*` paths. |
| 3 | ✅ | `createMiddlewareSupabaseClient` uses `@supabase/ssr` with `request.cookies` + response cookies. |
| 4 | ✅ | `supabase.auth.getUser()` (not `getSession`) — JWT-validated. |
| 5 | ✅ | No-user branch clones the URL, sets `/portal/login` + `?redirect=<path+search>`, returns 307. |
| 6 | ✅ | Signed-in branch returns the response assembled by the cookie plumbing so refreshed cookies propagate. |
| 7 | ✅ | `noIndex(response)` applied on both redirect and pass-through branches. |
| 8 | ✅ | `export const runtime = "nodejs"` set explicitly. |
| 9 | ⏸ | `/api/*`, `/`, `/get-started/*` not matched (matcher scope); manual curl smoke pending. |
| 10 | ✅ | `/portal/auth/callback` + `/portal/auth/expired` are exempted by the in-handler startsWith check. |
| 11 | ✅ | `/portal/login` exempted. |
| 12 | ✅ | `originalPathWithQuery` = `pathname + search` so `?sid=…&foo=…` preserves into the redirect encoding. |
| 13 | ✅ | Middleware only builds a same-origin redirect (`/portal/login` on the same request's origin via `request.nextUrl.clone()`). |
| 14 | ⚠️ | `next build` passes but bundle-size output is not surfaced in Next 16's terminal report for nodejs-runtime middleware. Note captured here; investigate via Vercel build output when the branch deploys. |
| 15 | ⏸ | Manual curl smoke (anonymous) pending dev deploy. |
| 16 | ⏸ | Manual smoke with session pending Supabase dashboard config (S1) + real migration apply (S2/S4). |

## Deviations from story AC

- **AC 14 bundle-size readout:** Next 16 does not print the middleware bundle size in the local `next build` terminal output (verified — no middleware line in the output). The information is surfaced in Vercel's build UI. Recording here as a known gap rather than a blocker.
- **ACs 9, 15, 16 manual smokes:** All pending the same dev-deploy + dashboard prerequisites that gated S3 + S4 smokes.

## Files touched

- `middleware.ts` (new — repo root)
- `src/lib/supabase/middleware.ts` (new)

## Out of scope

- Sentry wiring (S6)
- Team-member middleware (E11 — will share the Supabase client factory but add a `/team/*` matcher)
- Request-layer rate-limit enforcement (stays at the server-action layer)
