# 7883 — E4-S12: Plain-English MLS listing-status display + active-status gating

**Type:** User Story
**State:** New → In Development (at start)
**Parent:** 7780 (Feature — E4 Property Data Enrichment)
**Priority:** 2 · **Size:** S · **Order:** 12/13 in E4
**Depends on:** — (standalone)
**Blocks:** S13 (shared gate + shared component file)

## User story

As a seller whose home is already on MLS, I want the funnel to acknowledge my home's current listing status in plain English ("currently listed" / "coming soon" / "listed, currently under contract") so I trust the site saw my property correctly before I answer further questions. If my home is sold / expired / withdrawn / cancelled, don't surface an incorrect or stale-feeling banner at all.

## Acceptance criteria

1. `displayListingStatus` mapping: Active → "currently listed"; ActiveUnderContract → "listed, currently under contract"; ComingSoon → "coming soon"; Pending → "listed, currently under contract". Case- + separator-insensitive (lowercase + strip whitespace/underscore/dash — mirrors `normalizeListingStatus`).
2. `displayListingStatus` negatives: returns `undefined` for Closed/Sold/Expired/Withdrawn/Cancelled/null/undefined/empty/unknown.
3. `EnrichmentSlot` gains `listingStatusDisplay?: string` + `rawListingStatus?: string`; both populated by `mergeToEnrichmentSlot` from the search response.
4. `enrichmentSlotSchema` validates both new fields as `z.string().optional()`.
5. `MlsStatusNotice` returns `null` unless BOTH: (a) `slot.mlsRecordId` truthy AND (b) canonicalized `rawListingStatus` ∈ {active, activeundercontract, comingsoon, pending}.
6. Headline `<h3>`: `"We see your home is {listingStatusDisplay}."`. Subcopy + chips only when Active/ActiveUnderContract.
7. Three reason chips render IFF `normalizeListingStatus(rawListingStatus)` === 'currently-listed' (Active/ActiveUnderContract). Hidden for ComingSoon/Pending.
8. `listed-notice.tsx` removed; callers import from `mls-status-notice.tsx`; export renamed `ListedNotice` → `MlsStatusNotice`; `ListedReason` type export preserved (S8 consumes it).
9. Normalize tests: `displayListingStatus` for 12+ raw inputs covering whitespace/underscore/dash variants + negatives.
10. Component tests (renamed): Active (banner + chips), ActiveUnderContract (banner + chips), ComingSoon (banner, no chips), Pending (banner, no chips), Closed (no render), Expired (no render), missing mlsRecordId (no render), missing rawListingStatus (no render).
11. Existing E2E `enrichment-listed.spec.ts` unaffected — `__LISTED__` fixture still renders banner + chips after fixture is updated to carry `rawListingStatus: "Active"` + `listingStatusDisplay: "currently listed"`.
12. Analytics preserved — `track('enrichment_status', …)` call unchanged; no new dimensions.

## Out of scope

- S13 agent-involvement question.
- Banner copy for Closed/Expired/Withdrawn/Cancelled.
- Widening `normalizeListingStatus` enum.
- Emitting `rawListingStatus` as an analytics dimension.
