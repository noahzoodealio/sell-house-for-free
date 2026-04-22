# E4-S11 Implementation Plan

## Design decisions (grounded in current code)

1. **Parallelism shape.** Round 1: `Promise.allSettled([searchByAddress, getAttomProfile])`. Round 2 (only when MLS search matched): `Promise.allSettled([getAttomDetails, getImages])`. Two rounds total — ATTOM profile runs in parallel with MLS search, so off-MLS addresses still get public-record data.
2. **Merge precedence (AC5).** `details → search → attomProfile` per-field. Existing `listingStatus/photos/mlsRecordId/attomId` stay MLS-only.
3. **`ok-partial` rules (AC6).**
   - MLS match + ATTOM ok → `ok`, sources `['mls','attom']`
   - MLS match + ATTOM failed/off → `ok-partial`, sources `['mls']`
   - MLS no-match + ATTOM ok → `ok-partial`, sources `['attom']` (attom-only slot, no mlsRecordId/attomId/listingStatus)
   - MLS failed (threw) + ATTOM ok → `ok-partial`, sources `['attom']` (treats MLS throw like no-match when ATTOM saves the day)
   - Neither source has data → existing behaviour (`no-match` / `timeout` / `error`) driven by the MLS outcome
4. **`ENRICHMENT_SOURCES` toggle (AC7).** Comma-separated allow-list, trim + lowercase, dedupe. Default `['mls','attom']`. Unknown/empty values fall back to default. When `attom` is not in the list, no ATTOM fetch is constructed (`Promise.resolve(null)` placeholder).
5. **Telemetry propagation (AC13).** Change `getEnrichment` signature to return `{ envelope, telemetry }` where telemetry carries `attomLatencyMs / attomOk / sources / mlsOk-triplet`. `route.ts` consumes both. This keeps the public JSON body clean (no internal metrics leak to client). Never logs the raw ATTOM body.
6. **Cache (AC12).** Extend `CachedBody` with `kind: 'ok-partial'` that caches with the ok TTL (reuses `withEnrichmentCache` default). `no-match` keeps its short 1h TTL.
7. **`mergeToEnrichmentSlot` signature.** Refactor to an options object — `{ search?, detailsSettled?, imagesSettled?, attomProfileSettled, fetchedAt, sources }`. Returns a slot even when `search` is absent (ATTOM-only path).
8. **ATTOM DTO.** Narrow to the five consumed fields: `bedrooms, bathrooms, squareFootage, yearBuilt, lotSize` + `[k:string]: unknown`. Parse from `property[0]` — `building.rooms.beds / building.rooms.bathsTotal / building.size.universalsize / summary.yearbuilt / lot.lotsize2`.
9. **ATTOM no-match.** The expandedprofile endpoint returns HTTP 400 or a `status.code != 0` envelope when no match — parse defensively and return `null` (no throw) so `Promise.allSettled` sees fulfillment with `null`, treated same as "ATTOM has no data."

## File-groups

### Group 1 — Types + schema foundation
- `src/lib/enrichment/types.ts` — add `AttomErrorCode`/`AttomError`, `AttomProfileDto`, extend `MlsEndpoint` isn't needed (separate service). Add `sources` to `EnrichmentSlot` via seller-form schema (below). Extend `EnrichmentEnvelope` union with `ok-partial`. Add `EnrichmentTelemetry` + `EnrichmentResult` internal types.
- `src/lib/seller-form/schema.ts` — `enrichmentSlotSchema` gains `sources: z.array(z.enum(['mls','attom'])).optional()` and status enum gets `'ok-partial'`.

**Verify:** `npx tsc --noEmit` clean (service.ts still compiles against old merge signature for now).

### Group 2 — ATTOM client + unit tests
- `src/lib/enrichment/attom-client.ts` — new. Exports `getAttomProfile(addr: AddressFields): Promise<AttomProfileDto | null>`. Same timeout/retry discipline as mls-client. Header `apikey: <token>`; missing token throws `AttomError{code:'config'}` synchronously before any fetch. Parses `data.property[0]` → narrow DTO; returns `null` for no-match (HTTP 400 or empty property array).
- `src/lib/enrichment/__tests__/attom-client.test.ts` — 11 cases (all-five-fields success, partial-fields, 500→retry→ok, double-500 throws, 4xx-no-retry, abort→retry→ok, double-abort timeout, parse error, missing token throws config synchronously, fetch TypeError→network, no-match returns null).

**Verify:** `npx vitest run src/lib/enrichment/__tests__/attom-client.test.ts`.

### Group 3 — Normalize + merge
- `src/lib/enrichment/normalize.ts` — refactor `mergeToEnrichmentSlot` to options-object signature. Accept optional `attomProfileSettled`; compute the `details` fallback chain `details → search → attomProfile`. Build the slot correctly for MLS-only, ATTOM-only, and both-sources cases. Return `sources` array on the slot.

**Verify:** `npx tsc --noEmit` (service.ts will break until Group 4 — that's expected).

### Group 4 — Service orchestration + tests
- `src/lib/enrichment/service.ts` —
  - `getEnabledSources()` parses `ENRICHMENT_SOURCES`.
  - `runEnrichment` issues `Promise.allSettled([searchByAddress, attomEnabled ? getAttomProfile : Promise.resolve(null)])`. Then for MLS-matched case, issue the existing `[getAttomDetails, getImages]` allSettled.
  - Builds `CachedBody` with `ok` vs `ok-partial` kind based on source availability.
  - `getEnrichment` now returns `{ envelope, telemetry }`. Telemetry includes `mlsSearchOk / mlsDetailsOk / mlsImagesOk / attomOk / attomLatencyMs / sources`.
  - Cache handling extended to also cache `ok-partial` with ok TTL.
- `src/lib/enrichment/__tests__/service.test.ts` — update existing tests to destructure `{envelope}`; add 4 merge-path cases plus a `ENRICHMENT_SOURCES=mls` case asserting no ATTOM fetch.

**Verify:** `npx vitest run src/lib/enrichment/__tests__/`.

### Group 5 — Route + env docs
- `src/app/api/enrich/route.ts` — consume `{envelope, telemetry}` from `getEnrichment`. Extend `LogLine` with `attomLatencyMs / attomOk / sources`. Return only `envelope` to the client.
- `.env.example` — append `ATTOM_API_BASE_URL`, `ATTOM_PRIVATE_TOKEN`, `ENRICHMENT_SOURCES` (optional) with comments.
- `docs/e4-operations.md` — mention ATTOM in endpoint list (per suggested tasks).

**Verify:** `npm run typecheck` + `npx vitest run`. Smoke optional (the story says "Smoke: fire a real address through /api/enrich locally" — treat as manual post-PR verification).

## Non-goals (story scope fence)
- No UI change.
- No AVM / sales-history / equity endpoints.
- `suggest()` stays MLS-only.
- No per-source cache TTLs.

## Compaction gates
Between each file-group, compact context. The sidecar `index.md` + this plan are enough to resume at any group.
