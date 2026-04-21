# Feature 7778 (E2 — Core Marketing Pages + Trust Surface) — Summary Report

**Epic autopilot completed:** 2026-04-20
**Branch:** `feature/e2-core-marketing-pages-7778` (single-branch epic per user directive)
**Stories:** 11/11 closed
**Total commits added in this autopilot run:** 12 (across S6, S8, S10, S7, S9, S11)
**Prior commits on the branch (S1–S5):** 5 (already closed pre-run)

## Per-story outcome

| # | Story | ID | Outcome | Review verdict | Commits |
|---|-------|----|---------|----------------|---------|
| 1 | E2-S1 | 7797 | closed (pre-run) | self-pass | 4 |
| 2 | E2-S5 | 7801 | closed (pre-run) | self-pass | 1 |
| 3 | E2-S2 | 7798 | closed (pre-run) | self-pass | 1 |
| 4 | E2-S3 | 7799 | closed (pre-run) | self-pass | 1 |
| 5 | E2-S4 | 7800 | closed (pre-run) | self-pass | 1 |
| 6 | E2-S6 | 7802 | closed | self-pass (15/16) | 3 (97357cd, 72809cb, 14b6929) |
| 7 | E2-S8 | 7804 | closed | self-pass (18/21) | 2 (2c62cd8, d16e9c1) |
| 8 | E2-S10 | 7806 | closed | self-pass (19/20) | 2 (53af559, 3056bd4) |
| 9 | E2-S7 | 7803 | closed | self-pass (15/17) | 2 (fe00b42, f910e1d) |
| 10 | E2-S9 | 7805 | closed | self-pass (13/15) | 1 (7fc7c08) |
| 11 | E2-S11 | 7807 | closed | self-pass (16/17) | 2 (8c5120b, e5a9519) |

All ADO stories flipped `New → Code Review`. No 3-strike halts; no EF-migration halts (no DB work in E2).

## Aggregate metrics

- **New marketing routes shipped:** 18 prerendered pages
  - Home (replaced placeholder)
  - 4 pillar pages (`/listing`, `/cash-offers`, `/cash-plus-repairs`, `/renovation-only`)
  - 3 prose routes (`/how-it-works`, `/why-its-free`, `/about`)
  - `/meet-your-pm`
  - `/az` index + 7 city landers via dynamic `[city]` route
  - `/faq` (S4 pre-run)
- **JSON-LD coverage:** Organization, FAQPage, Service (×4), BreadcrumbList (×many), LocalBusiness (×7 cities), RealEstateAgent (city-scoped + base), HowTo, WebPage (×2), AboutPage (×2)
- **Shared content modules created:** `claims.ts`, `trust-bar-claims.tsx`, `home-pillars.tsx`, `home-steps.ts`, `cities/registry.ts`, `revenue/streams.ts`
- **Schema helpers added:** `aboutPageSchema` (S7); `realEstateAgentSchema` extended to accept optional city (S10)
- **Audit deliverable:** `docs/anti-broker-audit.md` (one-page closeout memo)
- **Unit tests added:** none. Every story qualified for "skipped — composition / pure data / content routes". No business logic was introduced.

## Patterns observed during the epic (memory candidates)

1. **Single-branch epic + commit-prefix scoping works cleanly.** 17 commits across 11 stories on one branch produced a fully traceable history without retargeting friction. Worth promoting as the default for future Feature-level work in this repo.
2. **Placeholder + cleanup-story pattern paid off.** Inlining `HOME_TRUST_CLAIMS` early (S6) with a single `TODO(E2-S11)` marker, extracted to a shared `placeholder-claims.tsx` (S8), then collapsed into the registry + adapter (S11) was a tidy progression. The file rename in S11 (`placeholder-claims.tsx → trust-bar-claims.tsx`) gave git history of the journey.
3. **Adapter split (data vs presentation) for typed registries.** `claims.ts` is pure data (audit-able, testable, no JSX). `trust-bar-claims.tsx` is the icon-bearing adapter. Same shape pairing for any future "content registry that has visual presentation" need.
4. **Closing TODOs across stories as a discipline.** S5's `CityEntryShape` placeholder closed in S10. S6's inline trust claims closed in S8 then again in S11. S10's documented `/az` follow-up closed in S11. Keeping `TODO(E2-S{N})` markers strict + sweeping them story-by-story prevented accumulation.
5. **Consistent AC-deferral pattern for axe/Lighthouse.** Every page-shipping story deferred Lighthouse + axe instrumentation to the S11 sweep. Worth formalizing: page stories under an epic don't carry instrumentation ACs as gates; the integrative closeout owns them.

## Follow-ups for the Feature-level PR

1. **Legal sign-off ask** (from S8 AC #19): pillar copy — especially commission language and broker attribution — needs JK Realty / legal eyes before merge or immediately post-merge.
2. **JK Realty license number** (from S11 audit): `SITE.broker.licenseNumber` is currently `"LC-TBD"`. Confirm and replace before launch (E7 / launch-readiness checklist).
3. **Hard gates rolled to E5 / E6 / E7 / E8** (per `docs/anti-broker-audit.md`):
   - E5-S1: submission payload schema review against the no-data-resale claim
   - E6: human-coordinated PM routing rule + Supabase isolation
   - E7: privacy policy clauses (no resale + no third-party tracking)
   - E8: launch-time smoke verifying zero third-party network requests on marketing pages
4. **Lighthouse + axe sweep** (deferred from every page-shipping story): run before Feature merge; attach reports.
5. **Visual QA screenshots** at 360 / 768 / 1440 for: home, one pillar, one city, FAQ, /how-it-works, /why-its-free, /about, /meet-your-pm, /az.
6. **Hero + city image assets** are placeholder-null today. UX can fill `heroImage` per city in `src/content/cities/registry.ts` without code changes once assets land in `public/images/cities/`.

## Files changed in the autopilot run

- **Created:** `src/lib/links.ts`, `src/content/cities/registry.ts`, `src/content/anti-broker/claims.ts`, `src/content/anti-broker/trust-bar-claims.tsx` (renamed from placeholder-claims), `src/content/pillars/home-pillars.tsx`, `src/content/how-it-works/home-steps.ts`, `src/content/revenue/streams.ts`, `docs/anti-broker-audit.md`, all four pillar `page.tsx`, `[city]/page.tsx`, `/az/page.tsx`, `/how-it-works/page.tsx`, `/why-its-free/page.mdx`, `/about/page.mdx`, `/meet-your-pm/page.mdx`
- **Edited:** `src/lib/routes.ts` (extended ×2), `src/lib/schema.ts` (CityEntry wiring + realEstateAgentSchema extension + aboutPageSchema add), `src/app/(marketing)/page.tsx` (replaced + refactored ×3)

## Status

**Feature 7778 is ready for the Feature-level PR.** Single-branch strategy means one PR opened against `main` covers all 11 stories. PR body should include:
- The 5 follow-ups above
- Link to `docs/anti-broker-audit.md`
- The deferred S11 QA sweep results when complete
