---
slug: basic-cash-plus-restyle
scope: moderate
task: Restyle /cash-plus-repairs to home composition; rename "Cash+ with Repairs" → "Cash+" site-wide (display only, route unchanged).
files-touched:
  - src/app/(marketing)/cash-plus-repairs/page.tsx
  - src/app/(marketing)/cash-offers/page.tsx (rename only)
  - src/app/(marketing)/listing/page.tsx (rename only)
  - src/app/(marketing)/renovation-only/page.tsx (rename only)
  - src/app/(marketing)/az/[city]/page.tsx (rename only)
  - src/app/(marketing)/how-it-works/page.tsx (rename only)
  - src/app/(marketing)/meet-your-pm/page.mdx (rename only)
  - src/app/(marketing)/get-offer/page.tsx (rename only)
  - src/app/(marketing)/about/page.mdx (rename only)
  - src/content/faq/entries.ts (rename only)
  - src/content/pillars/home-pillars.tsx (rename only)
  - src/content/cities/registry.ts (rename only)
  - src/content/revenue/streams.ts (rename only)
  - src/lib/schema.ts (rename only)
started-at: 2026-04-21
---

## Summary

Cash+ with Repairs pillar brought to the same 11-section composition as `/`, `/listing`, `/cash-offers`. Short copy focused on:

1. Investor funds the agreed repair scope up front
2. Seller never writes a check
3. Home lists at the after-repair value
4. Seller keeps the spread above the funded amount
5. Same PM and broker represent you the whole way, free

## Rename: "Cash+ with Repairs" → "Cash+"

Display-only, all source files. No route, LINKS key, schema slug, or serviceSchema key changed. Applied via `sed` across `src/`.

Unchanged (intentionally):
- URL: `/cash-plus-repairs`
- `LINKS.cashPlusRepairs`
- `PILLAR_SLUG = "cash-plus-repairs"` const
- `serviceSchema` key `"cash-plus-repairs"`
- `Pillar` type member `"cash-plus-repairs"`

Changing any of those would cascade to sitemap, LINKS, FAQ `relatedPillar` tagging, and redirect plumbing; not in scope for "just call it Cash+".

## Follow-ups

- Only `/renovation-only` remains on the older thin pillar template.
- Build passes, 29 static pages, typecheck clean.
