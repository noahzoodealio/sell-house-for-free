# E2-S6 (7802) — Completion Notes

**Commits on `feature/e2-core-marketing-pages-7778`:**
- `97357cd` — e2-s6(7802): LINKS typed internal-URL constants
- `72809cb` — e2-s6(7802): append E2 routes — pillars, prose pages, AZ cities
- `14b6929` — e2-s6(7802): home page final composition

**AC outcome:** 15/16 green; AC #15 (axe/Lighthouse with screenshots) deferred to S11 sweep + PR QA — consistent with every prior E2 story close-out.

**Follow-ups flagged for downstream stories:**
- `HOME_TRUST_CLAIMS` inlined in `page.tsx` with `TODO(E2-S11 cleanup)` — S11 must replace with import from `src/content/anti-broker/claims.ts`.
- `PILLARS` icons are hand-rolled inline SVGs. S8 (pillar pages) may standardize on an icon source; if so, S8 can swap these four icons out.
- `AZ_CITY_SLUGS` + `AzCitySlug` extracted as a typed tuple in `routes.ts` for S10 to consume directly — so the `[city]` dynamic route's `generateStaticParams` can read from it without duplicating the slug list.

**Non-issues observed:**
- `routes.ts` type pattern (`as const satisfies readonly RouteEntry[]`) works fine with `.filter()` in sitemap.ts — no `as readonly RouteEntry[]` cast needed. Epic plan's warning doesn't fire for this file shape.
- `title.absolute` composes correctly with `buildMetadata(...)`'s default `title` by being spread *after* the helper's output.
