---
feature: e9-ai-agent-suite
services-in-scope: [sell-house-for-free, Zoodealio.MLS (read-only), Offervana_SaaS (read-only ATTOM proxy)]
upstream-research: null  # direct user input via /zoo-core-create-architecture 2026-04-23
started-at: 2026-04-23T00:00:00Z
last-completed-step: 5
---

# Sidecar — E9 AI Agent Suite

## Scope digest (from user input 2026-04-23)

> Add a custom AI agent to the Next.js marketing site using Anthropic or OpenAI. Two primary sub-agents:
> 1. **Transaction Manager** — conversational; helps homeowner through the real-estate transaction. Reviews PDFs/docs, explains contract / offer terms.
> 2. **Comping Agent** — finds comparable properties, rates them, applies deviations, compares sold/pending/listed/cancelled, uses days-on-market + ATTOM data, reviews photos. Produces subject-property valuation with confidence score. Hands comps back with rationale.
>
> Sub-skills (PDF review, image review, comp selection, offer review, property valuation) are to be their own agents/skills that can run in parallel.

## Key inputs surveyed

- **Zoodealio.Chat** (Python/Chainlit/OpenAI Agents/Temporal) — existing ecosystem AI service, uses OpenAI + Temporal. Tightly coupled to Chainlit UI; system prompt in `config/instructions.txt`. Conclusion: **parallel-implement inside Next.js**, not call through. Borrow tool schemas where shapes align.
- **Zoodealio.MLS APIs** — `GET /api/properties/search`, `/api/properties/{mlsRecordId}/history`, `/api/properties/{mlsRecordId}/images`, `/api/properties/attom/{attomId}`. Anonymous (E4 confirmed). Photos returned as SAS-signed Azure Blob URLs valid until 2027-02-11 — **pass directly to Claude multimodal**.
- **ATTOM AVM** — reached via `IAttomClient.GetEquityAndAvm()` in Offervana. Not publicly exposed; accessed via MLS `/api/properties/attom/{attomId}` cached snapshot in E4.
- **Existing E4 enrichment** — `src/app/api/enrich/route.ts` + `src/lib/enrichment/*` supplies `attomId`, `mlsRecordId`, `listingStatus`, photos. Comping agent reuses these.
- **Existing Supabase infra** — `src/lib/supabase/server.ts` already standardized (E5). New agent tables piggyback.

## Provider decision

- **Anthropic Claude** via **Vercel AI Gateway** (per platform knowledge-update — prefer `"anthropic/claude-..."` strings through AI SDK rather than direct SDK). Rationale:
  - PDF / long-context / document review is Claude's sweet spot
  - Multimodal vision (photos) native
  - AI Gateway gives provider failover (OpenAI as backup) without code changes
  - Matches AGENTS.md posture; separate from Zoodealio.Chat's OpenAI choice so we don't couple provider decisions

## Posture (load-bearing)

- **Sell Your House Free is a tech platform**, not a brokerage. JK Realty is a third-party service provider for MLS-listing work. Architecture / prompts / UI must not describe the platform as "the broker."
- **AI = knowledgeable friend.** It advises on negotiation, contracts, offers, comps, terms — opinionated, direct, not hedged. The product value is in having a take.
- **What the AI doesn't do:** act on the seller's behalf (no signing, no sending as the seller, no committing). Advice ≠ action.
- **Disclaimer contract:** every AI-authored message and artifact includes the three claims — (1) AI, (2) not a licensed real-estate professional, (3) not a fiduciary. Required field on every artifact schema.

## Pattern decisions (cached here for doc-write step)

- AI SDK v6 `streamText` + tools — tools are the sub-skill surface
- Orchestrator = Transaction Manager system prompt + tool belt that includes `run_comping_agent`, `review_pdf`, `analyze_offer` etc. as AI SDK tools
- Sub-agents = isolated `generateText` / `streamText` calls with their own system prompts and tool subsets
- Parallel execution = `Promise.all` inside composite tools (e.g., comp-finder fan-out over N comps → image-review per comp in parallel)
- Long-running (>60s) comping work → **Vercel Workflow** durable steps, polled by client via SSE
- Persistence = Supabase tables: `ai_sessions`, `ai_messages`, `ai_artifacts` (reports/valuations/doc summaries), `ai_tool_runs` (audit)
- Safety = per-session token ceiling, PII redaction in logs, domain allow-list on tool URLs
- No auth in MVP — anonymous session id cookie, correlated to `submissionId` when present

## Epic decomposition

Three epics proposed (E9/E10/E11) — document covers all three; PM slices into stories.

- **E9 — AI Agent Foundation.** Provider, Gateway, Supabase schema, orchestrator skeleton, chat UI, streaming, session state, tool framework, observability.
- **E10 — Transaction Manager capabilities.** Conversational persona, `review_pdf` tool, `explain_offer_terms` tool, `analyze_offer` tool, citations to source docs.
- **E11 — Comping Agent capabilities.** `find_comps`, `rate_comps`, `apply_deviations`, `review_photos`, `aggregate_valuation`, confidence scoring, comp-review UI surface.

## Open items resolved during survey

- ATTOM confidence score: not available natively. Computed in-house as `comp_count_hit + avm_hit + photo_hit + radius_tightness` rubric (deviation table in doc).
- Comp search radius: MLS search doesn't expose radius param. Strategy: search by city+zip, post-filter in BFF by haversine + bed/bath tolerance.
- Days-on-market + cancellation: come from `PropertyHistoricalChangeDto` — E11 adds per-MLS-record history lookup gated by the rate budget.
- PDF intake: inline user uploads → Supabase Storage bucket `ai-docs` (private) → URL passed to Claude.
