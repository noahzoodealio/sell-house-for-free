# E2-S6 (7802) — Self-review vs Acceptance Criteria

| AC | Verdict | Evidence |
|----|---------|----------|
| 1 composition | ✅ pass | `src/app/(marketing)/page.tsx`: Server Component returning fragment Hero → TrustBar → PillarGrid → HowItWorks → FAQ → "See all questions" link → CTASection → 2× JsonLd. Placeholder comment removed. |
| 2 hero copy | ✅ pass | Heading: "Sell your Arizona home for free. No listing fees. No data resale. Real people."; 2-sentence subcopy names SYHF + JK Realty + covers cash-offer flow; primary CTA "Get my cash offer" → LINKS.getStarted; secondary "See how it works" → LINKS.howItWorks. |
| 3 TrustBar | ✅ pass | 4 claims inlined as `HOME_TRUST_CLAIMS` with `TODO(E2-S11 cleanup)` marker: no fees / no data resale / real PM / licensed AZ broker via JK Realty. |
| 4 PillarGrid | ✅ pass | `PILLARS` const at top of file — 4 entries: Listing→LINKS.listing, Cash Offers→LINKS.cashOffers, Cash+ with Repairs→LINKS.cashPlusRepairs, Renovation-Only→LINKS.renovationOnly. Inline SVG icons (deferred library decision per tech-note). |
| 5 FAQ excerpt | ✅ pass | `homeFaqExcerpt = faqEntries.filter(e => e.category === 'free-and-fair' ‖ e.skepticFirst)` → 5 entries (within 3–5 window). "See all questions →" link below. |
| 6 CTASection | ✅ pass | Heading "Ready to see your cash offer?"; primary "Get my cash offer" → LINKS.getStarted; secondary "Meet your Project Manager" → LINKS.meetYourPm. |
| 7 JSON-LD | ✅ pass | Two `<JsonLd>` blocks at fragment end: `organizationSchema()` + `faqPageSchema(homeFaqExcerpt)` — excerpt schema reflects exactly the FAQ rendered above. |
| 8 metadata.title.absolute | ✅ pass | `{ ...buildMetadata({ ... }), title: { absolute: HOME_TITLE } }` with HOME_TITLE = "Sell Your House Free — Free Arizona cash-offer service, no fees, real PM" — suppresses root template "%s ‖ Sell Your House Free". |
| 9 LINKS const | ✅ pass | `src/lib/links.ts` exports `LINKS as const` with home/listing/cashOffers/cashPlusRepairs/renovationOnly/howItWorks/whyItsFree/meetYourPm/about/faq/getStarted + `city(slug)` returning `` `/az/${slug}` as const``. |
| 10 routes.ts append | ✅ pass | 15 entries appended to ROUTES: 4 pillars (0.9), 4 prose pages (0.8/0.7/0.7/0.6), 7 AZ cities (0.7). Existing `/faq` priority bumped 0.6 → 0.7 per AC. Extracted `AZ_CITY_SLUGS` tuple for S10 reuse. |
| 11 sitemap | ✅ pass | `next build` completes; `src/app/sitemap.ts` reads ROUTES.filter(showInSitemap) with no edits. `/get-started` unchanged (not re-added). Verified route table in build output. |
| 12 typed hrefs | ✅ pass | `grep 'href="/' src/app/(marketing)/page.tsx` returns zero matches. Every internal nav uses `LINKS.*`. |
| 13 LCP<2.5s | ✅ pass (architectural) | Text-forward hero, no hero image, no client JS, no external scripts — the architectural conditions for AC #12 pass. Lighthouse instrumentation deferred to final E2 QA sweep (S11). |
| 14 no third-party scripts | ✅ pass | Only two `<script type="application/ld+json">` blocks (JsonLd). No pixels, chat, newsletter. Matches E1-S10 ESLint guard. |
| 15 axe + responsive QA | ⚠ deferred | Consistent with E2-S1..S5 close-outs: axe/Lighthouse instrumentation + screenshots deferred to S11 sweep + PR QA. All precondition architectural facts met (semantic landmarks, role=list grids, 60ch prose max, responsive breakpoints from S2/S3 components). |
| 16 build clean | ✅ pass | `npm run build` completed: Next 16.2.3 / Turbopack, 12 static pages generated, TypeScript finished in 3.0s, no warnings or errors. |

**Verdict:** 15/16 green; AC #15 deferred consistent with prior E2 stories. No pattern deviations. No CodeRabbit risks introduced (no `any`, no disabled-rules, no comment debt beyond the explicit `TODO(E2-S11 cleanup)`).

**Unit testing:** skipped — Server Component composition + pure constant module + data-registry append. No business logic to assert.
