---
slug: e6-scope-revision-2026-04-23
parent-sidecar: _bmad-output/story-working/e6-bulk-s1-to-s8/index.md
ado-feature-id: 7782
revised-at: 2026-04-23T00:00:00Z
revised-by: Noah
reason: scope-correction-pre-implementation
status: draft
---

# E6 Scope Revision — 2026-04-23

Revisions to the eight E6 stories (7823 / 7825 / 7827 / 7830 / 7832 / 7845 / 7852 / 7859) captured **before implementation begins**. Nothing in E6 has shipped yet (no `src/lib/pm-service/`, no `src/lib/email/`, `actions.ts:137` still has the `E6 owns the PM handoff write; stub for now.` placeholder). The ADO story IDs and hierarchy stay intact; bodies get rewritten before each story is picked up.

## What triggered the revision

Three discoveries during E6 pre-flight review:

1. **`/get-started/thanks` is dead in the production path.** `src/app/get-started/actions.ts:94` redirects to `/portal/setup?sid=…`, not `/thanks`. The `/thanks` page exists + is noindex + is still referenced by E2E tests and every E5/E6 architecture doc, but the live submit action has moved on. Rewriting `/thanks` as a PM-preview server component (E6-S6 as filed) ships a page that real users don't land on.
2. **We don't own the seller data locally.** The only persistence today is `offervana_idempotency` (submission_id, customer_id, referral_code, property_id, cached OffersV2 payload) + `offervana_submission_failures`. Name / email / phone / address live on Offervana's side. E6 as filed provisions Supabase for PM roster + assignments only — it does **not** add a `submissions` table. That leaves every downstream surface (team portal, AI agent context, seller login) round-tripping to Offervana or relying on `localStorage`.
3. **SendGrid is overkill for our scale + disclaimer posture.** Authoring two templates in the SendGrid web UI and stamping template IDs per environment (E6-S4 + E6-S7) is 60% of the email work. Resend + React Email collapses templates-in-Git and cuts a story.

## Changes by story

Each change is tagged as **Expand** (bigger scope than filed), **Rewrite** (different deliverable), **Cancel** (drop entirely), or **No change**.

### E6-S1 (7823) — Supabase provisioning + schema — **Expand**

Add three new tables to the S1 migration set (keeps the single-PR provisioning story intact):

- `profiles` — mirrors `auth.users`, holds `full_name`, `email`, `phone`, TCPA/terms consent version + timestamps. FK from `auth.users(id)`. Populated server-side at submit time via `supabase.auth.admin.createUser({ email, phone, email_confirm: false })` so the seller's first magic-link click is their "first login."
- `submissions` — the canonical seller-submission row. Keyed by `submission_id` (UUID), carries `seller_id → profiles`, `referral_code` (unique, ties to `offervana_idempotency`), property snapshot (address/beds/baths/sqft/zip/etc.), `seller_paths text[]`, timeline, status lifecycle (`new | assigned | active | closed_won | closed_lost`), `pm_user_id → team_members`, `assigned_at`.
- `submission_offers` — one row per Offervana-returned path (`cash | cash_plus | snml | list`) with low/high cents + raw payload. Eliminates the JSONB blob on `offervana_idempotency.offers_v2_payload` as a source of truth for the UI; that column becomes a dead-letter/debug trail.

The PM roster tables (`team_members`, `assignment_events`) and `assign_next_pm` RPC from the original S1 scope are unchanged. **Rename `pm_members` → `team_members`** across the migration to reflect the unified TC/PM/Agent role decision (E11).

RLS default-deny stays. Seller tables get policies in a later story when E10 (seller auth) lands — until then, service-role only.

### E6-S2 (7825) — Placeholder PM seed — **No change**

Still three placeholder rows for the `assign_next_pm` RPC smoke. Only rename: `pm_members` → `team_members` in the seed file + verify snippets.

### E6-S3 (7827) — PM service core — **Expand**

`assignPmAndNotify` now does four things instead of two:

1. Promote the Offervana result into a real `submissions` row (insert; idempotent on `submission_id`).
2. Auto-create the `auth.users` + `profiles` row for the seller (service-role, email-unconfirmed).
3. Pick a `team_member` via `assign_next_pm` RPC and write the `submissions.pm_user_id` + `assignment_events` initial row.
4. Enqueue two notification emails (seller confirmation + team-member notification) best-effort.

Contract `AssignInput` grows: in addition to the fields already specified, it takes the full seller form draft so we can populate `profiles` + `submissions` atomically. `AssignResult` stays the discriminated union; adds a `profileCreated: boolean` telemetry field.

### E6-S4 (7830) — Swap SendGrid → Resend — **Rewrite**

- Package: `resend` replaces `@sendgrid/mail`. Install `react` + `@react-email/components` for templates.
- `src/lib/email/send.ts` — lazy Resend singleton, 429/5xx retry with same backoff schedule (500/1000/2000ms), 3s abort per attempt, one `notification_log` row per attempt. Error-sanitization whitelist unchanged.
- `src/lib/email/templates/` — two React Email `.tsx` components (`SellerConfirmation.tsx`, `TeamMemberNotification.tsx`) replacing the SendGrid dynamic-template JSON + HTML uploads. Templates versioned in Git.
- `dynamic-data.ts` becomes the prop-shape contract for the React components; the JSON snapshot tests convert to rendered-HTML snapshot tests.
- Env vars: `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_REPLY_TO` (drop `SENDGRID_*` + `SENDGRID_TEMPLATE_*_ID` entries).

Vercel runtime-termination risk noted in the original S4 is unchanged.

### E6-S5 (7832) — Call-site wiring — **No change**

Still a single edit to `src/app/get-started/actions.ts`. Expanded `AssignInput` (see S3) means passing the full draft instead of the trimmed subset. Redirect target changes per S6 rewrite (see below) — no longer `/get-started/thanks?ref=…`, now `/portal/setup?sid=…&ref=…` (the `sid` already exists in current code; we're adding `ref` alongside it).

### E6-S6 (7845) — Confirmation page rewrite — **Rewrite**

Drop the `/get-started/thanks` rewrite entirely. Move the confirmation UI into `/portal/setup`:

- `/portal/setup/page.tsx` becomes a Server Component that reads `?sid=` + `?ref=` from search params, fetches `{ submission, pmPreview }` via `getAssignmentByReferralCode(ref)`, and renders the PM preview + submission ref **while the Offervana/offers polling continues in a client island below** (preserving the current setup page's polling-to-portal-transition UX).
- Three new Server Components under `src/components/portal/setup/`: `PmPreview`, `SubmissionRef`, `FallbackMessage`. Same fallback rules as the original S6 spec.
- `/get-started/thanks/page.tsx` + `thanks-ref.tsx` get **deleted**. `src/lib/routes.ts:40` entry removed. All five E2E specs that assert `/get-started/thanks?ref=…` (`enrichment-timeout`, `enrichment-no-match`, `enrichment-listed`, `enrichment-happy`, `e2e/support/seller-form.ts:110`) get updated to assert `/portal/setup?sid=…&ref=…`.

S6 size bumps **M → L** (the page-deletion + test sweep is real work).

### E6-S7 (7852) — Resend template content — **Rewrite**

Mostly cancellation — React Email templates are now in-repo TSX and versioned with code (authored in S4). S7 collapses to:

- Author final copy in both templates (subject lines, body text, TCPA footer).
- TCPA footer text coordinates with **E7** (unchanged dep).
- Delete the `email-templates/` HTML + plaintext reference files spec (no longer needed — Git *is* the reference).
- Verify send-a-real-email smoke from preview env to a real inbox + Resend's built-in deliverability report.

Size drops **S → XS**.

### E6-S8 (7859) — Ops runbook + prod roster + Sentry — **Expand**

Runbook now covers the expanded data model: adding/removing a seller account (not just a PM), re-sending a magic link, reading a `submissions` row for troubleshooting, understanding the `submission → assignment_events` trail. Sentry alerts unchanged (`pm_assignment_failed`, `pm_email_failed` event names are still the contract).

Prod roster migration renamed `pm_members` → `team_members` in the SQL. No functional change.

## New env vars (delta from original E6)

Add:
- `RESEND_API_KEY` (server-only)
- `EMAIL_FROM`, `EMAIL_REPLY_TO` (server-only)

Remove:
- `SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL`, `SENDGRID_REPLY_TO`
- `SENDGRID_TEMPLATE_SELLER_ID`, `SENDGRID_TEMPLATE_PM_ID`

Net: -5 + 3 = 2 fewer server-only secrets.

## Coordination with new epics

- **E10 (seller passwordless auth)** consumes `profiles` + `submissions` created here. First magic link goes out in E6's seller confirmation email — but the Supabase Auth UI + portal login routes + OTP fallback ship in E10.
- **E11 (team-member portal)** consumes `team_members`, `submissions`, `assignment_events` + requires `messages`, `documents` tables not added here. E11-S1 adds those.
- **E12 (property enrichments durable cache)** is independent of E6. Can ship any time after E6-S1 lands Supabase provisioning.

## ADO rework

Bodies of ADO stories 7823 / 7827 / 7830 / 7845 / 7852 / 7859 need to be rewritten before those stories are picked up for implementation. 7825 + 7832 absorb only the `pm_members` → `team_members` rename. None of the story IDs get canceled; sizes shift (S6 M→L, S7 S→XS).

Suggest running `/zoo-core-create-story e6` for each impacted story with `action=update-existing` when this revision is approved. The Feature (7782) body itself also needs a description refresh to reflect Resend + unified role + portal-setup confirmation.

## Open questions

1. **Who deletes `/get-started/thanks`?** E6-S6 as rewritten. Cleaner than a standalone cleanup PR.
2. **Does `/portal/setup` already render the poll UX we'd regress?** Need to inspect `src/app/portal/setup/page.tsx` during S6 implementation. The PM preview slot goes *above* whatever polling UI is there today.
3. **Is there a hidden consumer of `localStorage['sellfree:flow']` that needs the `sid`+`ref` params instead?** `src/components/portal/portal-data.ts:140` reads it. That seeding behaviour stays for now — E11 retires it when real data hydrates from Supabase.
