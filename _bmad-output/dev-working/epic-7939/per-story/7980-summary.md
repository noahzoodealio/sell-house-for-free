# 7980 (E13-S1) — Per-Story Summary

**Outcome:** complete (dev-story phase). PR-ready on `feature/e13-s1-define-tool`.
**Closed at:** 2026-04-25T20:55Z (approx).
**Strike count:** 0/3 (no review failures).

## Diff stat

- New: `src/lib/ai/tools/_define.ts` (188 lines)
- New: `src/lib/ai/tools/__tests__/_define.test.ts` (341 lines, 12 cases)
- Modified: `src/lib/ai/tools/explain-terms.ts`, `analyze-offer.ts`, `review-pdf.ts`, `review-photos.ts`, `start-comp-job.ts` (5 retrofits)
- Net: +529 / -180 across 8 files. ~120 lines of `ai_tool_runs` boilerplate eliminated.

## Verification

- `npx vitest run src/lib/ai`: **121/121 pass** across 11 test files.
- `npx tsc --noEmit -p tsconfig.json`: clean.
- `npm run build`: clean.
- Bundle leakage check: env-var **names** appear in AI Gateway SDK error strings (pre-existing); zero secret values leaked.

## ACs satisfied

12/13 fully satisfied. AC #7 (telemetry metadata persistence) deferred to E13-S7 per the story's own AC #10 ("verify before assuming") — `ai_tool_runs.metadata` column does not exist; telemetry plumbed through `ctx.telemetry`.

## Behavior changes worth noting

1. `analyze_offer.input_json` shape: `{documentId, hasOfferText}` → `{documentId, offerText}` (redacted). Standardizes on persisting the full input via `defineTool`'s default.
2. `start_comp_job` always writes an `ai_tool_runs` row now (including on input-validation failure). Old code returned `tool-error` without inserting on missing-address path.

## Follow-ups created

- E13-S7 must add `ai_tool_runs.metadata jsonb` column and persist `ctx.telemetry` at insert time. Plumbing already in place.
- Optional: CI lint rule grep'ing `src/lib/ai/tools/*.ts` for direct `tool({...})` imports outside `_define.ts`.

## Next in autopilot

Per `epic-plan.md`: **7983 (E13-S4 — Offervana OuterApi)** is next (highest-risk-early order).
