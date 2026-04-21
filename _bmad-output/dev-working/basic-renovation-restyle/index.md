---
slug: basic-renovation-restyle
scope: moderate
task: Restyle /renovation-only to home composition; drop "Only" in display; reframe as "free MLS listing with renovation included, seller pays from proceeds, no investor split."
files-touched:
  - src/app/(marketing)/renovation-only/page.tsx
  - src/content/pillars/home-pillars.tsx
  - src/content/revenue/streams.ts
  - src/content/faq/entries.ts
  - plus 9 files touched by display-rename only (Renovation-Only → Renovation)
started-at: 2026-04-21
---

## Summary

Renovation pillar brought to home-parity composition. Verbiage reframed per user correction:

- Seller pays for the renovation in full; the difference from a self-funded reno is *when* they pay (at close, from proceeds) not *whether*.
- No investor split on this path. No ARV-uplift share. Seller keeps 100% of upside above the reno cost.
- It's still a zero-fee MLS listing; the renovation is simply bundled in, settled at close.
- Hola Home Services remains the renovation execution partner but is no longer framed as "earning on the resale" (which was the old investor-spread model that didn't match reality).

## Display rename: "Renovation-Only" → "Renovation"

Display-only sweep across `src/`. Route, LINKS key, pillar slug, and `--color-accent-renovation-only` token all left intact to avoid cascading.

Unchanged (intentionally):
- URL: `/renovation-only`
- `LINKS.renovationOnly`
- `PILLAR_SLUG = "renovation-only"`
- Pillar type member `"renovation-only"`
- CSS token `--color-accent-renovation-only`

## Revenue & FAQ copy corrections

- `src/content/revenue/streams.ts` — `renovation-only-hola` entry rewritten as "Renovation cost settled at close," removing the old "Hola earns on the resale" framing.
- `src/content/faq/entries.ts` — `entry-cash-plus-and-renovation-only` answer updated so Cash+ correctly describes investor-funded repairs with ARV-share split, and Renovation correctly describes seller-funded-from-proceeds with no split.

## Verification

- `npx tsc --noEmit` clean
- `npm run build` passes, 29 static pages
- All four pillar pages (/listing, /cash-offers, /cash-plus-repairs, /renovation-only) now share the 11-section composition with home.

## Remaining follow-ups

- None on the pillar-restyle track. Home/Listing/Cash Offers/Cash+/Renovation all unified.
- Potential next: refresh `/why-its-free` page if the revenue-streams copy has additional stale cross-references.
