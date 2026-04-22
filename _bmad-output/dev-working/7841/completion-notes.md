# E4-S8 (7841) — Completion notes

## AC verification

| AC | Status | Notes |
|----|--------|-------|
| 1 Headline exact copy | ✅ | `<h3>We see your home is currently listed.</h3>` in listed-notice.tsx |
| 2 Body exact copy | ✅ | Body `<p>` with em-dash via `&mdash;` |
| 3 Three chip labels | ✅ | Second opinion / Ready to switch / Just exploring |
| 4 Chip↔enum compile match | ✅ | `ListedReason = CurrentListingStatus` derived from `z.enum(CURRENT_LISTING_STATUS_VALUES)` |
| 5 Enum stays `.optional()` | ✅ | schema.ts line 150 |
| 6 Chip write + re-select no-op | ✅ | `onClick` guard `if (value !== chip.value) onChange(chip.value)` |
| 7 Never gates Next | ✅ | No nav change |
| 8 Re-renders on property step | ✅ | Pre-existing — property-step.tsx already renders `<ListedNotice>` with same props |
| 9 Pre-nudge trigger | ✅ | `initialHints?.pillar === 'cash-offers' && enrichmentSlot?.listingStatus === 'currently-listed' && listedReason !== 'just-exploring'` computed in seller-form.tsx |
| 10 Pre-nudge copy | ✅ | Italic `<p>` near condition-step heading |
| 11 Pre-nudge non-gating | ✅ | Copy-only, no state / submit effect |
| 12 `currentListingStatus` in payload | ✅ | Hidden field in form + pass-through in `parseFormData` |
| 13 No localStorage rehydration | ✅ | `listedReason` is `useState`; no `writeDraft` path |
| 14 A11y radiogroup pattern | ✅ | Pre-existing `<fieldset>`+`<legend>`, `role=radio`, roving tabindex, arrow keys |
| 15 44×44 touch targets | ✅ | `min-h-[44px] min-w-[44px]` on chip buttons |
| 16 Copy sign-off | See PR note | "Copy reviewed by Noah" acceptable per AC16 fallback clause |
| 17 Lighthouse delta ≤ 2 | N/A | No perf-sensitive changes; copy-only + single boolean-prop thread |

## Deviations

- **Pre-nudge plumbed via prop, not `useSearchParams`** — story note "No new props on ConditionStep" was interpreted strictly, but three pieces of state (`pillar`, `enrichment.listingStatus`, `currentListingStatus`) are needed and only one (pillar) is reachable via `useSearchParams` alone. Smallest change: single optional boolean `showCashOffersPrenudge` on `ConditionStep`, computed in seller-form.tsx where all three are already in scope. Avoids context plumbing and keeps the component signature flat.
- **`currentListingStatus` pre-existing enum was wrong** — E3-S2 provisioned the field with values mirroring `listingStatus` (`not-listed | currently-listed | previously-listed`) instead of the reason-for-listed values this story locks. S8 replaces the values as part of the scope.

## Follow-ups

- No "reducer action" exists in the codebase today — listed-reason state is plain `useState`. AC6 references "existing reducer action (from E3-S2)" which never landed. Current implementation satisfies AC6 semantically (writes `currentListingStatus` + no-op on re-select).

## Files touched

- `src/lib/seller-form/schema.ts` — add `CURRENT_LISTING_STATUS_VALUES` constant + `CurrentListingStatus` type; point `currentListingStatus` enum at it.
- `src/components/get-started/listed-notice.tsx` — finalize copy, chip labels, headline level; source enum from schema; guard re-select no-op.
- `src/components/get-started/steps/condition-step.tsx` — add `showCashOffersPrenudge` optional prop + conditional italic `<p>` below heading.
- `src/components/get-started/seller-form.tsx` — compute pre-nudge flag, thread through `StepDispatch`, add `currentListingStatus` hidden form field.
- `src/app/get-started/actions.ts` — pass-through `currentListingStatus` from formData into Zod-validated payload.

## Checks

- `npx tsc --noEmit` → 0 errors
- `npx vitest run` → 116 passed (11 files)
- `npm run lint` → pre-existing warnings only in `src/components/marketing/faq.tsx`; no new issues in touched files
