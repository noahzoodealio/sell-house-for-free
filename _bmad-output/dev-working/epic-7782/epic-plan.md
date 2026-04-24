---
epic-id: 7782
epic-slug: e6-pm-service-and-confirmation
epic-url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7782
target-service: sell-house-for-free
mode: autopilot
autopilot-status: complete
started-at: 2026-04-24T00:00:00Z
stories-planned:
  - { id: 7823, slug: e6-s1-supabase-schema-and-rpc,       depends-on: [],           strike-count: 0, status: done,    size: M,  risk: medium, parallel-group: 1, pr: 20 }
  - { id: 7825, slug: e6-s2-placeholder-seed-and-smoke,    depends-on: [7823],       strike-count: 0, status: done, size: S,  risk: low,    parallel-group: 2 }
  - { id: 7827, slug: e6-s3-pm-service-core,               depends-on: [7823, 7825], strike-count: 0, status: done, size: M,  risk: high,   parallel-group: 3 }
  - { id: 7830, slug: e6-s4-resend-and-react-email,        depends-on: [7823, 7827], strike-count: 0, status: done, size: M,  risk: high,   parallel-group: 4a }
  - { id: 7832, slug: e6-s5-actions-ts-call-site-wiring,   depends-on: [7827],       strike-count: 0, status: done, size: S,  risk: low,    parallel-group: 4b }
  - { id: 7845, slug: e6-s6-portal-setup-confirmation,     depends-on: [7827, 7832], strike-count: 0, status: done, size: L,  risk: medium, parallel-group: 5 }
  - { id: 7852, slug: e6-s7-email-copy-finalization,       depends-on: [7830],       strike-count: 0, status: done, size: XS, risk: low,    parallel-group: 6 }
  - { id: 7859, slug: e6-s8-ops-runbook-and-sentry-alerts, depends-on: [7823,7825,7827,7830,7832,7845,7852], strike-count: 0, status: done, size: M, risk: medium, parallel-group: 7 }
stories-completed:
  - { id: 7823, outcome: pass, closed-at: 2026-04-24T19:50:13Z, pr: 20, commit: "2127005" }
---

# E6 — PM Service & Confirmation — Epic Execution Plan

Autopilot run for Feature **7782** (parent Epic **7776**, repo `sell-house-for-free`). Eight user stories filed, none shipped. Scope reflects the 2026-04-23 revision: Resend + React Email (not SendGrid), `/portal/setup` confirmation (not `/get-started/thanks`), expanded schema with `profiles` + `submissions` + `submission_offers`, unified `team_members` (TC/PM/Agent badges).

## Target service

`sell-house-for-free` (this repo). All E6 code lives here. Supabase project + Resend account are external dependencies but not code targets.

## Dependency graph (topological)

```
S1 (7823) ──┬──► S2 (7825) ──► S3 (7827) ──┬──► S4 (7830) ──► S7 (7852) ──┐
            │                               ├──► S5 (7832) ──► S6 (7845) ──┤
            │                               └──────────────────────────────┤
            └───────────────────────────────────────────────────────────────└──► S8 (7859)
```

- **S1 blocks everything** — migrations + `getSupabaseAdmin` extension.
- **S2 gates S3** — seed needed for RPC smoke + orchestrator tests.
- **S3 gates S4/S5/S6** — orchestrator types + `AssignInput`/`AssignResult`/`PmPreview` contracts.
- **S4 gates S7** — templates must exist before copy finalization.
- **S5 gates S6** — redirect target must be in place before portal/setup reads.
- **S8 closes** — requires every sibling + E7 (TCPA) + E8 (Sentry).

## Execution order (serial, autopilot)

| # | Story | Why this slot |
|---|-------|---------------|
| 1 | **S1 (7823)** | Foundation. Highest risk surfaces first — migration apply is a manual halt. |
| 2 | **S2 (7825)** | Small + low-risk; unblocks the contract-heavy S3. |
| 3 | **S3 (7827)** | Contract-defining. Must solidify `AssignInput` / `AssignResult` / `PmPreview` / Sentry event names before any consumer picks them up. |
| 4 | **S4 (7830)** | Email integration. Swaps the S3 email stub. Before S5 so the call-site redirect tests don't see stub output. |
| 5 | **S5 (7832)** | Single-file wiring into `actions.ts`. Cannot merge until S3 + S4 lock the call signature + real send path. |
| 6 | **S6 (7845)** | Largest story (L). Deletes `/get-started/thanks` + sweeps 5 E2E specs. Runs after redirect target lands. |
| 7 | **S7 (7852)** | Copy pass on templates + real-inbox smoke. XS — could be collapsed into S4 but ADO-filed separately. |
| 8 | **S8 (7859)** | Closeout. Ops runbook + prod roster migration + Sentry alert rules. External deps (E7 TCPA footer, E8 Sentry project, real team photos, real roster) may force partial halts. |

Parallelism columns in frontmatter reflect theoretical concurrency — this autopilot runs them serial for context-size safety.

## Known halt points (expected, not strikes)

1. **S1 — migration apply.** `supabase db push` on migrations that create `profiles`, `submissions`, `submission_offers`, `team_members`, `assignment_events`, `notification_log`, and `assign_next_pm` RPC. Autopilot halts with the migration files staged and waits for user to run the apply command. Not a strike.
2. **S1 — env vars.** `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` already exist (E5/E9 used them). New vars: `SUPABASE_ANON_KEY`, `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_REPLY_TO`, `EMAIL_CONTACT_WINDOW_HOURS`, `PM_ASSIGN_TIMEOUT_MS`. Added to `.env.example`; the user's `.env.local` is their responsibility.
3. **S4/S7 — Resend account setup.** Domain verification + DKIM/DMARC + preview API key. Autopilot can install the SDK + write code + unit-test against a mock; cannot verify DNS. Final send-a-real-email smoke in S7 will need user-provided API key.
4. **S7 — E7 TCPA footer.** `TODO(E7)` stub acceptable per story body; doesn't halt.
5. **S8 — prod roster + photos.** Real PM names/emails/photos are user-provided. The migration file is conditionally committed per PII sensitivity. Sentry alert rules depend on E8's Sentry project.

## 3-strike rule

Outer review loop (`zoo-core-code-review` verdict):
- `pass` → close story, advance.
- `pass-with-issues` → record + advance.
- `fail` → strike + loop back to `zoo-core-dev-story`.
- 3 strikes → halt, surface to user.

Inner `zoo-core-unit-testing` loop has its own 3-iteration cap (separate from strike count). If unit-testing exhausts after 3 iterations, strike count increments and outer loop halts for user decision.

## Per-story sidecars

Each story gets its own working dir under `_bmad-output/dev-working/{story-id}/` managed by `zoo-core-dev-story` itself. Summaries land in `_bmad-output/dev-working/epic-7782/per-story/{story-id}.md` at close-out so this epic sidecar stays orientation-sized.

## Cross-story contracts (load-bearing — do not break)

- **`AssignInput`** — full seller draft + offers[]; `phone: undefined` (never `""`). Locked in S3; consumed verbatim by S5.
- **`AssignResult`** — discriminated union on `ok: true|false`. Orchestrator never throws.
- **`PmPreview`** — `{ firstName, photoUrl }` only. Type itself must not expose email/phone.
- **Sentry event names** — `pm_assignment_failed` (critical) + `pm_email_failed` (error). S3 locks → S8 alerts on.
- **Redirect URL** — `/portal/setup?sid=${submissionId}&ref=${encodeURIComponent(referralCode)}`.
- **Idempotency keys** — `submission_id` at orchestrator, `referral_code` UNIQUE at RPC, `(submission_id, path)` UNIQUE on `submission_offers`.
- **`notification_log`** — one row per attempt, sanitized `error_reason` ≤ 500 chars.
- **Disclaimer posture** — three-part AI/tech-platform disclaimer on seller email (marketing-adjacent) but NOT on team-member email or `/portal/setup` (transactional).
- **Server-only + RLS default-deny** — every `src/lib/pm-service/**` + `src/lib/email/**` file starts with `import 'server-only'`; all E6 tables have RLS enabled with no policies (service-role bypasses; seller policies deferred to E10).

## Pre-flight observations (refinements from the filed story bodies)

1. **Supabase project already exists** — E5 + E9 migrations are live. E6-S1 language about "provisioning new `shf-pm-service` project (us-west-2)" is stale; this codebase shares one Supabase project. Apply the new migrations to the existing project instead of provisioning a new one. `src/lib/supabase/server.ts` already exports `getSupabaseAdmin`; extend `schema.ts` rather than create a new module.
2. **`/get-started/thanks/page.tsx` + `thanks-ref.tsx` exist today.** S6 deletion targets confirmed present.
3. **`src/app/portal/setup/page.tsx` exists.** S6 will edit in place, not create from scratch. Polling island from E9 must not regress.
4. **Existing migrations for E5/E9** follow `YYYYMMDDHHMMSS_{slug}.sql` naming — E6 migration files should follow the same convention (not the `20260420000000_*` placeholders in the story body).
5. **Branch-per-story workflow** — each story gets `feature/e6-s{n}-{slug}-{story-id}` matching recent E5 and E9 precedent in git log.

## Not in scope

- Seller RLS policies (deferred to E10).
- `messages` + `documents` tables (deferred to E11-S1).
- Admin UI for team roster management (deferred).
- SMS / Slack seller notifications (deferred).
- Area-aware / tier-aware assignment (deferred; round-robin only).
- Production Sentry alert wiring (E8 provides the project; S8 consumes).
- TCPA footer wording (E7 authoritative source).

## References

- Feature 7782: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7782
- Architecture doc: `_bmad-output/planning-artifacts/architecture-e6-pm-service-and-confirmation.md`
- Story sidecar: `_bmad-output/story-working/e6-bulk-s1-to-s8/index.md`
- Scope revision: `_bmad-output/story-working/e6-bulk-s1-to-s8/scope-revision-2026-04-23.md`
- E5 sibling (pattern reference): `_bmad-output/dev-working/epic-7781/epic-plan.md`
- Existing Supabase scaffold: `src/lib/supabase/server.ts`, `src/lib/supabase/schema.ts`
- Existing migrations: `supabase/migrations/20260423*.sql`
