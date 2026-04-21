# E2-S6 (7802) — Implementation Plan

Single-branch epic autopilot: commit on `feature/e2-core-marketing-pages-7778`. No PR.

## File-group 1 — `src/lib/links.ts` (create)

Typed internal-URL constants. `LINKS` object `as const` with string path entries + `city(slug: string) => \`/az/\${slug}\``.

Keys (per AC #9): `home, listing, cashOffers, cashPlusRepairs, renovationOnly, howItWorks, whyItsFree, meetYourPm, about, faq, getStarted, city`.

Commit: `e2-s6(7802): LINKS typed internal-URL constants`.

## File-group 2 — `src/lib/routes.ts` (edit, append-only)

Append E2 entries. Do NOT re-register `/` or `/get-started` or `/faq` (already present — verified). Additions (per AC #10):

| path | priority | changeFrequency |
|------|----------|-----------------|
| `/listing` | 0.9 | monthly |
| `/cash-offers` | 0.9 | monthly |
| `/cash-plus-repairs` | 0.9 | monthly |
| `/renovation-only` | 0.9 | monthly |
| `/how-it-works` | 0.8 | monthly |
| `/why-its-free` | 0.7 | monthly |
| `/meet-your-pm` | 0.7 | monthly |
| `/about` | 0.6 | monthly |
| `/az/phoenix` … `/az/glendale` (7) | 0.7 | monthly |

All `showInSitemap: true`. `showInNav: true` only for pillars + how-it-works + why-its-free + meet-your-pm + about (nav-visible); city landers `showInNav: false` (SEO landers, not primary nav). `/faq` priority currently 0.6 in routes.ts; AC #10 says 0.7 — **bump to 0.7** as part of append edit.

Commit: `e2-s6(7802): append E2 routes (pillars + prose pages + AZ cities)`.

## File-group 3 — `src/app/(marketing)/page.tsx` (replace)

Full composition. Pseudo-outline:

```tsx
import { buildMetadata } from "@/lib/seo";
import { LINKS } from "@/lib/links";
import { entries } from "@/content/faq/entries";
import { organizationSchema, faqPageSchema } from "@/lib/schema";
import { Hero, TrustBar, PillarGrid, HowItWorks, FAQ, CTASection, JsonLd } from "...";

// TODO(E2-S11 cleanup): replace with import from src/content/anti-broker/claims.ts
const HOME_TRUST_CLAIMS = [ /* 4 claims: no fees / no data resale / real PM / JK Realty broker */ ];

const PILLARS = [ /* 4 pillars with heading/blurb/href via LINKS + icon */ ];

const HOME_HOW_IT_WORKS_STEPS = [ /* 3 steps */ ];

const homeExcerptEntries = entries.filter(e => e.category === "free-and-fair" || e.skepticFirst);

export const metadata = {
  ...buildMetadata({ title: HOME_TITLE, description: HOME_DESCRIPTION, path: "/" }),
  title: { absolute: HOME_TITLE },
};

export default function Home() {
  return (<>
    <Hero heading="Sell your Arizona home for free. No listing fees. No data resale. Real people." subcopy="..." primaryCta={{ label: "Get my cash offer", href: LINKS.getStarted }} secondaryCta={{ label: "See how it works", href: LINKS.howItWorks }} />
    <TrustBar claims={HOME_TRUST_CLAIMS} />
    <PillarGrid pillars={PILLARS} />
    <HowItWorks steps={HOME_HOW_IT_WORKS_STEPS} cta={{ label: "Learn more", href: LINKS.howItWorks }} />
    <FAQ entries={homeExcerptEntries} title="Common questions" />
    <div>… "See all questions →" link to LINKS.faq …</div>
    <CTASection heading="Ready to see your cash offer?" primaryCta={{ label: "Get my cash offer", href: LINKS.getStarted }} secondaryCta={{ label: "Meet your Project Manager", href: LINKS.meetYourPm }} />
    <JsonLd data={organizationSchema()} id="ld-org" />
    <JsonLd data={faqPageSchema(homeExcerptEntries)} id="ld-faq" />
  </>);
}
```

Notes:
- Icons: inline mini-SVG primitives for TrustBar + PillarGrid (no `lucide-react` dependency yet — deferred per AC #4 / tech-note "PillarGrid icon source is deferred to S8"). Use distinct abstract shapes.
- `<FAQ>` component currently requires a single `category` OR renders a grouped `byCategory` view. For the home excerpt (mixed categories), pass `entries={homeExcerptEntries}` without `category` — it renders the grouped view, already sorted skeptic-first per-bucket. AC #5 says the filter must produce 3–5; verified 5.
- "See all questions" link lives outside `<FAQ>` in the home file (not part of the component).
- No hero image on MVP (AC #12 tech note).

Commit: `e2-s6(7802): home page final composition (E1-S11 placeholder → Hero+TrustBar+PillarGrid+HowItWorks+FAQ+CTASection+JsonLd)`.

## AC-mapping quick table

| AC | Group | Notes |
|----|-------|-------|
| 1 composition | 3 | Server Component, ordered fragment |
| 2 hero copy  | 3 | final heading + 2-sentence subcopy + CTAs |
| 3 TrustBar   | 3 | inline HOME_TRUST_CLAIMS w/ TODO(E2-S11) |
| 4 Pillars    | 3 | PILLARS const, LINKS hrefs |
| 5 FAQ subset | 3 | filter union free-and-fair ∪ skepticFirst = 5 |
| 6 CTASection | 3 | echoes top + meetYourPm secondary |
| 7 JSON-LD    | 3 | org + FAQPage excerpt |
| 8 metadata   | 3 | title.absolute with SEO-optimized form |
| 9 LINKS      | 1 | `as const` object w/ city fn |
| 10 routes    | 2 | 11 entries appended |
| 11 sitemap   | 2 | sitemap.ts auto-picks-up |
| 12 typed href | 3 | zero `href="/` internal literals |
| 13 LCP<2.5s  | 3 | text hero, no image |
| 14 no scripts | 3 | only 2 JsonLd blocks |
| 15 axe/responsive | — | deferred to S11 sweep + PR QA (text-only home) |
| 16 build clean | — | verified in self-review |

AC #15 (axe + Lighthouse with screenshots) cannot be fully auto-executed; deferred to E2-S11 JSON-LD sweep + PR QA. Documented same as prior E2 stories.
