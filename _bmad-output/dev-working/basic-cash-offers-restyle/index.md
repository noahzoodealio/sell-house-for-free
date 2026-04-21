---
slug: basic-cash-offers-restyle
scope: moderate
task: Restyle /cash-offers to match home/listing composition; emphasize unique market-value + upside-capture wedge.
files-touched:
  - src/app/(marketing)/cash-offers/page.tsx
  - src/content/faq/entries.ts
started-at: 2026-04-21
---

## Summary

Brought `/cash-offers` to the same 11-section composition as `/` and `/listing`. Copy rewritten around the site's unique cash wedge:

1. Cash offer priced at market value (not iBuyer discount)
2. You take the cash
3. We list/sell the home traditionally after close
4. Upside over the cash number flows back to you
5. Optionally pair with Cash+ with Repairs for more upside
6. Represented for free the whole way

## FAQ retagging

- `entry-do-you-sell-my-info` — added `relatedPillar: "cash-offers"` (investor-pool topic)
- `entry-vs-opendoor-offerpad` — retagged `listing` → `cash-offers` (iBuyer comparison is native to the cash-offer pillar)

Net effect on listing FAQ excerpt: still has 4 entries (3 free-and-fair + entry-how-long-does-it-take).

## No component changes

Only composition on the page file + data-only edits on `entries.ts`. Build verified below.
