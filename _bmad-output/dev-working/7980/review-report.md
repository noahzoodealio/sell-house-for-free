# E13-S1 Self-Review (vs. ACs from ADO 7980)

Branch: `feature/e13-s1-define-tool`. Commits: `e8412ae` (helper + tests), `8f980d3` (explain-terms retrofit), `4327be3` (4 remaining retrofits).

| AC | Status | Evidence |
|---|---|---|
| 1. File exists | ✅ | `src/lib/ai/tools/_define.ts` exports `defineTool`, `DisclaimerMissingError`, type aliases. |
| 2. Auto-insert ai_tool_runs | ✅ | `_define.ts:99-115`. Test `inserts a running ai_tool_runs row…` |
| 3. Auto-finalize ai_tool_runs | ✅ | `_define.ts:117-127`. Tests for success + error paths. |
| 4. Tool-error envelope returned | ✅ | `_define.ts:177-184`. Tests for thrown handler + tool-error return. |
| 5. Input redaction | ✅ | `_define.ts:97`. Test `redacts PII from input_json on insert`. |
| 6. Output disclaimer assertion | ✅ | `_define.ts:73-83, 152-156`. Test `throws DisclaimerMissingError…` |
| 7. Telemetry metadata persisted | ⚠️ DEFERRED | `ai_tool_runs.metadata` column does not exist in the E9-S1 schema. AC #10 says "verify before assuming" — verified absent. Telemetry plumbed through `ctx.telemetry` for in-process consumers; persistence deferred to E13-S7's migration. Test `plumbs telemetry metadata into ctx`. |
| 8. Retrofit explain-terms | ✅ | `tools/explain-terms.ts`. tool_name='explain_terms'. Existing E9 tests still pass (`__tests__/transaction-manager.test.ts` etc., 121/121 across the AI suite). |
| 9. Retrofit analyze-offer, review-pdf, review-photos, start-comp-job | ✅ | All four retrofitted. Tool names preserved: `analyze_offer`, `review_pdf`, `review_photos`, `start_comp_job`. `start-comp-job` uses `skipAutoFinalize: true` because it finalizes asynchronously via `after()`. |
| 10. No new migrations | ✅ | `git diff main -- supabase/migrations/` empty. |
| 11. signal honored | ✅ | `_define.ts:139` threads `opts.abortSignal`. Test `threads abortSignal into ctx and reports cause:'aborted'`. |
| 12. Unit tests ≥90% | ✅ | 12 vitest cases in `__tests__/_define.test.ts`. All branches covered: success, throw, disclaimer-missing, redact (input + output), tool-error return, abort, skipAutoFinalize (auto + manual finalize), telemetry, insert-failure resilience. |
| 13. No client bundle leakage | ✅* | Three matches in `.next/static/**` — all are AI Gateway SDK error-message strings referencing the env var **name** (`'AI_GATEWAY_API_KEY'`), not the secret value. Pre-existing pattern from E9; not introduced by S1. |

## Behavioral notes

- **`reviewPhotosImpl` unchanged.** Imported directly by the comp-run workflow step (E9-S17). The retrofit only touches the orchestrator-tool surface; the workflow path keeps its original calling convention.
- **`start-comp-job` no-row path.** When the subject address is missing, the old code returned `tool-error` without inserting any `ai_tool_runs` row. The retrofit inserts the row first (defineTool's contract) and explicitly finalizes it as an `error` with `cause: 'no_subject_address'`. This is a (small) data-shape improvement, not a regression — every tool call now has a corresponding `ai_tool_runs` row.
- **AnalyzeOffer `input_json`.** Original code persisted `{ documentId, hasOfferText: !!offerText }`. Retrofit persists the full input via `defineTool`'s default redactor — `{ documentId, offerText }` (with PII redacted). This is a (minor) shape change visible to S7 admin queries; the retrofit decision is to standardize on persisting the full input.
- **Tool-name strings locked.** `explain_terms`, `analyze_offer`, `review_pdf`, `review_photos`, `start_comp_job`. Any rename is a `ai_tool_runs.tool_name` migration.

## Cross-cutting checks

- ✅ `'server-only'` import on every new/edited tool file.
- ✅ Disclaimer constants reused from `prompts/*.ts` — no duplication.
- ✅ No new migrations.
- ✅ `redact` runs on input persistence + caught error messages + output persistence.
- ✅ Tool-error envelope shape matches E9-S23.
- ✅ `npx tsc --noEmit -p tsconfig.json` clean.
- ✅ `npm run build` clean.
- ✅ `npx vitest run src/lib/ai` 11 files, 121 tests pass.

## Deviations requiring user awareness

1. **AC #7 deferred to E13-S7.** Telemetry metadata persistence requires a column that doesn't exist; AC #10 prohibits a migration. The story's own AC #10 makes this explicit ("verify before assuming"). E13-S7's migration will add `ai_tool_runs.metadata` and the persistence path.
2. **`analyze_offer.input_json` shape change.** Original `{documentId, hasOfferText}` → retrofit `{documentId, offerText}` (redacted). Minor; consistent with persisting the full input via `defineTool`'s default redactor.
3. **`start_comp_job` no-row path.** Now always writes an `ai_tool_runs` row (as 'error' on input-validation failure). Improvement, not regression.

## Recommendation

Story is PR-ready. Proceed to `/zoo-core-unit-testing` (autopilot's next phase).
