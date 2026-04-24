---
epic-id: 7782
epic-slug: e6-pm-service-and-confirmation
pr: https://github.com/noahzoodealio/sell-house-for-free/pull/20
branch: feature/e6-s1-supabase-schema-and-rpc-7823
started-at: 2026-04-24T00:00:00Z
completed-at: 2026-04-24T21:55:00Z
autopilot-status: complete
---

# E6 — PM Service & Confirmation — Epic Summary

All 8 stories closed. Zero strikes on the outer review loop. One human checkpoint (S1 Supabase migration apply).

## Per-story outcomes

| # | ID | Slug | Size | Outcome | Commit |
|---|-----|------|------|---------|--------|
| 1 | 7823 | e6-s1-supabase-schema-and-rpc | M | pass | 2127005 |
| 2 | 7825 | e6-s2-placeholder-seed-and-smoke | S | pass | a42c898 |
| 3 | 7827 | e6-s3-pm-service-core | M | pass | 11df456 |
| 4 | 7830 | e6-s4-resend-and-react-email | M | pass | 448ccd6 |
| 5 | 7832 | e6-s5-actions-ts-call-site-wiring | S | pass | 237b369 |
| 6 | 7845 | e6-s6-portal-setup-confirmation | L | pass | 8c28e1a |
| 7 | 7852 | e6-s7-email-copy-finalization | XS | pass | 8aee5d3 |
| 8 | 7859 | e6-s8-ops-runbook-and-sentry-alerts | M | pass | 10a919f |

## Aggregate metrics

- **Stories completed:** 8 / 8
- **Strikes:** 0
- **Commits on E6 branch:** 8
- **Files added:** ~30 (pm-service, email, portal/setup components, migrations, runbook, templates)
- **Files deleted:** 2 (`/get-started/thanks/page.tsx`, `/get-started/thanks/thanks-ref.tsx`)
- **Migrations applied:** 5 to shared Supabase project `vzgjdfcdgpidmzglfjmr`
- **Unit tests added:** 19 (`pm-service/assign.test.ts` ×10, `email/send.test.ts` ×9). All green.
- **E2E specs swept:** 5 from `/thanks` → `/portal/setup`.
- **ADO transitions:** 8 (New → Done on every child story)
- **Packages added:** `resend`, `@react-email/components`, `@react-email/render`

## Contracts established (do not break downstream)

- `AssignInput`, `AssignResult` (discriminated), `PmPreview` in `src/lib/pm-service/types.ts`.
- Sentry event names `pm_assignment_failed` + `pm_email_failed` (S3 emit; S8 alert spec).
- `notification_log` per-attempt row schema (submission_id, recipient_type, recipient_email, template_key, attempt 1-indexed, status retry_pending|sent|failed, provider, provider_message_id, error_reason).
- Redirect URL `/portal/setup?sid=<uuid>&ref=<referralCode>`.
- Idempotency keys: `submission_id` at orchestrator (UNIQUE on `submissions`), `referral_code` UNIQUE on `submissions`, `(submission_id, path)` UNIQUE on `submission_offers`, lowercased email UNIQUE on `profiles`.
- `assign_next_pm(p_submission_id uuid)` RPC signature.
- Three-part AI/tech-platform disclaimer posture: present on seller email, NOT on team-member email or `/portal/setup`.

## Patterns observed (curate-memory candidates)

1. **Filed story bodies drift from repo reality.** The original story bodies were drafted before E5 + E9 landed; they assumed a blank Supabase slate that no longer matched. The 2026-04-23 scope revision captured this partially; the dev-epic still needed per-story deviation tracking during implementation. Pattern: reconcile pre-filed story bodies against current repo state *before* committing to scope; note deviations explicitly in per-story summary.
2. **Supabase typed client (`SupabaseClient<Database>`) fights additive schema evolution.** v2.104's generic inference expects a full shape with `Views` / `Enums` / `CompositeTypes` / `Relationships`. The cost of satisfying it outweighs the runtime benefit for this codebase. Kept the client untyped; row types exported from `schema.ts` and applied at call sites as needed. Pattern: prefer explicit caller-side typing over generic-parameter typing when the underlying library's inference is brittle.
3. **Resend v6 SDK rejects AbortSignal.** The SDK takes `(payload, CreateEmailRequestOptions)` where options don't include `signal`. Implemented timeout via `Promise.race`. Pattern: for providers that don't accept AbortSignal, per-attempt idempotency keys + per-attempt log rows detect post-timeout double-dispatch; accept the wasted round-trip as MVP degradation.
4. **Scrum User Story states in this ADO project are `{New, Done, Closed, Removed}` — no Active or Resolved.** Direct New → Done transition works via `wit_update_work_item`. Pattern: query `wit_get_work_item_type` first when state names are uncertain.
5. **Rolling single branch vs. branch-per-story.** User preference: all E6 stories on one branch + one PR. Faster human review (one diff) + no rebase churn, but less granular revert capability. Works well when dev-epic output is high-confidence.
6. **Orchestrator "never throws" contract pairs with discriminated-union result.** Callers (S5 `actions.ts`) don't wrap in try/catch; failure paths are type-checked. Forces explicit handling of every failure reason. Scales better than exception-based flow for best-effort orchestration with multiple independent failure modes.
7. **PII sanitization allow-list beats block-list.** `observability.ts:SAFE_EXTRA_KEYS` + `send.ts:SENSITIVE_KEYS` — explicit allow-list for Sentry extras, explicit block-list for provider error keys. Allow-list prevents accidental PII leak when new fields surface. Block-list is appropriate for external-error-body sanitization where fields are unpredictable.

## Follow-up items surfaced (not addressed in this epic)

- **E2E suite end-to-end run** against the live Supabase + Offervana + Resend stack. Regex updates in the 5 specs are syntactically correct but unexercised.
- **E7 (TCPA footer).** `src/lib/email/templates/disclaimer.tsx` has `TODO(E7)` stub. Prod email dispatch should be gated on this landing.
- **E8 (Sentry wiring).** `src/lib/pm-service/observability.ts:captureException` emits to `console.error`. E8 swaps the body for `Sentry.captureException` using the locked event names + severity contract.
- **Prod roster migration.** `supabase/migrations/20260424170500_e6_s8_seed_prod_roster.sql.example` is a template. Ops authors the concrete version locally + applies via `supabase db push` at launch; not committed if it contains PII.
- **Real PM photos.** Need `public/pm/<name>.jpg` files (≤100KB, ≤200×200) for the production roster cutover.
- **Resend domain verification.** DKIM + DMARC must be green on `sellyourhousefree.com` before prod email dispatch. Zoodealio infra owns.
- **Offer-path unit audit.** `offersFromPayload` in `actions.ts` maps `cash-plus` → `cash_plus`. Current `mapOffersV2ToPortal` only produces three tile keys (`cash-plus`, `snml`, `cash`) — the `list` path in `SubmissionOfferPath` never populates from `submission_offers`. If the marketing copy promises a "list" path range, a future story needs to surface it (probably from a separate Offervana endpoint).
- **`userId` in AssignInput is always null.** `OffervanaOkPayload` doesn't expose the long user ID. If E11 team portal needs the Offervana user ID for deep-linking, coordinate with E5 to extend the payload.
- **`sellerPaths` derivation in `buildAssignInput`.** Currently derives from `draft.currentListingStatus` — a single-element array. The scope revision describes `seller_paths` as a multi-path checkbox set; if the form collects multiple explicit path checkboxes later, update the mapping.

## Known-unknowns / pending verifications

- Supabase Auth admin direct INSERTs into `auth.users` (used in `supabase/verify.sql`) may trip triggers on the hosted project. Snippets are reference-only; not exercised against the shared remote DB in this epic.
- `portal/setup` is now dynamic (reads searchParams + DB); verify cache + revalidation behavior doesn't regress the perceived-instant redirect UX in production.
- `[e6.assign]` log prefixes are uncorrelated with the Vercel serverless runtime lifetime; long retries on Resend may be terminated before `notification_log` updates complete. Acknowledged MVP degradation.

## What changed vs. epic-plan.md

- Branch strategy: originally planned per-story branches with PRs; user requested rolling single branch. No data loss, just different review topology.
- Migration count: 5 (not 4 per the architecture doc) due to the `profiles` + `submissions`/`submission_offers`/`assignment_events` split in the scope revision.
- Package installs concentrated in S4 (not S1) per the revised scope. S1 added zero packages; S4 added 3.
- `server-only` wasn't installed by S1 because it was already present from prior epics.

## PR

https://github.com/noahzoodealio/sell-house-for-free/pull/20 — title `E6 (7782): PM Service & Confirmation — S1..S8`, body updated with full epic summary + validation + follow-ups.
