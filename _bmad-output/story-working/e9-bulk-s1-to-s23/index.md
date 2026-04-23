---
slug: e9-bulk-s1-to-s23
parent-feature-id: 7895
parent-feature-url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7895
ado-grandparent-epic-id: 7776
ado-grandparent-epic-url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7776
mode: bulk
mode-ado: mcp
status: completed
stories-planned:
  - e9-s1-supabase-ai-tables-and-bucket
  - e9-s2-gateway-client-and-package-install
  - e9-s3-session-lib-and-sessions-route
  - e9-s4-budget-and-redact-libs
  - e9-s5-chat-streaming-route-and-prompt-v0
  - e9-s6-chat-page-disclaimer-banner
  - e9-s7-ai-agent-policy-and-agents-md
  - e9-s8-chat-upload-and-storage-helpers
  - e9-s9-doc-upload-component
  - e9-s10-review-pdf-tool-and-summary-schema
  - e9-s11-explain-terms-tool
  - e9-s12-analyze-offer-tool-and-schema
  - e9-s13-doc-summary-and-offer-analysis-cards
  - e9-s14-orchestrator-prompt-v1
  - e9-s15-thanks-page-ai-cta
  - e9-s16-wdk-comp-run-skeleton
  - e9-s17-review-photos-tool-and-schema
  - e9-s18-apply-deviations-and-region-table
  - e9-s19-aggregate-valuation-judge
  - e9-s20-start-comp-job-and-jobs-route
  - e9-s21-comp-card-and-valuation-panel
  - e9-s22-bootstrap-from-submission-id
  - e9-s23-chaos-and-smoke-tests
stories-created:
  - id: 7896
    url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7896
    title: "E9-S1 — Supabase migrations: ai_sessions + ai_messages + ai_tool_runs + ai_artifacts tables + ai-docs private Storage bucket (RLS-locked)"
    size: S
    parent-linked: true
  - id: 7897
    url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7897
    title: "E9-S2 — AI Gateway client: src/lib/ai/gateway.ts + model profiles + install ai^6 + @vercel/workflow + env vars (AI_GATEWAY_API_KEY, AI_FALLBACK_MODEL, AI_WORKFLOW_QUEUE_KEY, AI_CHAT_ENABLED)"
    size: S
    parent-linked: true
  - id: 7898
    url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7898
    title: "E9-S3 — Session lib + /api/chat/sessions route: src/lib/ai/session.ts (create/load/cookie), 24-message window with compaction edge, shf_ai_session cookie (HttpOnly SameSite=Lax 7d)"
    size: S
    parent-linked: true
  - id: 7899
    url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7899
    title: "E9-S4 — Budget + redact libs: src/lib/ai/budget.ts (token ceiling + per-IP rate limit returning {ok, reason}) + src/lib/ai/redact.ts (PII redactor for email/phone/street)"
    size: S
    parent-linked: true
  - id: 7900
    url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7900
    title: "E9-S5 — /api/chat streaming route + orchestrator prompt v0: Route Handler (Node, maxDuration=300), streamText with empty tool belt, after() bumpSessionActivity, SSE via toDataStreamResponse"
    size: M
    parent-linked: true
  - id: 7901
    url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7901
    title: "E9-S6 — /chat page + <Chat> + <DisclaimerBanner>: (app) route group, session bootstrap (POST /sessions on mount), AI SDK useChat, markdown render, mobile + a11y"
    size: M
    parent-linked: true
  - id: 7902
    url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7902
    title: "E9-S7 — docs/ai-agent-policy.md + AGENTS.md append: codify tech-platform-not-brokerage posture, knowledgeable-friend advice scope, three-part disclaimer, retention, redaction, cost ceilings — BEFORE any tool ships"
    size: S
    parent-linked: true
  - id: 7903
    url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7903
    title: "E9-S8 — /api/chat/upload + src/lib/supabase/storage.ts: multipart PDF/image ingress, MIME + 10 MB cap, signed URL 60-min TTL, ai_artifacts row of kind doc_summary in uploaded stage"
    size: S
    parent-linked: true
  - id: 7904
    url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7904
    title: "E9-S9 — <DocUpload> component + inline preview: drag-and-drop, single file, progress indicator, posts to /api/chat/upload, inserts documentId into chat as attachment cue"
    size: S
    parent-linked: true
  - id: 7905
    url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7905
    title: "E9-S10 — review_pdf tool + DocSummarySchema + pdf-reviewer.ts prompt: Claude Opus via gateway, document content block, structured output, persist doc_summary artifact"
    size: M
    parent-linked: true
  - id: 7906
    url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7906
    title: "E9-S11 — explain_terms tool: model-only explainer for contract terms (earnest money, contingency, etc.) with optional doc context; no persistence beyond conversation"
    size: S
    parent-linked: true
  - id: 7907
    url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7907
    title: "E9-S12 — analyze_offer tool + OfferAnalysisSchema (required friendlyTake) + offer-analyzer.ts prompt: Claude Opus generateObject, pros/cons/net/vsAvm/pushbacks, persist offer_analysis artifact"
    size: M
    parent-linked: true
  - id: 7908
    url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7908
    title: "E9-S13 — <DocSummaryCard> + <OfferAnalysisCard>: render artifacts inside assistant messages with footer disclaimer, citation link-through to PDF preview, mobile + a11y"
    size: M
    parent-linked: true
  - id: 7909
    url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7909
    title: "E9-S14 — Orchestrator prompt v1: expand transaction-manager.ts with tool-use heuristics (review_pdf, explain_terms, analyze_offer, start_comp_job), friend-style voice, golden conversation tests"
    size: S
    parent-linked: true
  - id: 7910
    url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7910
    title: "E9-S15 — Thanks-page CTA (feature-flagged): add “Talk to your AI assistant” link to /chat?bootstrap={submissionId} in src/app/get-started/thanks/page.tsx, gated by AI_CHAT_ENABLED"
    size: S
    parent-linked: true
  - id: 7911
    url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7911
    title: "E9-S16 — WDK comp-run workflow skeleton + steps 1-2: src/lib/ai/workflows/comp-run.ts (find_comps + hydrate parallel) using @vercel/workflow, step()-level retry/memoization, reuses src/lib/enrichment/mls-client.ts"
    size: M
    parent-linked: true
  - id: 7912
    url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7912
    title: "E9-S17 — review_photos tool + PhotoAssessmentSchema + photo-reviewer.ts prompt: Claude vision via gateway(models.vision), ≤6 photos/comp, reviewPhotosImpl, exposed as workflow step 3 AND standalone tool"
    size: M
    parent-linked: true
  - id: 7913
    url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7913
    title: "E9-S18 — apply_deviations pure function + regionalPerSqft AZ zip seed table + 95%+ unit-test coverage: BED_DELTA=$15k, BATH_DELTA=$8k, conditionDelta(), adjustedSoldPrice math — NO LLM"
    size: M
    parent-linked: true
  - id: 7914
    url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7914
    title: "E9-S19 — aggregate_valuation judge tool + ValuationSchema + comping.ts prompt (confidence rubric inlined): Claude Opus generateObject, comp_report artifact, golden test ±10% vs Offervana PM CMA on 3 AZ addresses"
    size: M
    parent-linked: true
  - id: 7915
    url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7915
    title: "E9-S20 — start_comp_job orchestrator tool + /api/chat/jobs/[id] poll route: workflow.trigger('comp-run'), insert ai_tool_runs pending row, return {jobId, status, pollUrl}; GET returns tool_run + artifact; optional ?stream=1 SSE"
    size: M
    parent-linked: true
  - id: 7916
    url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7916
    title: "E9-S21 — <CompCard> + <ValuationPanel> render components: low/mid/high + confidence chip with hover-rubric tooltip, comp photo thumbnails, “why this comp” expandable, disclaimer footer, mobile + a11y"
    size: M
    parent-linked: true
  - id: 7917
    url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7917
    title: "E9-S22 — Bootstrap session from ?bootstrap=submissionId: chat server component reads submissions (E6) + seeds ai_sessions.context_json with SellerFormDraft, context-aware first assistant turn"
    size: S
    parent-linked: true
  - id: 7918
    url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7918
    title: "E9-S23 — Chaos + smoke test suite: slow MLS (>8s), timeouts, missing-photo comps, zero-comp path, judge retry, budget-exhaust, dead-letter to ai_tool_runs.error_detail, UAT golden regression suite"
    size: M
    parent-linked: true
started-at: 2026-04-23T17:40:00Z
paused-at: 2026-04-23T18:02:30Z
resumed-at: 2026-04-23T18:23:00Z
completed-at: 2026-04-23T18:33:30Z
last-completed-step: 5
---

# E9 bulk S1→S23 — PM Working Sidecar (COMPLETE)

## Status

**Completed** at 2026-04-23T18:33. All 23 stories filed + parent-linked to Feature 7895. Resume ran after user re-invoked `/zoo-core-create-story e9` with explicit Option-A (MCP bulk) approval of the permission gate that paused the first run.

## Plan (executed)

Twenty-three stories decomposing Feature **7895** per architecture §7. Filed as User Story children under the Feature with `format: "Html"` inside each field object (E8 precedent; avoiding the E2 top-level format bug).

**Phase A — Foundation (S1–S7) — DONE.** Seven filed + parent-linked in the paused run.

**Phase B — Transaction Manager (S8–S15) — DONE.** S8-S14 filed + parent-linked in the paused run. **S15 parent-link filed on resume** (2026-04-23T18:23) — it was the original permission-trip point.

**Phase C — Comping Agent (S16–S23) — DONE on resume.** All eight drafted from architecture §3.1.6–§3.1.11 + §4.4 + §4.5 context; filed + parent-linked sequentially 7911→7918.

## Posture (preserved across all 23 stories)

Sell Your House Free is a **tech platform**, not a brokerage. JK Realty is a third-party service provider. The AI is a **knowledgeable friend** — opinionated on negotiations, contracts, offers. Every AI-authored output carries the three-part disclaimer: **AI / not a licensed real-estate professional / not a fiduciary**. Enforced at Zod-schema level (required `disclaimer` field on every artifact payload), not prompt-only. `OfferAnalysisPayload.friendlyTake` is required — product value is in having a take. S19's `ValuationSchema.disclaimer` + S17's `PhotoAssessmentSchema.disclaimer` extend the pattern into Phase C.

## Filing order (final)

S1 (7896) → S2 (7897) → S3 (7898) → S4 (7899) → S5 (7900) → S6 (7901) → S7 (7902) → S8 (7903) → S9 (7904) → S10 (7905) → S11 (7906) → S12 (7907) → S13 (7908) → S14 (7909) → S15 (7910) → **[paused]** → S15 parent-link (resume) → S16 (7911) → S17 (7912) → S18 (7913) → S19 (7914) → S20 (7915) → S21 (7916) → S22 (7917) → S23 (7918) → **[complete]**.

Monotonic IDs — no other filings interleaved during either run. Parent link on every story via `wit_work_items_link`.

## Format compliance

Every filed story used `format: "Html"` **inside each field object** (not top-level). Verified by response bodies showing `"multilineFieldsFormat":{"System.Description":"html"}`. No markdown-escaped HTML regression across any of the 23.

## Content decisions (final, applies to all 23)

- **Blueprint cadence.** Every story follows the E1–E8 section structure (Parent/Order/Size/Blocks/Depends/Scope → Summary → Acceptance criteria → Technical notes → Out of scope → References → Notes).
- **Compression toward Phase C.** S1–S5 long-form (≈20K chars). S6–S15 tightened. Phase C (S16–S23) landed in the ~10–14K range — comprehensive ACs, terse Technical Notes.
- **Disclaimer wording verbatim** across S5 (prompt), S6 (banner), S7 (policy), S10/S12/S17/S19 (artifact `disclaimer` field), S13/S21 (card footers). The three-claim string is the invariant.
- **Schema-level disclaimer enforcement.** S10, S12, S17, S19 all use `z.string().min(1)` on `disclaimer`. S19's `ValuationSchema` extends this into the `comp_report` payload; S23 asserts the invariant byte-for-byte in smoke output.
- **`friendlyTake` required** (S12) and **rubric-sanity check** (S19) — both differentiators ship as required product features.
- **Env-var surface frozen at S2.** No Phase C story re-opens `env-matrix.md` — S16–S23 consume only.
- **Migration ordinals.** S1 → `0003_ai_tables.sql`, `0004_ai_storage_bucket.sql`. S4 → `0005_ai_ip_budgets.sql`. **Phase C ships no new migrations** (S22 reuses `context_json`; S20 notes LISTEN/NOTIFY as a potential follow-up migration, not this story). S16+ instructed to check ordinals at PR time in case E6 interleaves.
- **Bleeding-edge call-outs.** Every Technical Notes section pins the likely training-data regression: AI SDK v6 `tool({ inputSchema })`, `createGateway({ apiKey })`, `document` content block for Claude PDFs, Next.js 16 async `searchParams`/`cookies()`, React 19 ref-as-prop, WDK `@vercel/workflow` (not Temporal/BullMQ), `step()`-level memoization with stable names (no indexed suffixes).
- **Workflow scaffold pattern (Phase C).** S16 lands the full skeleton with pass-through steps 3–6. S17/S18/S19 each *replace step bodies only* — they don't touch the workflow definition. Lets Phase C parallelize cleanly.
- **Deterministic math invariant.** S18 explicitly prohibits LLM imports (AC asserts via grep). Decision 9.
- **Confidence as a separate pure function.** S19's `computeRubricConfidence` is a sanity check alongside the model's self-reported confidence; S23 will catch drift. Interpretability over opacity (Deviation row).
- **Standalone-tool + workflow-step duality.** S17, S19 (and S20's `start_comp_job`) all live as tools callable by the orchestrator outside WDK, with the same `execute` body reused inside the workflow. No duplicate LLM paths.

## Bulk-mode compaction note

Architecture doc held in memory across the resume: §3.1.6–§3.1.11, §4.1, §4.4, §4.5, §6 open questions, §7 handoff table, Decisions 4/6/9/10, Deviation rows relevant to Phase C. No per-story deep-context re-fetch; referenced S15 body once for HTML cadence confirmation on resume.

## Permission-denial note (resolved)

Original pause at call #16 (S15 parent-link) tripped the harness's bulk-external-write guard. Resume explicitly confirmed Option A (MCP bulk) with the user, and the flow proceeded through 8 creates + 9 parent-links without further friction.

## Verification suggested (not run here)

Spot-check 3 random stories from S16–S23 via `wit_get_work_item(id, expand='relations')` to confirm:
1. HTML format applied per-field (not markdown-escaped).
2. Parent link points at 7895.
3. System.Title matches the expected `E9-Sxx — <scope>` prefix.

If all three pass on spot-checks, the filing batch is verified.
