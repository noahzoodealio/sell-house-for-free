---
slug: e6-bulk-s1-to-s8
parent-epic-id: 7782
parent-epic-url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7782
ado-grandparent-epic-id: 7776
ado-grandparent-epic-url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7776
mode: bulk
mode-ado: mcp
stories-planned:
  - e6-s1-supabase-provisioning-and-client
  - e6-s2-placeholder-pm-seed
  - e6-s3-pm-service-core
  - e6-s4-sendgrid-integration
  - e6-s5-e5-call-site-wiring
  - e6-s6-confirmation-page-rewrite
  - e6-s7-sendgrid-template-content
  - e6-s8-ops-runbook-and-observability
stories-created:
  - id: 7823
    url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7823
    title: "E6-S1 — Supabase provisioning + schema migrations + server client (getSupabaseAdmin + server-only guard)"
    size: M
  - id: 7825
    url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7825
    title: "E6-S2 — Placeholder PM seed + local dev harness + assign_next_pm end-to-end smoke"
    size: S
  - id: 7827
    url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7827
    title: "E6-S3 — PM service core: types + assignPmAndNotify orchestrator + getAssignmentByReferralCode + config (stubbed emails)"
    size: M
  - id: 7830
    url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7830
    title: "E6-S4 — SendGrid integration: send.ts + templates.ts + dynamic-data.ts (retry + backoff + notification_log per attempt)"
    size: M
  - id: 7832
    url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7832
    title: "E6-S5 — Wire assignPmAndNotify into E5 actions.ts between Offervana success and /thanks redirect"
    size: S
  - id: 7845
    url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7845
    title: "E6-S6 — Confirmation page rewrite: Server Component /get-started/thanks + PmPreview + SubmissionRef + FallbackMessage"
    size: M
  - id: 7852
    url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7852
    title: "E6-S7 — Author SendGrid Dynamic Templates (seller confirmation + PM notification) + stamp template IDs per environment"
    size: S
  - id: 7859
    url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7859
    title: "E6-S8 — Ops runbook + production PM roster migration + Sentry alert rules (pm_assignment_failed / pm_email_failed)"
    size: M
started-at: 2026-04-18T02:20:00Z
completed-at: 2026-04-18T02:38:00Z
last-completed-step: 5
revised-at: 2026-04-23T21:40:00Z
revised-by: Noah (via /zoo-core-create-story e6 action=update-existing)
revision-doc: scope-revision-2026-04-23.md
stories-revised:
  - id: 7782
    change: Feature body rewrite — reflect expanded data model (profiles/submissions/submission_offers), Resend + React Email, /portal/setup confirmation, team_members rename
  - id: 7823
    change: Expand — add profiles/submissions/submission_offers tables; rename pm_members → team_members; 18 ACs
    size: M
  - id: 7825
    change: No functional change — rename pm_members → team_members in seed + verify snippets + runbook
    size: S
  - id: 7827
    change: Expand — AssignInput takes full seller draft; 4-step orchestrator (insert submission + submission_offers / create auth.users + profiles / assign team_member / enqueue emails); AssignResult adds profileCreated
    size: M
  - id: 7830
    change: Rewrite — Resend + React Email replaces SendGrid; templates as TSX in src/lib/email/templates/; drop 5 SENDGRID_* env vars, add RESEND_API_KEY + EMAIL_FROM + EMAIL_REPLY_TO
    size: M
  - id: 7832
    change: Rewrite — full draft passthrough via expanded AssignInput; redirect target now /portal/setup?sid=…&ref=… (was /get-started/thanks)
    size: S
  - id: 7845
    change: Rewrite — move confirmation UI into /portal/setup (PmPreview + SubmissionRef + FallbackMessage above existing polling island); delete /get-started/thanks + thanks-ref.tsx + 5 E2E specs
    size: L (was M)
  - id: 7852
    change: Rewrite / collapse — final TSX template copy + TCPA footer + preview smoke; drop email-templates/ reference files (Git IS the reference); no SendGrid UI work
    size: XS (was S)
  - id: 7859
    change: Expand — runbook covers seller account lifecycle (profiles/submissions/assignment_events); rename pm_members → team_members in prod-roster SQL; Sentry event names unchanged
    size: M
---

# E6 bulk S1→S8 — PM Working Sidecar

## Plan

Eight stories decomposing Feature **7782** per architecture §7. Sequencing per architecture critical path:

- **S1 blocks all** — Supabase provisioning + schema + server client is the foundation
- **S2 gates S3** — placeholder seed so `assign_next_pm` is end-to-end testable
- **S3 gates S4 / S5 / S6** — orchestrator types + `assignPmAndNotify` must exist before anyone wires a call site
- **S4, S5, S6, S7 run four-wide** once S3 lands
- **S8 closes** — ops runbook + prod roster + Sentry alerts require Ops input + E8 Sentry access

Filing order: S1 → S2 → S3 → S4 → S5 → S6 → S7 → S8. Non-contiguous ID sequence (7823 / 7825 / 7827 / 7830 / 7832 / 7845 / 7852 / 7859) — concurrent work in Offervana_SaaS inflated ID gaps, but monotonic order preserved across E6 stories. No collisions.

All eight filed as User Story children under Feature 7782 via `wit_add_child_work_items` with area/iteration path `Offervana_SaaS`, matching siblings 7785–7821 (E1 + E2 + E3 stories).

## Execution log

### Filed in order

1. **7823** — E6-S1 Supabase provisioning + schema + server client. 18 ACs. Four migrations from architecture §3.1 verbatim, `getSupabaseAdmin()` singleton with lazy env-guard throw, `import 'server-only'` as first line. Ten env vars added to `.env.example` in one go (architecture §3.4) — single-diff visibility into E6's secret surface. `@supabase/supabase-js` + `@sendgrid/mail` + `server-only` installed here so S4 avoids a lockfile-churn PR. Manual `supabase db push`; CI never auto-applies (patterns.md halt-for-confirmation baseline extended to Supabase). `pg_get_functiondef` verifies `assign_next_pm` body + `pgcrypto` extension enabled + RLS default-deny probe.
2. **7825** — E6-S2 Placeholder PM seed + local dev harness. 14 ACs. Three-PM seed from architecture §3.1 (Jordan / Morgan / Taylor, all `.placeholder@sellyourhousefree.com`, `coverage_regions='{all}'`, `active=true`, no phone/photo — S6's initials fallback must be exercised). `on conflict (email) do nothing` for idempotent reset. Four RPC smoke snippets committed to `supabase/verify.sql` with `-- reference only` header: first assign, idempotent re-call, three-way round-robin fairness, `E6_NO_ACTIVE_PMS` (P0001) reproduction. Runbook sections: Local reset flow, Verifying the RPC, Seed file rules (explicit PII-forbidden rule).
3. **7827** — E6-S3 PM service core. 21 ACs. Five new files under `src/lib/pm-service/` + `__tests__/`. `AssignInput` locked to architecture §4.1 verbatim (hard contract with E5-S5 call site). `AssignResult` discriminated union on `ok`. `AbortController` + 5s `RPC_TIMEOUT_MS` wrapping `.abortSignal()` on PostgREST builder (not `Promise.race`). Error classification: `E6_NO_ACTIVE_PMS` P0001 → Sentry `critical`; timeout → `error`; generic → `error`. `Promise.allSettled` for two email dispatches. Email stubs in separate file `email-stub.ts` for surgical S4 swap. `server-only` on every file. Sentry event names `pm_assignment_failed` + `pm_email_failed` locked as S8 alert-rule contract. Seven test paths covered.
4. **7830** — E6-S4 SendGrid integration. 24 ACs. Three files under `src/lib/email/`: `send.ts` (lazy-singleton SendGrid init, 429/5xx-only retry with 500/1000/2000ms precomputed backoff, 3s `AbortController` per attempt, `Retry-After` header honored, one `notification_log` row per attempt with 1-indexed `attempt` + per-attempt `status` transitions `retry_pending`→`sent`/`failed`, `sanitizeSendGridError` whitelist strip of `email`/`phone`/`to`/`from` JSON keys + 500-char truncation), `templates.ts` (env-backed IDs with `E6_EMAIL_ENV_MISSING` throw), `dynamic-data.ts` (pure functions matching architecture §4.3 JSON exactly — snapshot-tested). Barrel swap from `email-stub` → `email/send`; `email-stub.ts` deleted. Acknowledges Vercel runtime-termination risk on long retries as acceptable MVP degradation (architecture §5 deviation 3).
5. **7832** — E6-S5 E5 call-site wiring. 18 ACs. Exactly one file edited (`src/app/get-started/actions.ts`) plus optional test edit. One import + one `await assignPmAndNotify({…})` + two `console.log` lines + a load-bearing positioning comment. All `AssignInput` fields passed verbatim from E5's Offervana response + seller form data. `phone` passed as `undefined` not coerced. `pillarHint` plumbed through from upstream (coordination gate with E5 if not yet present). No try/catch (contract says orchestrator never throws). Redirect URL `/get-started/thanks?ref=${encodeURIComponent(referralCode)}` unchanged. Log prefix `[e6.assign]` is stable for E8's future Sentry-breadcrumb mapping. Failure mode coverage spelled out manually (Supabase unreachable, no-active-PMs, partial-email-fail).
6. **7845** — E6-S6 Confirmation page rewrite. 24 ACs. Body replacement of `/get-started/thanks/page.tsx` (E3 landed the stub) + three new Server Components under `src/components/confirmation/` (`PmPreview`, `SubmissionRef`, `FallbackMessage`). `await searchParams` for Next.js 16. `ref` type-narrowed with `typeof !== 'string'` fallthrough covering array/missing cases. `getAssignmentByReferralCode` is the only data source. Missing row → `FallbackMessage` (architecture §5 decision 12: fallback is a happy-path render, NOT an error boundary). Copy-to-clipboard as a `'use client'` micro-island, not a full-page client conversion. `CONTACT_WINDOW_HOURS` read from `pm-service/config.ts` (single source of truth with S7's email templates). `buildMetadata({ noindex: true })`. LCP < 2.5s + zero third-party requests (beyond va.vercel-scripts.com). Copy coordination hooks to E2 (tone) and E7 (TCPA — but this page is factually-transactional, not marketing).
7. **7852** — E6-S7 SendGrid template content. 20 ACs. Mostly non-code story — SendGrid UI work + five committed files under `email-templates/` (README + 2 HTML + 2 plaintext as reference copies for disaster recovery). Variable binding locked to architecture §4.3 exactly on both templates. Handlebars conditionals for optional fields (`pm_photo_url`, `seller_phone`). Plaintext authored by hand (SendGrid auto-plaintext is bad). Open + click tracking explicitly DISABLED on both (trust posture + deliverability). Seller template uses `{{unsubscribe_url}}` for CAN-SPAM; PM template does NOT (internal transactional). E7 cross-epic dep: prod template publishing blocked on TCPA footer wording; dev/preview ship with `<!-- TODO(E7) -->`. Prod template IDs in Vercel held off until E7 + S8.
8. **7859** — E6-S8 Ops runbook + prod roster + Sentry alerts. 21 ACs. Closeout story. `docs/pm-ops-runbook.md` with nine sections (Add/Disable/Re-assign/Re-send/Outage/Migration apply/Alerts/Ownership/What-we-didn't-automate). `supabase/migrations/20260420000000_seed_prod_roster.sql` — real PMs + DELETE of placeholders — conditionally committed per PII sensitivity call; uncommitted path documented. Sentry alert rules: `pm_assignment_failed` severity=critical → PagerDuty (throttle 1/min), `pm_email_failed` → Slack #launch-alerts (throttle 5/min). Synthetic alert-testing via `Sentry.captureMessage` spelled out as AC. Prod env stamping gated on all prerequisites green (including E7 footer). Real PM photos optimized to ≤ 100KB / ≤ 200x200 in `public/pm/`. Zero `src/` changes (except coordinated Sentry stub → real swap with E8).

### Content decisions (cross-story patterns)

- **Section cadence** matches E1/E2/E3 sibling stories (banner → User story → Summary → Files touched → Acceptance criteria → Technical notes → Suggested tasks → Out of scope → References → Notes). Reader familiarity preserved across features.
- **AC counts scale with correctness-sensitive surface.** S1 (18), S2 (14), S3 (21), S4 (24), S5 (18), S6 (24), S7 (20), S8 (21). S3 + S4 + S6 + S8 earn more ACs because they define contracts, cross-service integrations, or operational responsibility. S2 and S5 are tight, contained stories.
- **Hard contracts explicit in technical notes.** S3's `AssignInput` (E5-S5 consumes verbatim); S3's `AssignResult` discriminated union + Sentry event names `pm_assignment_failed` / `pm_email_failed` (S4/S8 consume); S4's `dynamic_template_data` JSON shape (S7 consumes); S6's `AssignmentView` shape (already S3-defined). Every hard contract calls out "don't break this later" in its Notes section.
- **Bleeding-edge Next.js 16 call-outs.** S1 `import 'server-only'` positioning; S3 `.abortSignal()` PostgREST builder chain + `.maybeSingle()` vs `.single()`; S4 `sgMail.setApiKey` module-global state idiom; S5 `redirect` throws-signal + no try/catch around the orchestrator; S6 `await searchParams` + RSC island pattern + no `force-dynamic`; S7 SendGrid Handlebars + version-per-environment. Every story's Notes tail pins the single most-likely training-data regression.
- **Architecture §5 decisions + deviations threaded through.** Decision 1 (dedicated Supabase project) → S1. Decision 3 (idempotency in RPC, not orchestrator) → S3. Decision 7 (SendGrid Dynamic Templates, not MJML) → S4/S7. Decision 9 (Server Component confirmation) → S6. Decision 11 (PM preview first-name + photo only, no email/phone) → S3 type + S6 component. Decision 12 (best-effort email, don't block redirect) → S3 / S4 / S5. Deviation 7 (sync inline call) → S5.
- **PII discipline threaded.** S3 Sentry extras cannot include `seller.email/phone/address`. S4 `sanitizeSendGridError` whitelist strip. S5 `[e6.assign]` log payload is referral code only. S6 `<PmPreview>` test scans output for forbidden tokens. S7 PM template is the only surface with seller PII; seller template has no PM email/phone. Multi-layer defense; every story carries some of the weight.
- **E8 hand-offs.** Sentry event names (S3), log prefix `[e6.assign]` (S5), stub `captureException` (S3) → S8's real Sentry wiring. `pm-ops-runbook.md` synthesizes ops-relevant content from every sibling.

### Bulk-mode compaction

Each story drafted individually and filed via `wit_add_child_work_items` immediately (one item per call; monotonic order). Per-story deep context discarded between drafts. Feature 7782 body + architecture §7 decomposition table re-referenced by memory rather than re-fetched; file re-reads avoided after step 2.

### Style match to E1 + E2 + E3 siblings

- Same HTML vocabulary (`<h2>`, `<ul>`, `<ol>`, `<code>`, `<strong>`, `<em>`). One table-like structure used (S3's seven-path AC list as numbered sub-items within one `<li>`) — simpler than a `<table>` in ADO's HTML stripped renderer.
- Same area/iteration path (`Offervana_SaaS` / `Offervana_SaaS`), state `New`, priority `2`.
- `Microsoft.VSTS.TCM.ReproSteps` auto-populated by ADO with the same HTML — matches E1/E2/E3 siblings.

### Format bug avoided (E2 lessons applied)

All eight stories filed with `format: "Html"` placed **inside each item object** (not top-level). E2's bug (stories stored as markdown-escaped HTML) avoided from story 1. Confirmed via API responses: every story shows `"multilineFieldsFormat":{"System.Description":"html","Microsoft.VSTS.TCM.ReproSteps":"html"}`.

## Not done

- No tags assigned (matches E1/E2/E3 precedent).
- No assignees, no sprint iteration (matches precedent; sprint planning will assign).
- Did not append patterns to `zoo-core-agent-pm/ado-history.md` — directory still doesn't exist.
- No inter-story `Related` links filed in ADO. Hierarchy (Parent) link is on each story pointing at 7782; sibling dependencies documented in each story body under the header.
- Figma frames not fetched — architecture noted PM photos + confirmation UI coordinate with E2 during pickup, not at decomposition.
- Did not verify whether E5's `actions.ts` exists in the current tree; S5 includes a `TODO(E5)` stub-behind fallback if E5 isn't merged yet.

## Revision pass (2026-04-23)

Ran `/zoo-core-create-story e6 action=update-existing` after the scope-revision doc was authored. All eight story bodies + Feature 7782 description rewritten in place on ADO via `wit_update_work_item` (`System.Description` + `System.Title` as needed). Format `html` preserved; ReproSteps left untouched (auto-populated clones of the original draft).

Titles updated to reflect revised scope:
- 7823: "Supabase provisioning + schema (profiles/submissions/submission_offers + team_members/assignment_events) + assign_next_pm RPC + getSupabaseAdmin"
- 7825: "Placeholder team_members seed + local dev harness + assign_next_pm end-to-end smoke"
- 7827: "PM service core: assignPmAndNotify (promotes submission + creates seller profile + assigns team_member + enqueues emails) + getAssignmentByReferralCode"
- 7830: "Resend + React Email integration: send.ts + templates/*.tsx (retry + backoff + notification_log per attempt); drop email-stub.ts"
- 7832: "Wire assignPmAndNotify into E5 actions.ts (full draft passthrough) between Offervana success and /portal/setup redirect"
- 7845: "Move confirmation UI into /portal/setup (PmPreview + SubmissionRef + FallbackMessage); delete /get-started/thanks route + thanks-ref.tsx + update 5 E2E specs"
- 7852: "Finalize Resend template copy (seller + team-member TSX); delete email-templates/ HTML/plaintext reference files; send-a-real-email smoke"
- 7859: "Ops runbook (team_members + seller-account lifecycle) + prod team_members roster migration + Sentry alert rules"

IDs preserved throughout. Hierarchy links untouched. Sentry event names (`pm_assignment_failed` / `pm_email_failed`) remain the S3→S8 contract.

One wit_update_work_item call failed on the first try (S5, 7832) with `Expected array, received string` — escaping backticks inside JSON template-literal examples broke parsing. Retried without literal backticks and succeeded. Lesson: avoid backticks in `updates[].value` strings when pushing via MCP JSON tools.

## Next steps

1. Review the eight rendered stories on ADO: 7823, 7825, 7827, 7830, 7832, 7845, 7852, 7859. Spot-check HTML rendering (no escaped `<p>` bug from E2's S1–S9).
2. Feature 7782 is now fully decomposed — E6 is ready for sprint planning.
3. **Critical path for parallel work:** S1 unblocks all. S2 unblocks S3. S3 unblocks S4/S5/S6 (three parallel contributors). S7 also parallel after S4. S8 closes — requires every other story + E7 footer + E8 Sentry project.
4. E6 implementation is gated on:
   - **E5** at least architected + S1-through-S-whatever that introduces `actions.ts` with Offervana return values (S5 can proceed behind a stub if not).
   - **E1-S5** for `/get-started` route shell (E3 + E5 already depend on this).
   - **E3-S1** for `/get-started/thanks` stub to replace (E3 landed this; confirmed by E3 bulk sidecar).
5. E8 architecture doc should be authored next (still missing per epic-working sidecar "Next steps 4"). E6's Sentry + observability asks (event names, alert-rule shape) are now concrete and can feed E8's architecture pass.
6. E7 architecture + stories needed to unblock S7's prod template publishing.
