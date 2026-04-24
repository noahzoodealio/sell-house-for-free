---
epic-id: 7919
epic-slug: e10-seller-passwordless-auth
epic-title: "E10 — Seller Passwordless Auth"
parent-epic-id: 7776
target-service: sell-house-for-free (this repo)
branch-strategy: single-branch (user override — all 6 stories commit onto one feature branch, single PR at the end)
feature-branch: feature/e10-passwordless-auth
stories-planned:
  - id: 7923
    slug: e10-s1-supabase-auth-provider-config
    title: "E10-S1 — Supabase Auth provider config"
    size: S
    depends-on: []
    risk: low
    strike-count: 0
    status: pending
  - id: 7924
    slug: e10-s2-portal-auth-callback
    title: "E10-S2 — /portal/auth/callback route + re-send UI"
    size: M
    depends-on: [7923]
    risk: medium
    strike-count: 0
    status: pending
  - id: 7925
    slug: e10-s3-portal-login-otp-screen
    title: "E10-S3 — /portal/login OTP screen"
    size: M
    depends-on: [7923, 7924]
    risk: medium
    strike-count: 0
    status: pending
  - id: 7926
    slug: e10-s4-seller-rls-and-portal-hydration
    title: "E10-S4 — Seller RLS + portal hydration from Supabase"
    size: M
    depends-on: [7924]
    risk: high    # migration + RLS — highest blast radius
    strike-count: 0
    status: pending
  - id: 7927
    slug: e10-s5-portal-auth-middleware
    title: "E10-S5 — Portal auth middleware"
    size: S
    depends-on: [7924, 7925, 7926]
    risk: medium
    strike-count: 0
    status: pending
  - id: 7928
    slug: e10-s6-auth-ops-and-observability
    title: "E10-S6 — Auth ops + observability"
    size: M
    depends-on: [7924, 7925, 7927]
    risk: low
    strike-count: 0
    status: pending
stories-completed: []
autopilot-status: planning
started-at: 2026-04-24T00:00:00Z
---

# E10 — Execution Plan (Dev Epic Autopilot)

## Branch strategy override

**User requested: all 6 stories commit onto ONE branch.** Deviation from `zoo-core-dev-story` default (per-story branches).

- **Feature branch:** `feature/e10-passwordless-auth` — cut from `main` once at start.
- **Commits:** one commit per story, message format `e10-s{N}({ado-id}): <summary>`. Matches recent-commit style (`e6-s8(7859): …`).
- **PR:** ONE PR at the end covering all 6 stories. No intermediate PRs.
- **Code review:** runs per story against the incremental diff just added to the branch (not a fresh branch each time).
- **ADO statuses:** each story moves `New → Active → Closed` as it lands, same as default.
- **EF migrations / Supabase migrations:** HALT before `supabase db push` for user confirmation (S1, S4 both touch dashboard/DB). Not a strike — a safety pause.

## Topological order (dependency-first, risk-breaking ties)

```
S1 (7923) ──► S2 (7924) ──┬──► S3 (7925) ──┐
                           │                │
                           └──► S4 (7926) ──┼──► S5 (7927) ──► S6 (7928)
                                            │
                           ┌────────────────┘
                           │
```

**Serial order for autopilot (dep-first, risk-first within tied deps):**

1. **S1 (7923)** — dashboard config only. No src diff. Must land before anything else.
2. **S2 (7924)** — callback route, `auth_resend_attempts` table + migration, `@supabase/ssr` install. Shared infrastructure; S3 + S4 both depend.
3. **S4 (7926)** — RLS migration + portal hydration rewrite. **Higher risk** than S3 (DB migration + policy coverage), chosen to surface migration/RLS blockers early before UI polish.
4. **S3 (7925)** — `/portal/login` OTP screen. Reuses S2's SSR client + rate-limit table; reuses S4's Supabase-first hydration path.
5. **S5 (7927)** — root `middleware.ts` guard. Needs S2 + S3 + S4 surfaces working first.
6. **S6 (7928)** — observability + runbook. Runs last per story AC (7-day dry-run gate). Deferred to user after S1-S5 land.

## Key risks + mitigations

- **Supabase migrations (S2 `auth_resend_attempts`, S4 RLS policies) require `supabase db push` to dev.** Autopilot will HALT at that step and ask the user to apply. Not a strike.
- **Provider-config story (S1) has no src diff** — commit is `.env.example` + `docs/pm-ops-runbook.md` only. The dashboard work is manual; autopilot documents the required steps and asks user to confirm they've been performed before proceeding to S2.
- **S6 7-day dry-run gate** — story AC says the story stays in "Code Review" for 7 days. Autopilot will complete the code changes + alerts config but will NOT close S6 (leaves it in-review) and will return control to the user for the 7-day wait.
- **`NEXT_PUBLIC_SUPABASE_*` env vars** — S1 requires Vercel env config. Autopilot adds `.env.example` entry + documents Vercel steps; cannot update Vercel env directly.
- **Twilio credentials** — S1 needs Twilio A2P 10DLC registration. Autopilot documents steps but cannot complete them (requires Twilio dashboard access). User must confirm before S3's phone path is exercised.
- **Architecture doc never filed.** Epic brief called for `/zoo-core-create-architecture e10` but decomposition proceeded without it. Story ACs are grounded in the brief + real code research — sufficient for dev per the bulk-story-prep sidecar flag. Proceeding without an arch doc.

## 3-strike rule

Applied to the outer `zoo-core-code-review` verdict. 3 fails on the same story → halt + surface review reports + last dev plan to user for decision (retry / skip / manual takeover).

Inner unit-testing loop has its own 3-iteration fix cap (separate from the outer review strike rule).

## Compaction policy

After each story closes out:
- Preserve `epic-plan.md` (this file) + per-story sidecar summary.
- Discard per-story working context (full file reads, test output, review comments).
- Re-enter the autopilot loop with `epic-plan.md` as orientation.

## Per-story sidecars

Each story's own flow (via `zoo-core-dev-story`) creates a sidecar at `_bmad-output/story-working/{story-slug}/`. This epic-level plan references them but does not duplicate their content.

## Close-out criteria

Epic 7919 closes when:
- All 6 stories move to Closed (or S6 to "Ready For Testing" awaiting 7-day dry-run, per its story AC).
- Single PR created from `feature/e10-passwordless-auth` → `main` with all 6 commits.
- `next build` passes on the branch tip.
- Summary report written to `summary-report.md`.
- Any EF/Supabase migrations have been applied to dev by the user.

## References

- Epic brief: `_bmad-output/epic-working/e10-seller-passwordless-auth/index.md`
- ADO Feature 7919: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7919
- Story bulk decomposition: `_bmad-output/story-working/e10-bulk-s1-to-s6/index.md`
- E6 revision (parent data model): `_bmad-output/story-working/e6-bulk-s1-to-s8/scope-revision-2026-04-23.md`
