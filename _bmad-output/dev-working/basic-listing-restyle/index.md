---
slug: basic-listing-restyle
scope: moderate
task: Restyle /listing page to match home page composition (StatBar, FeatureSplit, NumberedReasons, Testimonial, ServicesBand, FAQ excerpt)
ado-ticket: null
files-touched:
  - src/app/(marketing)/listing/page.tsx
  - src/content/faq/entries.ts
started-at: 2026-04-21
---

# Basic: Listing restyle to home parity

## Summary

Brought `/listing` up to full composition parity with the home page (`src/app/(marketing)/page.tsx`). Listing now runs the same section rhythm as home while keeping its cyan `PillarHero` accent stripe, listing-specific `TrustBar`, and 5-step listing-specific `HowItWorks`.

## Section order (after)

1. `PillarHero` (kept — cyan stripe + breadcrumb)
2. `TrustBar` (kept — TRUST_BAR_CLAIMS)
3. `StatBar` (NEW — 4 listing-framed stats)
4. `FeatureSplit` (NEW — "Your listing agent, without the commission", soft tone, placeholder visual)
5. `NumberedReasons` (NEW — 3 reasons; subsumes the deleted custom prose)
6. `HowItWorks` (kept — 5 steps: intake → photos → MLS → offer review → close)
7. `Testimonial` (NEW — MLS-listing seller story)
8. `ServicesBand` (NEW — 6 listing services)
9. `FAQ` (NEW — filtered by `relatedPillar === "listing" || category === "free-and-fair"`; `size="page"`)
10. "See all questions" link block (copied from home pattern)
11. `CTASection` (kept — upgraded `tone="brand"` to match home)

## Data changes

- `src/content/faq/entries.ts` — added `relatedPillar: "listing"` to 4 existing entries:
  - `entry-how-is-this-free`
  - `entry-what-fees-do-i-pay`
  - `entry-how-long-does-it-take`
  - `entry-vs-opendoor-offerpad`

## Schema

Added a third `JsonLd` block for `faqPageSchema(listingFaqExcerpt)` alongside the existing service + breadcrumb schemas.

## Deviations from plan

None. Implementation matches the approved plan.

## Pattern decisions

- Inlined content constants (`LISTING_STATS`, `LISTING_REASONS`, `LISTING_SERVICES`) in the page file, matching home's pattern — no new `src/content/` files.
- Reused existing `FAQ` component with a pre-filtered `entries` prop (not the `category` prop), matching home's approach at `page.tsx:37-39,197-202`.
- Kept all pillar-specific copy (JK Realty, MLS, ARMLS, seller commission framing).

## Edge cases handled

- JSX text cannot process `\uXXXX` escape sequences. One reason body is a JSX fragment with a curly apostrophe — written as `{"\u2019"}` expression container. The `NumberedReasons` `subcopy` was also moved from a JSX attribute string to an expression container so the JS string escape processes.
- `FeatureSplit` without an `image` prop renders a gradient `PlaceholderVisual` — verified in `feature-split.tsx:131-133`.

## Follow-ups surfaced

- Three other pillar pages (`/cash-offers`, `/cash-plus-repairs`, `/renovation-only`) still use the older pillar template. Bringing them to home parity is a substantial-tier task touching 3 files; should escalate to `zoo-core-dev-story` if pursued.
