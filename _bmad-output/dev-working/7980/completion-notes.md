# E13-S1 Completion Notes (ADO 7980)

## What shipped

`src/lib/ai/tools/_define.ts` — the universal contract for AI tool registration. Five existing E9 tools retrofitted onto it. ~120 lines of repeated boilerplate eliminated; every future E13 tool gets the contract for free.

## Branch

`feature/e13-s1-define-tool` — three commits, ready for PR. Diff stat: `+529 / -180` across 8 files (1 new helper, 1 new test file, 5 retrofitted tools, plus the test-import fix in the test file itself).

## Test coverage

- 12 new vitest cases in `__tests__/_define.test.ts` covering every defineTool branch.
- 121/121 existing AI tests pass (no E9 regressions).
- `tsc --noEmit` clean. `next build` clean.

## Follow-ups for downstream stories

- **E13-S7** must add `ai_tool_runs.metadata jsonb` column and update `defineTool` to persist `ctx.telemetry` to the row at insert time. The `cost_class` + `budget_bucket` plumbing is already in place.
- **E13-S2/S3/S4/S5** all consume `defineTool`. The session contract is `{id: string, ...}` — passing the full session object lets handlers reach into context (e.g., `session.context.address`, `session.user_id` for E10 sessions).
- **`reviewPhotosImpl`** stays callable directly (the comp-run workflow imports it). Don't fold it into `defineTool` for the workflow path.

## Suggested follow-up not in this story

- Add a CI check that grep's `src/lib/ai/tools/*.ts` for direct `tool({...})` from `'ai'` (would catch a future tool that bypasses `defineTool`). Could land in S7 alongside the read-only lint rule for OuterApi.
- The AI SDK v6's `tool()` overload resolution required `as never` casts in `_define.ts` — clean but worth keeping in mind if/when AI SDK changes its generic signature.

## Posture preserved

- Tech-platform-not-brokerage. No new disclaimer strings; reused `DOC_SUMMARY_DISCLAIMER`, `OFFER_ANALYSIS_DISCLAIMER`, `PHOTO_ASSESSMENT_DISCLAIMER`, `VALUATION_DISCLAIMER`.
- Read-only. `defineTool` neither requires nor enforces read-only — that's the caller's job. But every retrofit preserves the existing read-only-ish behavior (the only mutations are to `ai_tool_runs` and `ai_artifacts`, internal SHF tables).

## Status

`/zoo-core-dev-story` complete. Next: `/zoo-core-unit-testing` (auto-chained by dev-epic).
