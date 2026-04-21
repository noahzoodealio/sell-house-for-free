---
work-item-id: 7800
work-item-type: story
code: E2-S4
parent-epic: 7778
repo: sell-house-for-free
branch: feature/e2-core-marketing-pages-7778
started-at: 2026-04-20
---

# 7800 — E2-S4 FAQ system

## Title
E2-S4 — FAQ system: `<FAQ>` + `<FAQItem>` + /faq page + skeptic-first entries + FAQPage JSON-LD

## Dependencies (resolved)
- **S5 (7801) closed** — `<JsonLd>` + `faqPageSchema(entries)` already shipped at `src/lib/schema.ts:120` (expects `ReadonlyArray<{id, question, answer, category?}>` — my `FaqEntry` satisfies it). Schema carries a `TODO(E2-S4)` to swap the local shape for `FaqEntry` import — I'll close that here.
- **S2 (7798) closed** — `<PageHeader>` + `<Container>` available.
- **S1 (7797) closed** — `.prose-custom` not needed (this is TSX, not MDX).

## 16 acceptance criteria (condensed)
1. Group entries by category; order `how-it-works, free-and-fair, data-and-privacy, pm-and-fulfillment, arizona, comparison`; empty cats not rendered.
2. `skepticFirst: true` sorts first in each category; remainder is stable by source order.
3. Native `<details>/<summary>` — no useState, no Radix.
4. `<details id={entry.id}>` with `scroll-mt-24`; kebab-case ids.
5. Override `::-webkit-details-marker`; custom `::after` chevron rotates on `[open]`.
6. Answer is `string`; split on `\n\n` → multiple `<p>`; no dangerouslySetInnerHTML.
7. 10–15 seed entries covering skeptic-first topics; `lastReviewed` ISO.
8. `FAQPage` JSON-LD valid; `<` escaped to `\u003c` (JsonLd renderer already does this).
9. `buildMetadata({ title: 'FAQ', description, path: '/faq' })`.
10. Permalink scroll works natively; auto-expand if hash-target helper ships.
11. Optional hash-link icon on summary hover — defer (nice-to-have).
12. Optional `<FaqHashTarget />` client helper — ship (10 lines, trivial).
13. Axe-clean on `/faq`; semantic headings.
14. `<FAQ category="…" title="…" />` filters + hides per-cat h3 (home excerpt mode).
15. Build clean; `/faq` 200; interactive.
16. `FaqEntry` + `FaqCategory` exported.

## Files to create
- `src/content/faq/entries.ts`
- `src/components/marketing/faq-item.tsx`
- `src/components/marketing/faq.tsx`
- `src/components/marketing/faq-hash-target.tsx` (optional — include)
- `src/app/(marketing)/faq/page.tsx`

## Files to modify
- `src/lib/schema.ts` — replace `FaqEntryShape` with imported `FaqEntry` (closes the TODO).
- `src/lib/routes.ts` — append `/faq` entry so sitemap picks it up.

## Branch strategy
Per epic directive: single branch `feature/e2-core-marketing-pages-7778`, commit with prefix `e2-s4(7800): …`, no PR at close-out.
