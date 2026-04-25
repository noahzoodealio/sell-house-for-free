---
epic-id: 7939
epic-url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7939
epic-slug: e13-ai-agent-data-tools
target-service: sell-house-for-free
stories-planned:
  - id: 7980
    slug: e13-s1-define-tool-and-retrofit
    depends-on: []
    blocks: [7981, 7982, 7983, 7984, 7986]
    size: M
    risk: low
    strike-count: 0
    status: pending
  - id: 7981
    slug: e13-s2-attom-tool-wrappers
    depends-on: [7980]
    blocks: [7985]
    size: M
    risk: low
    strike-count: 0
    status: pending
  - id: 7982
    slug: e13-s3-mls-tool-wrappers
    depends-on: [7980]
    blocks: [7985]
    size: S
    risk: low
    strike-count: 0
    status: pending
  - id: 7983
    slug: e13-s4-offervana-outer-api
    depends-on: [7980]
    blocks: [7985, 7986]
    size: M
    risk: high
    strike-count: 0
    status: pending
  - id: 7984
    slug: e13-s5-supabase-read-tools
    depends-on: [7980]
    blocks: [7985]
    size: M
    risk: medium
    strike-count: 0
    status: pending
  - id: 7985
    slug: e13-s6-prompt-and-planner
    depends-on: [7981, 7982, 7983, 7984]
    blocks: []
    size: S
    risk: medium
    strike-count: 0
    status: pending
  - id: 7986
    slug: e13-s7-budgets-and-ops
    depends-on: [7980, 7981, 7982, 7983, 7985]
    blocks: []
    size: M
    risk: medium
    strike-count: 0
    status: pending
stories-completed: []
autopilot-status: planning
started-at: 2026-04-25T20:42:30Z
---

# E13 Epic Execution Plan

Feature **7939** — AI Agent Data Tool Surface (ATTOM / MLS / Offervana / Supabase). Brief: `_bmad-output/epic-working/e13-ai-agent-data-tools/index.md`. PM working sidecar (story creation): `_bmad-output/story-working/e13-bulk-s1-to-s7/index.md`.

## Dependency graph

```
                    7980 (S1: defineTool foundation)
                    │
        ┌───────────┼───────────┬───────────┐
        │           │           │           │
       7981        7982        7983        7984
       (ATTOM)     (MLS)       (Offervana) (Supabase)
        │           │           │           │
        └───────────┴───────────┴───────────┘
                    │
                  7985 (S6: prompt + golden)
                    │
                  7986 (S7: budgets + ops + runbooks)
```

## Topological order with risk-based tie-breaking

Linear chain (single hand-off path through S6 → S7 funnels everything):

1. **7980 (S1)** — foundation. Lowest risk; landing this proves the contract before 28 new tools multiply it.
2. **7983 (S4)** — Offervana. **Highest risk** — only E13 story owning end-to-end (new client, new env var, seller-scope enforcement, customerId cross-check). Surface blockers early; ATTOM/MLS/Supabase wrappers are mechanical by comparison.
3. **7984 (S5)** — Supabase. Medium risk — RLS-trust, but E10/E11 RLS policies already merged. May surface gaps in RLS coverage.
4. **7981 (S2)** — ATTOM (12 tools). Low risk — thin wrappers over E12 clients merged 2026-04-25.
5. **7982 (S3)** — MLS (3 tools). Low risk — same pattern as S2, fewer tools.
6. **7985 (S6)** — prompt + golden conversations. Medium risk — model planner accuracy is non-deterministic; golden tests have to tolerate some stochasticity.
7. **7986 (S7)** — exit gate. Adds migration, Sentry events, kill switches, runbooks.

Risk-based tie-break put S4 second (after S1) so the highest-risk story surfaces blockers before the mechanical wrappers consume autopilot time. S2/S3 are easy and could parallelize, but the dev-epic skill is sequential per story by design.

## Per-story strike tracker

Outer review-loop strike count starts at 0 per story. Cap = 3. On hit-cap, halt autopilot + surface to user with: review report + dev-story's last plan + the 3 review verdicts.

Inner unit-testing 3-iteration loop is **separate** — that's the unit-testing skill's own retry budget, not an outer-loop strike.

## EF migration halt

E13 ships **only one migration** (S7's `e13_s7_tool_budgets.sql`). When that story's dev-story phase generates the migration, autopilot halts for explicit user confirmation before the migration is applied. Inherited from dev-story's own rule.

## Cross-cutting invariants to enforce in code-review per story

- **Read-only.** Grep for `method: 'POST'|'PATCH'|'DELETE'|'PUT'` in any new tool or client — must be zero hits.
- **server-only.** Every new file in `src/lib/ai/tools/` and `src/lib/offervana/` imports `'server-only'`.
- **No client bundle leakage.** Build, grep `.next/static/**` for `OFFERVANA_OUTER_API_KEY`, `ATTOM_API_KEY`, `MLS_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY` — zero hits.
- **defineTool everywhere (S2–S7).** Grep for direct `tool({...})` from `'ai'` outside `_define.ts` — zero hits.
- **Disclaimer present.** Every tool's `OutputSchema` includes `disclaimer: z.string().min(1)`.
- **Citation envelope.** Every tool returns `{source, retrievedAt}` (cacheHit where applicable).
- **PII redaction.** Grep for `redact(` usage in every tool file — at minimum on input-persist path.

## Compaction policy

After each story's close-out:
- Preserve `epic-plan.md` (this file) + per-story summary at `dev-working/epic-7939/per-story/{story-id}-summary.md`.
- Discard per-story working context (file diffs, test output, etc.).
- Re-enter the autopilot loop with fresh context.

## Halt conditions (autopilot-defined)

1. Outer review loop hits 3 strikes on any story → halt + surface to user.
2. EF migration generated by dev-story (S7 only) → halt for user confirmation.
3. Any unit-testing 3-iteration cap exhaustion → halt + surface (separate from outer strikes).
4. Cross-cutting invariant violation surfaced post-merge → halt before next story.
5. User intervention at any point.

## Open questions / deviations from skill

- **Architecture doc absent.** `/zoo-core-create-architecture e13` was the next-step in the brief but not run. The brief is dense enough to dev against. Each story's Technical Notes contain enough decisions to execute. If dev-story surfaces an architecture-level ambiguity, autopilot halts.
- **E11 soft dep.** Several team-only tool variants (S4 `getMyCustomerRecord`, S5 `listMyAssignmentEvents`) are stubbed in S4/S5 and only activate once E11 wires `/team/*` consumers. This is captured in the story ACs as `forbidden` stubs — not a blocker.

## Status

- Stories filed: ✅ 7 of 7
- Stories parent-linked: ✅ 7 of 7
- Autopilot status: **complete** — all 7 stories implemented on `feature/e13-ai-agent-data-tools` (renamed from `feature/e13-s1-define-tool`).
- 9 commits, 437/437 tests pass, tsc clean, build clean.
- Branch is local-only; S7 migration written but not applied. See `summary-report.md` for action items.
