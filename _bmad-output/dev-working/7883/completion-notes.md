# Completion notes — E4-S12 / 7883

**Branch:** `feature/e4-property-enrichment-7780` (shared E4 branch, no push per user directive)
**Commit:** _filled in at commit time_
**Tests:** 154 passing across 11 vitest files (57 in normalize.test, 17 in mls-status-notice.test).
**TypeScript:** `npx tsc --noEmit` clean.

## Scope delivered

- `displayListingStatus()` + `canonicalizeStatus()` + `ACTIVE_STATUS_RAW_KEYS` in `normalize.ts`.
- `EnrichmentSlot` extended with `listingStatusDisplay?` + `rawListingStatus?`; `enrichmentSlotSchema` updated.
- `listed-notice.tsx` → `mls-status-notice.tsx` rename (plus its test file). `ListedReason` + `LISTED_REASON_VALUES` re-exported for S8 consumers.
- Gate: `MlsStatusNotice` renders IFF `mlsRecordId` truthy AND `canonicalizeStatus(rawListingStatus) ∈ {active, activeundercontract, comingsoon, pending}`. Chips only for Active / ActiveUnderContract.
- Call-site updates in `seller-form.tsx`, `address-step.tsx`, `property-step.tsx`.
- `__LISTED__` dev-mock fixture updated with `rawListingStatus: "Active"` + `listingStatusDisplay: "currently listed"`.

## Deviations from plan (all documented in review-report.md)

1. `CURRENTLY_LISTED` renamed to exported `ACTIVE_STATUS_RAW_KEYS` (component needs it for the gate; clearer intent).
2. `canonicalizeStatus` extracted as a shared helper.
3. Added `"sold"` to `PREVIOUSLY_LISTED` — pre-existing gap, covered by new test.
4. No-chips branch uses `<section>` instead of `<fieldset>` (ARIA clean when no radiogroup).

## Handoff to S13

- `ACTIVE_STATUS_RAW_KEYS` + `canonicalizeStatus` already exported for S13's agent-question gate.
- `MlsStatusNotice` is the exact component S13 extends with the agent-question radiogroup.
- `listingStatusDisplay` + `rawListingStatus` already plumbed from draft through both step components — S13 does not need to re-plumb.

## Not in scope / follow-ups

- Banner copy for Closed/Expired/Withdrawn — product call is no banner.
- Widening `normalizeListingStatus` beyond current buckets — not needed.
- `rawListingStatus` as a `track` dimension — deferred (cardinality concern).
- Playwright re-run not performed in dev-story (E2E gate lives in S9/CI). `__LISTED__` fixture change preserves `enrichment-listed.spec.ts` assertions (chips + currentListingStatus still flow).

## Branch state at close-out

Branch retained locally, not pushed (user directive). S13 will stack on top of this commit on the same branch.
