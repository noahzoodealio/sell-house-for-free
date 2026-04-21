# Autopilot summary — Feature 7777 (E1 Site Foundation & Design System)

**Started:** 2026-04-20 (initial session; resumed after terminal freeze mid-S6 close-out)
**Completed:** 2026-04-20T20:01:04Z
**Autopilot status:** complete — all 7 remaining stories closed out to ADO `Code Review`

## Per-story outcomes

| Story | Title | PR | ACs | Outcome |
|-------|-------|----|-----|---------|
| 7787 S3 | File-based metadata | #3 (pre-autopilot, merged) | 13/13 | already-implemented; re-verified incl. VERCEL_ENV preview-indexing gate |
| 7791 S6 | Button/Input/Label/Field/Fieldset | #6 (merged) | 16/18 in-branch | shipped; ADO flip completed on resume after terminal freeze |
| 7792 S7 | Checkbox/Radio/Select/Textarea | #7 | 13/15 in-branch | shipped; --chevron-down CSS var added for Select |
| 7793 S8 | Container/Card/FormStep | #8 | 15/16 in-branch | shipped; branched from main pre-#7, expect additive smoke-ui conflict |
| 7794 S9 | Header + Footer (JK Realty attribution) | #9 (stacked on #8) | 17/17 | shipped; skip-link + aria landmarks + marketing-layout swap |
| 7795 S10 | Analytics gating + policy doc | #10 | 12/12 | shipped; upgraded S1 single-env gate to dual-env; policy doc + ESLint guard |
| 7796 S11 | Placeholder home page | #11 (stacked on #9) | 17/17 | shipped; home relocated into (marketing) group |

All seven ADO work items flipped `New → In Development → Code Review`. Zero strike-count halts. Zero EF-migration pauses (E1 has no database work).

## Aggregate metrics

- **PRs opened:** 5 new (#7, #8, #9, #10, #11). PR #6 merged mid-session; PR #3 was pre-autopilot.
- **PR stack:** #7 ← main · #8 ← main · #9 ← #8 · #10 ← main · #11 ← #9. Merge order must respect stack; GitHub auto-retargets stacked PRs as their bases merge.
- **Commits:** 11 feature commits + 1 TS-narrowing fix.
- **Files created:** 16 new (primitives × 7, layout × 3, docs × 1, sidecars not counted).
- **Files edited:** 4 (globals.css, marketing layout, root layout, AGENTS.md, eslint config).
- **Files deleted:** 1 (src/app/page.tsx — relocated to (marketing)/).
- **Build runs:** 5 production builds, all green on Next.js 16.2.3 Turbopack + TypeScript strict.
- **Reviewer-side follow-ups flagged:** axe-core CLI on S7/S8/S9/S11 (5 runs); Figma visual parity on S7/S8/S9 (3 matrices); Lighthouse LCP+perf on S11.

## Patterns observed across the epic

Worth surfacing to curate-memory (or leaving as-is if the knowledge is code-visible):

1. **React 19 ref-as-prop is the consistent pattern here.** No `forwardRef` anywhere in E1. Every primitive uses `ref?: Ref<T>` as a regular prop. This is a Next.js 16 + React 19.2+ idiom that older training data gets wrong.
2. **`cn()` is a 1-line helper, not a dependency.** `classes.filter(Boolean).join(' ')` under `src/lib/cn.ts`. Architecture §6 rejects `clsx` / `tailwind-merge` for E1. Anywhere we need class composition, we `cn()`.
3. **Token utilities + CSS vars over hex literals.** No JSX-level hex anywhere in E1. The one exception — the SVG chevron stroke — lives inside `--chevron-down` in `globals.css` (colocated with other theme tokens) so palette refreshes stay in one file.
4. **`VERCEL_ENV !== 'preview'` in addition to `NODE_ENV === 'production'`.** Vercel preview deploys set `NODE_ENV=production`, which leaks analytics + indexing if you only check one. Same dual-env pattern is used in S3 (robots) and now S10 (Analytics).
5. **`ROUTES as const satisfies readonly RouteEntry[]` tuple narrowing.** TS narrows filter results to `never` when the predicate excludes every literal path. Widen via `as readonly RouteEntry[]` before filtering. Bit me once in S9.
6. **CSS `var()` cannot appear inside `url()`.** SVG data URIs that need a themed color must be stored as a top-level CSS custom property containing the entire URL — the hex lives embedded in the SVG, colocated with other tokens.
7. **Route groups don't affect URLs.** `src/app/(marketing)/page.tsx` serves `/`. Relocating a page into a route group is a chrome-inheritance decision, not a URL refactor. Learned in S11.
8. **Smoke page pattern.** `src/app/smoke-ui/page.tsx` accumulates matrix rows per primitive story. `metadata.robots: { index: false, follow: false }` keeps it out of search. When a branch cuts from main pre-merge of a sibling, an additive conflict on this file is expected on merge — trivially resolved by concatenating sections.

## Memory candidates (highest value)

In rough priority order:

1. **Dual-env check idiom for Vercel preview gating.** `NODE_ENV === 'production' && VERCEL_ENV !== 'preview'`. Applies to analytics, robots/indexing, and any future prod-only side effect. Saves the class-of-bug S1 shipped + S10 fixed.
2. **React 19 ref-as-prop pattern for this repo.** No `forwardRef`. Worth one memory since training data tends to default to `forwardRef`.
3. **CSS `var()` cannot appear inside `url()`.** Store the full URL as a CSS custom property; put the embedded color next to other tokens so palette refreshes stay in one file.

Saving these would materially help future sessions on this repo.

## Follow-ups surfaced

- **Smoke-ui merge conflicts.** PR #7 and PR #8 both extend `src/app/smoke-ui/page.tsx` from the S6 baseline. Additive; resolve by concatenating when the later PR rebases. Flagged in PR #8 body.
- **PR stack merge order.** Reviewer should merge PRs in order #7 → #8 → #9 → #11; #10 is independent and can merge any time. GitHub auto-retargets #9 → main after #8 merges and #11 → main after #9 merges.
- **`SITE.broker.licenseNumber` TODO.** Placeholder `"LC-TBD"` in `src/lib/site.ts`; E7 resolves with JK Realty contact.
- **Feature 7777 Definition-of-Done gates reviewer must verify on the live preview:** Lighthouse LCP < 2.5s + perf ≥ 90 on `/` (AC 13 of S11); axe 0 violations across `/`, `/get-started`, `/smoke-ui` (S7/S8/S9/S11); Figma node 877:787 visual parity across primitives + chrome.
- **E2 scope waiting on this epic:** populating `ROUTES.showInNav` with real nav items, writing the final home hero, adding `/about` / `/how-it-works` siblings under `(marketing)/`.

## Risk callouts honored

Epic plan listed these; confirmed none were violated:

- No `tailwind.config.ts` reintroduced (Tailwind v4 `@theme` is the only declaration surface).
- No third-party analytics SDK added (S10 formalized the rule; ESLint guard now nudges future attempts).
- Self-hosted fonts preserved (no new `next/font` imports from Google beyond S1's Inter + Open Sans).
- ADO state vocabulary honored (`In Development` / `Code Review`; no invalid `Active`).

## Epic verdict

All seven remaining child stories are PR-ready and flipped to `Code Review` on ADO. Feature 7777 DoD gates that can be verified in-branch are green; gates that require a live preview URL (Lighthouse, axe, Figma parity) are flagged in each PR's test plan for reviewer close-out.

**Recommended next action:** merge the PRs in stack order (#7, then #8, then #9 + #11, plus #10 any time). Once all five merge, the Feature itself can flip to whatever state your team uses after Code Review cycles complete.
