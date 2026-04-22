# 7839 — E4-S6 Self-Review

Branch: `feature/e4-property-enrichment-7780` · All files touched live in `src/components/get-started/`.

## AC walk (19 criteria)

1. **Badge renders per status (7 states).** ✅ `enrichment-badge.tsx` — `idle` returns `null`, other six each render distinct copy + icon via `COPY` + `TONE_CLASS`. Unit-tested with `it.each` in `__tests__/enrichment-badge.test.tsx`.
2. **Exact copy per architecture §3.1.** ✅ All five required strings live as literals in `COPY`. Unit test asserts each.
3. **`aria-live="polite"`.** ✅ Root `<div role="status" aria-live="polite" aria-atomic="true">`. Asserted in unit test.
4. **Badge never blocks advance.** ✅ Badge is a sibling of the address inputs — `StepNav` `canAdvance` remains `true` (unchanged). The badge has no interaction with the Next button or form state. Manual walk: clicking Next while status=loading proceeds because nothing gates on it.
5. **Confirm strip conditional.** ✅ `enrichment-confirm.tsx` returns `null` when `photos` is undefined or empty. Unit-tested both branches.
6. **Confirm thumbnails (next/image).** ✅ `<Image sizes="120px" width={120} height={90}>`; no `unoptimized` anywhere. Up to 3 rendered via `slice(0, MAX_PHOTOS)`. Azure Blob host allow-listed in S7 `next.config.ts`.
7. **"Not my home" link.** ✅ Button calls `router.replace(...?step=address&...)` preserving other params. Draft state at the `SellerForm` level is mount-scoped so the address inputs stay populated. Unit test verifies `step=address` + existing params preserved.
8. **Listed notice conditional.** ✅ `listed-notice.tsx` returns `null` unless `listingStatus === "currently-listed"`. Unit-tested across `undefined`, `not-listed`, `previously-listed`.
9. **Listed notice chips (skeleton).** ✅ Three values: `second-opinion`, `ready-to-switch`, `just-exploring`. Chips are `role="radio"` inside `role="radiogroup"` inside `<fieldset>` with `<legend>`. `onChange` writes via the seller-form-level `setListedReason`. S8 will finalize copy + strict schema enum. (Note: story AC #9 has typo `second-oinion` — implemented the unambiguous `second-opinion`.)
10. **Listed notice never gates.** ✅ The reason state is local to `SellerForm`; `onNext` in seller-form has no guard on it. Chip selection doesn't feed validation.
11. **Property-step pre-fill.** ✅ `property-step.tsx` uses `displayNumber(draftValue, enrichmentValue, typed)` to render the enrichment value only when the seller has not typed AND the draft is empty. Applies to `bedrooms`, `bathrooms`, `squareFootage`, `yearBuilt`, `lotSize`.
12. **Pre-fill hint text.** ✅ `helpText={isPrefilled(field) ? PREFILL_HINT : undefined}` passed to `<Field>`. `PREFILL_HINT = "Filled from public records — edit if wrong"`. Rendered via the existing `<Field>` `.text-ink-muted` helper slot (small, muted).
13. **Edit affordance.** ✅ `markTyped(field)` flips the per-field flag on the first `onChange`. `isPrefilled` then returns `false`, so the hint disappears and `data-prefilled` attribute is dropped. The input value becomes `draftValue` (seller-typed).
14. **Orchestrator wiring.** ✅ `seller-form.tsx` calls `useAddressEnrichment(completeAddress, submissionId)` once near the top (after `stepData` is initialized). `completeAddress` is the `addressStepSchema.safeParse(stepData.address)` result (or `null`). The hook itself already calls `setEnrichment` internally per S5.
15. **Badge + listed notice in address-step.** ✅ `address-step.tsx` renders `<EnrichmentBadge>` under the "Arizona only" blurb (i.e. under the address input block) and `<ListedNotice>` directly below the badge.
16. **Confirm strip + pre-fill hints in property-step.** ✅ `<EnrichmentConfirm>` renders as the first child above the `<h2>`. Pre-fill hints appear inside each `<Field>` via `helpText`.
17. **Axe clean.** ⚠️ Deferred to S9 per story "out of scope" (Playwright + axe-core run). Structurally: `role="status"` / `aria-live="polite"` / `aria-atomic` on badge; `fieldset` + `legend` + `radiogroup` + `role="radio"` + `aria-checked` on listed notice; `<section aria-label>` + `alt` on photos; preserves the E3-S10 baseline patterns.
18. **Touch targets ≥ 44×44.** ✅ Listed-notice chips: `min-h-[44px] min-w-[44px]`. "Not my home" button: `min-h-[44px]` + px/py padding.
19. **Keyboard complete.** ✅ `handleKeyDown` on chips implements arrow-key roving focus per ARIA radiogroup pattern (tested with `tabIndex` assertion). "Not my home" is a `<button type="button">` — Tab-focusable natively.

## Pattern compliance

- **React 19 ref-as-prop.** ✅ No `forwardRef` introduced; the new components don't take refs.
- **`'use client'`** on all three new components (badge, confirm, listed-notice). Required — badge subscribes via prop from a client-only hook; confirm uses `useRouter` + `useSearchParams`; listed-notice uses `useId` + `useRef`.
- **No Radix/shadcn.** ✅ Hand-rolled primitives; the E1 Headless UI carve-out (Combobox) is limited to S4.
- **Controlled inputs.** ✅ Property-step pre-fill uses `value={...}` only, with per-field `hasUserTyped` flag. No `defaultValue` anywhere.
- **Analytics guard.** ✅ No vendor SDK touched. `src/app/layout.tsx` analytics gate untouched.
- **Draft `stripPii`.** ✅ Enrichment is still stripped on localStorage write (no regression). In-memory hook result is the UI source of truth.

## Test coverage

- `enrichment-badge.test.tsx` — 9 assertions (idle null, 6 copy cases, aria-live, data-attr).
- `listed-notice.test.tsx` — 5 assertions (3 null branches, radiogroup structure, click, aria-checked, roving tabindex).
- `enrichment-confirm.test.tsx` — 5 assertions (null undefined, null empty, ≤3 thumbnails + image props, caption, router navigation preserving params).
- Full suite: **116 tests pass** (was 97 pre-S6).

## Build + typecheck

- `npx tsc --noEmit` → clean.
- `npm run build` → compiled successfully; 31/31 static pages.
- `npm run lint` → 5 pre-existing issues in `faq.tsx` / `renovation-only/page.tsx` / `header.tsx` / `actions.ts`; none in S6 files.

## Deferred items (per story "Out of scope")

- S7 next.config.ts allow-list — already landed (30ab536).
- S8 strict `currentListingStatus` schema enum + listed-notice copy finalization.
- S9 Playwright E2E + axe-core runs.
- S10 observability.

## Files touched

- `src/components/get-started/enrichment-badge.tsx` (new, 98 lines)
- `src/components/get-started/enrichment-confirm.tsx` (new, 62 lines)
- `src/components/get-started/listed-notice.tsx` (new, 119 lines)
- `src/components/get-started/steps/address-step.tsx` (edit — 4 props + badge + listed notice)
- `src/components/get-started/steps/property-step.tsx` (rewrite — pre-fill + confirm + listed notice)
- `src/components/get-started/seller-form.tsx` (edit — hook call + 4 new dispatch props)
- `src/components/get-started/__tests__/enrichment-badge.test.tsx` (new)
- `src/components/get-started/__tests__/enrichment-confirm.test.tsx` (new)
- `src/components/get-started/__tests__/listed-notice.test.tsx` (new)

Verdict: **ready for close-out**.
