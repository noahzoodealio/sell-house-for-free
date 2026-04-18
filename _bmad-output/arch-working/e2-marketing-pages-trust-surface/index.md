---
feature: e2-marketing-pages-trust-surface
ado-feature-id: 7778
ado-feature-url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7778
services-in-scope:
  - sell-house-for-free
upstream-research: null
upstream-plan: _bmad-output/planning-artifacts/project-plan-sell-house-for-free.md
depends-on-architecture: _bmad-output/planning-artifacts/architecture-e1-site-foundation.md
output: _bmad-output/planning-artifacts/architecture-e2-marketing-pages-trust-surface.md
started-at: 2026-04-17T20:30:00Z
completed-at: 2026-04-17T20:45:00Z
last-completed-step: 5
---

# E2 — Marketing Pages + Trust Surface — Architect Working Sidecar

## Inputs consumed

- Project plan §4 E2 (Core Marketing Pages + Trust Surface) — seven-bullet scope with locked CMS decision (MDX in-repo, Strapi reserved for blog)
- E1 architecture doc (`architecture-e1-site-foundation.md`) — pattern parity for tokens, primitives, `(marketing)` layout, `SITE`/`ROUTES`/`buildMetadata`, file-based metadata
- ADO Feature 7778 body (rev 3) — confirms decisions locked: brand name, MDX-only content pipeline, renovation-only as marketing differentiator
- Next.js 16 docs (actually read, not recalled from training):
  - `01-app/02-guides/mdx.md`
  - `01-app/02-guides/json-ld.md`
  - `01-app/03-api-reference/03-file-conventions/mdx-components.md` (referenced, not read in full)
  - `01-app/03-api-reference/04-functions/generate-static-params.md` (referenced)
- Repo survey — confirmed pristine scaffold state (no E1 stories implemented yet). Architecture is forward-looking, assuming E1 ships per E1 arch §3.

## Key decisions

| Decision | Alternative considered | Why this one |
|---|---|---|
| `@next/mdx` + route-level `.mdx` for prose pages; TSX for composed pages | All-TSX with imported MDX; all-MDX-route | Composed pages (home, pillars, city landers) are structurally richer and benefit from TSX composition. Prose pages (why-its-free, meet-your-pm, about) are editorially prose-first — route-level MDX keeps authoring clean. |
| Content-as-TS-data for FAQ entries, city registry, revenue streams, anti-broker claims | All MDX | Gives us typed data, greppable content, and programmatic transforms (FAQPage JSON-LD ← `entries.map`). MDX is reserved for prose *form*, not data. |
| JSON-LD per page via `<script type="application/ld+json">` with `schema-dts` types + `<`→`\u003c` escape | Global `Organization` in root layout; `next/script`; no JSON-LD at all | Next.js 16 `json-ld.md` is explicit on the pattern. Per-page schemas let pillar pages emit `Service`, FAQ emits `FAQPage`, city landers emit `LocalBusiness` — richer SERP surface. |
| Native `<details>`/`<summary>` for FAQ | Radix Accordion | Inherits E1 handrolled ethos (E1 arch §6). Zero JS, accessible by default, keyboard-operable, works without hydration. |
| `generateStaticParams` + `dynamicParams = false` for city landers | Fully static per-file pages (`src/app/(marketing)/az/phoenix/page.tsx`, etc.) | Single-file route + typed data registry is easier to maintain. `dynamicParams = false` turns unknown cities into 404s instead of soft errors. Seven pages prerendered at build is identical in cost either way. |
| No `@tailwindcss/typography` | Install it per MDX doc suggestion | `prose-*` classes encode Tailwind's spacing opinions; won't match Figma. Handrolled `.prose-custom` (sibling spacing ~30 lines) stays aligned with E1 tokens. |
| No `remark-gfm` | Install for tables/autolinks/strikethrough | CommonMark covers tables. No need for strikethrough or task lists in marketing copy. Adds Turbopack constraint for zero gain. |
| No `experimental.mdxRs` | Enable Rust MDX | Doc marks it not-for-production. JS MDX is fine at marketing scale. |
| `LINKS` typed constant for internal URLs | Stringly-typed `href` | Single file to update on any route rename. Idiom from Zoodealio Angular apps (`routing.module.ts` constants). |

## Story decomposition (11 stories)

Mirrors E1's 11-story shape. Sequencing: S1-S5 unblock page stories; S6-S10 run in parallel; S11 is integrative closeout.

1. S1 — MDX infrastructure (S)
2. S2 — Marketing components wave 1 (M): Hero, PillarGrid, TrustBar, CTASection, PageHeader
3. S3 — Marketing components wave 2 (M): PillarHero, HowItWorks, RevenueTable, PMProfile, ProseContainer
4. S4 — FAQ system + `/faq` (M)
5. S5 — JSON-LD helpers + `<JsonLd>` (S)
6. S6 — Home + `LINKS` + route registry updates (M)
7. S7 — How It Works, Why It's Free, About (M — three prose routes)
8. S8 — Four pillar pages (L — PM may split 4-way per velocity)
9. S9 — Meet Your PM (S, placeholders)
10. S10 — AZ city landers + registry (L)
11. S11 — Anti-broker audit + closeout (S)

## Deviations from E1 patterns

- **Server Components by default** — no `"use client"` in any E2 component. Only optional piece is a client-side `hashchange` handler on `<FAQ>` to sync `<details open>` with URL hash — that one file would be `"use client"` if we ship it.
- **`src/mdx-components.tsx`** — introduces a new file outside the `src/app/`, `src/components/`, `src/lib/` division established by E1. Colocated with `src/` root per Next.js doc permission. Flagged for Dev to avoid relocating it.
- **Content directory** (`src/content/`) — new top-level under `src/`. E1 did not scaffold it. This epic establishes it; future epics with structured data (E3 submission UX copy, E7 legal copy version-stamps) may reuse it.

## Open questions (not blocking)

- Exact `Service` vs. `Offer` vs. `RealEstateListing` schema type for the four pillar pages — `Service` is the safest umbrella; `Offer` subtype might be added per-pillar for rich pricing context when pricing copy is reviewed with legal.
- FAQ hash-deep-link handler: ship or defer? Zero-cost enhancement; deciding factor is whether the S4 story is already at max size.
- Per-city MLS stat blurbs (post-launch) — when the time comes, the integration is via `Zoodealio.MLS.Api` (research already in plan §7) with daily ISR revalidation or a scheduled rebuild.
- Spanish-language AZ landers — deferred; architecturally clean because content is TS data.

## Next steps

1. Review this doc and `architecture-e2-marketing-pages-trust-surface.md`.
2. ~~Run `/zoo-core-create-epic e2` if you want to enrich ADO Feature 7778's body with the story decomposition + pattern anchors (matches E1's enrichment step)~~ — **done 2026-04-17; see `_bmad-output/epic-working/e2-marketing-pages-trust-surface/index.md`.**
3. Run `/zoo-core-create-story e2` to file Stories S1-S11 under Feature 7778.
4. Kick off E1 implementation in parallel — E1 stories are already filed (7785-7796) and E2 doesn't start shipping until E1's foundation lands.

## Not done

- No Figma pull for E2-specific designs. E1 used Figma node `877:787` (style guide); E2 would pull per-page designs from the marketing Figma frames when drafting stories. Flagged for PM to request Figma links (home, pillar page exemplar, city lander exemplar) during story decomposition.
- No back-end anchor audit yet — that's the E2-S11 deliverable once E5 architecture is written. The `fulfillmentAnchor` slot in `AntiBrokerClaim` is the pre-wired hook.
- No content drafted. Copy (including the skeptic-first FAQ entries) is a story-level deliverable, not an architectural artifact.
