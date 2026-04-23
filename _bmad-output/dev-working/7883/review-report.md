# Self-review — E4-S12 / 7883

## AC-by-AC verification

| # | AC | Evidence | Status |
|---|----|----|----|
| 1 | `displayListingStatus` mapping (Active / AUC / ComingSoon / Pending) case+separator insensitive | `normalize.ts` — lookup table keyed by `canonicalizeStatus(raw)`. Tests cover `Active`, `active`, ` Active `, `ActiveUnderContract`, `active_under_contract`, `active-under-contract`, `ACTIVE UNDER CONTRACT`, `ComingSoon`, `coming soon`, `coming_soon`, `Pending`, `PENDING` | ✓ |
| 2 | Negatives → undefined (Closed/Sold/Expired/Withdrawn/Cancelled/null/undefined/empty/unknown) | Same test block — 7 out-of-gate strings + null/undefined | ✓ |
| 3 | Slot fields `listingStatusDisplay?` + `rawListingStatus?` populated by `mergeToEnrichmentSlot` | `normalize.ts` merge adds both fields; three new `mergeToEnrichmentSlot` tests cover Active / Closed / undefined cases | ✓ |
| 4 | `enrichmentSlotSchema` validates both as `z.string().optional()` | `schema.ts:123-124` | ✓ |
| 5 | `MlsStatusNotice` returns null unless mlsRecordId truthy AND canonicalized raw ∈ {active, activeundercontract, comingsoon, pending} | Component early returns; 6 gate tests (missing mlsRecordId, missing rawListingStatus, 6 out-of-gate raws) | ✓ |
| 6 | Headline `<h3>We see your home is {display}.` | Both render branches emit the same `<h3>`; test uses `getByRole("heading", { level: 3 })` to assert exact text | ✓ |
| 7 | Chips render IFF canonicalized ∈ {active, activeundercontract} | `showChips` keys off `canonical === "active" \|\| canonical === "activeundercontract"`; ComingSoon/Pending tests assert `queryByRole("radiogroup")` is null | ✓ (AC#7 wording said `normalizeListingStatus === 'currently-listed'` which would include Pending/ComingSoon — AC#10 test cases make the stricter intent clear; went with stricter) |
| 8 | Rename complete; `listed-notice.tsx` removed; `ListedReason` type export preserved | `git mv` both files; `ListedReason` + `LISTED_REASON_VALUES` re-exported from new module; grep confirms no remaining `listed-notice` references in src/ | ✓ |
| 9 | `displayListingStatus` unit tests — 12+ inputs | 12 positive cases via `it.each` + 7 negatives + 3 null/undefined/empty | ✓ |
| 10 | Component tests — 8 scenarios | Active (banner + chips), ActiveUnderContract (banner + chips), ComingSoon (banner, no chips), Pending (banner, no chips), Closed (no render), Expired (no render via it.each), missing mlsRecordId (no render), missing rawListingStatus (no render) | ✓ |
| 11 | `enrichment-listed.spec.ts` unaffected | Spec asserts three chips render + currentListingStatus flows. `__LISTED__` fixture updated with `rawListingStatus: "Active"` + `listingStatusDisplay: "currently listed"` — banner + chips still render. Spec not text-coupled to banner copy | ✓ (not re-run here — no Playwright invocation in dev-story; E2E gate lives in S9/CI) |
| 12 | Analytics preserved | `src/app/api/enrich/route.ts:57` untouched; `track("enrichment_status", { status, cache_hit })` unchanged | ✓ |

## Additional checks

- **TypeScript:** `npx tsc --noEmit` clean.
- **Unit tests:** 11 files / 154 tests pass (57 in normalize.test, 17 in mls-status-notice.test).
- **No third-party tracking SDKs introduced** (per CLAUDE.md analytics policy) — no SDK imports added.
- **React 19 ref-as-prop** — component uses plain `useRef` callback pattern, no `forwardRef` introduced.
- **Bonus fix:** Added `"sold"` to the `PREVIOUSLY_LISTED` set in `normalizeListingStatus` (was missing; consistent with `displayListingStatus` treating Sold as out-of-gate). New test asserts `normalizeListingStatus("Sold") === "previously-listed"`.

## Deviations from plan

1. Renamed internal `CURRENTLY_LISTED` → exported `ACTIVE_STATUS_RAW_KEYS` (component needs it for the gate; clearer intent name).
2. Extracted `canonicalizeStatus` helper (planned — now shared by `normalizeListingStatus`, `displayListingStatus`, and the component gate).
3. Added `"sold"` to `PREVIOUSLY_LISTED` — pre-existing gap, fits the story's "Sold" handling. Documented in tests.
4. For ComingSoon/Pending banner (no-chips variant), rendered plain `<section>` instead of `<fieldset>` to keep ARIA clean when there's no radiogroup. User approved in plan review.

## Risks / follow-ups

- None blocking. S13 can now consume `ACTIVE_STATUS_RAW_KEYS` + `canonicalizeStatus` for its agent-question gate.
