# E2-S7 (7803) — Implementation Plan

## File-group 1 — revenue data + schema helper

1. `src/content/revenue/streams.ts` (create) — exports `streams: RevenueStream[]` (4 honest entries: buyer-broker MLS commission, cash-offer buyer-side spread, Cash+ investor-funded repairs split, Renovation-Only Hola Home investor commission).
2. `src/lib/schema.ts` (edit) — append `aboutPageSchema({ name, description, url })` returning `WithContext<AboutPage>`. Add `AboutPage` to the schema-dts imports.

Commit: `e2-s7(7803): revenue streams registry + aboutPageSchema helper`.

## File-group 2 — three secondary prose routes

1. `src/app/(marketing)/how-it-works/page.tsx` — TSX route. Local `STEPS` constant (4 steps per AC #1). `<PageHeader>` + `<HowItWorks steps cta>` + short prose tail + `<CTASection>` + `<JsonLd data={howToSchema(meta, steps)}>`. Step bodies for the JsonLd flatten ReactNode → string by using string-typed bodies in the local STEPS (matches HowItWorksStep.body which can be ReactNode but we keep it string here for schema parity).

2. `src/app/(marketing)/why-its-free/page.mdx` — MDX. Imports at top: PageHeader, ProseContainer, RevenueTable, CTASection, JsonLd, LINKS, webPageSchema, SITE, streams. `export const metadata = buildMetadata({...})`. Body: PageHeader + ProseContainer (markdown prose) + RevenueTable + ProseContainer (closing prose) + CTASection + JsonLd.

3. `src/app/(marketing)/about/page.mdx` — MDX. Imports + metadata + PageHeader + ProseContainer (origin/AZ/broker prose) + ProseContainer ("what we don't do" positive-statement section) + CTASection + JsonLd (aboutPageSchema).

Commit: `e2-s7(7803): /how-it-works, /why-its-free, /about — secondary prose routes`.

## AC mapping

| AC | Group | Notes |
|----|-------|-------|
| 1 /how-it-works composition | 2 | inline STEPS const (4 steps) |
| 2 HowTo schema | 2 | howToSchema(meta, STEPS) |
| 3 metadata | 2 | buildMetadata, no title.absolute |
| 4 /why-its-free MDX | 2 | imports at top, body composes JSX |
| 5 honest revenue disclosure | 1,2 | streams.ts authored honestly |
| 6 WebPage schema | 2 | webPageSchema |
| 7 metadata | 2 | buildMetadata |
| 8 /about prose scope | 2 | brand/AZ/broker/anti-broker positives + CTA |
| 9 AboutPage schema | 1,2 | aboutPageSchema helper added |
| 10 /about metadata | 2 | buildMetadata |
| 11 (marketing) layout | 2 | files under (marketing) |
| 12 ProseContainer wraps prose | 2 | per AC; tables/CTA outside |
| 13 Server Components | 2 | no 'use client' |
| 14 title template | 2 | template appends "\| Sell Your House Free" |
| 15 build clean | — | npm run build verifies |
| 16 axe + responsive | ⚠ | deferred to S11 sweep |
| 17 perf | ⚠ | deferred (text-only routes) |
