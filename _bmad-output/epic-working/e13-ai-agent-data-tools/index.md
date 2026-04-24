---
slug: e13-ai-agent-data-tools
ado-epic-id: 7939
ado-url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7939
ado-parent-epic-id: 7776
ado-parent-epic-url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7776
work-item-type: Feature
mode: mcp
action: create-new
status: filed-and-trimmed
created-at: 2026-04-23T00:00:00Z
filed-at: 2026-04-23T22:47:49Z
trimmed-at: 2026-04-23T22:58:19Z
---

# E13 — AI Agent Data Tool Surface (ATTOM / MLS / Offervana / Supabase) — Epic Brief

Filed as ADO Feature **7939** under Epic 7776 on 2026-04-23. **Trimmed on 2026-04-23** after widening E12 (ADO #7921) to own all cache schema + ATTOM/MLS client wrappers. E13 is now purely the AI-tool-surface epic: tool registration, prompt discipline, seller-scope enforcement, budgets, observability.

## Pivot notes

1. Originally scoped as "add ATTOM Data MCP server." Reverted after confirming we have REST API access only, not MCP access. The MCP server is a hosted wrapper over the same ATTOM REST endpoints.
2. Originally owned cache schema + new ATTOM clients. Moved to E12 when we realized E12 hadn't shipped yet — one migration is cheaper than two, and E12 can ship independently of E10/E11/E13.

## Scope split with E12 (locked)

- **E12** owns: every ATTOM + MLS client wrapper, the `property_enrichments` + `area_enrichments` tables, TTL policy, durable-cache helpers.
- **E13** owns: `defineTool()` registration pattern, tool wrappers (thin `~20-line` exports over E12 clients), Offervana OuterApi client + tools, Supabase read tools, prompt updates, per-session tool budgets, observability.

E13's ATTOM/MLS stories collapse to "call the E12 client, shape the response for the LLM, return through Zod." No schema work, no new HTTP clients, no cache logic.

## Summary

Curated read-only tool catalog for the E9 AI assistant, built on direct REST calls (no MCP):

- **ATTOM** (12 tools): fundamentals, AVM, AVM history, last sale, sales history, assessment, assessment history, area sales trend, home equity, rental AVM, building permits, nearby schools
- **MLS** (3 tools): listing search, listing detail, listing history
- **Offervana OuterApi** (5 tools, read-only): property, offers V1, offers V2, offer history, customer record `[team-only]`
- **Internal Supabase** (8 tools): submission, submission offers, assigned PM, thread messages, documents, enriched property, assignment events, prior AI artifacts

## Dependencies

- **E10** — seller passwordless auth (hard; seller-scoped tools need session identity)
- **E11** — team-member portal (soft; team-only tool variants are stubs until `/team/*` consumes them)
- **E12** — durable cache (hard; all ATTOM/MLS tools read through)
- **E9** — AI agent foundation (reuses `tool()`, `ai_tool_runs`, gateway, disclaimers)

## Proposed stories (7, trimmed from 10)

- **E13-S1** — `defineTool()` wrapper + auto-write `ai_tool_runs`; retrofit E9's five existing tools.
- **E13-S2** — ATTOM tool wrappers (all 12) — thin wrappers over E12 clients.
- **E13-S3** — MLS tool wrappers (all 3) — thin wrappers over E12 clients.
- **E13-S4** — Offervana OuterApi read tools (all 5) + `src/lib/offervana/outer-api-client.ts` + seller-scope enforcement (email + `customerId` cross-check).
- **E13-S5** — Supabase read tools (all 8) — thin RLS-backed queries with Zod response schemas.
- **E13-S6** — Prompt + planner updates with cite-the-source discipline.
- **E13-S7** — Per-session tool-call budgets (new columns on `ai_sessions`) + Sentry events + team/admin cost surfacing + outage runbooks.

## Load-bearing decisions

- Read-only only — no write tools in v1 (`ai-agent-policy.md` §3).
- One tool per endpoint, not grouped mega-tools.
- AVM laundered through existing `aggregate-valuation` pipeline; raw ATTOM AVM is a citation, not the headline.
- Offervana seller-scope requires email match *and* `customerId` match against `submissions.offervana_customer_id`.
- PII redaction on every response via `src/lib/ai/redact.ts` before returning to LLM.
- Team-only tools are separate tools, not same-tool-different-scope.
- `[AllowAnonymous]` Offervana endpoints don't leak into seller tools.

## Out of scope

- Any write tools.
- Cache schema or ATTOM/MLS client wrappers (E12).
- MCP-based tool discovery / outbound MCP server.
- Strapi / Trade-in-holdings / Investor-portal / Zoodealio-chat surfaces.
- Cross-tenant queries.
- GHL / Recurly / Cloudinary reads.
- Voice tool-calling.

## References

- `src/app/api/chat/route.ts:14-18`
- E12 (cache + clients): https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7921
- `docs/ai-agent-policy.md` §§3, 7, 8
- `_bmad/memory/zoo-core/services/offervana-saas/api-catalog.md` — OuterApi
- `_bmad/memory/zoo-core/services/zoodealio-mls/api-catalog.md`

## Next steps

- `/zoo-core-create-architecture e13` after E12 architecture locks — locks the `defineTool()` contract, Offervana seller-scope enforcement, and `ai_sessions` budget schema.
- Story creation waits on E10/E11/E12 reaching architecture-locked state (E12 is the hard dep; E10/E11 are consumption-ready gates).
