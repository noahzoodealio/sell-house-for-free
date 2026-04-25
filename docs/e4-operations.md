# E4 — Property enrichment operations

Quick reference for on-call. Full architecture is in
`_bmad-output/planning-artifacts/architecture-e4-property-data-enrichment.md`;
this file is the 3am-page pocket card.

## What E4 does

Client hits `/api/enrich` (server-only route) after the seller types an
Arizona address. Route calls `Zoodealio.MLS` read-only, normalizes the
response, and returns a bounded `EnrichmentSlot`. Failures return a
shaped envelope (never a 500) so the form always submits.

## Endpoints called

`getEnrichment()` in `src/lib/enrichment/service.ts` runs two rounds of
parallel fetches (S11+):

**Round 1** — `Promise.allSettled`:

| Service | Endpoint | Purpose |
|---|---|---|
| MLS | `GET /properties/search?address=…` | Resolve address → ATTOM ID + MLS record ID |
| ATTOM | `GET /property/expandedprofile?address1=…&address2=…` | Public-record gap-fill (bedrooms/bathrooms/sqft/year/lot) |

**Round 2** (only when MLS matched) — `Promise.allSettled`:

| Endpoint | Purpose | Gate |
|---|---|---|
| `GET /properties/attom/{attomId}` | MLS-side property facts (more authoritative than search) | MLS match |
| `GET /properties/{mlsRecordId}/images` | Listing photos | `listingStatus === currently-listed` |

Each call is wrapped in `AbortSignal.timeout(ENRICHMENT_TIMEOUT_MS)`
(default 4000ms). MLS and ATTOM clients both retry once on 5xx / abort
/ network failures with 250ms backoff. The ATTOM kill-switch is
`ENRICHMENT_SOURCES=mls` (skip ATTOM calls cheaply in preview or during
an ATTOM outage).

Merge precedence: MLS details → MLS search → ATTOM profile (first
non-undefined wins). MLS-only fields (mlsRecordId, attomId,
listingStatus, photos) stay empty on ATTOM-only matches.

## Structured log shape

Every `/api/enrich` call emits one JSON line to stdout. Grep-friendly:

```json
{
  "at": "2026-04-21T22:18:01.234Z",
  "submissionId": "a1b2c3d4-...",
  "addressKey": "<sha256-hex>",
  "status": "ok",
  "durationMs": 412,
  "mlsHits": {"search": true, "details": true, "images": true},
  "attomOk": true,
  "attomLatencyMs": 287,
  "sources": ["mls", "attom"],
  "cacheHit": false,
  "kind": "enrich"
}
```

`mlsHits.{search,details,images}` are flags for "this leg returned
usable data" (not just "the call was made"). `status:"ok-partial"`
means exactly one of MLS / ATTOM had data for the address.

**No raw address**, **no street number** — only the SHA-256 `addressKey`.
If you see a `Street St` substring in the log line, that's a bug — file
immediately.

## Error signatures to grep

Search production logs for these:

| Signature | Meaning | Action |
|---|---|---|
| `"status":"timeout"` | MLS exceeded the 4s budget | Check MLS health dashboard. Rate ≤ 1% of calls is normal. |
| `"status":"error"` | Unhandled thrown error | Check the downstream code path; surface a GitHub issue. |
| `"mlsHits":{"search":false` | Address didn't resolve | High rate → check `Zoodealio.MLS` `/properties/search` output. |
| `"cacheHit":false` at sustained high rate | `unstable_cache` miss storm | Possible cache-key churn; check `addressCacheKey()` or AZ-zip input quality. |

## Counters (Vercel Analytics)

`/api/enrich` fires `track('enrichment_status', {status, cache_hit})` on
every response. Dashboards to build (E8 scope):

- **Success rate**: `status:ok` / total, targeting ≥ 90%.
- **Cache hit rate**: `cache_hit:true` / total, targeting ≥ 60% after warmup.
- **Degraded rate**: `(timeout + error)` / total, alert threshold 5%.

No PII in event dimensions. Status cardinality is 5, `cache_hit` is 2 → 10 combos max.

## Cache drain

When MLS corrects bad property data and we need to invalidate our cache,
fire `revalidateTag('enrichment')` from a Server Action:

```ts
// src/app/admin/enrichment/actions.ts (to build when needed)
"use server";
import { revalidateTag } from "next/cache";

export async function drainEnrichmentCache() {
  revalidateTag("enrichment");
}
```

The cache layer in `src/lib/enrichment/service.ts` tags every entry
`enrichment`, so `revalidateTag` drains the whole namespace. Per-address
invalidation isn't exposed today (architecture §6 open question).

## Escalation

| Failure mode | Who to page |
|---|---|
| `/api/enrich` returning 500s | This repo's on-call (see team directory) |
| `Zoodealio.MLS` unreachable | MLS service owner (Slack: `#mls-service`) |
| Listing photos 403-ing | [SAS rotation runbook](./operations/sas-rotation.md) |
| Vercel Analytics not receiving events | Low priority — structured logs are authoritative; defer |
| Sentry alert | E8 lands Sentry; pre-E8 there is none |

## Out of scope (handed to E8)

- Sentry error tracking.
- Dashboard construction on Vercel Analytics.
- Admin UI for cache invalidation.
- Alerting thresholds wired up.

## E12 — Durable enrichment cache (added 2026-04-25)

The 24h `unstable_cache` is now a hot-path layer over a permanent Supabase
store (`property_enrichments` + `area_enrichments`). Hit ordering inside
`getEnrichment`:

1. In-memory `unstable_cache` (existing, 24h TTL, per-region)
2. Durable cache (`src/lib/enrichment/durable-cache.ts`) — per-endpoint
   stale-check via `src/lib/enrichment/durable-cache-policy.ts`
3. Upstream ATTOM/MLS — only when both layers miss or are stale

**TTLs (per-endpoint):** profile/assessment/schools 90d · avm/sale/permits/rental 30d
· mls_history/sales_trend 7d · mls_search/mls_details/negative-cache 1h
· avm_history indefinite. Source of truth: `durable-cache-policy.ts`.

**Sentry events:**

| Event | When |
|---|---|
| `enrichment_durable_hit` | Cache hit + fresh, upstream skipped |
| `enrichment_upstream_refetch` | Cache miss/stale, upstream called |
| `enrichment_stale_refresh_skipped_outage` | Upstream failed, served stale durable |
| `enrichment_upstream_error` | Upstream failed and no durable to fall back on |

**Vercel Analytics dimensions on `enrichment_status`:** `status`,
`cache_hit`, `durable_hit` (aggregate), `durable_profile_hit`,
`durable_mls_search_hit`. Use the per-endpoint flags to compute hit-rate
by endpoint without re-emitting per-endpoint events.

**Manual stale refresh of a specific address.** Currently no admin UI;
delete the row and re-enrich:

```sql
delete from public.property_enrichments where address_key = '<sha256>';
```

`address_key` is the sha256 of the normalized address — derive via
`addressCacheKey()` in `src/lib/enrichment/normalize.ts`. The next
seller submission for that address will refetch ATTOM + MLS.

**Stale-cache sweep (read-only).** Lists rows whose ATTOM profile or MLS
search timestamps have crossed their TTL. Reports only — does not mutate.

```bash
SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… \
  npx tsx scripts/enrichment-stale-sweep.ts            # all stale
SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… \
  npx tsx scripts/enrichment-stale-sweep.ts --zip 85004  # filtered
```

**Outage tolerance.** When ATTOM (or MLS) returns errors and we have
*any* durable payload (even if past TTL), we serve the stale value and
emit `enrichment_stale_refresh_skipped_outage`. New addresses with no
durable row throw — that path matches the pre-E12 behavior.

**Negative cache.** A row with `sources = []` marks "address looked up,
no upstream match" (1h TTL). Subsequent requests within the TTL skip
both upstreams. Helps with typo storms.

**RLS posture.** Both tables are service-role only. There is no
seller-facing or team-facing read path. Address is weakly-identifying;
no seller PII (name/email/phone) is stored.

## Related

- [`configuration.md`](./configuration.md) — env vars.
- [`e4-qa-plan.md`](./e4-qa-plan.md) — Playwright scenarios.
- [`operations/sas-rotation.md`](./operations/sas-rotation.md) — photo SAS rotation (2027-02-11).
