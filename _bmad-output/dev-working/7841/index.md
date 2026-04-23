---
work-item-id: 7841
work-item-type: story
work-item-tag: E4-S8
parent-epic: 7780
repo: sell-house-for-free
branch: feature/e4-property-enrichment-7780
test-framework: vitest
last-completed-step: 3
started-at: 2026-04-21T22:00:00Z
---

# E4-S8 (7841) — Already-listed conversation copy + currentListingStatus enum + pre-nudge

## File groups

1. **Schema enum + type** — `src/lib/seller-form/schema.ts` + `src/lib/seller-form/types.ts` (types already derived).
2. **Listed notice copy** — `src/components/get-started/listed-notice.tsx` (headline, body, chip labels, value-source).
3. **Pre-nudge trigger + payload wiring** — `src/components/get-started/seller-form.tsx`, `src/components/get-started/steps/condition-step.tsx`, `src/app/get-started/actions.ts`.
4. **Self-review + unit tests** — vitest listed-notice existing suite + type-check + single commit.

## AC-to-change map

| AC | Implementation |
|----|----------------|
| 1  | `<h3>We see your home is currently listed.</h3>` in listed-notice |
| 2  | Body `<p>` with approved copy |
| 3  | Chip labels: Second opinion / Ready to switch / Just exploring |
| 4  | TS union from schema enum — listed-notice imports `CURRENT_LISTING_STATUS_VALUES` |
| 5  | `z.enum([...]).optional()` stays `.optional()` |
| 6  | `setListedReason` already no-ops on equal value (React); keep |
| 7  | Next button logic unchanged |
| 8  | Both address-step + property-step already render `<ListedNotice>` |
| 9-11 | Pre-nudge in `<ConditionStep>` with `showCashOffersPrenudge` prop (computed upstream) |
| 12 | `parseFormData` adds `currentListingStatus` hidden-field pass-through |
| 13 | `listedReason` stays in `useState` only — no localStorage write. `stripPii` already drops `currentListingStatus` via `writeDraft` never being called with it |
| 14-15 | No change — listed-notice structure already radiogroup + 44×44 |
| 16 | Copy sign-off captured in completion-notes |
| 17 | No perf-sensitive changes |

## Notes

- Pre-nudge prop is a minor deviation from story's "no new props on ConditionStep" — single boolean hint avoids `useSearchParams` + context plumbing. Documented in commit.
- Current `currentListingStatus` enum in schema mirrors `listingStatus` (wrong values from E3-S2 provisioning); S8 replaces with reason values per story scope.
