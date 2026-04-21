# E2-S10 (7806) — Self-review

| AC | Verdict | Notes |
|----|---------|-------|
| 1 7 routes prerender | ✅ | Build output: `● /az/[city]` with `/az/phoenix`, `/az/tucson`, `/az/mesa` listed + `[+4 more paths]` (gilbert/glendale/scottsdale/chandler). Marked SSG. |
| 2 dynamicParams = false | ✅ | Top-level named export; unknown slugs route to `not-found.tsx`. |
| 3 typed params (Promise) | ✅ | `params: Promise<CityRouteParams>`; awaited at top of both `generateMetadata` + page. |
| 4 registry lookup + notFound | ✅ | `findCity(slug)` + `if (!city) notFound()` defensive guard. |
| 5 hero city-specific | ✅ | "Sell your {city.displayName} home — free, licensed broker, no fees"; subcopy from `city.intro`; CTA `${LINKS.getStarted}?city=${city.slug}`; secondary `LINKS.howItWorks`. |
| 6 hero image conditional | ✅ | `image={city.heroImage ?? undefined}`. All seven currently `null` → text-only hero (LCP-safe MVP default). |
| 7 TrustBar shared | ✅ | `PLACEHOLDER_HOME_TRUST_CLAIMS` from the S8 shared module. |
| 8 prose intro + proof | ✅ | `<Container size="prose">` rendering `city.localProofPoint` + neighborhoods list. |
| 9 PillarGrid cross-links | ✅ | `HOME_PILLARS` shared module; same 4 pillars as home; LINKS-typed hrefs. |
| 10 HowItWorks shared | ✅ | `HOME_HOW_IT_WORKS_STEPS` extracted to `src/content/how-it-works/home-steps.ts`; reused on every city. |
| 11 CTASection bottom | ✅ | "Ready to see your {city} offer?" + getStartedHref + `LINKS.faq` secondary. |
| 12 three JSON-LD blocks | ✅ | `localBusinessSchema(city)` (CityEntry-typed, includes geo when present) + `realEstateAgentSchema({ city: city.displayName })` (extended this story; areaServed lists City + State) + `breadcrumbSchema(trail)` (3-level Home → Arizona → City). |
| 13 generateMetadata | ✅ | per-city title + description; root template appends "\| Sell Your House Free". |
| 14 sitemap includes 7 cities | ✅ | S6 already appended seven `/az/{slug}` entries to `routes.ts`; sitemap.ts auto-emits from there. Build inclusion verified. |
| 15 honest registry | ✅ | Each `localProofPoint` references real, plausible neighborhoods; no invented service areas (e.g., Glendale East Valley reference avoided). |
| 16 canonical counties | ✅ | Phoenix/Mesa/Chandler/Scottsdale/Gilbert/Glendale = Maricopa; Tucson = Pima. 6 + 1 split. |
| 17 build clean | ✅ | `npm run build` completed; 23 static pages generated total; SSG marker on the `/az/[city]` segment. |
| 18 Lighthouse + axe | ⚠ deferred | Architectural: text hero, semantic landmarks, Container size=prose (60ch), zero client-side JS, no third-party scripts. Instrumentation deferred to S11 sweep consistent with E2 cadence. |
| 19 `?city=<slug>` contract | ✅ | Emitted on every CTA. E3 may consume or ignore. |
| 20 type-safe schema inputs | ✅ | `localBusinessSchema(city: CityEntry)` directly types the registry entry; drift would surface as a TS error at build. |

**Verdict:** 19/20 green; AC #18 deferred (S11 sweep). No pattern deviations.

**Documented follow-up:** the 3-level breadcrumb references `/az` which has no index page (MVP scope decision). Either land a tiny `/az` index in S11 or revise the breadcrumb to 2-level (Home → City). Not a strike — the AC's schema example explicitly includes the `/az` level.

**Unit testing:** skipped — Server Component composition + pure data registry; no business logic.
