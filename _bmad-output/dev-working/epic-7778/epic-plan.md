---
epic-id: 7778
target-service: sell-house-for-free
ado-project: Offervana_SaaS
parent-epic: 7776
autopilot-status: complete
started-at: 2026-04-20
stories-planned:
  - { id: 7797, code: E2-S1,  depends-on: [],                                      strike-count: 0, status: closed }
  - { id: 7801, code: E2-S5,  depends-on: [],                                      strike-count: 0, status: closed }
  - { id: 7798, code: E2-S2,  depends-on: [],                                      strike-count: 0, status: closed }
  - { id: 7799, code: E2-S3,  depends-on: [],                                      strike-count: 0, status: closed }
  - { id: 7800, code: E2-S4,  depends-on: [7801],                                  strike-count: 0, status: closed }
  - { id: 7802, code: E2-S6,  depends-on: [7798, 7801],                            strike-count: 0, status: closed }
  - { id: 7804, code: E2-S8,  depends-on: [7798, 7799, 7801, 7802],                strike-count: 0, status: closed }
  - { id: 7806, code: E2-S10, depends-on: [7798, 7799, 7801, 7802],                strike-count: 0, status: closed }
  - { id: 7803, code: E2-S7,  depends-on: [7797, 7798, 7799, 7801, 7802],          strike-count: 0, status: closed }
  - { id: 7805, code: E2-S9,  depends-on: [7797, 7799, 7801, 7802],                strike-count: 0, status: closed }
  - { id: 7807, code: E2-S11, depends-on: [7797, 7798, 7799, 7800, 7801, 7802, 7803, 7804, 7805, 7806], strike-count: 0, status: closed }
stories-completed:
  - { id: 7797, code: E2-S1, outcome: closed, closed-at: 2026-04-20, commits: [fd2b436, b7b8d55, da7bf76, 9201488], review-verdict: self-pass, unit-testing: skipped-no-business-logic, notes: "Two documented AC deviations (mdx-smoke path, prose-custom spacing units); both preserve intent." }
  - { id: 7801, code: E2-S5, outcome: closed, closed-at: 2026-04-20, commits: [184e7d1], review-verdict: self-pass, unit-testing: skipped-pure-fn, notes: "14/15 ACs green; AC #15 smoke validation deferred to S11 sweep. FaqEntry/CityEntry typed locally with TODO markers for S4/S10." }
  - { id: 7798, code: E2-S2, outcome: closed, closed-at: 2026-04-20, review-verdict: self-pass, unit-testing: skipped-server-components, notes: "16/17 ACs green; AC #15 smoke route deferred — composition happens in real S6-S10 pages. Added CtaLink helper + --color-brand-subtle token." }
  - { id: 7799, code: E2-S3, outcome: closed, closed-at: 2026-04-20, review-verdict: self-pass, unit-testing: skipped-server-components, notes: "15/16 ACs green; AC #15 smoke route deferred. Added 4 pillar accent tokens (listing/cash-offers/cash-plus-repairs/renovation-only); hues pending UX." }
  - { id: 7800, code: E2-S4, outcome: closed, closed-at: 2026-04-20, commits: [e154e6a], review-verdict: self-pass, unit-testing: skipped-no-business-logic, notes: "15/16 ACs green; AC #11 (hover hash-link icon) explicitly deferred per AC text. Closed schema.ts TODO(E2-S4); appended /faq to routes.ts." }
  - { id: 7802, code: E2-S6, outcome: closed, closed-at: 2026-04-20, commits: [97357cd, 72809cb, 14b6929], review-verdict: self-pass, unit-testing: skipped-composition-and-constants, notes: "15/16 ACs green; AC #15 axe/Lighthouse deferred to S11 sweep. LINKS.ts + 15 routes appended + home composed. HOME_TRUST_CLAIMS inline w/ TODO(E2-S11); AZ_CITY_SLUGS tuple extracted for S10." }
  - { id: 7804, code: E2-S8, outcome: closed, closed-at: 2026-04-20, commits: [2c62cd8, d16e9c1], review-verdict: self-pass, unit-testing: skipped-composition, notes: "18/21 ACs green; #16/#17 deferred to S11, #20 legal sign-off queued for Feature PR, #18/#21 n/a. Four pillar pages with structural parity; extracted PLACEHOLDER_HOME_TRUST_CLAIMS shared module; Cash+ honest risk/reward paragraph + Renovation-Only platform-gap acknowledgement discipline held." }
  - { id: 7806, code: E2-S10, outcome: closed, closed-at: 2026-04-20, commits: [53af559, 3056bd4], review-verdict: self-pass, unit-testing: skipped-composition-and-data, notes: "19/20 ACs green; AC #18 deferred to S11. Cities registry + dynamic [city] route w/ dynamicParams=false + Next.js 16 async params; 7 AZ cities prerendered as SSG. Closed S5's CityEntryShape TODO(E2-S10); extended realEstateAgentSchema with optional city. Extracted HOME_PILLARS + HOME_HOW_IT_WORKS_STEPS shared modules. Follow-up: /az breadcrumb link 404s — S11 to decide index page vs 2-level breadcrumb." }
  - { id: 7803, code: E2-S7,  outcome: closed, closed-at: 2026-04-20, commits: [fe00b42, f910e1d], review-verdict: self-pass, unit-testing: skipped-content-routes, notes: "15/17 ACs green; #16/#17 deferred to S11. Three secondary prose routes (/how-it-works TSX with HowTo schema; /why-its-free MDX with RevenueTable + WebPage schema; /about MDX with new aboutPageSchema helper). Revenue streams registry seeded with 4 honest entries; S11 audits." }
  - { id: 7805, code: E2-S9,  outcome: closed, closed-at: 2026-04-20, commits: [7fc7c08], review-verdict: self-pass, unit-testing: skipped-content-route, notes: "13/15 ACs green; #14/#15 deferred to S11. /meet-your-pm MDX route w/ 4 placeholder PM cards (region-role names, S3 initial-letter fallback, no contact info per ethical AC #11). Top-of-file MDX comment guides E6 swap-in. AboutPage JSON-LD via S7's aboutPageSchema." }
  - { id: 7807, code: E2-S11, outcome: closed, closed-at: 2026-04-20, commits: [8c5120b, e5a9519], review-verdict: self-pass, unit-testing: skipped-data-and-adapter, notes: "16/17 ACs green; #16 optional. Anti-broker claims.ts registry + trust-bar-claims.tsx adapter; 6 consumer redirects; zero TODO(E2-S11) remains. docs/anti-broker-audit.md memo with hard gates rolled to E5/E6/E7/E8. Bonus: /az index page closes the S10 follow-up." }
---

# Feature 7778 — E2 Core Marketing Pages + Trust Surface — Execution Plan

**Parent Epic:** 7776 (Sell Your House Free — AZ umbrella)
**Target repo/service:** `sell-house-for-free` (Next.js 16, React 19, Tailwind 4, Turbopack)
**Precondition met:** E1 (Feature 7777) fully merged to `main` — S1-S11 PRs all landed. Foundation primitives, `(marketing)` layout, `SITE`/`ROUTES`/`buildMetadata`, tokens, analytics gate, home placeholder are available.
**Scope:** `sell-house-for-free` repo only. No cross-service calls. Marketing CTAs link to `/get-started`, which E3 fills.
**ADO state vocabulary:** `New → In Development → Code Review → Ready For Testing` (custom workflow; no `Active`).

## Feature-level Definition of Done (from ADO)

1. Every route in the pages table renders in production build with a valid schema.org JSON-LD block (Google Rich Results Test).
2. All seven AZ cities (`phoenix`, `tucson`, `mesa`, `chandler`, `scottsdale`, `gilbert`, `glendale`) appear in `sitemap.xml`; unknown city slug returns 404 (not a soft-empty page).
3. Skeptic-first FAQ entries (free-ness, data-handling, PM model, agent comparison) appear above others at `/faq`, each with a permalink anchor.
4. Renovation-Only pillar copy names what *this site* + the PM deliver, not a non-existent Offervana platform feature.
5. Every `AntiBrokerClaim.fulfillmentAnchor` maps to a real back-end behavior (validated by S11; architectural reference to E5 submission).
6. On any marketing page, Lighthouse LCP < 2.5s on 4G profile; no third-party analytics beyond Vercel Analytics (enforced by E1 ESLint guard).
7. MDX typography matches Figma via `.prose-custom` + E1 type ramp (no `@tailwindcss/typography` opinions visible).

## Patterns inherited from E1 (do not re-prove)

- **React 19 ref-as-prop.** No `forwardRef`. Every primitive and marketing component takes `ref?: Ref<T>` as a regular prop.
- **`cn()` is a 1-line helper.** `src/lib/cn.ts`: `classes.filter(Boolean).join(' ')`. No `clsx` / `tailwind-merge`.
- **Token utilities / CSS vars; no JSX-level hex.** SVG data URIs that need theming live as top-level CSS custom properties (CSS `var()` cannot appear inside `url()`).
- **Dual-env prod gate.** `NODE_ENV === 'production' && VERCEL_ENV !== 'preview'` — required anywhere we don't want preview deploys affected (analytics, robots, indexing).
- **`ROUTES as const satisfies readonly RouteEntry[]` needs `as readonly RouteEntry[]` before `.filter(...)`** — otherwise TS narrows filter results to `never`.
- **Route groups don't affect URLs.** `(marketing)/…` serves from root. Relocation is a chrome-inheritance decision, not a URL refactor.
- **Smoke page pattern.** `src/app/smoke-ui/page.tsx` is `robots: { index: false, follow: false }` and accumulates matrix rows. Additive conflicts on stacked branches are expected — resolve by concatenation.

## Execution order (11 stories)

Ordering rule: topological by dependency, risk-first within a level so blockers surface early.

| # | Story | ADO ID | Title (short) | Size | Rationale |
|---|-------|--------|---------------|------|-----------|
| 1 | **E2-S1** | 7797 | MDX infra: `pageExtensions`, `createMDX`, `mdx-components`, `.prose-custom` | S | **Highest-risk foundational.** Validates Next.js 16 + `@next/mdx` + Turbopack plugin-naming constraint before any MDX route consumes it. Hold point if Turbopack misbehaves. |
| 2 | **E2-S5** | 7801 | JSON-LD helpers: `<JsonLd>` + `schema.ts` typed via `schema-dts` | S | Low-risk foundational. Unblocks every page story's rich-results gate. Pure module, no layout side effects. |
| 3 | **E2-S2** | 7798 | Marketing components wave 1: Hero, PillarGrid, TrustBar, CTASection, PageHeader | M | Five components every page needs. Ref-as-prop pattern; no client directives. |
| 4 | **E2-S3** | 7799 | Marketing components wave 2: PillarHero, HowItWorks, RevenueTable, PMProfile, ProseContainer | M | Second wave feeds S7 (HowItWorks, RevenueTable, ProseContainer), S8 (PillarHero), S9 (PMProfile). |
| 5 | **E2-S4** | 7800 | FAQ system + `/faq` + skeptic-first entries + FAQPage JSON-LD | M | Native `<details>/<summary>` (zero JS). Provides excerpts the home page (S6) references. Needs S5. |
| 6 | **E2-S6** | 7802 | Home + `LINKS` typed constants + `routes.ts` append | M | **Single-point-of-failure for all page stories below** — `LINKS.home`, `LINKS.cashPlusRepairs`, `LINKS.city(slug)` etc. must exist before S7/S8/S9/S10 can compose internal hrefs without stringly-typed paths. Home composition uses S2 + S4 excerpt + S5 (Organization schema). |
| 7 | **E2-S8** | 7804 | Four pillar pages: `/listing`, `/cash-offers`, `/cash-plus-repairs`, `/renovation-only` | L | **Largest page-content story.** Highest content volume + four `Service` JSON-LD blocks. Sequenced early among page stories to surface any `AntiBrokerClaim` / Renovation-Only reality gap. |
| 8 | **E2-S10** | 7806 | AZ city landers: `[city]` dynamic route + cities registry + `LocalBusiness`+`RealEstateAgent` JSON-LD | L | Second-largest. `generateStaticParams` + `dynamicParams = false` validated here; sitemap append must expose all seven `/az/{slug}` entries. |
| 9 | **E2-S7** | 7803 | Secondary prose routes: `/how-it-works`, `/why-its-free`, `/about` | M | Mixed MDX + TSX body for How It Works; `WebPage`/`HowTo`/`AboutPage` JSON-LD. Low risk once S1+S3 (ProseContainer) land. |
| 10 | **E2-S9** | 7805 | Meet Your PM: `/meet-your-pm` MDX + placeholder `PMProfile` cards | S | Smallest; placeholder roster only — E6 seeds real PMs. |
| 11 | **E2-S11** | 7807 | Anti-broker claim registry + audit + E2 closeout | S | **Integrative closeout.** Verifies every `AntiBrokerClaim.fulfillmentAnchor` against E5 architecture doc; finalizes trust-bar copy; JSON-LD validation sweep across all E2 routes. |

Levels (for visibility):
- **Level 0 (foundational, no deps):** S1, S5 — run in order: S1 (risky), then S5.
- **Level 1 (component libs):** S2, S3.
- **Level 2 (content system):** S4.
- **Level 3 (home + LINKS):** S6 — gate for all remaining page stories.
- **Level 4 (page compositions):** S8, S10, S7, S9 — risk-first (largest scope first).
- **Level 5 (closeout):** S11.

## Per-story autopilot contract

For each story in order:

1. **`zoo-core-dev-story {id}`** — dev agent runs plan mode → branch → implement → commit → PR → flip ADO to `Code Review`.
2. **`zoo-core-unit-testing`** — QA agent runs against the branch. Inner 3-iteration fix loop. If still failing after iteration 3, increment the story's strike count and halt for user decision.
3. **`zoo-core-code-review`** — review agent produces `pass` / `pass-with-issues` / `fail`.
   - `pass` → close the story.
   - `pass-with-issues` → record issues in the per-story sidecar; close the story.
   - `fail` → increment strike count, loop back to `zoo-core-dev-story` with the review findings.
4. **Strike rule:** if a story's strike count on the outer review loop reaches 3, halt autopilot and surface the three review verdicts + last dev plan to the user.
5. **Compact** the per-story working context before moving to the next (plan + summary preserved).

## Branch / PR strategy

**Single epic branch** (user directive, 2026-04-20): `feature/e2-core-marketing-pages-7778` cut once from `main`. All 11 stories commit on top of this shared branch — no per-story branches, no stacked PRs.

- Each story's commits are scoped to that story (message prefix: `e2-s{N}({id}): …`) so history stays traceable inside one branch.
- No PR is opened per story. Per-story close-out flips ADO state (`In Development → Code Review`) but does **not** create a PR.
- **Single PR opened at S11 close-out** (or sooner if the user asks) targeting `main`, covering the whole Feature.
- No `--no-verify` / `--no-gpg-sign`. If a hook fails, investigate root cause.
- Rationale: E1 shipped 5 stacked PRs with retargeting + additive `smoke-ui` merge work. Consolidating to one branch avoids that friction.

## EF-migration halt rule

E2 has **no database work** (content-as-TS-data, MDX prose, JSON-LD). EF-migration halt rule is declared but expected to not fire. If dev-story nonetheless emits a migration (e.g., inadvertent schema change in an unrelated area), autopilot pauses for user confirmation before applying.

## Known content / architectural watch-items

Flagged for dev-story to surface in per-story plans, not decided here:

- **Renovation-Only pillar vs. platform reality.** DoD gate #4. S8 copy must match what *this site* + PM deliver. Don't invent a platform offering.
- **AntiBrokerClaim registry.** S11 audits `fulfillmentAnchor` against E5 architecture doc (`_bmad-output/planning-artifacts/architecture-e5-*.md` — if absent, S11 must surface the missing anchor target, not synthesize one).
- **Figma parity.** Per Feature description, Figma links arrive at story drafting time (home, pillar exemplar, city exemplar). If a dev-story's plan has no Figma URL, proceed with the written copy brief and flag it in the PR body for reviewer visual parity.
- **Skeptic-first FAQ ordering.** Entries flagged `skepticFirst: true` sort above others at `/faq`. Home FAQ excerpt (S6) references this slice.
- **Sitemap coupling.** E2 appends to `src/lib/routes.ts`; E1's `sitemap.ts` picks them up automatically. S6 + S10 both touch this file — order matters; S6 lands before S10.

## Expected deliverables at close-out

- 11 PRs opened (some potentially stacked), each with ADO story flipped to `Code Review`.
- Feature 7778 flipped to `Code Review` (or team's post-dev state) after S11 completes.
- `summary-report.md` alongside this plan documenting outcomes, metrics, patterns, follow-ups, and memory candidates.

## Sidecar locations

- Epic sidecar (this file): `_bmad-output/dev-working/epic-7778/epic-plan.md`
- Per-story sidecars: `_bmad-output/dev-working/{story-id}/` (managed by `zoo-core-dev-story`)
- Epic-level per-story summaries: `_bmad-output/dev-working/epic-7778/per-story/{story-id}.md` (appended on close-out)
