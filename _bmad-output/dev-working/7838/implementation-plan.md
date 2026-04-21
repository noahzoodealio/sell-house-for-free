---
work-item-id: 7838
work-item-type: User Story
parent-epic: 7780
repo: sell-house-for-free
branch: feature/e4-property-enrichment-7780
last-completed-step: 3
---

# E4-S5 (7838) — useAddressEnrichment hook + draft wiring

## Reality check vs spec

Two deltas to flag up front:

1. **No `useSellerFormDraft` hook exists.** E3-S2 landed draft persistence as pure functions (`readDraft`/`writeDraft`/`clearDraft`). The seller-form uses those directly with local `useState`. The spec's instruction to "add `setEnrichment` to `useSellerFormDraft` return type" is vacuous — there is no hook to extend.
   - **Adaptation:** `setEnrichment(slot)` lands as an exported function in `src/lib/seller-form/draft.ts`, imported by the hook. Caller of the hook (S6/seller-form consumer) can read `slot` directly off the hook return without needing a separate draft-hook layer.
   - **`types.ts` edit is skipped** — no return type to modify; the slot type is already exported.

2. **`enrichmentSlotSchema.status` enum is too narrow for AC 10.** The schema currently allows `["idle", "loading", "ok", "error", "timeout"]`. AC 10 requires writing `no-match` and `out-of-area` envelope statuses verbatim into the slot.
   - **Adaptation:** extend the enum by two values (`"no-match"`, `"out-of-area"`). Backward-compatible — existing drafts parse fine since the field is optional.

## File-groups

### FG-1 — Schema extension
- `src/lib/seller-form/schema.ts` — extend `enrichmentSlotSchema.status` enum to include `"no-match"` and `"out-of-area"`.

### FG-2 — Draft helper
- `src/lib/seller-form/draft.ts` — export `setEnrichment(slot: EnrichmentSlot): void`; strip `enrichment` from the persisted copy (mirror `stripPii` pattern).

### FG-3 — Hook
- `src/lib/enrichment/use-address-enrichment.ts` — new `'use client'` module.
  - 400ms debounce (AC 3)
  - `useTransition` wrapper (AC 4)
  - `AbortController` per request + unmount abort (AC 5)
  - `sessionStorage:shf:enrich:v1:${hash}` synchronous cache (AC 6)
  - Client `crypto.subtle.digest` SHA-256 (AC 7) matching server `addressCacheKey` canonical string
  - AZ-zip short-circuit via `isAzZip` (AC 11)
  - `useRef<Map<key, Promise>>` dedupe (AC 8)
  - Calls `setEnrichment(...)` on resolve (AC 9/10)
  - Discriminated-union return (AC 1, 15)

### FG-4 — Tests
- `src/lib/enrichment/__tests__/use-address-enrichment.test.ts` — cover all AC 14 scenarios: null idle, happy ok, no-match, timeout, sessionStorage hit, debounce coalesce, abort on unmount, AZ-zip guard, concurrent dedupe.

## Risks

- `crypto.subtle` in jsdom: vitest uses jsdom 29; has WebCrypto. Should work.
- React 19 `useTransition` + `startTransition` on async fn: valid pattern but tests will need `act()` wrapping and `vi.useFakeTimers()` for debounce.

## Close-out

Single commit on current branch: `E4-S5 (7838): useAddressEnrichment hook + setEnrichment draft wiring`.
