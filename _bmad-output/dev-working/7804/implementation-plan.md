# E2-S8 (7804) — Implementation Plan

Single-branch epic autopilot; commit on `feature/e2-core-marketing-pages-7778`. No PR.

## Design decision: shared placeholder trust-claims module

E2-S6 inlined `HOME_TRUST_CLAIMS` on the home. S8 needs the same 4 claims on all four pillar pages. Rather than duplicate 16 `TODO(E2-S11)` stubs, extract once to `src/content/anti-broker/placeholder-claims.tsx` with a single TODO marker. S11 can delete this file and redirect all 5 imports in one atomic change.

## File-group 1 — placeholder trust claims + home refactor

**Create `src/content/anti-broker/placeholder-claims.tsx`** — exports `PLACEHOLDER_HOME_TRUST_CLAIMS: readonly TrustBarClaim[]` with 4 entries (same 4 icons + copy currently inlined in home). Single `TODO(E2-S11)` marker at file top.

**Edit `src/app/(marketing)/page.tsx`** — remove local Icon* functions + HOME_TRUST_CLAIMS (the trust-claim ones only; pillar icons stay local). Import PLACEHOLDER_HOME_TRUST_CLAIMS, rename local usage.

Commit: `e2-s8(7804): extract placeholder trust claims module (shared by home + pillars)`.

## File-group 2 — four pillar pages

Structural parity: each `src/app/(marketing)/{slug}/page.tsx` follows the same shape.

```tsx
import { PillarHero, TrustBar, HowItWorks, CTASection, JsonLd } from "...";
import { LINKS } from "@/lib/links";
import { serviceSchema, breadcrumbSchema } from "@/lib/schema";
import { PLACEHOLDER_HOME_TRUST_CLAIMS } from "@/content/anti-broker/placeholder-claims";
import { buildMetadata } from "@/lib/seo";

const PILLAR_NAME = "…";
const PILLAR_SLUG = "listing" | "cash-offers" | "cash-plus-repairs" | "renovation-only";
const BREADCRUMB = [
  { label: "Home",        href: "/" },
  { label: PILLAR_NAME,   href: LINKS.{pillar} },
];
const PILLAR_STEPS = [ … 3–5 steps … ];
const GET_STARTED_HREF = `${LINKS.getStarted}?pillar=${PILLAR_SLUG}`;

export const metadata = buildMetadata({ title: PILLAR_NAME, description: …, path: LINKS.{pillar} });

export default function PillarPage() {
  return (<>
    <PillarHero accent={PILLAR_SLUG} breadcrumb={BREADCRUMB} heading="…" subcopy="…" primaryCta={{ label, href: GET_STARTED_HREF }} secondaryCta={{ label: "See how it works", href: LINKS.howItWorks }} />
    <TrustBar claims={PLACEHOLDER_HOME_TRUST_CLAIMS} />
    <HowItWorks steps={PILLAR_STEPS} cta={{ label: "Start my {pillar}", href: GET_STARTED_HREF }} />
    <section className="py-12 md:py-16"><Container size="prose">… 2–4 prose paragraphs per AC #7 …</Container></section>
    <CTASection heading="…" primaryCta={{ label, href: GET_STARTED_HREF }} secondaryCta={{ label: "Meet your Project Manager", href: LINKS.meetYourPm }} />
    <JsonLd id="ld-service-{pillar}" data={serviceSchema(PILLAR_SLUG)} />
    <JsonLd id="ld-breadcrumb" data={breadcrumbSchema(BREADCRUMB.map(c => ({ label: c.label, url: c.href })))} />
  </>);
}
```

### Per-pillar copy outline

**`/listing`** — slug `listing`, accent listing, name "Listing + MLS".
- Hero heading: "Free MLS listing. No seller commission."
- Subcopy: 2 sentences — JK Realty listing, buyer-broker commission flows from sale proceeds (market standard), seller pays zero to us.
- Steps (5): intake → photography & pricing → go live on MLS → PM-assisted offer review → close.
- Prose: 2 paragraphs honestly naming the buyer-broker commission as market-standard practice. Cross-link mentions `LINKS.cashOffers` as an alternative path.
- CTA label: "Get my free listing started". Secondary on bottom CTA → `LINKS.meetYourPm`.

**`/cash-offers`** — slug `cash-offers`, accent cash-offers, name "Cash Offers".
- Hero heading: "A real cash offer. On your timeline. No repairs."
- Subcopy: 2 sentences — vetted cash offer within 24–48h, close in 7–21 days, no obligation.
- Steps (5): intake → cash offer generated (24–48h) → PM walkthrough → yes/no → close (7–21d).
- Prose: we earn a small spread from the buyer-investor side, never a seller fee.
- CTA label: "Get my cash offer". Secondary → `LINKS.meetYourPm`.

**`/cash-plus-repairs`** — slug `cash-plus-repairs`, accent cash-plus-repairs, name "Cash+ with Repairs".
- Hero heading: "Your home, improved — before it hits the MLS."
- Subcopy: 2 sentences — partner investor funds pre-list repairs, listing lands at higher ARV, you keep the spread above the investor's investment.
- Steps (5): intake + scope → investor match → repairs (1–8 weeks) → MLS listing → close.
- Prose: 3 paragraphs — includes mandatory honest risk/reward note (AC #7, tech-note "Cash+ risk/reward note is not optional"): timeline can stretch, repair estimate can miss, ARV can soften. Names the trade-off.
- CTA label: "See my Cash+ path". Secondary → `LINKS.faq` (contentious pillar, skeptics want FAQ).

**`/renovation-only`** — slug `renovation-only`, accent renovation-only, name "Renovation-Only".
- Hero heading: "Renovate first. Then list for maximum upside."
- Subcopy: 2 sentences — Hola Home renovates, then JK Realty lists conventionally; no cash-offer component.
- Steps (4): intake → Hola Home scope → renovation → MLS listing → close.
- Prose: 3 paragraphs. One explicitly acknowledges (AC #8) that Offervana's platform doesn't surface Renovation-Only as a distinct offer — it's the PM + Hola Home fulfilling the concept on *this site*. Use "the path we call Renovation-Only" / "our Renovation-Only service", never "our Renovation-Only product".
- CTA label: "Explore Renovation-Only". Secondary → `LINKS.meetYourPm`.

### Breadcrumb component caveat

`PillarHero`'s `BreadcrumbCrumb.href` is a required string. AC #3 says the current crumb has no href, but the component renders it as `<span aria-current="page">` regardless of the href value (the href is only used by non-last crumbs). Pass `LINKS.{pillar}` as the second crumb's href — unused for rendering, satisfies the type, and matches the URL for `breadcrumbSchema`.

Commit: `e2-s8(7804): four pillar pages — /listing, /cash-offers, /cash-plus-repairs, /renovation-only`.

## AC-mapping quick table

| AC | Group | Notes |
|----|-------|-------|
| 1 routes render | 2 | four pages prerendered; inherit (marketing) chrome |
| 2 accent tokens | 2 | PillarHero accent prop per pillar |
| 3 breadcrumb | 2 | 2 crumbs; co-located const; matches schema |
| 4 hero CTA `?pillar=` | 2 | GET_STARTED_HREF per file |
| 5 TrustBar | 1,2 | shared placeholder module; S11 TODO |
| 6 HowItWorks steps | 2 | 3–5 steps, zero-padded by component |
| 7 honest revenue prose | 2 | per-pillar wording; no invented numbers |
| 8 Renovation-Only honesty | 2 | "service"/"path we call" wording |
| 9 CTASection bottom | 2 | echoes CTA + secondary |
| 10 JSON-LD Service + Breadcrumb | 2 | two JsonLd blocks per page |
| 11 metadata | 2 | buildMetadata per page |
| 12 hero image policy | 2 | text hero MVP; no images |
| 13 no 3p scripts | 2 | only JsonLd blocks |
| 14 `?pillar=` contract | 2 | emitted; E3 may consume |
| 15 build clean | — | `npm run build` verifies |
| 16 Lighthouse/axe | ⚠ | deferred to S11 sweep + PR QA |
| 17 responsive | ⚠ | deferred to S11 sweep + PR QA |
| 18 split option | n/a | keeping unified |
| 19 no cross-pillar footer | 2 | no "See other pillars" block; home PillarGrid handles discovery |
| 20 legal sign-off ask | — | flag in final PR body |
| 21 Offer subtype | n/a | deferred per AC text |
