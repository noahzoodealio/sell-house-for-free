# Implementation plan — E4-S12 / 7883

## Approach

Four file-groups, each a self-contained unit that compiles + tests green before moving on.

## File-group 1 — normalize helpers + slot type/schema + merge wiring

**Files**
- `src/lib/enrichment/normalize.ts` — add `canonicalizeStatus` (tiny exported helper), `displayListingStatus`, and export the `CURRENTLY_LISTED` raw-key set (rename to `ACTIVE_STATUS_RAW_KEYS` with clearer intent) for reuse; update `mergeToEnrichmentSlot` to populate `listingStatusDisplay` + `rawListingStatus`.
- `src/lib/seller-form/schema.ts` — extend `enrichmentSlotSchema` with `listingStatusDisplay: z.string().optional()` + `rawListingStatus: z.string().optional()`.
- `src/lib/enrichment/types.ts` — no code change (it re-exports `EnrichmentSlot` from seller-form/types which is `z.infer<enrichmentSlotSchema>`). Verify.
- `src/lib/enrichment/__tests__/normalize.test.ts` — add `displayListingStatus` test block (12+ inputs) and update the `mergeToEnrichmentSlot` test to assert the two new fields appear.

**Verify** `npx vitest run src/lib/enrichment/__tests__/normalize.test.ts` green.

## File-group 2 — component rename + gate + chip split

**Files**
- `git mv src/components/get-started/listed-notice.tsx src/components/get-started/mls-status-notice.tsx` — rename, then rewrite:
  - Export `MlsStatusNotice` (new name). Keep `LISTED_REASON_VALUES` + `ListedReason` type export intact (S8 consumer).
  - New props: `mlsRecordId: string | undefined`, `rawListingStatus: string | undefined`, `listingStatusDisplay: string | undefined`, plus existing `value`, `onChange`, `className`.
  - Gate: return `null` unless `mlsRecordId` truthy AND `canonicalizeStatus(rawListingStatus) ∈ ACTIVE_STATUS_RAW_KEYS`.
  - Headline: `<h3>We see your home is {listingStatusDisplay}.</h3>` (always rendered when gate passes).
  - Subcopy + three chips: rendered IFF `normalizeListingStatus(rawListingStatus) === 'currently-listed'` (Active / ActiveUnderContract).
  - For ComingSoon / Pending, render a plain `<section>` with just the heading (no fieldset/radiogroup since there are no radio chips in that branch — keeps ARIA clean).

## File-group 3 — call sites + dev-mock fixture

**Files**
- `src/components/get-started/seller-form.tsx` — update `ListedReason` import path to `./mls-status-notice`. Plumb new fields (`mlsRecordId`, `rawListingStatus`, `listingStatusDisplay`) from draft.enrichment down to the two step components.
- `src/components/get-started/steps/address-step.tsx` — swap import + component name; replace the `listingStatus` prop with the three new fields.
- `src/components/get-started/steps/property-step.tsx` — same.
- `src/lib/enrichment/fixtures.ts` — `__LISTED__` branch: add `rawListingStatus: "Active"` + `listingStatusDisplay: "currently listed"` so the gate passes in dev-mock + E2E.

**Verify** `npm run build` (or `npx tsc --noEmit`) clean.

## File-group 4 — component tests

**Files**
- `git mv src/components/get-started/__tests__/listed-notice.test.tsx src/components/get-started/__tests__/mls-status-notice.test.tsx` — rewrite:
  - Active: banner + chips + `onChange` on click + roving tabindex.
  - ActiveUnderContract: banner + chips.
  - ComingSoon: banner only, no radiogroup.
  - Pending: banner only, no radiogroup.
  - Closed / Expired: no render.
  - Missing mlsRecordId: no render.
  - Missing rawListingStatus: no render.

**Verify** `npx vitest run src/components/get-started/__tests__/mls-status-notice.test.tsx` green, then full `npx vitest run` to confirm nothing else broke.

## Compaction gates

Between each file-group — re-read this plan + sidecar to resume.

## EF migrations

None. Next.js BFF + client only.

## Out of scope

Reconfirmed: S13 agent question, banner copy for Closed/Expired, widening `normalizeListingStatus`, `rawListingStatus` analytics dimension.
