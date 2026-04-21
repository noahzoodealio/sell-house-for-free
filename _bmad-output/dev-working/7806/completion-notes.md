# E2-S10 (7806) — Completion Notes

**Commits on `feature/e2-core-marketing-pages-7778`:**
- `53af559` e2-s10(7806): cities registry + shared home-pillars/steps + schema CityEntry wiring
- `3056bd4` e2-s10(7806): [city] dynamic route

**AC outcome:** 19/20 green. AC #18 (Lighthouse/axe instrumentation + screenshots) deferred to S11 sweep, consistent with every prior E2 close-out.

**Surprises / deviations:**
- Initial `generateStaticParams` returned `Promise<ReadonlyArray<...>>`; Next.js 16's `AppPageConfig` validator requires a mutable `any[]`-compatible array. Switched to `Promise<CityRouteParams[]>`.
- `WithContext<RealEstateAgent>["areaServed"]` indexed-access type doesn't expose the property cleanly through `schema-dts`'s mapped types; used inline conditional in the return literal instead.

**Follow-ups for downstream stories:**
- S11 should decide whether to land `/az/page.tsx` (a minimal index listing the 7 cities) so the 3-level breadcrumb `/az` link doesn't 404 on click. The AC text emits the `/az` schema level explicitly, so the current behavior matches; this is a UX polish call, not a correctness call.
- S11 cleanup of `placeholder-claims.tsx` will now hit 6 import sites (home + 4 pillars + city dynamic route).
- Hero images for cities are all `null` in the registry — UX can fill `heroImage` per city without code changes, just an asset drop into `public/images/cities/{slug}.jpg` + a registry entry update.
