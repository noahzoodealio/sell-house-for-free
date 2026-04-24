---
slug: e12-property-enrichments-durable-cache
ado-epic-id: 7921
ado-url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7921
ado-parent-epic-id: 7776
ado-parent-epic-url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7776
work-item-type: Feature
mode: mcp
action: create-new
status: filed-and-widened
created-at: 2026-04-23T00:00:00Z
filed-at: 2026-04-23T21:33:15Z
widened-at: 2026-04-23T22:56:48Z
---

# E12 — Property Enrichments Durable Cache (ATTOM multi-endpoint + MLS) — Epic Brief

Filed as ADO Feature **7921** under Epic 7776 on 2026-04-23. **Widened at E13 drafting on 2026-04-23** to cover every ATTOM/MLS endpoint the AI agent (E13) will call as a tool — one migration, one cache layer serves both the existing submission flow and the future AI tool surface. Full architecture doc to follow via `/zoo-core-create-architecture e12`.

## Widening rationale

Original E12 scoped to caching only ATTOM `expandedprofile` + MLS listing lookup (the two endpoints the existing `getEnrichment` path already uses). E13 (ADO #7939) was going to add nine more ATTOM endpoints + MLS listing history as AI tools — each needing the same Supabase-backed cache. Rather than ship E12 twice (narrow first, expand later with a schema migration), expand once now with per-endpoint jsonb columns. E13 then owns zero cache infrastructure and is purely a tool-surface epic.

Ships independently of E10/E11/E13 — only depends on E6-S1 (Supabase provisioning).

## Summary

Persist every cacheable ATTOM + MLS response to Supabase keyed by `address_key` (sha256 of normalized address). In-memory `unstable_cache` stays on top as the fast hot path. Per-endpoint jsonb columns + per-endpoint `*_fetched_at` timestamps enable independent staleness checks and partial refresh (e.g. MLS stale → refetch MLS only, reuse ATTOM).

Includes a separate `area_enrichments` table keyed on `geoid_v4` for area-scope endpoints (`/salestrend/snapshot`, `/school/search`) where the key is a zip/geo region rather than an address.

## Endpoint coverage (expanded list)

ATTOM per-property: expandedprofile, attomavm/detail, avmhistory/detail, sale/snapshot, saleshistory/detail, assessment/detail, assessmenthistory/detail, property/buildingpermits, valuation/rentalavm.

ATTOM area-scope: salestrend/snapshot, school/search.

MLS: properties/search, properties/attom/{attomId}, properties/{mlsRecordId}/history.

Each endpoint gets its own `{source}_payload jsonb` + `{source}_fetched_at` column and its own TTL entry in the policy table.

## Dependencies

- **E6-S1** — Supabase provisioning + `getSupabaseAdmin()`. Only hard dep.
- **Not blocked** by E10/E11/E13.

## Proposed stories (7)

- **E12-S1** — Schema migration: `property_enrichments` + `area_enrichments` tables with per-endpoint jsonb columns, per-endpoint `*_fetched_at`, `sources text[]`, RLS service-role-only.
- **E12-S2** — `src/lib/enrichment/durable-cache.ts`: `readDurable(key, endpoint)` + `writeDurable(key, endpoint, payload)`. Pure Supabase wrapper, no policy.
- **E12-S3** — TTL policy table in `src/lib/enrichment/durable-cache-policy.ts`: profile 90d, avm 30d, avm_history indefinite, sale/sales_history 30d, assessment/assessment_history 90d, building_permits 30d, rental_avm 30d, mls_search/mls_details 1h, mls_history 7d, area_sales_trend 7d, schools 90d, negative-cache 1h.
- **E12-S4** — Wire into `getEnrichment`: in-memory → durable → upstream → durable write → in-memory write; partial-refresh semantics.
- **E12-S5** — New ATTOM client wrappers for all endpoints not yet implemented (AVM, AVM history, sale, sales history, assessment, assessment history, building permits, rental AVM, salestrend, schools) + MLS `getListingHistory`. Each writes through durable-cache automatically.
- **E12-S6** — Ops + observability: Sentry (`enrichment_durable_hit`, `enrichment_upstream_refetch`, `enrichment_stale_refresh_skipped_outage`, `enrichment_upstream_error`), Vercel Analytics dimensions (`durable_hit`, `endpoint`), per-endpoint hit-rate dashboard, stale-sweep script.
- **E12-S7** — Opportunistic backfill from `offervana_idempotency`. Skip if no salvageable payloads.

## Load-bearing decisions

- Per-endpoint jsonb columns, not a single `payloads jsonb` object — cheaper stale-checks, easier partial invalidation.
- `address_key` (sha256) PK, not `attom_id` — addresses without ATTOM matches still need cache rows.
- Store raw payloads, not normalized — normalization is `normalize.ts`'s job, can re-derive.
- Area-scope endpoints cache to `area_enrichments` keyed by `geoid_v4`, not on `property_enrichments`.
- Negative-cache rows (`sources = []`) with 1h TTL to avoid hammering typos.
- No seller PII on the cache table; RLS service-role only.

## Out of scope

- AI-agent tool surface (E13).
- Caching Offervana or Supabase reads (different access patterns; separate epic if warranted).
- Property-history tables beyond ATTOM-exposed endpoints.
- MLS change-notification webhooks.
- Pre-warming speculative zips.

## References

- `src/lib/enrichment/service.ts`, `cache.ts`, `normalize.ts`
- `src/lib/enrichment/attom-client.ts` (reuse + extend with new endpoints)
- `src/lib/enrichment/mls-client.ts` (reuse + extend with `/history`)
- `_bmad-output/planning-artifacts/architecture-e4-property-data-enrichment.md`
- E13 consumer: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7939
- ATTOM API docs: https://api.developer.attomdata.com/docs

## Next steps

- `/zoo-core-create-architecture e12` to lock the full schema (all per-endpoint columns), TTL policy table, and the `readDurable/writeDurable` contract before story decomposition.
- E12 should land before E13 (hard dep); E12 can run in parallel with E10/E11 since it has no auth/portal dependency.
