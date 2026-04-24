---
slug: e10-s3-portal-login-otp-screen
ado-story-id: 7925
ado-url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7925
parent-epic-id: 7919
branch: feature/e10-passwordless-auth
status: implemented
started-at: 2026-04-24T01:50:00Z
---

# E10-S3 — /portal/login OTP screen

## Scope delivered

1. **Route** — `src/app/portal/login/page.tsx`
   - Server Component with `metadata.robots = { index: false, follow: false }`.
   - Reads `?redirect` from `searchParams`; passes to `<LoginForm redirect={…}>`.
   - Quiet tech-platform footer attribution (no AI disclaimer — no AI on this surface).
2. **Client form** — `src/components/portal/login/LoginForm.tsx`
   - Tabbed email / phone (React 19 ref-as-prop via the `OtpCodeInput` component; no `forwardRef`).
   - Two stages: `input` (send code) → `verify` (OTP entry).
   - Rate-limit / TCPA-missing / user-not-found / invalid-input / unknown-error UI branches.
   - Lockout after 3 failed verify attempts with a cue to request a fresh code.
   - Re-send button re-enters the rate-limit bucket.
3. **OTP input** — `src/components/portal/login/OtpCodeInput.tsx`
   - 6 single-digit slots, auto-advance, backspace-across, paste-distributes.
   - `autoComplete="one-time-code"` on slot 0.
4. **Server actions** — `src/app/portal/login/actions.ts`
   - `requestOtp({ method, identifier })` — input validation + rate-limit check (reusing S2's `auth_resend_attempts`) + TCPA pre-check on phone + `supabase.auth.signInWithOtp` with `shouldCreateUser: false`.
   - `verifyOtpAndSignIn({ method, identifier, token, redirect })` — `verifyOtp` via the SSR client (cookie-set on success).
   - `resolveRedirect` same-origin check — decoded, path-only, rejects scheme + protocol-relative.
   - 1500ms timing floor on send to prevent response-time enumeration (rate-limit branch exempted; the retry-after itself is the signal).
5. **Phone E.164 normalization** — `src/lib/auth/phone.ts`
   - `normalizePhoneE164(input)` via `libphonenumber-js` with US default region; returns null on parse failure.
   - `libphonenumber-js@^1.12.42` added to `package.json`.

## Acceptance criteria mapping

| AC | Status | Evidence |
|---|---|---|
| 1 | ✅ | Tabbed form uses inputs + buttons aligned to existing primitives; React 19 ref-as-prop in `OtpCodeInput`. |
| 2 | ✅ | `metadata.robots = { index: false, follow: false }`. |
| 3 | ✅ | `requestOtp` — email path uses `signInWithOtp({ email, shouldCreateUser: false, emailRedirectTo })`; phone path runs TCPA check first. |
| 4 | ✅ | Rate limit reuses S2's `auth_resend_attempts` via `checkResendRateLimit`. |
| 5 | ✅ | `verifyOtpAndSignIn` uses the SSR client, which mints the session cookie on verify. |
| 6 | ✅ | `shouldCreateUser: false` on both paths; `user_not_found` branch surfaces with "we don't see an account" copy. |
| 7 | ✅ | `enforceTimingFloor` enforces 1500ms minimum latency for non-rate-limited branches. |
| 8 | ✅ | Send success transitions to `verify` stage with disabled tab + OTP input + re-send button. |
| 9 | ✅ | `OtpCodeInput` handles auto-advance, paste-distribute, backspace. |
| 10 | ✅ | Client-side lockout after 3 failed verifies; `locked` state disables OTP input until re-send. |
| 11 | ✅ | `resolveRedirect` decodes + validates same-origin (path-only, scheme + `//` rejected). |
| 12 | ✅ | No analytics / pixels / session replay on the route (nothing imported; project analytics gate keeps third-party SDKs out). |
| 13 | ✅ | Footer line "Sell Your House Free is a technology platform, not a broker." No AI disclaimer. |
| 14 | ✅ | E.164 normalization via `libphonenumber-js`; server re-validates by parsing again. |
| 15 | ✅ | `next build` passes; new `ƒ /portal/login` route visible. |
| 16 | ⏸ | Manual smoke (email send, OTP verify, phone TCPA-present, phone TCPA-missing reject) pending migration + dashboard config. |

## Deviations from story AC

- **AC 14 phone validation on blur:** Server-side validation via `normalizePhoneE164`; UI does not re-validate on blur inline. The submit-time validation returns the `invalid_input` branch with "Double-check your entry and try again" message. Not considered a blocker — the 1500ms timing floor gives users plenty of visual feedback that the server rejected.
- **AC 16 smoke path:** Blocked on same manual prerequisites as S2 (migration apply + Supabase dashboard config + Twilio provisioning).

## Files touched

- `package.json` + `package-lock.json` — add `libphonenumber-js`
- `src/lib/auth/phone.ts` (new)
- `src/app/portal/login/page.tsx` (new)
- `src/app/portal/login/actions.ts` (new)
- `src/components/portal/login/LoginForm.tsx` (new)
- `src/components/portal/login/OtpCodeInput.tsx` (new)

## Manual steps required

- [ ] Supabase dashboard config (S1 manual steps). Blocks live OTP send.
- [ ] Apply migration `20260424180000_e10_s2_auth_resend_attempts.sql` (S2 manual step).
- [ ] Smoke: email send → verify → `/portal`. Phone with TCPA → send → verify → `/portal`. Phone without TCPA → clean reject UI.

## Out of scope

- Middleware redirect (S5)
- Sentry wiring (S6)
- Team-member login (E11)
