---
slug: e10-s6-auth-ops-and-observability
ado-story-id: 7928
ado-url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7928
parent-epic-id: 7919
branch: feature/e10-passwordless-auth
status: implemented-awaiting-dry-run
started-at: 2026-04-24T02:50:00Z
---

# E10-S6 — Auth ops + observability

## Scope delivered

1. **Typed event helper** — `src/lib/auth/events.ts`
   - Discriminated union `AuthEventInput` over `seller_login_succeeded | seller_login_failed | seller_magic_link_expired | seller_login_resend`.
   - `trackAuthEvent(input)` — `import 'server-only'`. Routes through the existing `captureException` stub in `src/lib/pm-service/observability.ts` so when E8 swaps that body for a real Sentry SDK call, auth events ride along.
   - Payloads carry only `userId` / `identifierType` / `method` / `reason` — never raw email or phone.
2. **Observability module extension** — `src/lib/pm-service/observability.ts`
   - `SentryEventName` union widened with four auth event names.
   - `SAFE_EXTRA_KEYS` widened with `authMethod`, `authReason`, `identifierType`.
3. **Call sites wired**
   - `src/app/portal/auth/callback/route.ts` (S2) — success / expired / used / exchange_failed → structured events. Logs the Supabase `userId` on success only.
   - `src/app/portal/login/actions.ts` (S3) — every branch of `requestOtp` + `verifyOtpAndSignIn` emits a structured event (success, rate_limited, user_not_found, tcpa_missing, expired, invalid_code, exchange_failed).
4. **PII unit test** — `src/lib/auth/__tests__/events.test.ts`
   - 4 test cases covering all 4 event types.
   - Every assertion checks the serialized payload for absence of `@` (email leak canary).
   - A resend event with `identifierType: 'phone'` also asserts no leaked `+1` E.164 prefix.
5. **Runbook §13-§18** — `docs/pm-ops-runbook.md`
   - §13 "Seller can't log in — triage" — 7-step flow from "which method" to "nuke + re-send".
   - §14 "Session-revoke SOP" — when + how to revoke refresh tokens via Supabase dashboard.
   - §15 "Twilio error budget" — 10/day threshold, weekly review procedure, common error codes.
   - §16 "E10 Sentry alert rules" — login-failure rate (> 20/hr) + magic-link-expiry rate (> 5/hr). Both configured in dashboard when Sentry is wired live.
   - §17 "7-day dry-run" — gate for closing this story.
   - §18 "`auth_resend_attempts` retention" — 24h prune note for future cron.

## Acceptance criteria mapping

| AC | Status | Evidence |
|---|---|---|
| 1 | ✅ | `src/lib/auth/events.ts` exports `trackAuthEvent(input: AuthEventInput)` with discriminated union types. `import 'server-only'`. |
| 2 | ✅ | Callback route emits on every branch (success + expired + used + exchange_failed). |
| 3 | ✅ | `verifyOtpAndSignIn` emits on success (with userId) + all failure reasons. |
| 4 | ✅ | Resend path in `requestOtp` emits `seller_login_resend` when `attemptsInWindow > 0`. |
| 5 | ✅ | Phone TCPA-missing emits `seller_login_failed({ method: 'sms_otp', reason: 'tcpa_missing' })`. |
| 6 | ✅ | `events.test.ts` asserts absence of `@` in serialized payload across all event types. |
| 7 | ⏸ | Sentry alert rule 1 documented in runbook §16 — configured in the Sentry dashboard when E8 wires the SDK + on-call channel. |
| 8 | ⏸ | Sentry alert rule 2 documented in runbook §16 — same dependency. |
| 9 | ✅ | Twilio error budget documented in runbook §15 with threshold (10/day), review method, common error codes. |
| 10 | ✅ | Runbook §13 "Seller can't log in" — 7-step triage flow with Twilio + Resend + Supabase checkpoints. |
| 11 | ✅ | Runbook §14 "Session-revoke SOP". |
| 12 | ✅ | Runbook §12.8 "Do not" list (from S1) — already present; §18 retention adds one more. |
| 13 | ⏸ | 7-day dry-run — scheduled by user; story closes to "Ready for Testing" when thresholds verified with real data. |
| 14 | ✅ | `next build` passes; no regressions in tests (400 passed). Sentry DSN wiring is E8's responsibility. |
| 15 | ✅ | `auth_resend_attempts` retention note in runbook §18. |

## Deviations from story AC

- **ACs 7, 8 (Sentry alert rules configured live):** The structured events ship via `console.error` today (existing `captureException` stub). The two alert rules are documented in runbook §16 with exact queries + thresholds; the user or E8 will create them in the Sentry dashboard when the real SDK wiring lands. This matches story spec: "Coordinates with E8 (Sentry base wiring)" — if E8 ships first, these events flow; if this story ships first, the runbook entry becomes the to-do.
- **AC 13 (7-day dry-run):** Intentional. Runbook §17 defines the gate. This sidecar marks the story `implemented-awaiting-dry-run` rather than `closed` so ADO status can move to Ready for Testing after the user's dry-run signs it off.
- **No Sentry SDK installed:** E8 owns that. This story is additive on top of the existing stub and doesn't install `@sentry/nextjs`.

## Files touched

- `src/lib/auth/events.ts` (new)
- `src/lib/auth/__tests__/events.test.ts` (new)
- `src/lib/pm-service/observability.ts` (edit — widened `SentryEventName` + `SAFE_EXTRA_KEYS`)
- `src/app/portal/auth/callback/route.ts` (edit — replaced stub log with `trackAuthEvent` on every branch; logs `userId` on success)
- `src/app/portal/login/actions.ts` (edit — `trackAuthEvent` wired into `requestOtp` + `verifyOtpAndSignIn`)
- `docs/pm-ops-runbook.md` (edit — §13-§18 added)

## Manual / future steps

- [ ] 7-day dry-run once S1-S5 land in preview with a live email + phone smoke.
- [ ] Adjust rate-limit baselines (S1 §12.6) + Sentry thresholds (§16) with real data.
- [ ] Configure the 2 Sentry alert rules via dashboard when E8 Sentry wiring is live.
- [ ] Fill A2P 10DLC brand + campaign IDs into runbook §12.5 after Twilio registration.

## Out of scope

- Sentry SDK install + DSN wiring (E8)
- Scripted Twilio → Sentry poll (future)
- Seller-facing session-revoke UI (future)
- Multi-factor auth beyond OTP (future)
- Passkeys (future)
