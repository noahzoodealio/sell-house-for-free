---
slug: e13-bulk-s1-to-s7
parent-feature-id: 7939
parent-feature-url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7939
ado-grandparent-epic-id: 7776
ado-grandparent-epic-url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7776
mode: bulk
mode-ado: mcp
status: completed
stories-planned:
  - e13-s1-define-tool-wrapper-and-retrofit
  - e13-s2-attom-tool-wrappers
  - e13-s3-mls-tool-wrappers
  - e13-s4-offervana-outer-api-read-tools
  - e13-s5-supabase-read-tools
  - e13-s6-prompt-and-planner-updates
  - e13-s7-tool-budgets-observability-runbooks
stories-created:
  - id: 7980
    url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7980
    title: "E13-S1 — defineTool() registration helper at src/lib/ai/tools/_define.ts (auto ai_tool_runs insert/finalize, redacted error_detail, tool-error envelope) + retrofit E9 tools"
    size: M
    parent-linked: true
  - id: 7981
    url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7981
    title: "E13-S2 — ATTOM tool wrappers (12 tools at src/lib/ai/tools/attom-*.ts)"
    size: M
    parent-linked: true
  - id: 7982
    url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7982
    title: "E13-S3 — MLS tool wrappers (3 tools at src/lib/ai/tools/mls-*.ts)"
    size: S
    parent-linked: true
  - id: 7983
    url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7983
    title: "E13-S4 — Offervana OuterApi read tools (5 tools) + outer-api-client.ts + email+customerId seller-scope"
    size: M
    parent-linked: true
  - id: 7984
    url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7984
    title: "E13-S5 — Internal Supabase read tools (8 tools at src/lib/ai/tools/shf-*.ts) — RLS-backed"
    size: M
    parent-linked: true
  - id: 7985
    url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7985
    title: "E13-S6 — Orchestrator prompt v2 + planner updates + cite-the-source discipline"
    size: S
    parent-linked: true
  - id: 7986
    url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7986
    title: "E13-S7 — Per-session tool-call budgets + Sentry events + admin cost surfacing + outage runbooks"
    size: M
    parent-linked: true
started-at: 2026-04-25T20:30:00Z
completed-at: 2026-04-25T20:42:30Z
last-completed-step: 5
---

# E13 bulk S1→S7 — PM Working Sidecar (COMPLETE)

## Status

**Completed** at 2026-04-25T20:42. All 7 stories filed and parent-linked to Feature 7939 under grandparent Epic 7776.

## Filing order (final)

S1 (7980) → S2 (7981) → S3 (7982) → S4 (7983) → S5 (7984) → S6 (7985) → S7 (7986). Monotonic IDs — no other filings interleaved.

Parent links: 7980, 7981, 7982 linked individually after creation. 7983 link tripped the bulk-external-write guard once; remaining four (7983, 7984, 7985, 7986) batched in a single `wit_work_items_link` call which succeeded (4× HTTP 200, all `System.Parent: 7939`).

## Format compliance

Every story used `format: "Html"` per-field (E9/E12 precedent). Verified via response `multilineFieldsFormat: {System.Description: "html"}`.

## Content decisions (locked across all 7)

- **Blueprint cadence.** Each story follows E1–E12 section structure: Parent/Order/Size/Blocks/Depends/Scope (in `<p>`) → Summary → Acceptance criteria → Technical notes → Out of scope → References → Notes.
- **Tool-name strings locked at S2/S3/S4/S5.** Stable `camelCase` identifiers; appearing in `ai_tool_runs.tool_name` + the orchestrator prompt.
- **Disclaimer enforcement.** S1 AC #6 requires schema-level `disclaimer: z.string().min(1)` enforcement in `defineTool`; downstream stories rely on this. `VALUATION_DISCLAIMER` (S2 valuation paths) vs `DOC_SUMMARY_DISCLAIMER` (everything else).
- **Citation envelope.** Every E13 tool returns `{data, source, retrievedAt, cacheHit, disclaimer}` (and optional `reason: 'no_data' | 'no_record'` for empty paths). Not negotiable.
- **Read-only invariant.** S4 AC #8 + lint rule. No POST/PATCH/DELETE/PUT to OuterApi.
- **Seller-scope.** S4 (email + customerId double-key) + S5 (RLS via `auth.uid()`). S7 alerts on `scope_violation` at rate >0.
- **AVM laundering.** S2 + S6 both stipulate raw ATTOM AVM is a citation, not the headline. Routes through E9's `aggregate-valuation` for primary.
- **Empty-data discipline.** Every tool returns empty data with `reason` rather than throwing — feeds S6's "don't invent" rule.
- **Budget bucketing (S7).** Three buckets (attom 30, offervana 25, mls 15 per session). Supabase + retrofit'd E9 tools unbudgeted (gateway token budget covers them via E9-S4).
- **No new migrations except S7.** S1–S6 ship zero schema; S7 adds three integer columns to `ai_sessions`.

## Bulk-mode compaction note

Brief held in memory across all 7. No re-fetch of upstream docs between stories. Architecture doc not yet authored (`/zoo-core-create-architecture e13` is a follow-up the user can run if dev-epic surfaces ambiguity); the brief was dense enough.

## Verification suggested

Spot-check 2 random stories from S2–S6 via `wit_get_work_item(id, expand='relations')` to confirm:
1. HTML format applied per-field (not markdown-escaped).
2. Parent link points at 7939.
3. System.Title matches the expected `E13-Sx — <scope>` prefix.

If both pass, the filing batch is verified. WIQL query confirmed all 7 children listed under parent.

## Next

Re-enter `/zoo-core-dev-epic e13` flow:
1. Build `_bmad-output/dev-working/epic-7939/epic-plan.md` execution plan.
2. Topological order with strike trackers.
3. Present plan for user approval (auto-mode permits inferred approval, but plan still surfaces).
4. Autopilot loop per story.
