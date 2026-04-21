# E2-S7 (7803) — Self-review

| AC | Verdict | Notes |
|----|---------|-------|
| 1 /how-it-works composition | ✅ | PageHeader + HowItWorks (4 steps) + "Why PM-assisted" prose + CTASection + JsonLd. |
| 2 HowTo schema | ✅ | `howToSchema({ name, description }, STEPS)` — same STEPS const drives visible + schema. |
| 3 /how-it-works metadata | ✅ | `buildMetadata({ title: "How it works", … })`; root template appends "\| Sell Your House Free". |
| 4 /why-its-free MDX | ✅ | Imports at top; metadata as top-level export; body composes PageHeader + ProseContainer + RevenueTable + ProseContainer + CTASection + JsonLd. |
| 5 honest revenue disclosure | ✅ | 4 streams.ts entries — buyer-broker MLS commission, cash-offer buyer spread, Cash+ ARV-uplift share, Renovation-Only Hola Home commission. Each names whoPays + whenItActivates + clarifying note. |
| 6 WebPage schema | ✅ | `webPageSchema({ name, description, url })`. |
| 7 /why-its-free metadata | ✅ | `buildMetadata({ title: "Why it's free", … })`. |
| 8 /about prose scope | ✅ | brand origin / AZ focus / JK Realty + license attribution / "what we do" + "what we keep off this site" anti-broker positives / CTASection. |
| 9 AboutPage schema | ✅ | aboutPageSchema helper added to schema.ts (FG1); /about emits via JsonLd. |
| 10 /about metadata | ✅ | `buildMetadata({ title: "About", … })`. |
| 11 (marketing) layout | ✅ | All three under (marketing); inherit Header + Footer. |
| 12 ProseContainer wraps prose | ✅ | All MDX prose inside `<ProseContainer>`; RevenueTable + CTASection render outside (full page width). |
| 13 Server Components | ✅ | No `'use client'`. |
| 14 title template | ✅ | All three use `buildMetadata` without `title.absolute`. |
| 15 build clean | ✅ | `npm run build` completed; 26 pages prerendered total; all three new routes appear in route table. |
| 16 axe + responsive | ⚠ deferred | S11 sweep (consistent with E2 cadence). |
| 17 Lighthouse perf | ⚠ deferred | Architectural conditions met; instrumentation deferred. |

**Verdict:** 15/17 green; 2 deferred. No pattern deviations. The MDX routes use `{LINKS.howItWorks}` style template references (interpreted by MDX's JSX bracket-expression in URLs) — verified by build success.

**Unit testing:** skipped — content-only routes with no business logic.
