---
work-item-id: 7800
branch: feature/e2-core-marketing-pages-7778
build: pass (Next.js 16.2.3, Turbopack, 12/12 static)
typecheck: pass (tsc --noEmit, silent)
lint: pass (0 errors; 1 pre-existing unused-import warning in pillar-hero.tsx from 7799, not in scope)
---

# 7800 self-review against 16 ACs

| # | AC | Status | Evidence |
|---|----|--------|----------|
| 1 | FAQ groups by category; fixed order; empty cats not rendered | pass | `faq.tsx` iterates `FAQ_CATEGORIES`, skips buckets with 0 entries, wraps each in `<section aria-labelledby>` + `<h3 id=faq-category-{cat}>` |
| 2 | Skeptic-first sort within each category; stable otherwise | pass | `sortSkepticFirst()` — decorate with source index, sort by `(skepticFirst ? 0 : 1)` then by idx |
| 3 | Native `<details>/<summary>`; no useState, no Radix | pass | `faq-item.tsx` RSC-only, no hooks, no client dir on the item |
| 4 | `<details id={entry.id}>` + kebab-case ids + `scroll-mt-24` | pass | all 12 entries use `entry-…` slugs; `scroll-mt-24` on the details |
| 5 | Hide `::-webkit-details-marker` + `::marker`; chevron rotates on `[open]` | pass | Tailwind arbitrary variants + `group` + `group-open:rotate-180` on SVG |
| 6 | Answer string split on `\n\n` → `<p>`s; no dangerouslySetInnerHTML | pass | `paragraphs = entry.answer.split("\n\n")`; `.map` to `<p>` |
| 7 | 10–15 skeptic-first seed entries covering required topics | pass | 12 entries; all AC7 topics a-j covered; `lastReviewed: 2026-04-20`; 3 flagged `skepticFirst` (what's-the-catch, sell-my-info, who-is-my-pm) |
| 8 | FAQPage JSON-LD valid; `<` → `\u003c` escape | pass | `<JsonLd>` renderer already escapes (`src/components/marketing/json-ld.tsx:9`); `faqPageSchema(entries)` now typed against imported `FaqEntry` (closed S5 TODO) |
| 9 | `buildMetadata({ title: 'FAQ', description, path: '/faq' })` | pass | `page.tsx` exports it; title template from layout → "FAQ \| Sell Your House Free" |
| 10 | Permalink scroll + auto-expand if hash-target ships | pass | native `scroll-mt-24` anchor scroll; `<FaqHashTarget>` reads `location.hash` on mount and sets `open` |
| 11 | Hover hash-link icon on `<summary>` | deferred | AC itself: "Not blocking if deferred; nice-to-have" — not shipped |
| 12 | Optional `<FaqHashTarget />` client helper | pass | shipped at `src/components/marketing/faq-hash-target.tsx`; 12 lines; `'use client'` |
| 13 | Accessibility — axe-clean semantics | pass | `<section aria-labelledby>`, `<h3 id>`, native details keyboard behavior, `focus-visible` ring on summary. Axe browser-run not executed in autopilot; structural review clean |
| 14 | Home excerpt mode: `category` prop filters + hides per-cat `<h3>` | pass | early-return branch in `faq.tsx` renders only `title` + scoped items when `category` set |
| 15 | Build clean; `/faq` reachable | pass | `next build` green; `/faq` is `○ (Static)` in the manifest |
| 16 | `FaqEntry`, `FaqCategory` exported | pass | both exported from `src/content/faq/entries.ts`; also `FAQ_CATEGORIES` + `FAQ_CATEGORY_LABELS` |

## Deviations noted
- **AC 11 (hover hash-link icon)** — explicitly deferred per AC text; revisit post-launch.
- **AC 13 (axe browser scan)** — structural review only; autopilot has no headless-browser harness. Home excerpt consumer (S6) will provide the second real-page validation point.

## Additional S5 cleanup completed
`src/lib/schema.ts` — removed the local `FaqEntryShape` type + `TODO(E2-S4)` marker; `faqPageSchema()` now types its parameter as `ReadonlyArray<FaqEntry>` from the canonical source.

## Sitemap
`src/lib/routes.ts` — appended `/faq` with `showInSitemap: true`, `changeFrequency: monthly`, `priority: 0.6`. Picked up by `sitemap.ts` automatically.

## Verdict
**pass** — 15/16 ACs green, 1 explicitly deferred per AC text. No additional review iterations needed.
