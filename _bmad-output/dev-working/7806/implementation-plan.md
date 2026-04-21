# E2-S10 (7806) — Implementation Plan

Single-branch epic autopilot; commit on `feature/e2-core-marketing-pages-7778`. No PR.

## File-group 1 — schema extension + shared extracts + registry + home refactor

Five related edits landing in one commit so the city page in group 2 reads as a simple composition:

1. **`src/lib/schema.ts`** — replace the local `CityEntryShape` placeholder with `import type { CityEntry } from "@/content/cities/registry"`; close the `TODO(E2-S10)` marker. Extend `realEstateAgentSchema` to accept an optional `{ city?: string }` arg; when a city is passed, include it in `areaServed` alongside Arizona.

2. **`src/content/pillars/home-pillars.tsx`** (create) — extract the four home-page pillar cards (icons + headings + blurbs + hrefs) as `HOME_PILLARS: readonly Pillar[]`. Imported by home + city landers for structural parity per AC #9.

3. **`src/content/how-it-works/home-steps.ts`** (create) — extract the three home-page `HowItWorks` steps as `HOME_HOW_IT_WORKS_STEPS: readonly HowItWorksStep[]`. Imported by home + city landers per AC #10 "extract path".

4. **`src/app/(marketing)/page.tsx`** (edit) — drop the local `IconListing/IconCash/IconCashPlus/IconReno` components + `PILLARS` + `HOME_HOW_IT_WORKS_STEPS`; import the extracted modules.

5. **`src/content/cities/registry.ts`** (create) — typed data per AC #15/16:

```ts
export type CityEntry = {
  slug: AzCitySlug;
  displayName: string;
  county: string;
  populationApprox: number;
  neighborhoodsSampled: readonly string[];
  localProofPoint: string;
  heroImage: { src: string; alt: string; width: number; height: number } | null;
  intro: string;
  geo?: { latitude: number; longitude: number };
};
export const cities: readonly CityEntry[] = [ … 7 entries … ];
```

Copy discipline per AC #14: honest `localProofPoint` per city; 2–3 neighborhoods; canonical counties (5× Maricopa / 1× Pima Tucson / 1× Maricopa Glendale). `heroImage: null` across all seven — UX hasn't shipped city hero assets yet (consistent with prior E2 story pattern of deferring images). Approximate geo for each city so LocalBusiness schema has optional `GeoCoordinates`.

Commit: `e2-s10(7806): cities registry + shared home-pillars/steps + schema CityEntry wiring`.

## File-group 2 — `[city]` dynamic route

**Create `src/app/(marketing)/az/[city]/page.tsx`:**

- `export const dynamicParams = false;` (top-level named export per Next.js 16 note).
- `export async function generateStaticParams()` maps `AZ_CITY_SLUGS` → `[{ city: slug }, …]` (use the tuple from `routes.ts` to guarantee parity with sitemap registration).
- `export async function generateMetadata({ params })` — `const { city: slug } = await params;` lookup + `buildMetadata({ title: \`Sell your ${city.displayName} home — free, licensed broker, no fees\`, description: \`...${city.displayName}...\`, path: LINKS.city(city.slug) })`.
- Page component: `async function CityLander({ params }: { params: Promise<{ city: string }> })`; `await params`; registry lookup; `notFound()` defensive guard.
- Composition: `<Hero>` (city heading + city.intro subcopy + primaryCta `${LINKS.getStarted}?city=${slug}` + secondaryCta `LINKS.howItWorks`) → `<TrustBar>` (PLACEHOLDER_HOME_TRUST_CLAIMS) → prose block (`<Container size="prose">` with 2 paragraphs from `city.intro` + `city.localProofPoint` + neighborhoods list) → `<PillarGrid pillars={[...HOME_PILLARS]}>` → `<HowItWorks steps={[...HOME_HOW_IT_WORKS_STEPS]} cta={{ label, href: GET_STARTED_CTA }}>` → `<CTASection>` (city-specific heading + GET_STARTED_CTA + secondaryCta `LINKS.faq`) → three JsonLd blocks.
- Breadcrumb: 3-level per AC #12 explicit schema text — Home → Arizona → City. Document `/az` 404 follow-up in completion-notes.

Commit: `e2-s10(7806): [city] dynamic route — 7 AZ city landers with LocalBusiness + Agent + Breadcrumb JSON-LD`.

## AC-mapping

| AC | Group | Notes |
|----|-------|-------|
| 1 7 routes prerender | 2 | generateStaticParams from AZ_CITY_SLUGS |
| 2 unknown 404 | 2 | dynamicParams = false |
| 3 typed params | 2 | Promise<{ city: string }> + await |
| 4 registry lookup + notFound() | 2 | defensive guard |
| 5 hero city-specific | 2 | displayName in heading; GET_STARTED_CTA |
| 6 hero image | 2 | null in registry → text-only hero |
| 7 TrustBar shared | 2 | PLACEHOLDER_HOME_TRUST_CLAIMS |
| 8 prose block | 2 | intro + localProofPoint + neighborhoods |
| 9 PillarGrid cross-links | 1,2 | HOME_PILLARS shared |
| 10 HowItWorks shared | 1,2 | HOME_HOW_IT_WORKS_STEPS shared |
| 11 CTASection | 2 | city heading + LINKS.faq |
| 12 3 JSON-LD blocks | 1,2 | localBusinessSchema / realEstateAgentSchema({ city }) / breadcrumbSchema |
| 13 generateMetadata | 2 | per-city title + description |
| 14 sitemap includes cities | — | already appended by S6; will verify via build |
| 15 honest registry | 1 | per AC discipline |
| 16 canonical county list | 1 | 6× Maricopa, 1× Pima |
| 17 build clean | — | `npm run build` verifies |
| 18 Lighthouse/axe | ⚠ | deferred to S11 sweep |
| 19 `?city=` contract | 2 | emitted |
| 20 type-safe schema inputs | 1 | CityEntry imported directly by localBusinessSchema |
