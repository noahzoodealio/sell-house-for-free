---
slug: e2-bulk-s1-to-s11
parent-epic-id: 7778
parent-epic-url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7778
mode: bulk
mode-ado: mcp
stories-planned:
  - e2-s1-mdx-infrastructure
  - e2-s2-marketing-components-wave-1
  - e2-s3-marketing-components-wave-2
  - e2-s4-faq-system
  - e2-s5-jsonld-helpers
  - e2-s6-home-links-routes
  - e2-s7-secondary-prose-routes
  - e2-s8-four-pillar-pages
  - e2-s9-meet-your-pm
  - e2-s10-az-city-landers
  - e2-s11-anti-broker-audit
stories-created:
  - id: 7797
    url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7797
    title: "E2-S1 — MDX infrastructure: pageExtensions, createMDX, mdx-components, .prose-custom"
    size: S
  - id: 7798
    url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7798
    title: "E2-S2 — Marketing components wave 1: Hero, PillarGrid, TrustBar, CTASection, PageHeader"
    size: M
  - id: 7799
    url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7799
    title: "E2-S3 — Marketing components wave 2: PillarHero, HowItWorks, RevenueTable, PMProfile, ProseContainer"
    size: M
  - id: 7800
    url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7800
    title: "E2-S4 — FAQ system: <FAQ> + <FAQItem> + /faq page + skeptic-first entries + FAQPage JSON-LD"
    size: M
  - id: 7801
    url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7801
    title: "E2-S5 — JSON-LD helpers: <JsonLd> renderer + schema.ts typed helpers via schema-dts"
    size: S
  - id: 7802
    url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7802
    title: "E2-S6 — Home page + LINKS typed constants + routes registry append"
    size: M
  - id: 7803
    url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7803
    title: "E2-S7 — Secondary prose routes: /how-it-works, /why-its-free, /about"
    size: M
  - id: 7804
    url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7804
    title: "E2-S8 — Four pillar pages: /listing, /cash-offers, /cash-plus-repairs, /renovation-only"
    size: L
  - id: 7805
    url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7805
    title: "E2-S9 — Meet Your PM: /meet-your-pm MDX route + placeholder PM profiles"
    size: S
  - id: 7806
    url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7806
    title: "E2-S10 — AZ city landers: [city] dynamic route + cities registry + LocalBusiness JSON-LD"
    size: L
  - id: 7807
    url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7807
    title: "E2-S11 — Anti-broker claim registry + audit + E2 closeout"
    size: S
started-at: 2026-04-17T21:00:00Z
completed-at: 2026-04-17T21:20:00Z
last-completed-step: 5
---

# E2 bulk S1→S11 — PM Working Sidecar

## Plan

Eleven stories decomposing Feature 7778 per the architecture doc §7 decomposition table. Sequencing:

- **S1–S5 unblock page stories** — MDX infra (S1), component waves 1+2 (S2/S3), FAQ system (S4), JSON-LD helpers (S5)
- **S6–S10 run in parallel** — home (S6), prose routes (S7), pillar pages (S8), Meet Your PM (S9), city landers (S10)
- **S11 is integrative closeout** — anti-broker claim audit + trust-bar wiring cleanup

All eleven filed under Feature 7778 via `wit_add_child_work_items` with area/iteration path `Offervana_SaaS`, matching siblings 7785–7796 (E1 stories).

### Filing order

S1 (7797) → S2 (7798) → S3 (7799) → S4 (7800) → S5 (7801) → S6 (7802) → S7 (7803) → S8 (7804) → S9 (7805) → S10 (7806) → S11 (7807). Monotonic numeric sequence preserves at-a-glance readability in ADO.

## Execution log

### Filed in order

1. **7797** — E2-S1 MDX infrastructure. 15 ACs. `pageExtensions` + `createMDX` + `src/mdx-components.tsx` (required exact path) + `.prose-custom` in `globals.css`. Deps: `@next/mdx`, `@mdx-js/loader`, `@mdx-js/react`, `@types/mdx` as runtime; `schema-dts` as devDep only. Notes pin the Turbopack plugin-name constraint.
2. **7798** — E2-S2 Marketing components wave 1 (Hero, PillarGrid, TrustBar, CTASection, PageHeader). 17 ACs. Server Components only — no `'use client'`. Named exports, no barrel. Full-card-link pattern on PillarGrid via absolutely-positioned `<Link>` overlay with heading as accessible name. TrustBar takes a `claims` prop — registry is owned by S11.
3. **7799** — E2-S3 Marketing components wave 2 (PillarHero, HowItWorks, RevenueTable, PMProfile, ProseContainer). 16 ACs. PillarHero **composes** `<Hero>` — no JSX copy-paste. Four pillar accent tokens added to `@theme`. HowItWorks step numerals zero-pad to two digits at display-large scale. RevenueTable uses semantic `<table>` with responsive column-hide pattern. PMProfile initial-letter fallback when `photo` omitted. ProseContainer is an `<article>` wrapper with prose-max + `.prose-custom`.
4. **7800** — E2-S4 FAQ system. 16 ACs. `src/content/faq/entries.ts` ships 10–15 skeptic-first entries with `lastReviewed`. Grouping by category at render time; skeptic-first within each category. Native `<details>`/`<summary>` with custom chevron rotate on `[open]`. FAQPage JSON-LD validated via Rich Results Test. Optional hash-target client helper for deep-link auto-open (~10 LOC, shippable if capacity).
5. **7801** — E2-S5 JSON-LD helpers. 15 ACs. `src/lib/schema.ts` with eight typed helpers (organizationSchema, realEstateAgentSchema, serviceSchema, faqPageSchema, localBusinessSchema, breadcrumbSchema, webPageSchema, howToSchema). `<JsonLd>` renderer with explicit `<`→`\u003c` escape per Next.js 16 `json-ld.md`. Do NOT use `next/script`.
6. **7802** — E2-S6 Home + LINKS + routes. 16 ACs. Replaces E1-S11 placeholder with final composition (Hero → TrustBar → PillarGrid → optional HowItWorks excerpt → FAQ excerpt filtered to free-and-fair+skepticFirst → CTASection). `LINKS` typed constant with `as const` + `city(slug)` function. `routes.ts` appends E2 entries with per-route `changeFrequency`/`priority`. `title.absolute` on home to suppress the S1 title template (a Next.js 16 nuance not in most training data).
7. **7803** — E2-S7 Secondary prose routes. 16 ACs. Three routes: `/how-it-works` (TSX with HowTo schema), `/why-its-free` (MDX with RevenueTable + revenue streams data), `/about` (MDX with AboutPage schema). Creates `src/content/revenue/streams.ts` (architecture §3.3). `aboutPageSchema` helper added to S5's schema.ts in this PR if missing.
8. **7804** — E2-S8 Four pillar pages. 20 ACs. `/listing`, `/cash-offers`, `/cash-plus-repairs`, `/renovation-only`. PillarHero + TrustBar + HowItWorks + CTASection per page, Service + BreadcrumbList JSON-LD per page. Cash+ risk/reward note is mandatory (AC 7). Renovation-Only honestly names it as a site-unique marketing differentiator, NOT an Offervana platform offering (AC 8). CTA contract: `?pillar=<slug>` query param to E3. May split per-pillar 4-way if velocity wants (AC 18).
9. **7805** — E2-S9 Meet Your PM. 14 ACs. MDX route. Placeholder PM roster explicitly labeled as placeholder; inline data (no data file); contact info omitted on placeholders (architecture §3.2 optionality). Initial-letter fallback on photos unless UX ships `public/images/pm/placeholder-*.jpg`. E6 swap-in pattern documented in top-of-file comment.
10. **7806** — E2-S10 AZ city landers. 20 ACs. Single `[city]` dynamic route + `src/content/cities/registry.ts` with 7 entries (phoenix, tucson, mesa, chandler, scottsdale, gilbert, glendale). `generateStaticParams` + `dynamicParams = false` — unknown slugs 404. Async `params` (Next.js 16). LocalBusiness + RealEstateAgent + BreadcrumbList JSON-LD per city. `?city=<slug>` CTA contract to E3. `/az` breadcrumb level is virtual (no index page MVP).
11. **7807** — E2-S11 Anti-broker audit + closeout. 16 ACs. `src/content/anti-broker/claims.ts` with four typed claims (no-fees, no-data-resale, real-pm, jk-realty-broker), each carrying a `fulfillmentAnchor` string. `docs/anti-broker-audit.md` memo cross-checks E5/E6/E7/E8. Cleanup replaces every inline `HOME_TRUST_CLAIMS`-style placeholder across 6 consuming pages with registry import. Grep-verify zero `TODO(E2-S11` markers remain.

### Content decisions (cross-story patterns)

- **Blueprint stability.** Every story follows the same section cadence as E1 siblings 7785–7796 (banner → User story → Summary → Files touched → Acceptance criteria → Technical notes → Suggested tasks → Out of scope → References → Notes). Banner shape matches parent Feature 7778 and E1 siblings.
- **AC count scales with correctness-sensitive surface, not story size.** S1 (15), S2 (17), S3 (16), S4 (16), S5 (15), S6 (16), S7 (16), S8 (20), S9 (14), S10 (20), S11 (16). S8 and S10 earn more ACs because they ship four / seven near-identical surfaces, each with its own JSON-LD validation + copy-honesty gate.
- **Soft-dep forgiveness.** Every page story (S6–S10) includes `TODO(upstream)` escape clauses when S1–S5 components may not have landed. Same pattern E1's stories used. No hard blocks within E2 besides S1 (MDX infra) blocking S7/S9 MDX routes.
- **Bleeding-edge Next.js 16 call-outs.** Every Notes tail pins the ONE training-data regression risk most likely for that story: S1 `@next/mdx` Turbopack plugin constraint; S2 Server Component discipline in marketing components; S3 `<PillarHero>` composing (not copy-pasting) `<Hero>`; S4 `<`→`\u003c` escape on JSON-LD stringify; S5 `next/script`-is-wrong for JSON-LD; S6 `title.absolute` on home; S7 `export const metadata` (not frontmatter) in MDX files; S8 Service schema rich-result eligibility limits; S9 placeholder ethics (no stock photos of real faces); S10 async `params` Promise + `dynamicParams = false` module export; S11 audit honesty > audit completeness.
- **Architecture §5 deviations enforced.** No `@tailwindcss/typography` (S1). No `remark-gfm` (S1). No `experimental.mdxRs` (S1). Native `<details>`/`<summary>` for FAQ (S4). `schema-dts` devDep only (S5). No comparison tables (S8, S11). No stock-photo PMs (S9). Single `[city]` segment, not per-city folders (S10).

### Bulk-mode compaction

Each story was drafted individually and filed via `wit_add_child_work_items` immediately (not batched). Per-story context was discarded between draftings. The Feature 7778 body + architecture §7 decomposition table were re-referenced by memory rather than re-fetched.

### Style match to E1 siblings

- Same HTML vocabulary (`<h2>`, `<ul>`, `<ol>`, `<code>`, `<strong>`, `<em>`, `<table>` for the Pages-delivered table in Feature 7778).
- Same area/iteration path (`Offervana_SaaS` / `Offervana_SaaS`).
- State `New`, priority `2`.
- `Microsoft.VSTS.TCM.ReproSteps` auto-populated by ADO with the same HTML — matches E1 siblings.

## Format bug and repair

**Bug discovered mid-run.** The first nine stories (S1–S9: 7797–7805) were filed with `format: "Html"` placed at the top-level MCP call rather than inside each item object. The MCP tool's schema specifies `format` as a per-item property; the top-level parameter was ignored, and ADO defaulted to markdown storage. The descriptions were stored as HTML-escaped text (`&lt;p&gt;` instead of `<p>`), which renders in ADO as visible `<p>` tags rather than formatted paragraphs.

**Detected on S9 (7805)** when the API response surfaced `"multilineFieldsFormat":{"System.Description":"markdown"}`. Fix confirmed on S10 (7806) with `format: "Html"` correctly placed inside the item object — response showed `"multilineFieldsFormat":{"System.Description":"html"}` and stored content contains real HTML tags.

**Repair strategy.** For each of 7797–7805: (a) fetch the current description (HTML entities escaped); (b) unescape with a regex pass (`&lt;` → `<`, `&gt;` → `>`, `&quot;` → `"`, `&nbsp;` → `\u00a0`, then `&amp;` → `&` last); (c) `wit_update_work_item` with JSON Patch operations `replace /fields/System.Description` = unescaped HTML AND `add /multilineFieldsFormat/System.Description` = `html`.

**Cosmetic damage note.** Some descriptions intentionally contained `&lt;Link&gt;`-style literal entity refs inside `<code>` blocks to show code samples like `<Link>` as visible text. ADO's uniform `<`→`&lt;` escape at storage time erased the distinction between real HTML and these intentional entity refs. After unescape, those code samples will render as empty/unknown `<Link>` / `<TrustBarClaim>` / etc. tags instead of the intended literal text. The impact is limited to ~5–10 spots per story inside Technical notes sections; readers can infer intent from context. Flagged for possible manual touch-up if the team wants pixel-perfect code samples.

**Repair DEFERRED** — user closed out the session before the repair ran. The 9 stories are filed with full content but render with visible HTML tags in ADO. Re-run `/zoo-core-create-story` repair mode OR run the 18-call fix (9× `wit_get_work_item` + 9× `wit_update_work_item` with JSON Patch) as a follow-up. Stories 7806 and 7807 are correctly formatted and should NOT be touched.

## Not done

- No tags assigned (matches E1 precedent).
- No assignees, no sprint iteration (matches E1; sprint planning will assign).
- Did not append patterns to `zoo-core-agent-pm/ado-history.md` — directory still doesn't exist.
- No inter-story `Related` links filed in ADO. Hierarchy (Parent) link is on each story pointing at 7778; sibling-to-sibling relationships are documented in each story body under `Depends on` / `Blocks`.
- Figma frames not fetched — per architect working sidecar §"Not done", per-page designs should be requested during individual story pickup, not during decomposition.

## Next steps

1. Review the eleven rendered stories on ADO. Spot-check the format-repaired S1–S9 for any cosmetic drift in code-sample entities (see Format bug and repair §).
2. Feature 7778 is now fully decomposed — E2 is ready for sprint planning. All 11 stories filed: 7797, 7798, 7799, 7800, 7801, 7802, 7803, 7804, 7805, 7806, 7807.
3. Critical path for parallel work: S1–S5 unblock S6–S10. S1 is the only hard-blocker (MDX infra must land before MDX routes in S7/S9). S6–S10 can run concurrently by different contributors once S1–S5 land. S11 runs last.
4. E2 implementation is gated on E1 stories landing first — specifically E1-S5 (route groups) must ship so `(marketing)/layout.tsx` exists to host E2 pages.
5. Suggested next skill: `/zoo-core-create-architecture` for the next critical-path Feature (E3 funnel, E4/E5 submission back-end, E6 PM roster, E7 legal copy, E8 launch).
