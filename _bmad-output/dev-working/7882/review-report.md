# E4-S11 Self-Review

## AC coverage

| # | AC | Status | Evidence |
|---|---|---|---|
| 1 | ATTOM client exists, 4s timeout, retry-once, 4xx/parse/config non-retryable | ✅ | `attom-client.ts` + attom-client.test.ts cases `retries once on 500`, `throws after two 500s`, `does not retry on 4xx`, `retries once on AbortError`, `throws timeout after two aborts` |
| 2 | `apikey` header; missing token → synchronous config error, no fetch | ✅ | Test `throws config when token unset (no fetch fires)` asserts `mock.not.toHaveBeenCalled()` |
| 3 | `address1` + `address2` format, URL-encoded | ✅ | Test `sends apikey header and encodes address1/address2` asserts the exact URL |
| 4 | `Promise.allSettled([mls, attom])` in service; off-MLS still gets ATTOM | ✅ | `service.ts` round 1; `attom-only path (MLS no-match + ATTOM ok)` test |
| 5 | Merge precedence details → search → attom; MLS-only fields stay MLS | ✅ | `normalize.ts` fallback chain; `both-ok path` test asserts `bedrooms=4 (details), yearBuilt=2001 (attom), lotSize=7200 (details)`; `attom-only` test asserts `attomId/mlsRecordId/listingStatus` are undefined |
| 6 | Envelope status: both-ok→ok, one→ok-partial, both-fail→existing | ✅ | Four merge-path tests in service.test.ts cover all four branches |
| 7 | `ENRICHMENT_SOURCES=mls` disables ATTOM, no fetch fired | ✅ | `ENRICHMENT_SOURCES=mls` test asserts `getAttomProfile.not.toHaveBeenCalled()` |
| 8 | .env.example documents ATTOM_API_BASE_URL, ATTOM_PRIVATE_TOKEN, ENRICHMENT_SOURCES, server-only (no NEXT_PUBLIC_) | ✅ | Diff verified |
| 9 | 10+ attom-client tests | ✅ | 14 cases |
| 10 | 4 merge paths + ENRICHMENT_SOURCES=mls test | ✅ | All five present |
| 11 | AttomProfileDto narrow (5 fields + `[k]: unknown`) | ✅ | `types.ts` |
| 12 | Suggest still MLS-only | ✅ | `suggest()` unchanged structurally |
| 13 | Log line gains `attomLatencyMs / attomOk / sources`; raw ATTOM body never logged | ✅ | `route.ts` LogLine extended; service only propagates normalized fields to telemetry, never the raw response |
| 14 | Cache unchanged; ok-partial caches with ok TTL | ✅ | `getEnrichment` writes ok-partial to `withEnrichmentCache` with default (ok) TTL |
| 15 | `enrichmentSlotSchema` gains `sources[]` + `'ok-partial'` status | ✅ | `schema.ts` diff |

## Documented deviations

1. **`getAttomProfile` returns `AttomProfileDto | null` (AC1 said `Promise<AttomProfileDto>`)** — needed to represent the no-match case where ATTOM returns `property: []`. Throwing an error for no-match would force callers to pattern-match on a specific error code. Treating null as "no data" aligns with how `searchByAddress` already handles no-match. Documented in the client JSDoc and captured in the `returns null when property[] is empty` test.

2. **Envelope status with `ENRICHMENT_SOURCES=mls` + MLS match → `ok`, not `ok-partial`** — the story literally says "Both sources OK → ok, only one OK → ok-partial," but `only one` operationally means "data gap among enabled sources." When the operator has deliberately disabled ATTOM, reporting ok-partial would mask real degradation in dashboards. The enabled-set comparison is documented in the `ENRICHMENT_SOURCES=mls` test expectation.

3. **mlsHits.{search,details,images} semantics change** — previously `search: true` meant "we called MLS" (approximated as `!isDevMock && !out-of-area`). Now all three flags mean "this leg returned usable data," driven by telemetry. The docs update in `docs/e4-operations.md` calls this out so ops dashboards can be adjusted.

## Verification

- `npx tsc --noEmit`: clean
- `npx vitest run`: **193 / 193 pass** (14 new attom-client + 11 service + 2 new normalize merge cases)
- `npm run build`: success
- `npm run lint`: 0 issues in S11 touchpoints (pre-existing issues in marketing/layout files are unrelated)
- Smoke: not performed locally — story marks it optional ("Smoke: fire a real address through /api/enrich locally"). Treat as pre-merge manual verification before releasing behind the epic PR.

## Pattern compliance

- Mirrors `mls-client.ts` exactly: `AbortSignal.timeout`, `retryOnce`, `parseJson`, `server-only` import, env-driven config.
- Same narrow-DTO discipline as `PropertyDetailsDto` — five fields typed + `[k]: unknown`.
- Keeps `suggest()` MLS-only per architecture intent.

## Follow-ups (not in scope)

- ATTOM AVM / sales history / equity — deferred to a future story.
- Per-source cache TTLs — future optimization.
- Smoke test with live ATTOM key — needs `.env.local` secrets; manual pre-merge step.
