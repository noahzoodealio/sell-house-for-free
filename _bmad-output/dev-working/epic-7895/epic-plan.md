---
epic-id: 7895
epic-title: "E9 — AI Agent Suite (Transaction Manager + Comping Agent)"
ado-url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7895
ado-work-item-type: Feature
ado-grandparent-epic: 7776
target-service: sell-house-for-free
branch: feature/e9-ai-agent-suite-7895
worktree: .claude/worktrees/feature-e9-ai-agent-suite-7895
autopilot-status: planning
started-at: 2026-04-23T00:00:00Z
architecture: _bmad-output/planning-artifacts/architecture-e9-ai-agent-suite.md
story-sidecars-root: _bmad-output/dev-working/
---

# E9 Epic Execution Plan — AI Agent Suite

## Sources of truth

- **Feature #7895** description: authoritative story table + "Critical sequencing" paragraph + posture.
- **Architecture** (`_bmad-output/planning-artifacts/architecture-e9-ai-agent-suite.md`): §§3–7 schemas, prompts, workflow design, story decomposition.
- **Filing sidecar** (`_bmad-output/story-working/e9-bulk-s1-to-s23/index.md`): per-story filing notes (decisions 4/6/9/10, schema-enforced disclaimer, workflow scaffold pattern).
- **Feedback memory**:
  - Epic autopilot = one branch (single feature branch, no per-story PRs/branches).
  - React 19 ref-as-prop (no `forwardRef`) for any UI primitive.
  - AI posture — tech platform, friend-style advice with three-part disclaimer.
  - Vercel preview-env gating idiom for any flag-gated UI (`AI_CHAT_ENABLED`).

## Posture invariants (carry across every story)

1. **Schema-enforced disclaimer.** Every artifact payload has a required `disclaimer: z.string().min(1)` field. Banner + card footers render the three-part claim: **AI / not a licensed real-estate professional / not a fiduciary**.
2. **`OfferAnalysisPayload.friendlyTake` required** — opinionated take is the product.
3. **Deterministic deviations.** S18's `applyDeviationsImpl` is a pure function; AC asserts no LLM imports.
4. **Gateway-only** provider wiring. No direct `@ai-sdk/anthropic` import. Model strings route through `createGateway({ apiKey })`.
5. **Env-var surface frozen at S2.** No Phase C story re-opens `.env.example` / `env-matrix.md`.
6. **Migration ordinals.** S1 → `0003_ai_tables.sql`, `0004_ai_storage_bucket.sql`. S4 → `0005_ai_ip_budgets.sql`. Phase C ships no new migrations. S16+ verify ordinals at PR time in case E6 interleaves.
7. **No third-party analytics** on agent traffic.
8. **Preview-env gating** for `AI_CHAT_ENABLED` thanks-page CTA.
9. **React 19 ref-as-prop** for every new component in `src/app/(app)/chat/components/`.

## Execution order (23 stories, linear autopilot)

Feature's Critical-sequencing paragraph allows some parallelism (S2/S3/S4/S7 inside Phase A; S8/S11/S16 across Phase B+C; S17/S18 inside Phase C). Autopilot processes one story at a time, so we serialize into a single dependency-respecting order. Higher-risk stories are not bumped earlier than their dependencies — risk surfacing happens in-flow.

### Phase A — Foundation (7 stories, S1–S7)

| Order | Story ID | Title | Depends on (within plan) | Strikes |
|---|---|---|---|---|
| 1 | 7896 | E9-S1 — Supabase migrations (ai_sessions, ai_messages, ai_tool_runs, ai_artifacts) + ai-docs bucket | — | 0 |
| 2 | 7897 | E9-S2 — AI Gateway client + model profiles + package install + env vars | — | 0 |
| 3 | 7898 | E9-S3 — Session lib + `/api/chat/sessions` route + cookie | S1, S2 | 0 |
| 4 | 7899 | E9-S4 — Budget + redact libs | S1, S2 | 0 |
| 5 | 7900 | E9-S5 — `/api/chat` streaming route + orchestrator prompt v0 | S2, S3, S4 | 0 |
| 6 | 7901 | E9-S6 — `/chat` page + `<Chat>` + `<DisclaimerBanner>` | S3, S5 | 0 |
| 7 | 7902 | E9-S7 — `docs/ai-agent-policy.md` + `AGENTS.md` append | — (ships before any Phase B domain tool) | 0 |

### Phase B — Transaction Manager capabilities (8 stories, S8–S15)

| Order | Story ID | Title | Depends on (within plan) | Strikes |
|---|---|---|---|---|
| 8 | 7903 | E9-S8 — `/api/chat/upload` + `src/lib/supabase/storage.ts` | S1, S2, S7 | 0 |
| 9 | 7904 | E9-S9 — `<DocUpload>` component + inline preview | S6, S8 | 0 |
| 10 | 7905 | E9-S10 — `review_pdf` tool + `DocSummarySchema` + prompt | S5, S7, S8 | 0 |
| 11 | 7906 | E9-S11 — `explain_terms` tool | S5, S7 | 0 |
| 12 | 7907 | E9-S12 — `analyze_offer` tool + `OfferAnalysisSchema` (friendlyTake required) + prompt | S5, S7, S8 | 0 |
| 13 | 7908 | E9-S13 — `<DocSummaryCard>` + `<OfferAnalysisCard>` | S6, S10, S12 | 0 |
| 14 | 7909 | E9-S14 — Orchestrator prompt v1 (tool heuristics + friend-style voice) | S10, S11, S12 | 0 |
| 15 | 7910 | E9-S15 — Thanks-page AI CTA (gated by `AI_CHAT_ENABLED` + preview-env idiom) | S6, S14 | 0 |

### Phase C — Comping Agent capabilities (8 stories, S16–S23)

| Order | Story ID | Title | Depends on (within plan) | Strikes |
|---|---|---|---|---|
| 16 | 7911 | E9-S16 — WDK `comp-run` workflow skeleton + steps 1-2 (find_comps + hydrate) | S2, S7 | 0 |
| 17 | 7912 | E9-S17 — `review_photos` tool + `PhotoAssessmentSchema` + prompt (vision) | S5, S7, S16 | 0 |
| 18 | 7913 | E9-S18 — `apply_deviations` pure function + AZ-zip seed table + 95%+ unit-test coverage | S16 | 0 |
| 19 | 7914 | E9-S19 — `aggregate_valuation` judge tool + `ValuationSchema` + prompt | S16, S17, S18 | 0 |
| 20 | 7915 | E9-S20 — `start_comp_job` orchestrator tool + `/api/chat/jobs/[id]` poll route | S5, S16, S19 | 0 |
| 21 | 7916 | E9-S21 — `<CompCard>` + `<ValuationPanel>` render components | S6, S19, S20 | 0 |
| 22 | 7917 | E9-S22 — Bootstrap session from `?bootstrap=submissionId` | S3, S6 | 0 |
| 23 | 7918 | E9-S23 — Chaos + smoke test suite (slow MLS, timeouts, zero-comp, budget-exhaust) | S20, S21 | 0 |

## Strike policy

- **Outer review loop (zoo-core-code-review):** 3-strike halt. At strike 3 on the same story, pause autopilot and surface: review report, last dev-story plan, 3 review verdicts. User decides retry / skip / takeover.
- **Inner unit-testing loop:** 3-iteration fix cap inside `zoo-core-unit-testing` (its own rule; separate from outer strikes).
- **EF migration halt:** n/a. Supabase migrations (`.sql`) apply via normal infra — S1 + S4 migration files are checked in with the story; no EF tooling here. If any Supabase migration PR comment asks the user to apply before continuing, autopilot pauses for confirmation (not counted as a strike).

## Compaction discipline

After each story closes out:
- Preserve `epic-plan.md` (this file) + per-story `_bmad-output/dev-working/{story-id}/` sidecar summary.
- Discard per-story deep context (tool outputs, file reads, search results).
- Re-enter the autopilot loop fresh; rehydrate from `epic-plan.md` + the next story's ADO record.

## Branch discipline

Single feature branch: `feature/e9-ai-agent-suite-7895` (worktree at `.claude/worktrees/feature-e9-ai-agent-suite-7895`). All 23 stories commit to this branch. No per-story branches. No per-story PRs. One PR at epic completion.

## Autopilot phases checklist

- [ ] Plan approved by user
- [ ] Phase A complete (S1–S7)
- [ ] Phase B complete (S8–S15)
- [ ] Phase C complete (S16–S23)
- [ ] `summary-report.md` written
- [ ] Feature #7895 state set to Ready For Testing (per ADO state feedback memory: In Development → Code Review → Ready For Testing)
