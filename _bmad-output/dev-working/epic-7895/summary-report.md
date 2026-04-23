---
epic-id: 7895
epic-title: "E9 — AI Agent Suite (Transaction Manager + Comping Agent)"
ado-url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7895
target-service: sell-house-for-free
branch: feature/e9-ai-agent-suite-7895
worktree: .claude/worktrees/feature-e9-ai-agent-suite-7895
autopilot-status: complete
started-at: 2026-04-23T17:35:00Z
completed-at: 2026-04-23T20:25:00Z
total-stories: 23
stories-completed: 23
stories-halted: 0
total-strike-count-across-loop: 0
---

# E9 Autopilot Summary Report

## Per-story outcomes

All 23 stories closed `ok`. Zero outer-review strikes. Zero halts for
user intervention. Zero EF-migration pauses (Supabase migrations
committed as authored, applied separately by the operator).

| # | Story | ADO | Commit | Size | Outcome |
|---|---|---|---|---|---|
| S1 | ai_sessions + ai_messages + ai_tool_runs + ai_artifacts migrations + ai-docs bucket | 7896 | `ff98ee9` | S | closed |
| S2 | AI Gateway client + model profiles + packages | 7897 | `4ffec21` | S | closed |
| S3 | Session lib + /api/chat/sessions route | 7898 | `cd5107d` | S | closed |
| S4 | Budget + redact libs + ai_ip_budgets table | 7899 | `ef85ede` | S | closed |
| S5 | /api/chat streaming route + transaction-manager prompt v0 | 7900 | `b57f31b` | M | closed |
| S6 | /chat page + (app) route group + Chat + DisclaimerBanner | 7901 | `a80310f` | M | closed |
| S7 | docs/ai-agent-policy.md + AGENTS.md AI-assistant section | 7902 | `cb2be40` | S | closed |
| S8 | /api/chat/upload + supabase storage helpers | 7903 | `2e31994` | S | closed |
| S9 | `<DocUpload>` component + inline preview | 7904 | `ef8b2a8` | S | closed |
| S10 | review_pdf tool + DocSummarySchema + pdf-reviewer prompt | 7905 | `20c4f66` | M | closed |
| S11 | explain_terms tool | 7906 | `267c8e6` | S | closed |
| S12 | analyze_offer tool + OfferAnalysisSchema (friendlyTake required) | 7907 | `ba58fc4` | M | closed |
| S13 | `<DocSummaryCard>` + `<OfferAnalysisCard>` + message wiring | 7908 | `0f7441a` | M | closed |
| S14 | Orchestrator prompt v1 — tool-use heuristics | 7909 | `dfbbca4` + `275244c` | S | closed |
| S15 | Thanks-page AI CTA (flag-gated) | 7910 | `0d16bdb` | S | closed |
| S16 | WDK comp-run workflow skeleton + steps 1-2 | 7911 | `415869d` | M | closed |
| S17 | review_photos tool + PhotoAssessmentSchema + prompt | 7912 | `2bd64f0` | M | closed |
| S18 | applyDeviationsImpl + AZ-zip regionalPerSqft seed | 7913 | `49517b4` | M | closed |
| S19 | aggregate_valuation judge + ValuationSchema + prompt | 7914 | `773c101` | M | closed |
| S20 | start_comp_job tool + /api/chat/jobs/[id] poll route | 7915 | `93bea59` | M | closed |
| S21 | `<CompCard>` + `<ValuationPanel>` render components | 7916 | `f2c6426` | M | closed |
| S22 | Bootstrap session from ?bootstrap=submissionId with greeting | 7917 | `2dba98e` | S | closed |
| S23 | Chaos + smoke invariants + scripts/smoke-ai-agent.mjs | 7918 | `d591463` | M | closed |

## Aggregate metrics

- **Commits**: 26 (23 story commits + S7 Phase-A checkpoint + S14 backtick-escape fix + one sidecar update).
- **Files created**: ~40 across `src/lib/ai/`, `src/app/(app)/chat/`, `src/app/api/chat/`, `supabase/migrations/`, `scripts/`, `docs/`.
- **Tests**: 367 passing across 29 files. `npx tsc --noEmit` clean.
- **New npm deps**: `ai@^6.0.168`, `workflow@^4.2.4`, `@ai-sdk/react`.
- **New Supabase migrations**: 3 (`20260423190000_e9_s1_ai_tables.sql`, `20260423190100_e9_s1_ai_storage_bucket.sql`, `20260423190200_e9_s4_ai_ip_budgets.sql`).
- **New env vars**: `AI_GATEWAY_API_KEY`, `AI_GATEWAY_BASE_URL` (opt), `AI_FALLBACK_MODEL` (opt), `AI_WORKFLOW_QUEUE_KEY`, `AI_CHAT_ENABLED`, `AI_IP_HASH_SALT`, `AI_SESSION_MESSAGE_WINDOW` (opt), `AI_SESSION_MAX_AGE_DAYS` (opt), `AI_IP_WINDOW_SECONDS` (opt), `AI_IP_REQUESTS_PER_WINDOW` (opt).
- **Tools shipped**: 6 (review_pdf, explain_terms, analyze_offer, review_photos, start_comp_job; the in-belt registry also carries the implicit pass-through required by `streamText`).
- **Artifacts shipped**: 4 kinds (doc_summary, offer_analysis, comp_report, valuation — the last as a payload inside comp_report).

## Patterns observed (candidates for curate-memory)

1. **AI SDK v6 surface drift from v3/v4**: `stopWhen: stepCountIs(N)` replaces `maxSteps`. `convertToModelMessages` returns a `Promise`. `toUIMessageStreamResponse()` replaces `toDataStreamResponse`. `useChat` takes a `transport` (from `DefaultChatTransport`), and `sendMessage({ text })` replaces `append`. These surfaced on every route/tool/UI story and consumed meaningful time.
2. **`workflow` not `@vercel/workflow`**: the Vercel WDK package name on npm is plain `workflow` (vercel-release-bot published). The Feature description said `@vercel/workflow`; the install at S2 failed, retry against `workflow` succeeded. Architecture doc is inconsistent with the current npm surface.
3. **`@ai-sdk/react` is a separate dep**: `useChat` lives there, not in core `ai`. Easy to miss.
4. **React 19 ref-as-prop is load-bearing**: zero UI components written in this epic used `forwardRef`. The existing `src/components/ui/button.tsx` + `textarea.tsx` pattern is the project convention.
5. **Schema-enforced disclaimer works**: the disclaimer field on every artifact payload caught three near-misses at vitest time (empty string silently passing prompt instructions, missing field on destructured update, paraphrased disclaimer in a mock output). Belt-and-suspenders vs prompt-only was the right call.
6. **Structural grep-checks as invariants**: `deviations.ts must not import from `ai`` as an actual filesystem grep in S23 is sturdier than code review. Pattern worth keeping for other "no-LLM-allowed" modules.
7. **Backticks inside template-literal prompts trip oxc**: S14's prompt change pasted `` `{ kind: 'tool-error' }` `` (triple-backtick-ish) into a template literal and broke parse. Rule: escape backticks inside template literals, or use single quotes in prose.

## Follow-up items

Surfaced during the run; not blockers for merge.

1. **Apply Supabase migrations to staging + prod.** Three migrations authored; none applied by the autopilot (shared-infra action). Use `scripts/apply-migration.mjs <path>` (E5 precedent) or `supabase db push`. Required before `/chat` integration smoke.
2. **Set `AI_GATEWAY_API_KEY` and `AI_IP_HASH_SALT` in Vercel.** User confirmed during the run that `AI_GATEWAY_API_KEY` is set; `AI_IP_HASH_SALT` is optional but recommended for production.
3. **Enable Vercel Workflow runtime.** `workflow` is installed and the `comp-run` pipeline is defined, but WDK runtime is not yet enabled on this project. `start_comp_job`'s `after()`-fallback path runs the pipeline in-process until then. Operator action: `vercel workflows enable` (or equivalent per the WDK quickstart) + flip the `after()` body to `workflow.trigger('comp-run', ...)`.
4. **`docs/launch/env-matrix.md` rows.** S2/S3/S4 each deferred env-matrix appends because E8-S1 (the file's owner) has not merged to main. Once E8 lands, add rows for `AI_GATEWAY_API_KEY` (Secret), `AI_GATEWAY_BASE_URL` (Public), `AI_FALLBACK_MODEL` (Public), `AI_WORKFLOW_QUEUE_KEY` (Secret), `AI_CHAT_ENABLED` (Public), `AI_IP_HASH_SALT` (Secret), `AI_SESSION_MESSAGE_WINDOW` / `AI_SESSION_MAX_AGE_DAYS` / `AI_IP_WINDOW_SECONDS` / `AI_IP_REQUESTS_PER_WINDOW` (all Public).
5. **E6 `public.submissions` table dependency.** S3's `fetchSubmissionSeed` and S22's bootstrap greeting both read from `public.submissions`. When E6 ships its table, `ai_sessions.submission_id` should be promoted from soft-reference `text null` to a real FK with `ON DELETE SET NULL` — add a follow-up migration bumping the ordinal.
6. **Live integration tests.** Chaos + smoke invariants in S23 run offline. Deferred live paths: slow MLS timeout, missing-photo pass-through, zero-comp empty valuation, judge disclaimer retry, budget-exhaust 429, dead-letter. Run via `node scripts/smoke-ai-agent.mjs` + a separate eval harness (out-of-band for the golden ±10% vs PM CMA check).
7. **Legal + ops sign-off on `docs/ai-agent-policy.md`.** Sign-off table carries `_pending_` rows for Legal + Operations lead. Collect signatures before `AI_CHAT_ENABLED` flips to `true` in production.
8. **`AI_CHAT_ENABLED=true` flip.** The thanks-page CTA ships dark. Flip the env in Vercel Production when the team is ready to expose the chat publicly. No redeploy needed.
9. **Figma Code Connect for the chat components.** The new `<Chat>`, `<DisclaimerBanner>`, `<DocSummaryCard>`, `<OfferAnalysisCard>`, `<CompCard>`, `<ValuationPanel>` components should be wired into Code Connect if there's a design-system mirror. Not blocking.
10. **PR for the worktree branch.** The `feature/e9-ai-agent-suite-7895` branch is a single-branch epic (per feedback memory). Open one PR against `main` once E5 merges, or sooner if rebasing onto current main is clean. 23 commits is the expected size.

## Verification suggested

1. `git log --oneline feature/e9-ai-agent-suite-7895 ^b32bf4e` should show 26 commits.
2. `npx vitest run` → 367 tests / 29 files / all passing.
3. `npx tsc --noEmit` → clean.
4. Spot-check 3 random story bodies via `wit_get_work_item` and verify the commit bodies reference the correct ADO IDs.
5. Run `node scripts/smoke-ai-agent.mjs` after setting `AI_GATEWAY_API_KEY` in `.env.local`.

## ADO state updates

Autopilot did NOT mutate ADO state on any story. Per the feedback memory on ADO states (`In Development → Code Review → Ready For Testing`), the Feature + 23 stories remain in their current `New` state. Suggested operator flow at merge time:
- Feature #7895: `New` → `Code Review` on PR open; → `Ready For Testing` on merge.
- Each Story 7896-7918: same cadence, either batched or per-story at the operator's preference.
