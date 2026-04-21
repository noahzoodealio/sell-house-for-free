# E4 — Property enrichment operations

Quick reference for on-call. Full architecture is in
`_bmad-output/planning-artifacts/architecture-e4-property-data-enrichment.md`;
this file is the 3am-page pocket card.

## What E4 does

Client hits `/api/enrich` (server-only route) after the seller types an
Arizona address. Route calls `Zoodealio.MLS` read-only, normalizes the
response, and returns a bounded `EnrichmentSlot`. Failures return a
shaped envelope (never a 500) so the form always submits.

## MLS endpoints called

`getEnrichment()` in `src/lib/enrichment/service.ts` may hit three MLS
endpoints per call, in order:

| Endpoint | Purpose | Required for happy path |
|---|---|---|
| `POST /properties/search` | Resolve address → ATTOM ID + MLS record ID | ✅ |
| `GET /properties/attom/{attomId}` | Property facts (bedrooms/bathrooms/sqft/year/lot) | ✅ (on match) |
| `GET /properties/{mlsRecordId}/images` | Listing photos (only when `listingStatus === currently-listed`) | Conditional |

Each call is wrapped in `AbortSignal.timeout(ENRICHMENT_TIMEOUT_MS)`
(default 4000ms). First failure short-circuits to an envelope.

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
  "cacheHit": false,
  "kind": "enrich"
}
```

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

## Related

- [`configuration.md`](./configuration.md) — env vars.
- [`e4-qa-plan.md`](./e4-qa-plan.md) — Playwright scenarios.
- [`operations/sas-rotation.md`](./operations/sas-rotation.md) — photo SAS rotation (2027-02-11).
