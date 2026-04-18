---
slug: e6-pm-service-and-confirmation
ado-epic-id: 7782
ado-url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7782
ado-parent-epic-id: 7776
ado-parent-epic-url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7776
work-item-type: Feature
mode: mcp
action: update-existing
started-at: 2026-04-18T02:10:00Z
completed-at: 2026-04-18T02:13:00Z
---

# E6 — Project Manager Handoff & Confirmation — Epic Working Sidecar

## What this invocation did

**Enrichment, not creation.** ADO Feature **7782** already existed (rev 3, filed 2026-04-16 at plan-project time under parent Epic **7776**) with a pre-architecture description that named Supabase + SendGrid at a high level but left the schema, orchestrator shape, call-site wiring, and confirmation-page design undefined. This run replaced the description with a post-architecture body that mirrors the shape of E1 (7777) / E2 (7778) / E3 (7779):

- Parent / build-order / depends / feeds / scope header
- Summary grounded in architecture §1–§2 (six-step flow: Supabase project → `assign_next_pm` RPC with `FOR UPDATE SKIP LOCKED` → idempotency on `ReferralCode` → `assignPmAndNotify()` call from E5's actions.ts → `/get-started/thanks` Server Component rewrite → `server-only` guards on all server modules)
- Decisions locked (16 items) — Supabase, us-west-2, stored-procedure assignment, referral-code idempotency, least-recently-assigned round-robin, migrations-only roster, service-role access (no RLS), SendGrid direct, dynamic templates, shared sending domain, 5s RPC + 3s×3 email timeouts, best-effort email dispatch, Server Component confirmation page, first-name+photo only, sync-awaited inline call, no CAPTCHA on `/thanks`
- Deviations from Zoodealio baseline (5 items with justification) — SendGrid direct vs. Offervana `Integrations/`, Supabase vs. OffervanaDb, no Temporal, this-repo vs. Offervana_SaaS, no RLS
- Pattern anchors (8 items with Next.js 16 / Supabase / Postgres / SendGrid doc citations)
- Key module surface (new) — `src/lib/supabase.ts`, `src/lib/pm-service/{types,assign,read,config}.ts`, `src/lib/email/{send,templates,dynamic-data}.ts`, `src/components/confirmation/*`, `supabase/` tree
- Modified files (3) — `/get-started/thanks/page.tsx` body replacement, `actions.ts` call-site addition (E5-owned file), `routes.ts` verification
- Environment variables (10 new, all server-only) — Supabase URL + service-role key, SendGrid API key + from/reply-to + 2 template IDs, Offervana admin dashboard URL, optional contact-window override
- Packages added (`@supabase/supabase-js`, `@sendgrid/mail`, `server-only`)
- Out-of-scope list (9 items — explicit handoffs to E8 for rate-limit/Sentry/infra; defers admin UI, SMS/Slack, area-aware assignment, seller dashboard, Offervana_SaaS graduation)
- 10 feature-level Gherkin gates as Definition of Done (concurrency, idempotency, Supabase-outage fallback, PII-free confirmation HTML, email-failure resilience, empty-roster path, server-only bundle audit, preview-env E2E email delivery, Lighthouse LCP, RLS default-deny)
- 8-story decomposition with sizing + parallelism notes (S1 blocks all; after S3, S4/S5/S6/S7 run four-wide; S8 closes)
- References (architecture doc, plan doc, E3 handoff contract, E1 dep ownership, Zoodealio patterns, Offervana behavioral analog, Postgres/Supabase/SendGrid docs)
- Bleeding-edge Next.js 16 reminder + migration-application posture + prod-roster PII note

Rev bumped **3 → 4** in place. Hierarchy preserved (parent link to 7776 intact). Title preserved (`E6 — Project Manager Handoff & Confirmation`). Work item type preserved (`Feature`).

## Intentionally NOT in the Feature body

- Per-story acceptance criteria — those land on each child Story via `/zoo-core-create-story e6`.
- Full SQL migration bodies (four files totaling ~150 lines) — live in architecture doc §3.1 and will be materialized during S1 implementation.
- `AssignInput` / `AssignResult` / `PmPreview` TypeScript type bodies — live in architecture doc §4.1 and materialize in S3.
- SendGrid dynamic-template JSON payload shapes — live in architecture doc §4.3 and materialize in S4/S7.
- Pattern decision citations table with the "why" for each choice — lives in architecture doc §5 (kept out of the Feature body to avoid double-maintenance).
- `Microsoft.VSTS.TCM.ReproSteps` — left at the rev-3 skeleton content (ReproSteps is a bug-type field, unusual on a Feature; not rewritten to avoid unintended consumers). Matches E1/E3 precedent. If ADO reports read ReproSteps instead of Description, re-run targeted at that field.

## Inputs consumed

- `_bmad-output/planning-artifacts/architecture-e6-pm-service-and-confirmation.md` (full — §1 summary, §2 component diagram, §3 per-service changes, §4 integration contracts, §5 pattern decisions + deviations, §6 open questions, §7 story decomposition, §8 references)
- `_bmad-output/arch-working/e6-pm-service-and-confirmation/index.md` (architect working sidecar — scope snapshot, key design decisions, patterns surveyed, open questions)
- `_bmad-output/planning-artifacts/project-plan-sell-house-for-free.md` §4 E6, §7 Q11/Q11a (via architecture cross-references)
- Current Feature 7782 body, rev 3 (preserved tone for "trust posture" framing)
- ADO Feature 7779 (E3) — structural pattern for enriched Feature descriptions (HTML format, section order, gate phrasing, story-decomposition table shape)
- Inherited contracts: E3 arch §4.5 (E3 → E6 confirmation handoff), E1 arch §5 (E6 owns `@supabase/supabase-js` install)

## Decisions

- **Update in place, not a new Feature.** Matches E1 (7777), E2 (7778), E3 (7779) precedent; umbrella hierarchy was established at `/zoo-core-plan-project` time.
- **Work item type: Feature** (ADO semantics: Feature-under-Epic; the `Epic` in this skill's name is the BMad-naming convention).
- **Title preserved** as `E6 — Project Manager Handoff & Confirmation` (matches ADO; architecture doc title "PM Service and Confirmation" is the filesystem slug but not the work-item title).
- **AC style:** Feature-level Gherkin given/when/then, testable, anchored to runtime behavior and observable signals (concurrent-insert tests, Sentry events, bundle grep, Lighthouse, real inboxes) — not implementation detail.
- **HTML formatting:** ADO stores `System.Description` as HTML; sent explicit `<p>`/`<h2>`/`<ul>`/`<ol>`/`<table>`/`<code>` markup so bullets + code spans + tables render predictably. Arrows (`→`), em-dashes (`—`), and section symbols (`§`) sent as literal Unicode (rendered fine in E1/E2/E3).
- **Decisions-locked + Deviations split:** architecture doc §5 separates the two; kept that separation in the Feature body because the deviations explicitly push back on baseline patterns (`Integrations/`-only SendGrid, Temporal-for-reliability, OffervanaDb) and readers reviewing pattern adherence will want them called out explicitly rather than folded in.
- **10 Gherkin gates** (one more than E3's 11 scaled for a backend-heavy Feature) — concurrency + idempotency gates are the headline because `assign_next_pm` is the only place in the repo where correctness-under-concurrency matters; every other operation is either a single-user submit or a read.
- **8-story decomposition** — copied verbatim from architecture §7 with sizing preserved; chose not to re-split any story (S8 is intentionally a "closeout" larger than average because it folds in ops runbook + prod roster + Sentry alerts).

## Cross-service impact

**Minimal and contained.** E6 introduces exactly one new external system (a dedicated Supabase project `shf-pm-service`) and consumes one existing system (SendGrid via Zoodealio's shared sending domain). Per the architecture §1 impact table:

- `sell-house-for-free` — **authoritative**: new PM service code + Supabase client + email sender + confirmation page rewrite.
- **Supabase** (new `shf-pm-service` project, us-west-2) — **authoritative**: new schema for PM roster, assignments, notification log, and the `assign_next_pm` function.
- **SendGrid** (existing Zoodealio account) — **consumer**: new dynamic templates (seller confirmation, PM notification). No account or schema changes.
- **Offervana_SaaS** — **read-only upstream consumer via E5**. E6 does **not** call Offervana back. Offervana's contribution is the `ReferralCode` / `CustomerId` / `UserId` from E5's `CreateHostAdminCustomer` response, plus the dashboard URL the PM email deep-links to.

The `CustomerLeadSource` enum additions needed for path differentiation (`SellYourHouseFree`, `SellYourHouseFree_Renovation`) are **E5's** responsibility, not E6's. E6 only passes `pillarHint` through for confirmation-page + email-template data.

## Parent hierarchy

```
Epic 7776 — Sell Your House Free (AZ) — Client-Facing Marketing & Submission Funnel
├── Feature 7777 — E1 Site Foundation & Design System              (enriched)
├── Feature 7778 — E2 Core Marketing Pages + Trust Surface         (enriched)
├── Feature 7779 — E3 Seller Submission Flow (front-end)           (enriched)
├── Feature 7780 — E4 Property Data Enrichment (ATTOM + MLS)       (rev 2)
├── Feature 7781 — E5 Offervana Host-Admin Submission              (rev 3)
├── Feature 7782 — E6 Project Manager Handoff & Confirmation       ← this run
├── Feature 7783 — E7 AZ Compliance & Anti-Broker Disclosure       (rev 3)
└── Feature 7784 — E8 Launch Readiness                             (rev 1)
    └── (Stories S1–S8 for E6 to be filed via /zoo-core-create-story e6)
```

## Next steps

1. Review rendered Feature at https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7782 — confirm wording matches house style and the pattern matches E1/E2/E3.
2. Run `/zoo-core-create-story e6` to decompose the 8 stories (S1–S8) as ADO User Stories under Feature 7782.
3. E6 implementation is gated on:
   - **E1-S5** (route shell + marketing layout — unblocks every sibling Feature).
   - **E3-S1** (at minimum a stub `/get-started/thanks/page.tsx` to replace; E3 landed this).
   - **E5** architecture + S1 (for `ReferralCode` + call-site shape in `actions.ts`). E5's own Feature is rev 3 and ready; architect the remaining E5 work first if that's the critical-path sequencing call.
4. In parallel, architecture doc for E8 (7784) is still needed — E6's observability requirements (`pm_assignment_failed` / `pm_email_failed` alerts) feed into E8's Sentry project + alert-rule setup.

## Not done

- `Microsoft.VSTS.TCM.ReproSteps` not rewritten (see "Intentionally NOT" above).
- No child Stories created — that's `/zoo-core-create-story`'s job.
- No ADO comment added — description replacement is self-documenting via rev history; E1/E2/E3 precedent didn't add comments either.
- PM agent's `_bmad/memory/zoo-core-agent-pm/ado-history.md` not updated — the memory file doesn't exist yet (only `_bmad/memory/zoo-core/` is present). Skill mentions optional append; skipping for now to avoid creating an unestablished memory surface. If PM-agent memory gets set up later, this Feature's "enriched E6 per E1/E2/E3 precedent — in-place update, Feature type, Gherkin feature-level gates, 8-story decomposition" phrasing pattern is worth recording.
