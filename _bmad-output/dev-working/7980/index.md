---
work-item-id: 7980
work-item-type: story
work-item-url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7980
parent-feature: 7939
parent-feature-url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7939
grandparent-epic: 7776
repo: sell-house-for-free
branch: feature/e13-s1-define-tool
file-groups:
  - id: A
    label: defineTool helper + tests
    files:
      - src/lib/ai/tools/_define.ts
      - src/lib/ai/tools/__tests__/_define.test.ts
    status: pending
  - id: B
    label: retrofit explain-terms (smallest, validates contract)
    files:
      - src/lib/ai/tools/explain-terms.ts
    status: pending
  - id: C
    label: retrofit analyze-offer
    files:
      - src/lib/ai/tools/analyze-offer.ts
    status: pending
  - id: D
    label: retrofit review-pdf
    files:
      - src/lib/ai/tools/review-pdf.ts
    status: pending
  - id: E
    label: retrofit review-photos
    files:
      - src/lib/ai/tools/review-photos.ts
    status: pending
  - id: F
    label: retrofit start-comp-job (skipAutoFinalize)
    files:
      - src/lib/ai/tools/start-comp-job.ts
    status: pending
last-completed-step: 4
last-completed-file-group: null
started-at: 2026-04-25T20:43:00Z
---

# E13-S1 — Dev Story Working Sidecar

ADO 7980. Foundation story for E13. Lands `defineTool()` registration helper at `src/lib/ai/tools/_define.ts` and retrofits the five existing E9 tools.

## Research summary

- **`ai_tool_runs` schema** (`supabase/migrations/20260423190000_e9_s1_ai_tables.sql`): id (uuid), session_id, message_id, tool_name, status (pending|running|ok|error|timeout), input_json, output_json, error_detail, latency_ms, workflow_run_id, created_at. **No `metadata` column** — S1 AC #7 (telemetry persistence to `ai_tool_runs.metadata`) deferred to S7 per AC #10's "verify before assuming." Documented as a deviation; not a blocker.
- **Existing tool pattern** (`src/lib/ai/tools/explain-terms.ts`, `analyze-offer.ts`, `review-pdf.ts`, `review-photos.ts`, `start-comp-job.ts`): each tool factory takes a session ctx, builds the AI SDK `tool({...})` shape, opens with `getSupabaseAdmin()` + `.from('ai_tool_runs').insert({status:'running'})` + a `finalize()` closure that updates the row on success/error.
- **`redact` + `redactObject`** (`src/lib/ai/redact.ts`): both exported. Use `redactObject` for the input JSON persisted to `ai_tool_runs.input_json` so structured PII is redacted recursively.
- **AI SDK v6 surface**: `tool({ description, inputSchema, execute })`; `execute(input, opts?)` where `opts?.abortSignal` is the AbortSignal. Confirmed via existing usage.
- **`start-comp-job` is special**: uses `after()` to run work past the synchronous response. Returns immediately with `{jobId: toolRunId, pollUrl, ...}`, then updates the same `ai_tool_runs` row via `after()`. `defineTool` needs a `skipAutoFinalize: true` flag to avoid prematurely setting `status='ok'`.

## Implementation plan

**File-group A — defineTool helper + tests**

`_define.ts` exports `defineTool({ name, description, inputSchema, outputSchema?, telemetry?, skipAutoFinalize?, handler })` returning a session-factory. Behavior:

1. On invocation: insert `ai_tool_runs` row with `status='running'`, redacted `input_json`. Capture `toolRunId`.
2. Build `ctx = { sessionId, toolRunId, supabase, signal, redact, finalize }` and pass to `handler(input, ctx)`.
3. On handler success:
   - If result has `kind === 'tool-error'` shape → finalize as error (unless `skipAutoFinalize`).
   - Else if `outputSchema` declares a non-optional `disclaimer` field → assert non-empty disclaimer; throw `DisclaimerMissingError` if missing.
   - Else → finalize as ok with redacted output (unless `skipAutoFinalize`).
4. On handler throw: finalize as error with redacted message; return canonical `tool-error` envelope to the AI SDK.
5. Telemetry metadata accepted on the spec; persistence to `ai_tool_runs.metadata` **deferred to S7** (no column yet). Stored on `ctx` for in-process consumers.

Tests cover: success, thrown handler, disclaimer-missing, redact path, skipAutoFinalize, abort-signal threading, tool-error return path.

**File-groups B–F — retrofits**

Per-tool: rewrite using `defineTool`. Preserve `tool_name` strings exactly (`explain_terms`, `analyze_offer`, `review_pdf`, `review_photos`, `start_comp_job`). Preserve `input_json` keys + `output_json` keys. Existing tests pass without modification. `start-comp-job` uses `skipAutoFinalize: true` and writes its own status update via `after()` (existing pattern preserved).

## Cross-cutting checks (all groups)

- `'server-only'` import on every file.
- Disclaimer string constants reused from `prompts/*.ts` — no duplication.
- No new migrations.
- `redact` runs on input persistence and on caught error messages.
- Tool-error envelope shape: `{ kind: 'tool-error', safe: true, message, disclaimer }` (matches E9-S23).

## Deviations from S1 AC

- **AC #7 (telemetry metadata persistence)** — deferred to S7. Reason: `ai_tool_runs.metadata` column does not exist; AC #10 prohibits new migrations. AC #10's "verify before assuming" makes this conditional. Will document in completion-notes.
