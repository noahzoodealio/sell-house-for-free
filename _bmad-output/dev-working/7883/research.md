# Research — E4-S12 / 7883

## Existing code shape

### `src/lib/enrichment/normalize.ts`
- `normalizeListingStatus(raw)` uses canonicalization `raw.toLowerCase().replace(/[\s_-]/g, "")` and maps to 3 buckets: `currently-listed` / `previously-listed` / `not-listed`.
- `CURRENTLY_LISTED = Set(active, activeundercontract, pending, comingsoon)` — exactly the S12 gate set. Reuse this canonicalization idiom.
- `mergeToEnrichmentSlot(search, detailsSettled, imagesSettled, fetchedAt)` constructs the slot — needs extension to populate `listingStatusDisplay` + `rawListingStatus`.

### `src/lib/enrichment/types.ts`
- `EnrichmentSlot` re-exported from `../seller-form/types`. Authoritative declaration is `enrichmentSlotSchema` in `src/lib/seller-form/schema.ts` (z.infer).
- `PropertySearchResultDto.listingStatus?: string` — the raw field.

### `src/lib/seller-form/schema.ts`
- `enrichmentSlotSchema` is the source of truth for slot shape; add `listingStatusDisplay?: string.optional()` and `rawListingStatus?: string.optional()`.
- `CURRENT_LISTING_STATUS_VALUES = ['second-opinion', 'ready-to-switch', 'just-exploring']` — these are chip-reason values (S8), not MLS statuses. Don't touch.

### `src/components/get-started/listed-notice.tsx`
- Current gate: `listingStatus !== 'currently-listed' → null`. Takes `listingStatus: EnrichmentSlot['listingStatus']`.
- Renders `<fieldset>` + `<legend>` with hardcoded h3 `"We see your home is currently listed."` + subcopy + three-chip radiogroup with roving tabindex.
- New gate needs `slot.mlsRecordId` + `slot.rawListingStatus` — so the component props must change. Prefer passing `slot` (or the specific fields) rather than just `listingStatus`.

### Callers of ListedNotice
- `src/components/get-started/seller-form.tsx` — imports `ListedReason` type only; uses `useState<ListedReason | undefined>` + props down to step components.
- `src/components/get-started/steps/address-step.tsx` — renders `<ListedNotice>` passing `listingStatus`, `value`, `onChange`.
- `src/components/get-started/steps/property-step.tsx` — same.

All three callers currently pass `listingStatus: EnrichmentSlot['listingStatus']`. New signature needs `mlsRecordId?`, `rawListingStatus?`, `listingStatusDisplay?`. Simplest: pass the whole `slot` (or a subset). But keeping `value`/`onChange` in the callers is still cleanest.

### Tests
- `src/components/get-started/__tests__/listed-notice.test.tsx` — 5 cases, all with `listingStatus={...}`. Full rewrite needed for new prop shape + new cases.
- `src/lib/enrichment/__tests__/normalize.test.ts` — has `normalizeListingStatus` coverage; extend with `displayListingStatus`.

### E2E
- `e2e/enrichment-listed.spec.ts` asserts three chips render + clicking "Ready to switch" sets `currentListingStatus`. Does NOT assert banner copy string. Survives rename as long as fixture carries `mlsRecordId` + `rawListingStatus: "Active"` (or synonym).
- `src/lib/enrichment/fixtures.ts` `__LISTED__` branch currently returns slot with `listingStatus: 'currently-listed'` (already normalized) and `mlsRecordId: 'mls-dev-listed-001'`. **Missing `rawListingStatus`.** Must add `rawListingStatus: "Active"` + `listingStatusDisplay: "currently listed"`. Not in the story's "Files touched" list but implicit from AC#11.

### Analytics
- `src/app/api/enrich/route.ts:57` — `track("enrichment_status", { status, cache_hit: cacheHit })`. Unchanged.

## Canonicalization helper — do we extract?

`normalizeListingStatus` has a one-line canonicalization: `raw.toLowerCase().replace(/[\s_-]/g, "")`. `displayListingStatus` and `MlsStatusNotice` both need the same canonicalization. Options:

- **A. Extract `canonicalizeStatus(raw?: string | null): string` helper** — DRY, single source of truth. Used by both `normalizeListingStatus` and `displayListingStatus` and the component's gate.
- **B. Inline the replace in each call site** — 3 duplications, but fewer files changed.

Going with **A** — the gate set `{active, activeundercontract, comingsoon, pending}` is also worth exporting so the component + tests share it (and S13 can import it).

## Decisions

1. Export `CURRENTLY_LISTED_RAW` (renamed or new export) + a `canonicalizeStatus` helper from `normalize.ts` for reuse by component + S13.
2. Add `displayListingStatus` next to `normalizeListingStatus` — both key on the same canonicalized form.
3. `MlsStatusNotice` props: `mlsRecordId?: string`, `rawListingStatus?: string`, `listingStatusDisplay?: string`, plus existing `value` + `onChange` + `className`.
4. Update `src/lib/enrichment/fixtures.ts` `__LISTED__` to include `rawListingStatus: "Active"` + `listingStatusDisplay: "currently listed"` — required for AC#11 + smoke.
