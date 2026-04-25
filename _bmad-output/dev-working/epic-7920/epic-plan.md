---
epic-id: 7920
epic-slug: e11-team-member-portal
epic-title: "E11 — Team-Member Portal (Unified TC / PM / Agent)"
parent-epic-id: 7776
target-service: sell-house-for-free
branch-strategy: single-branch
branch-name: feature/e11-team-member-portal
autopilot-status: complete
started-at: 2026-04-24T22:35:00Z
stories-planned:
  - id: 7929
    code: E11-S1
    title: "Schema additions + Storage buckets + RLS"
    size: M
    depends-on: []
    strike-count: 0
    status: pending
  - id: 7930
    code: E11-S2
    title: "Team magic-link auth (/team/login + callback)"
    size: S
    depends-on: []
    strike-count: 0
    status: pending
  - id: 7931
    code: E11-S3
    title: "Work queue home (/team)"
    size: M
    depends-on: [7929, 7930]
    strike-count: 0
    status: pending
  - id: 7932
    code: E11-S4
    title: "Submission detail view"
    size: L
    depends-on: [7929, 7930]
    strike-count: 0
    status: pending
  - id: 7933
    code: E11-S5
    title: "Messages thread + Resend inbound webhook"
    size: M
    depends-on: [7929]
    strike-count: 0
    status: pending
  - id: 7934
    code: E11-S6
    title: "Documents vault"
    size: M
    depends-on: [7929]
    strike-count: 0
    status: pending
  - id: 7935
    code: E11-S7
    title: "Handoff flow"
    size: M
    depends-on: [7932, 7933]
    strike-count: 0
    status: pending
  - id: 7936
    code: E11-S8
    title: "AI-context panel"
    size: S
    depends-on: [7932]
    strike-count: 0
    status: pending
  - id: 7937
    code: E11-S9
    title: "Admin roster"
    size: M
    depends-on: [7929, 7930]
    strike-count: 0
    status: pending
  - id: 7938
    code: E11-S10
    title: "Ops + observability"
    size: S
    depends-on: [7929, 7930, 7931, 7932, 7933, 7934, 7935, 7936, 7937]
    strike-count: 0
    status: pending
stories-completed:
  - { id: 7929, code: E11-S1,  commit: fd7a7a6, completed-at: 2026-04-24T22:58Z }
  - { id: 7930, code: E11-S2,  commit: ab27a32, completed-at: 2026-04-25T01:05Z }
  - { id: 7933, code: E11-S5,  commit: 9b4af8b, completed-at: 2026-04-25T02:20Z }
  - { id: 7934, code: E11-S6,  commit: aa3c79b, completed-at: 2026-04-25T03:44Z }
  - { id: 7932, code: E11-S4,  commit: 8a6aadc, completed-at: 2026-04-25T06:00Z }
  - { id: 7931, code: E11-S3,  commit: 4f516f9, completed-at: 2026-04-25T06:04Z }
  - { id: 7935, code: E11-S7,  commit: fd7772c, completed-at: 2026-04-25T06:12Z }
  - { id: 7936, code: E11-S8,  commit: dcf94ea, completed-at: 2026-04-25T06:14Z }
  - { id: 7937, code: E11-S9,  commit: fcd9958, completed-at: 2026-04-25T14:34Z }
  - { id: 7938, code: E11-S10, commit: 7190b72, completed-at: 2026-04-25T14:42Z }
---

# E11 Epic Execution Plan

## Source

- ADO Feature `7920` (filed under umbrella Epic `7776`, Sell Your House Free).
- Brief: `_bmad-output/epic-working/e11-team-member-portal/index.md`
- 10 child User Stories: 7929–7938.

## User override — single branch + single PR

Per `/zoo-core-dev-epic e11 do it all on 1 branch`, this epic deviates from the default per-story branch convention. **All 10 stories land on `feature/e11-team-member-portal`** with one commit per story (`e11-sN(<id>): <subject>`) and a single PR at epic close-out. Trade-off accepted: a larger PR review surface in exchange for reviewing the team portal as a coherent vertical slice; matches the E10 precedent (PR #21 bundled E10-S1 through E10-S6).

## Execution order (topological, sequential)

The Feature's stated critical path is `S1 → S2 → {S3, S4, S5, S6 parallel} → {S7, S8, S9 parallel} → S10`. Autopilot serializes this:

1. **S1 — Schema** *(blocks everything)*. Migration + 3 tables + 3 buckets + RLS helpers. **EF/Supabase migration halt expected** — autopilot pauses for user migration-application confirmation before continuing.
2. **S2 — Team magic-link auth**. Independent of S1 *technically* but required by every UI route; do early.
3. **S5 — Messages thread**. Pulled forward from the parallel set so S7 (handoff, depends on S5) is not blocked.
4. **S6 — Documents vault**. Independent of S5; pulled forward to derisk Storage RLS early.
5. **S4 — Submission detail view** *(L — largest)*. Renders summaries from S1/S5/S6 surfaces, exposes handoff button stub.
6. **S3 — Work queue home**. After S5 so unread-message count query is real (not stubbed).
7. **S7 — Handoff flow**. Needs S4 (UI surface) + S5 (messaging context).
8. **S8 — AI-context panel**. Slot into S4's detail view.
9. **S9 — Admin roster**. Independent surface; ordered late since it's its own page.
10. **S10 — Ops + observability**. Closeout — Sentry events, runbook, training doc, orphan-storage cron.

Tie-breaker: highest-risk surfaces (S1 RLS, S5 Resend HMAC webhook, S6 Storage signed URLs) front-loaded so any blocker surfaces early.

## 3-strike + halt rules

- **3-strike outer loop**: each story tracks `strike-count` for `zoo-core-code-review` verdicts of `fail`. Halt at 3.
- **Inner unit-testing loop**: 3-iteration fix cap inside `zoo-core-unit-testing` itself. Failure after that increments outer strike + halts for user.
- **EF/SQL migration halt**: S1 (migration), S5 (if it adds `notification_log` or alters `messages`), S6 (Storage policy migration), S9 (potentially `team_members.role` updates) — autopilot pauses for user to apply migrations to dev Supabase before continuing.
- **Architecture doc gap**: Brief noted `/zoo-core-create-architecture e11` should run before story decomposition is locked. Stories are already filed; proceeding on the feature description's locked decisions. Surface any per-story architectural ambiguity to user as it arises.

## Single-branch commit convention

```
git checkout -b feature/e11-team-member-portal
# Per story:
git commit -m "e11-sN(<ado-id>): <one-line subject>"
# At closeout:
gh pr create --title "E11 — Team-Member Portal" --base main
```

ADO status updates per story: `New → Active` on dev-story start, `Active → Resolved` on review pass, `Resolved → Closed` after PR merge (manual user step).

## Outputs

- `epic-plan.md` (this file) — source of truth, survives compaction.
- `per-story/<story-id>/` — sidecar per story (managed by `zoo-core-dev-story`).
- `summary-report.md` — written at epic close-out.

## References

- Feature brief: `_bmad-output/epic-working/e11-team-member-portal/index.md`
- ADO Feature: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7920
- Storage memory: `project_storage_supabase_only`
- Unified-role memory: `project_unified_team_role`
- AI disclaimer: `docs/ai-agent-policy.md`
- Anti-broker: `docs/anti-broker-audit.md`
- E10 PR precedent (single-branch): https://github.com/noahzoodealio/sell-house-for-free/pull/21
