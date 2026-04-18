# Architecture — E2 Core Marketing Pages + Trust Surface

- **Feature slug:** `e2-marketing-pages-trust-surface`
- **ADO Feature:** [7778](https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7778)
- **Repo:** `sell-house-for-free` (Next.js 16.2.3, React 19.2.4, Tailwind v4)
- **Upstream:** `_bmad-output/planning-artifacts/project-plan-sell-house-for-free.md` §4 E2
- **Depends on:** E1 (Site Foundation) — consumes `(marketing)` layout, primitives, `SITE`/`ROUTES`/`buildMetadata`, tokens
- **Author:** Noah (Architect) · 2026-04-17
- **Status:** draft — ready for PM decomposition

---

## 1. Summary

E2 fills the content surface of the marketing site: home, how-it-works, four pillar pages, trust/revenue disclosure, PM profile, FAQ, about, and seven AZ-city landers. It adds the **MDX content pipeline**, a **handrolled library of marketing page components** (Hero, PillarGrid, TrustBar, FAQ, CTASection, etc.), a **typed JSON-LD helper layer** for rich-results coverage, and a static **anti-broker claim registry** that keeps fulfillment-adjacent copy honest.

The trust posture is a first-class product surface, not decoration — this architecture is built to make "no fees, no data resale, real PM, JK Realty broker of record" legible at every page, and to make it easy to verify that every marketing claim corresponds to real back-end behavior before launch.

**Affected services:** `sell-house-for-free` only. No cross-service integration in E2 — E4/E5 own that. Marketing pages link to `/get-started` (the funnel route E1 stubbed and E3 fills), but no API calls from E2 pages.

**Pattern adherence snapshot**

| Area | Choice | Pattern source |
|---|---|---|
| Content format | MDX for prose-heavy pages; TSX for composed pages (imports MDX fragments when needed) | Next.js 16 `02-guides/mdx.md` |
| MDX plugin | `@next/mdx` with Turbopack-compatible options (string plugin names only) | Next.js 16 `02-guides/mdx.md` §Turbopack |
| MDX global styles | `src/mdx-components.tsx` mapping `h1..h6`, `p`, `ul`, `ol`, `a`, `img` → E1 primitives + E1 type ramp | Next.js 16 `03-api-reference/03-file-conventions/mdx-components.md` |
| Structured data | `<script type="application/ld+json">` emitted per page via typed helpers (`schema-dts` types) | Next.js 16 `02-guides/json-ld.md` |
| FAQ interaction | Native `<details>`/`<summary>`, no Radix / no JS toggle | Handrolled discipline inherited from E1 |
| Dynamic city routes | `[city]` segment + `generateStaticParams` + `dynamicParams = false` | Next.js 16 `03-api-reference/04-functions/generate-static-params.md` + `…/dynamicParams.md` |
| Typography | Handrolled `<ProseContainer>` + E1 token system; **no `@tailwindcss/typography`** | E1 arch §6 handrolled ethos |
| Metadata | Every page calls `buildMetadata()` from E1 `lib/seo.ts`; route-level MDX pages use `export const metadata = …` | Next.js 16 `03-api-reference/04-functions/generate-metadata.md` + E1 §3.4 |
| Sitemap | E2 adds routes to `src/lib/routes.ts`; E1's `sitemap.ts` picks them up automatically | E1 arch §5 |

**Pages delivered**

| Route | Page type | Primary schema.org |
|---|---|---|
| `/` | TSX (home) | `Organization`, `FAQPage` excerpt |
| `/how-it-works` | TSX + MDX body | `HowTo` |
| `/listing` | TSX (pillar) | `Service` |
| `/cash-offers` | TSX (pillar) | `Service` |
| `/cash-plus-repairs` | TSX (pillar) | `Service` |
| `/renovation-only` | TSX (pillar) | `Service` |
| `/why-its-free` | MDX route | `WebPage` (+ table) |
| `/meet-your-pm` | MDX route | `WebPage` |
| `/about` | MDX route | `AboutPage` |
| `/faq` | TSX | `FAQPage` (full) |
| `/az/[city]` × 7 | Dynamic TSX | `LocalBusiness` + `RealEstateAgent` |

---

## 2. Component diagram

```
                               src/app/(marketing)/layout.tsx  (from E1-S5 + E1-S9)
                                       │  Header + Footer + Container
                                       │
        ┌──────────────────────────────┼──────────────────────────────┐
        ▼                              ▼                              ▼
 ┌───────────────┐             ┌───────────────┐             ┌─────────────────┐
 │ (marketing)/  │             │ (marketing)/  │             │ (marketing)/    │
 │   page.tsx    │             │   <slug>/     │             │   az/[city]/    │
 │   (home)      │             │   page.tsx OR │             │   page.tsx      │
 │               │             │   page.mdx    │             │   + generate-   │
 │               │             │               │             │   StaticParams  │
 └───────┬───────┘             └───────┬───────┘             └────────┬────────┘
         │                             │                              │
         └─────────────────┬───────────┴──────────────┬───────────────┘
                           ▼                          ▼
           ┌─────────────────────────────┐  ┌─────────────────────────────┐
           │ src/components/marketing/   │  │ src/content/                │
           │   hero.tsx                  │  │   faq/entries.ts  (data)    │
           │   trust-bar.tsx             │  │   cities/registry.ts (data) │
           │   pillar-grid.tsx           │  │   anti-broker/claims.ts     │
           │   pillar-hero.tsx           │  │   mdx/                      │
           │   how-it-works.tsx          │  │     ├── home-hero.mdx       │
           │   cta-section.tsx           │  │     ├── pillar-*.mdx (body) │
           │   page-header.tsx           │  │     └── city-*.mdx (blurb)  │
           │   revenue-table.tsx         │  └─────────────────────────────┘
           │   pm-profile.tsx            │
           │   faq.tsx + faq-item.tsx    │
           │   prose-container.tsx       │
           │   json-ld.tsx               │
           └─────────────────────────────┘
                           │
                           ▼
           ┌─────────────────────────────┐
           │ src/lib/                    │
           │   schema.ts (typed helpers) │
           │   links.ts (typed slugs)    │
           │   routes.ts  ← E2 appends   │
           │                entries      │
           └─────────────────────────────┘

    Root config:
    ├── next.config.ts   ← pageExtensions + createMDX
    ├── src/mdx-components.tsx  (required)
    └── public/images/{hero,cities,pillars}/  (asset tree)
```

---

## 3. Per-service changes

Everything lives inside `sell-house-for-free`. Breakdown by area:

### 3.1 MDX pipeline

| File | Action | Notes |
|---|---|---|
| `package.json` | Add deps | `@next/mdx`, `@mdx-js/loader`, `@mdx-js/react`, `@types/mdx`, `schema-dts` (dev only — types only). No `remark-gfm` in MVP unless GFM extensions become necessary; its Turbopack constraint (string-only plugin names) is fine but adds surface we don't need yet. |
| `next.config.ts` | Edit | Add `pageExtensions: ['js', 'jsx', 'md', 'mdx', 'ts', 'tsx']`; wrap export in `createMDX({})`. Keep `experimental: {}` stub (E1). Do **not** enable `experimental.mdxRs` — still marked experimental per `03-api-reference/05-config/01-next-config-js/mdxRs.md`. |
| `src/mdx-components.tsx` | Create | **Required** by `@next/mdx` App Router integration. Maps `h1..h6`, `p`, `ul`, `ol`, `li`, `a`, `img`, `blockquote`, `code`, `pre`, `hr`, `strong`, `em` to E1 type ramp + primitives. `a` → `next/link` when internal; `img` → `next/image` with default `sizes="100vw"`. Exports `useMDXComponents()`. |

### 3.2 Marketing page components (new)

All under `src/components/marketing/`. Server Components by default; a component only becomes `"use client"` when it needs interactivity (none do in MVP — even the FAQ uses native `<details>`).

| Component | Shape | Consumers |
|---|---|---|
| `hero.tsx` | `<Hero eyebrow heading subcopy primaryCta secondaryCta? image? align>` — full-bleed intro with asymmetric grid (copy L, image R on desktop; stacked on mobile). Accepts MDX children for rich subcopy. | Home, pillar pages (alt variant), city landers |
| `trust-bar.tsx` | Horizontal strip rendering claims from `anti-broker/claims.ts` — 4 icons + short labels ("No fees", "We don't sell your info", "Real PM — not a lead broker", "Listed under JK Realty · AZ#…"). | Home, every pillar page, FAQ, `why-its-free` |
| `pillar-grid.tsx` | 4-card responsive grid linking to the four pillar pages. Each card: `icon, heading, blurb, href`. | Home, city landers |
| `pillar-hero.tsx` | Variant of Hero with a pillar-specific accent stripe + breadcrumb. | Four pillar pages |
| `page-header.tsx` | Smaller hero for secondary pages (About, FAQ, Why It's Free, Meet Your PM). `<h1>` + subcopy + optional eyebrow. | All secondary pages |
| `how-it-works.tsx` | Numbered step list (3-5 steps). Accepts `steps: { heading, body }[]`. Renders as ordered list with large step numerals. | `/how-it-works`, all four pillar pages |
| `cta-section.tsx` | Full-bleed CTA strip: heading + subcopy + primary button → `/get-started`, secondary link → `/how-it-works`. | Bottom of every marketing page |
| `revenue-table.tsx` | Static 2-column table: "Revenue stream" / "Who pays". Data sourced from `src/content/revenue/streams.ts` so edits are one-file. | `/why-its-free` |
| `pm-profile.tsx` | Card for one PM: photo (or placeholder), name, role, short bio, optional phone/email. MVP fills with representative placeholder content until the PM roster is seeded (E6). | `/meet-your-pm` |
| `faq.tsx` + `faq-item.tsx` | `<FAQ entries={…}>` renders `<dl>`/`<details>`/`<summary>` pattern. `<FAQItem>` is the single collapsible. Each item has a permalink anchor (`id={entry.id}`). | `/faq`, home FAQ excerpt |
| `prose-container.tsx` | `<article className="prose-custom max-w-[var(--container-prose)] mx-auto">` — owns spacing between MDX-generated elements. A `.prose-custom` rule lives in `globals.css` (added by this epic) — small set of `h2+p`, `p+p`, `ul+p` sibling selectors. | Every MDX route |
| `json-ld.tsx` | Dumb renderer: `<JsonLd data={…} />` → `<script type="application/ld+json" …>` with the `<`→`\u003c` escape per Next.js 16 `json-ld.md`. | Every page that emits structured data |

**All components are typed, keyboard-accessible, focus-visible by default, and do not depend on client-side JS.** Where interactivity exists (FAQ toggles), it rides native HTML primitives.

### 3.3 Content data

| File | Shape | Notes |
|---|---|---|
| `src/content/faq/entries.ts` | `FaqEntry[]`: `{ id, category, question, answer: string, relatedPillar?, lastReviewed: YYYY-MM-DD }` | Categories: `how-it-works`, `free-and-fair`, `data-and-privacy`, `pm-and-fulfillment`, `arizona`, `comparison`. Skeptic-first entries are flagged by a boolean `skepticFirst: true` and sort earliest. |
| `src/content/cities/registry.ts` | `CityEntry[]`: `{ slug, displayName, county, populationApprox, neighborhoodsSampled, localProofPoint, heroImage: { src, alt }, intro: string }` | Seven entries: Phoenix, Tucson, Mesa, Chandler, Scottsdale, Gilbert, Glendale. Slug matches `kebab-case(displayName)`. |
| `src/content/revenue/streams.ts` | `RevenueStream[]`: `{ id, label, whoPays, whenItActivates, note? }` | Consumed by `<RevenueTable>`. Entries: renovation commission (buyer or investor side), Cash+ spread (buyer), optional add-on products (seller opt-in), buyer-broker commission (the listing-side buyer, not the seller). |
| `src/content/anti-broker/claims.ts` | `AntiBrokerClaim[]`: `{ id, shortLabel, fullStatement, fulfillmentAnchor, lastVerified: YYYY-MM-DD }` | `fulfillmentAnchor` is a short human explanation of *how* the back-end actually honors the claim (E5 posts with no broker-syndication payload; E6 is the PM service; there is no `sell_lead_to_third_party_agents` flag anywhere in the stack). This field is the raw material for the E2-S11 audit. |
| `src/content/mdx/` | Directory of imported MDX fragments | Optional — only used when a TSX page wants MDX inside it. See §3.4. |

### 3.4 Pages

**Route-level MDX** (entire page is MDX; `export const metadata = …` at the top):

- `src/app/(marketing)/why-its-free/page.mdx`
- `src/app/(marketing)/meet-your-pm/page.mdx`
- `src/app/(marketing)/about/page.mdx`

Each imports a local `<PageHeader>` / `<ProseContainer>` / `<CTASection>` / `<RevenueTable>` / `<PMProfile>` as needed and renders them inline per the `@next/mdx` JSX-in-MDX convention.

**TSX pages** (composed; may import MDX fragments from `src/content/mdx/*.mdx`):

- `src/app/(marketing)/page.tsx` — home
- `src/app/(marketing)/how-it-works/page.tsx`
- `src/app/(marketing)/listing/page.tsx`
- `src/app/(marketing)/cash-offers/page.tsx`
- `src/app/(marketing)/cash-plus-repairs/page.tsx`
- `src/app/(marketing)/renovation-only/page.tsx`
- `src/app/(marketing)/faq/page.tsx`
- `src/app/(marketing)/az/[city]/page.tsx` — dynamic, with `generateStaticParams` + `dynamicParams = false`

Home page is moved from `src/app/page.tsx` to `src/app/(marketing)/page.tsx` in E1-S11; E2 replaces the placeholder with the final composition.

### 3.5 `src/lib/` additions

| File | Purpose |
|---|---|
| `src/lib/schema.ts` | Typed JSON-LD helpers. Uses `schema-dts` for compile-time correctness. Exports `organizationSchema()`, `realEstateAgentSchema(city?)`, `serviceSchema(pillar)`, `faqPageSchema(entries)`, `localBusinessSchema(city)`, `breadcrumbSchema(trail)`, `webPageSchema(meta)`, `howToSchema(steps)`. |
| `src/lib/links.ts` | Typed slug constants: `LINKS.home`, `LINKS.listing`, `LINKS.cashOffers`, `LINKS.cashPlusRepairs`, `LINKS.renovationOnly`, `LINKS.whyItsFree`, `LINKS.meetYourPm`, `LINKS.about`, `LINKS.faq`, `LINKS.city(slug)`, `LINKS.getStarted`. Everything a page renders as an internal link goes through this; no stringly-typed `href="/cash-offers"`. |
| `src/lib/routes.ts` | **Edit existing (from E1-S2).** Append E2 routes with `{ path, changeFrequency: 'monthly' or 'weekly' for home, priority }`. Sitemap picks them up automatically (E1-S3). |

### 3.6 `src/app/` edits to existing files

| File | Edit |
|---|---|
| `src/app/globals.css` | Append a small `.prose-custom` block under `@layer components` — sibling spacing rules for MDX-generated elements. Uses E1 tokens; no new tokens introduced. |
| `src/app/sitemap.ts` | **No edit** — reads from `src/lib/routes.ts` which E2 appends to. City routes emit one entry per city. |

### 3.7 Assets (deliverable alongside code)

Not code, but hard-blocking for design QA:

| Path | Asset | Notes |
|---|---|---|
| `public/images/hero/home.jpg` (+ `@2x`) | Arizona home exterior, warm hour, contextual | Provided by design |
| `public/images/hero/pillar-listing.jpg` | MLS listing visual | Design |
| `public/images/hero/pillar-cash.jpg` | Cash-offer metaphor (e.g. stack of paper, check) | Design |
| `public/images/hero/pillar-cash-plus.jpg` | Home-with-renovation scene | Design |
| `public/images/hero/pillar-renovation-only.jpg` | Reno in progress | Design |
| `public/images/cities/{phoenix,tucson,mesa,chandler,scottsdale,gilbert,glendale}.jpg` | Iconic per-city shot (licensed, AZ-accurate) | Design — 7 images |
| `public/images/pm/placeholder-01..04.jpg` | Illustrative PM portraits, gender-neutral, placeholder until roster is seeded | Design |
| `public/images/logo/jk-realty.svg` | JK Realty logo for broker attribution | Provided |

### 3.8 Environment variables (new)

None in E2. `NEXT_PUBLIC_SITE_URL` from E1 is reused for JSON-LD `url` fields.

---

## 4. Integration contracts

E2 does not call cross-service endpoints. The only integration contract is with the existing site foundation (E1) and the downstream funnel route (E3).

### 4.1 E2 → E1 (consumer)

| Use | E1 export | E2 consumption |
|---|---|---|
| Metadata | `buildMetadata({ title, description, path, image? })` | Every page (route-level MDX uses `export const metadata = buildMetadata(…)`) |
| Routes | `ROUTES` registry | E2 appends entries for sitemap + nav pickup |
| Site config | `SITE.name`, `SITE.url`, `SITE.broker.name`, `SITE.broker.licenseNumber`, `SITE.broker.state` | Hero subcopy, footer attribution, JSON-LD `Organization` |
| Primitives | `Button`, `Card`, `Container` | Composed into marketing components |
| Layout | `<Header>`, `<Footer>` | Inherited via `(marketing)/layout.tsx` — E2 does not edit layout |
| Type ramp | Utility patterns in E1 arch §4 | Hand-applied inside each component (no new token extraction) |

### 4.2 E2 → E3 (handoff)

All marketing CTAs route to `/get-started`. Contract: **E2 emits query params on the CTA URL; E3 is free to consume or ignore them.**

- From pillar pages: `/get-started?pillar=listing|cash-offers|cash-plus-repairs|renovation-only` — lets E3 pre-select a path or add a hidden attribution field.
- From city landers: `/get-started?city={slug}` — lets E3 pre-fill AZ city and add attribution.
- From home `<TrustBar>` or `<CTASection>`: no params.

Params are optional and non-normative — E3 must treat them as hints, not required inputs, and a missing/garbage value must still yield a working form.

### 4.3 E2 → E7 (compliance link-out)

All marketing pages' footers link to `/privacy` and `/terms` (E7 fills). E2 does not author legal copy. The anti-broker claim "We don't sell your info" must have a matching enforceable clause in the E7 privacy policy; the `AntiBrokerClaim.fulfillmentAnchor` field is the audit hook.

### 4.4 E2 → E8 (launch)

The anti-third-party-PII-pixel promise lives on. E2 introduces **no ad pixels, no GTM, no cross-origin tracking scripts, no Hotjar/FullStory/Clarity**. `next/image` with origin `/` or `public/` only — no `remotePatterns` added in E2. E8 audits.

---

## 5. Pattern decisions + deviations

### Decisions (with citations)

1. **MDX via `@next/mdx`** — Next.js 16 `02-guides/mdx.md`. Native route support via `pageExtensions`; `export const metadata` pattern for per-page SEO.
2. **No frontmatter** — Frontmatter is not supported by `@next/mdx` natively (doc: "@next/mdx does not support frontmatter by default") and adding a remark plugin for it introduces a Turbopack constraint. Use `export const metadata` instead. Simpler, typed, and idiomatic with Next.js 16.
3. **`src/mdx-components.tsx` (not project root)** — The doc allows `src/` placement when a project uses `src/`. We do. Co-locates with other config.
4. **JSON-LD via inline `<script type="application/ld+json">`** — Next.js 16 `02-guides/json-ld.md` is explicit: "render structured data as a `<script>` tag in your `layout.js` or `page.js`." Do not use `next/script` — doc says wrong choice; structured data is not executable code.
5. **`schema-dts` for JSON-LD typing** — Cited directly in `json-ld.md`. Compile-time guard against typos in `@type` / required fields.
6. **`<`→`\u003c` escape on JSON-LD stringify** — Exact pattern from `json-ld.md`. Guards against XSS when any data field contains user-controllable text (city name, FAQ answer — all static today, but the pattern is free).
7. **Native `<details>`/`<summary>` for FAQ** — Accessible by default, no JS, opens on click and via keyboard, supports `[open]` URL-hash deep-link with a small handler on the target, and works without hydration. No Radix accordion, no custom open/close state. Matches E1's handrolled discipline (E1 arch §6).
8. **Static generation with `generateStaticParams` + `dynamicParams = false` for city landers** — Next.js 16 `03-api-reference/04-functions/generate-static-params.md`. Seven static routes prerendered at build; any `/az/unknown-city` returns 404 rather than rendering an empty page.
9. **Content-as-TS-data** for FAQ entries, city registry, revenue streams, anti-broker claims — Gives us compile-time safety, grep-ability, easy refactor, programmatic transformation (FAQPage JSON-LD is just `entries.map(…)`), and no runtime file I/O. MDX is used only where the editorial *form* is prose, not data.
10. **`routes.ts`-driven sitemap** — E1 pattern, unchanged. E2 appends entries; sitemap regenerates automatically at build.
11. **`LINKS` typed constant** — Avoids stringly-typed internal URLs. Route changes touch one file. Pattern in common use across Zoodealio's Angular apps (e.g., `routing.module.ts` constants); ported into TS here.

### Deviations (with justification)

| Deviation | From | Why | Who accepts the risk |
|---|---|---|---|
| No `@tailwindcss/typography` | Next.js 16 `mdx.md` §"Using Tailwind typography plugin" suggests it | The doc's own example renders `prose-h1:text-5xl` etc. — we already have the type ramp as utility patterns from E1. `prose` classes encode Tailwind's opinions about spacing, which won't match our Figma. A handrolled `.prose-custom` block (sibling spacing only) is ~30 lines and stays consistent with E1's token system. | Noah — revisit if MDX authoring becomes painful. |
| No `remark-gfm` | Next.js MDX common default | Default MDX (CommonMark) covers tables, ordered/unordered lists, bold/italic, inline code. GFM adds strikethrough, autolinks, and task lists — we don't need any of these for marketing copy. Adds Turbopack surface (string-only plugin names) for zero user-visible gain. | Noah — add when a specific GFM feature becomes necessary. |
| No `experimental.mdxRs` | Rust MDX compiler option | Doc explicitly marks it experimental and not for production. JS MDX compiler is fine at marketing-site scale. | Noah — reconsider when stable. |
| No blog / no Strapi integration in E2 | Plan §4 E2 mentions "an optional blog area can pull from Strapi if/when we want one" | Scope-bounded. MVP is marketing + funnel, not content marketing. Strapi integration, blog index, article template, RSS, etc. would be a sibling epic, not E2. | Noah — plan Q7 resolved this. |
| JSON-LD per page, not a shared `<head>` slot | Some sites emit a single global `Organization` in root `layout.tsx` | Next.js 16 App Router supports `<script>` in any component, including server-rendered pages, and each page benefits from its own contextually-relevant schema (Service for pillars, FAQPage for `/faq`, LocalBusiness for city landers). Emitting in the page is clearer and the `Organization` overhead is tiny. Root `layout.tsx` stays schema-free. | Noah. |
| FAQ as static `<details>` rather than URL-hash-driven open state | Some teams want shareable deep-links | A small client-side handler can read `window.location.hash` on mount and set `open` on the matching `<details>` — this is a 5-line pattern and can ship without violating the "no JS" target. Keeping it in E2-S4 as an optional enhancement; still accessible without it. | Noah — no regression even if unchecked. |
| Placeholder PM profiles in MVP | `Meet Your PM` page implies real people | The PM roster is owned by E6 (Supabase-backed). MVP uses 3-4 placeholder illustrations with role/title only; real photos + bios slot in when roster seeds. Copy honest: "Meet our Arizona Project Managers — we'll match you with one after you submit." Prevents pre-launch from blocking on roster finalization. | Noah — flagged to E6 as a content swap-in point. |
| No interactive anti-broker "comparison table" in MVP | Some competitor sites use them | Comparison tables invite legal exposure ("We're better than agent X") and age poorly. Prose that names the pattern ("lead-resale fronts") and explicit skeptic-first FAQs do the job without claim-by-claim comparisons. | Noah — revisit post-launch. |
| Anti-broker claims as data (not a single page) | Could be concentrated on `/why-its-free` | The trust posture is "a first-class product surface, not a footer disclaimer" (plan §1). Claims rendered on every high-traffic page (home, pillars) via `<TrustBar>`. `/why-its-free` expands on the same claims. Data source is one file → one place to audit. | Noah — plan §3 functional requirement. |

---

## 6. Open questions

None blocking. Items to revisit in downstream work:

- **`remark-gfm` or similar** — add if MDX copy starts reaching for strikethrough / task lists / autolinks frequently. Not now.
- **Search on FAQ** — MVP is static list grouped by category. If analytics show users scrolling long FAQ, add a client-side filter or per-category anchor jumps in a follow-up.
- **Spanish-language AZ landers** — Phoenix metro has large Spanish-speaking population; Spanish versions of city landers + a language toggle are future work. Architecturally clean because content is TS data — swap in `_es.ts` registries later.
- **Per-city fresh MLS stat blurbs** — e.g., "37 homes sold in Chandler last week." Would want a cached daily pull from `Zoodealio.MLS`. Defer to post-launch; MVP city landers are evergreen.
- **Testimonials carousel** — out of scope pre-launch (no customers yet). When added, data model (TS), not MDX.
- **`<SkipLink>` for MDX content** — E1-S9 adds a Header skip link; if MDX pages develop dense navigation, extend or duplicate. Not needed MVP.
- **PM profile real copy + real photos** — E6 owns the roster; E2 ships placeholders.

---

## 7. Handoff notes for PM (suggested story boundaries)

Proposed decomposition into ADO User Stories under Feature 7778. PM should validate sequencing against team capacity; most stories can land in parallel because component deps are linear and small.

| # | Story | Size | Notes |
|---|---|---|---|
| E2-S1 | **MDX infrastructure** — add deps, edit `next.config.ts`, create `src/mdx-components.tsx`, add `.prose-custom` rule to `globals.css` | S | Unblocks S6-S10. Single failure mode: `pageExtensions` order and Turbopack compatibility. |
| E2-S2 | **Marketing components wave 1** — `<Hero>`, `<PillarGrid>`, `<TrustBar>`, `<CTASection>`, `<PageHeader>` | M | Five components, each ≤150 lines. Build with placeholder data first; wire real data in per-page stories. |
| E2-S3 | **Marketing components wave 2** — `<PillarHero>`, `<HowItWorks>`, `<RevenueTable>`, `<PMProfile>`, `<ProseContainer>` | M | Consumed by pillar pages + prose routes. |
| E2-S4 | **FAQ system** — `<FAQ>`, `<FAQItem>`, `src/content/faq/entries.ts`, `/faq` page, FAQPage JSON-LD emission, deep-link-on-hash handler (optional enhancement) | M | Ship with 10-15 skeptic-first entries; expand post-launch. Hash handler is optional per §5 deviation. |
| E2-S5 | **JSON-LD helpers** — `src/lib/schema.ts` with 8 typed helpers, `<JsonLd>` component, `schema-dts` dev dep | S | Shared foundation for S6-S10. Test with [Rich Results Test](https://search.google.com/test/rich-results) for at least Organization + Service + FAQPage. |
| E2-S6 | **Home page + `LINKS` constant + route registry updates** — final home content, Organization + FAQPage (excerpt) JSON-LD, `src/lib/links.ts`, append routes to `lib/routes.ts` | M | Home is the highest-traffic page; copy gets editorial attention. Registers sitemap entries for E2 routes as part of this story. |
| E2-S7 | **Secondary prose routes** — `/how-it-works` (TSX + MDX body), `/why-its-free` (MDX route + `<RevenueTable>` + revenue stream data), `/about` (MDX route) | M | Three prose pages; share `<PageHeader>` + `<ProseContainer>`. `src/content/revenue/streams.ts` created here. |
| E2-S8 | **Four pillar pages** — `/listing`, `/cash-offers`, `/cash-plus-repairs`, `/renovation-only`, each with `<PillarHero>` + `<HowItWorks>` + `<TrustBar>` + `<CTASection>` + Service JSON-LD | L | Largest story. PM may split per-pillar if team velocity wants smaller slices; architecture supports either. |
| E2-S9 | **Meet Your PM + placeholder PM profiles** — `/meet-your-pm` MDX route + 3-4 `<PMProfile>` placeholders + one `AboutPage`-style JSON-LD | S | Honest "placeholder until roster seeds" copy. Photos via `public/images/pm/`. |
| E2-S10 | **AZ city landers** — `[city]/page.tsx` + `generateStaticParams` + `dynamicParams = false` + `src/content/cities/registry.ts` (7 entries) + `<CityHero>` (variant of Hero) + LocalBusiness/RealEstateAgent JSON-LD + sitemap pickup | L | Data-heavy. Each city is a data entry, not a file — unless the design calls for per-city hero copy variants, in which case pull from `src/content/mdx/city-{slug}.mdx` per Q7's MDX-for-prose convention. |
| E2-S11 | **Anti-broker claim audit + closeout** — `src/content/anti-broker/claims.ts` written + every claim's `fulfillmentAnchor` verified against E5/E6 architecture (or flagged as open risk to resolve by launch), `<TrustBar>` wired on all pages, E7 privacy-policy pointer lined up | S | Integrative closeout. Produces a short `docs/anti-broker-audit.md` memo listing each claim + the back-end line that honors it (or the risk if not yet honored). |

**Critical sequencing:** S1 unblocks S6-S10; S2+S3 unblock S6-S10; S5 unblocks JSON-LD in every page story; S11 is closeout and runs last.

**Parallelism after S1-S5:** S6, S7, S8, S9, S10 can all start concurrently by different contributors. S11 waits until S6-S10 land.

**Acceptance criteria cadence** — every page story must include:

- `next build` passes; the route is prerendered (check `.next/server/app/…`)
- Lighthouse LCP < 2.5s on 4G throttle (plan §3 non-functionals; E1 gate applies here)
- JSON-LD validates in [Schema Markup Validator](https://validator.schema.org/) and (for Service/LocalBusiness/FAQPage) Rich Results Test
- `<TrustBar>` is present and visible above the fold on home + pillar + city pages
- No third-party network requests fire on page load (DevTools Network tab filter — only `va.vercel-scripts.com` in prod and self-origin allowed)
- Visual parity vs. Figma for at least the hero + one representative section

**Not in E2 scope** (for PM planning clarity): `/get-started` page contents (E3), any API route under `src/app/api/` (E4/E5), Supabase client (E6), privacy / terms copy (E7), security headers / CSP / Sentry / page-speed budget in CI (E8), blog or Strapi pipeline (post-launch epic).

---

## 8. References

- Project plan: `_bmad-output/planning-artifacts/project-plan-sell-house-for-free.md` §4 E2
- E1 architecture: `_bmad-output/planning-artifacts/architecture-e1-site-foundation.md`
- ADO Feature 7778: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7778
- Next.js 16 MDX: `node_modules/next/dist/docs/01-app/02-guides/mdx.md`
- Next.js 16 JSON-LD: `node_modules/next/dist/docs/01-app/02-guides/json-ld.md`
- Next.js 16 `mdx-components.tsx`: `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/mdx-components.md`
- Next.js 16 `generateStaticParams`: `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/generate-static-params.md`
- Next.js 16 `dynamicParams`: `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/02-route-segment-config/dynamicParams.md`
- Rich Results Test: https://search.google.com/test/rich-results
- Schema Markup Validator: https://validator.schema.org/
- `schema-dts` types: https://www.npmjs.com/package/schema-dts
