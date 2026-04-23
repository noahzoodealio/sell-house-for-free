---
work-item-id: 7839
work-item-type: story
work-item-tag: E4-S6
parent-epic: 7780
repo: sell-house-for-free
branch: feature/e4-property-enrichment-7780
file-groups:
  - A: three-new-components (enrichment-badge, enrichment-confirm, listed-notice)
  - B: step-edits-and-orchestrator (seller-form, address-step, property-step)
  - C: unit-tests
last-completed-step: 1
last-completed-file-group: 0
started-at: 2026-04-21T21:50:00Z
---

# 7839 — E4-S6 Enrichment UI surfaces · Dev Sidecar

## Work item

- **Title:** E4-S6 — Enrichment UI surfaces: `<EnrichmentBadge>` + `<EnrichmentConfirm>` photo strip + property-step pre-fill hints + orchestrator wiring
- **Parent:** Feature 7780 (E4).
- **Size:** M.
- **Depends on:** 7838 (`useAddressEnrichment` hook + draft slot), 7840 (Azure Blob remotePatterns allow-listed).
- **Scope:** `sell-house-for-free` only. 3 new files, 3 edits.

## Ecosystem context

- Hook already lives at `src/lib/enrichment/use-address-enrichment.ts` returning a discriminated union `EnrichmentHookResult` (`idle`/`loading`/`ok`/`no-match`/`out-of-area`/`timeout`/`error`).
- `EnrichmentSlot` in `src/lib/seller-form/types.ts` carries `listingStatus`, `details`, `photos`, `fetchedAt`.
- Draft reducer in `src/components/get-started/seller-form.tsx` already strips `enrichment` from localStorage — in-memory hook result is source of truth; pass result down via props, not via `draft.enrichment` reads.
- `currentListingStatus` top-level field on the draft schema currently shares enum with `listingStatus` (existing schema bug). Story explicitly defers strict enum + copy finalization to S8. **Plan:** treat `currentListingStatus` in S6 as a new reason enum (`second-opinion | ready-to-switch | just-exploring`) kept in component state only (not persisted via `writeDraft`, since the schema enum doesn't match the S6 values). S8 will widen the schema + persist.
- `router.replace("?step=address")` (Next.js App Router) preserves draft because seller-form-level state persists across step navigation within the same mount.

## Implementation plan (condensed)

**File-group A — 3 new client components:**
1. `src/components/get-started/enrichment-badge.tsx` — props `{ status }`. Renders `null` when `idle`. Pill with exact architecture-copy for each of the other 6 states. `role="status"` + `aria-live="polite"`.
2. `src/components/get-started/enrichment-confirm.tsx` — props `{ photos }`. Returns `null` when empty. Up to 3 `<Image>` (sizes="120px", width=120 height=90). "Not my home" link → `router.replace("?step=address")`.
3. `src/components/get-started/listed-notice.tsx` — props `{ listingStatus, value, onChange }`. Returns `null` unless `listingStatus === 'currently-listed'`. `<fieldset>` + `<legend>` + 3 radio chips. `role="radio"` inside `role="radiogroup"` with arrow-key nav. Never gates advance (no form integration beyond optional state writeback).

**File-group B — orchestrator + step edits:**
4. `src/components/get-started/seller-form.tsx` —
   - Add `useAddressEnrichment(completeAddressOrNull)` call near top, passing `stepData.address` through `addressStepSchema.safeParse` to derive `AddressFields | null`.
   - Extract `enrichmentStatus`, `listingStatus`, `details`, `photos` from result.
   - Add local `listedReason` state + setter.
   - Pass props to AddressStep + PropertyStep.
5. `src/components/get-started/steps/address-step.tsx` — new props `{ enrichmentStatus, listingStatus, listedReason, onListedReasonChange }`. Render `<EnrichmentBadge>` under zip block. Render `<ListedNotice>` below badge.
6. `src/components/get-started/steps/property-step.tsx` — new props `{ enrichmentDetails, photos, listingStatus, listedReason, onListedReasonChange }`. Controlled pre-fill: per-field `hasUserTyped` flag; display `data.<field> ?? details?.<field> ?? ""` when not typed, `data.<field> ?? ""` otherwise. Hint text under pre-filled inputs until first keystroke. `<EnrichmentConfirm>` above heading. Re-render `<ListedNotice>` (re-shown on property step per story).

**File-group C — unit tests:**
- `src/components/get-started/__tests__/enrichment-badge.test.tsx` — each status renders expected copy + idle renders nothing + `aria-live="polite"`.
- `src/components/get-started/__tests__/enrichment-confirm.test.tsx` — null on empty photos; renders up to 3 thumbnails; clicking "Not my home" calls `router.replace`.
- `src/components/get-started/__tests__/listed-notice.test.tsx` — null unless currently-listed; selection writes via callback; radiogroup role structure.

## Test strategy

- Vitest component tests use `@testing-library/react` + `happy-dom` env (already configured for the repo).
- Mock `next/navigation` `useRouter` for the confirm-strip test.
- Defer Axe + Playwright E2E to S9 (per story "Out of scope").

## Risk / pattern notes

- **Controlled pre-fill** — strictly `value={...}` with per-field `hasUserTyped`; never `defaultValue`. Avoids the React-19 mount-swap warning.
- **Touch target ≥ 44×44** — listed-notice chips sized `min-h-[44px] min-w-[44px]`; "Not my home" link with adequate padding.
- **Ref-as-prop** — all primitives consumed from `@/components/ui/*` already ref-as-prop; no forwardRef added.
- **E1 Radix exception** — no Radix/shadcn imports; three components are hand-rolled (only Headless UI allowance is S4's Combobox).
- **Re-render cost** — props carry only the derived enrichment view shape; seller-form re-renders on every keystroke already (existing pattern). Acceptable.
