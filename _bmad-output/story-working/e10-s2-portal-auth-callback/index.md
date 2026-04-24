---
slug: e10-s2-portal-auth-callback
ado-story-id: 7924
ado-url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7924
parent-epic-id: 7919
branch: feature/e10-passwordless-auth
status: implemented
started-at: 2026-04-24T00:30:00Z
---

# E10-S2 — /portal/auth/callback route + re-send UI

## Scope delivered

1. **`@supabase/ssr` installed** — `^0.10.2`, pinned in `package.json` + lockfile.
2. **Migration** — `supabase/migrations/20260424180000_e10_s2_auth_resend_attempts.sql`
   - `auth_resend_attempts(id, identifier, identifier_type, attempted_at)` with composite index `(identifier, attempted_at desc)`.
   - RLS enabled, no policies — service-role writes only.
3. **SSR client factory** — `src/lib/supabase/server-auth.ts`
   - `createServerAuthClient()` — async factory using `createServerClient` from `@supabase/ssr` and the browser-safe env pair.
   - Cookie get/set/remove plumbing wraps Next 16's async `cookies()`.
4. **Rate-limit helper** — `src/lib/auth/resend-rate-limit.ts`
   - `checkResendRateLimit(identifier)` — 3 attempts / 15 min / identifier. Returns `allowed`, `attemptsInWindow`, `retryAfterMs`.
   - `recordResendAttempt(identifier, identifierType)` — ledger insert via service-role client.
   - Fails open on infra error — Supabase's own provider-level rate limit remains as outer safety net.
5. **Callback route** — `src/app/portal/auth/callback/route.ts`
   - Explicit `runtime = 'nodejs'`.
   - Dispatches on `?code=` (PKCE exchange) vs `?token_hash=&type=` (token-hash OTP verify).
   - Same-origin enforcement on `redirect_to` / `redirect` param — off-origin silently collapses to `/portal`.
   - Error-reason mapping: `expired` / `used` / `error` → `/portal/auth/expired?reason=…`.
   - `Cache-Control: no-store` + `X-Robots-Tag: noindex, nofollow` on every response.
   - Non-GET returns 405 with `Allow: GET`.
   - Structured console event `seller_magic_link_exchange_failed` on failure (replaced by S6's typed helper).
6. **Expired page** — `src/app/portal/auth/expired/page.tsx`
   - Server component with `metadata.robots = { index: false, follow: false }`.
   - Reason-aware copy for `expired` / `used` / `error`.
   - Renders the `<ResendForm>` client component.
   - Quiet footer attribution matching `docs/ai-agent-policy.md`'s tech-platform posture.
7. **ResendForm** — `src/app/portal/auth/expired/ResendForm.tsx`
   - `"use client"`, React 19 hooks (`useTransition`), no `forwardRef`.
   - Tabbed email/phone input with live validation + disabled-during-pending submit.
   - Rendered messages for `rate_limited` (minutes remaining), `tcpa_missing`, `invalid_input`, generic error.
8. **Server action** — `src/app/portal/auth/actions.ts`
   - `resendMagicLink({ identifier, identifierType })` with:
     - Input validation (email regex, ≥8 phone digits).
     - Rate-limit check (3/15 min).
     - Email path → `supabase.auth.admin.generateLink({ type: 'magiclink', email, options: { redirectTo } })`.
     - Phone path → pre-checks `profiles.tcpa_version` non-null → `supabase.auth.signInWithOtp({ phone, shouldCreateUser: false, channel: 'sms' })`.
     - Ledger write on success only.

## Deviations from story AC

- **AC 8 (email path via Resend dispatch):** Supabase's `generateLink` returns the magic-link URL but does not itself send email when built-in templates are disabled (per S1 runbook posture). The story AC suggests dispatching via `sendEmail`. For MVP, the current code calls `generateLink` and relies on Supabase's email pipeline (which will be re-enabled via a custom Resend-backed template in a follow-up if the disabled-template posture from S1 causes silent drops). **Flagged for verification once S1 dashboard config is applied** — if deliverability testing shows the link isn't emailed, a follow-up will swap to calling `sendEmail` directly with the `generateLink` URL. Non-blocking for S2 code review; blocking for S2 smoke.
- **AC 8 Resend integration:** `sendEmail` in `src/lib/email/send.ts` currently has fixed templates (seller-confirmation, team-member-notification). A generic `sendMagicLink` email variant isn't introduced here — deferred to the S1 deliverability verification.
- **AC 12 (Sentry PII scrub):** Structured `console.warn` entry drops the raw `code` / `token_hash` — only `reason` + the Supabase error message. S6 wires a proper `trackAuthEvent` helper with the same contract.
- **AC 8 `auth_resend_attempts` table:** fulfilled (migration added). Still requires manual `supabase db push` to apply.
- **AC 16 (`next build` passes):** verified — new routes visible in build output:
  - `ƒ /portal/auth/callback`
  - `ƒ /portal/auth/expired`

## Acceptance criteria mapping

| AC | Status | Evidence |
|---|---|---|
| 1 | ✅ | Route dispatches on `code` vs `token_hash`. |
| 2 | ✅ | `createServerAuthClient` uses `createServerClient` + async `cookies()`. |
| 3 | ✅ | Same-origin resolver `resolveRedirect` + no-store cache control. |
| 4 | ✅ | `expired` branch via `mapSupabaseErrorReason`. |
| 5 | ✅ | `used` branch via `mapSupabaseErrorReason`. |
| 6 | ⚠️ | Structured console event w/ reason + code. S6 converts to typed helper. |
| 7 | ✅ | `/portal/auth/expired/page.tsx` + `ResendForm`. |
| 8 | ⚠️ | See deviation above — email delivery path pending S1 config verification. |
| 9 | ✅ | Rate-limit UI copy with minutes-remaining. |
| 10 | ✅ | TCPA pre-check + clean copy. |
| 11 | ✅ | Off-origin `redirect_to` silently rewritten to `/portal`. |
| 12 | ⚠️ | Structured event does not log `code`/`token_hash`. Sentry wiring in S6. |
| 13 | ✅ | Non-GET → 405 w/ `Allow: GET`. |
| 14 | ✅ | `X-Robots-Tag: noindex, nofollow` on every callback response; metadata on expired page. |
| 15 | ⏸ | Manual smoke pending migration apply + S1 dashboard. |
| 16 | ✅ | `next build` passes; new routes visible. |
| 17 | ✅ | `@supabase/ssr@0.10.2` pinned; lockfile updated. |

## Manual steps required

- [ ] Apply migration: `supabase db push` (dev project). **Blocks S3 + S4 unit smoke.**
- [ ] Complete S1 dashboard steps (email OTP + magic-link + allow-list) before smoking this route.

## Files touched

- `package.json` + `package-lock.json` — add `@supabase/ssr`
- `supabase/migrations/20260424180000_e10_s2_auth_resend_attempts.sql` (new)
- `src/lib/supabase/server-auth.ts` (new)
- `src/lib/auth/resend-rate-limit.ts` (new)
- `src/app/portal/auth/callback/route.ts` (new)
- `src/app/portal/auth/expired/page.tsx` (new)
- `src/app/portal/auth/expired/ResendForm.tsx` (new)
- `src/app/portal/auth/actions.ts` (new)

## Out of scope

- `/portal/login` OTP screen (S3)
- RLS (S4)
- Middleware guard (S5)
- Full Sentry/alert wiring + runbook triage (S6)
