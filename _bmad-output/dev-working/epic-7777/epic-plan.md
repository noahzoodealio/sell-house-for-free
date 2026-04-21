---
feature-id: 7777
feature-url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7777
parent-epic-id: 7776
target-service: sell-house-for-free
stories-planned:
  - { id: 7787, slug: e1-s3-file-based-metadata,         depends-on: [7786],       strike-count: 0, status: pending }
  - { id: 7791, slug: e1-s6-primitives-button-input,     depends-on: [7785, 7786], strike-count: 0, status: pending }
  - { id: 7792, slug: e1-s7-primitives-checkbox-radio,   depends-on: [7791],       strike-count: 0, status: pending }
  - { id: 7793, slug: e1-s8-primitives-card-formstep,    depends-on: [7785],       strike-count: 0, status: pending }
  - { id: 7794, slug: e1-s9-layout-chrome-header-footer, depends-on: [7791, 7793], strike-count: 0, status: pending }
  - { id: 7795, slug: e1-s10-analytics-gating-policy,    depends-on: [7785],       strike-count: 0, status: pending }
  - { id: 7796, slug: e1-s11-placeholder-home-page,      depends-on: [7791, 7794], strike-count: 0, status: pending }
stories-completed:
  - { id: 7787, outcome: already-implemented-re-verified, closed-at: 2026-04-20T18:58:40Z, ado-state: "Code Review", notes: "PR #3 merged pre-autopilot; all 13 ACs re-verified incl. VERCEL_ENV=preview flip" }
  - { id: 7791, outcome: shipped-new, closed-at: 2026-04-20T19:25:00Z, pr: 6, ado-state: "Code Review", notes: "7 commits; PR #6 merged; ADO state flipped + close-out comment posted on resume after terminal freeze" }
  - { id: 7792, outcome: shipped-new, closed-at: 2026-04-20T19:34:40Z, pr: 7, ado-state: "Code Review", notes: "3 commits; 13/15 ACs in-branch; 2 reviewer-side manual checks (axe, Figma). --chevron-down CSS var added to globals.css for Select chevron." }
  - { id: 7793, outcome: shipped-new, closed-at: 2026-04-20T19:38:12Z, pr: 8, ado-state: "Code Review", notes: "2 commits; 15/16 ACs in-branch; 1 reviewer-side check (Figma). Container/Card/FormStep; branch cut from main pre-PR-7, so smoke-ui merge conflict expected." }
  - { id: 7794, outcome: shipped-new, closed-at: 2026-04-20T19:55:48Z, pr: 9, ado-state: "Code Review", notes: "3 commits (incl. TS-narrowing fix); 17/17 ACs in-branch; 1 reviewer-side check (Figma). Header/Footer/skip-link/marketing-layout swap. PR stacked on #8 (Container dep)." }
  - { id: 7795, outcome: shipped-new, closed-at: 2026-04-20T19:58:39Z, pr: 10, ado-state: "Code Review", notes: "1 commit; 12/12 ACs addressed. Analytics gate hardened to dual-env (NODE_ENV + VERCEL_ENV). docs/analytics-policy.md + AGENTS.md pointer + ESLint no-restricted-imports guard." }
  - { id: 7796, outcome: shipped-new, closed-at: 2026-04-20T20:01:04Z, pr: 11, ado-state: "Code Review", notes: "1 commit; 17/17 ACs in-branch. Home relocated to (marketing)/page.tsx; title.absolute pattern on home only. Lighthouse/axe reviewer-side on live preview. PR stacked on #9." }
ado-flips-pending: []
autopilot-status: complete
completed-at: 2026-04-20T20:01:04Z
pr-stack-note: "PRs 7 + 8 cut from main; PR 9 will stack on S8 branch (needs Container); PR 10 independent; PR 11 will stack on S9 branch (needs chrome)."
stories-already-closed:
  - { id: 7785, slug: e1-s1-global-scaffolding,       state: "Code Review" }
  - { id: 7786, slug: e1-s2-lib-foundations,          state: "Code Review" }
  - { id: 7788, slug: e1-s4-global-ux-boundaries,     state: "Code Review" }
  - { id: 7790, slug: e1-s5-route-groups-layouts,     state: "Code Review" }
autopilot-status: running
started-at: 2026-04-20T00:00:00Z
---

# Feature 7777 — E1 Site Foundation & Design System — Dev Autopilot Plan

## Orchestration target

ADO **Feature** 7777 (`E1 — Site Foundation & Design System`), child of umbrella Epic 7776. `/zoo-core-dev-epic` is being applied at the Feature level so its 7 remaining child User Stories can be chained through `dev-story → unit-testing → code-review` end-to-end.

## State on entry

4 of 11 child stories already closed out to `Code Review` (S1, S2, S4, S5) with PRs merged to `main`. Remaining 7 are in `New`. Only these 7 are in scope for this autopilot run.

## Dependency analysis

Explicit links in ADO are hierarchy-only (parent Feature 7777). Dependencies below are inferred from story descriptions + architecture doc `architecture-e1-site-foundation.md` §3–§8:

| Story | Depends on (hard)            | Notes                                                                 |
|-------|------------------------------|-----------------------------------------------------------------------|
| S3 7787  | S2 (`SITE`, `ROUTES`, `buildMetadata`) | Reads registry; root-layout `metadataBase` from S1 resolves OG URL. |
| S6 7791  | S1 (tokens), S2 (none direct)          | Base primitives — Button, Input, Label, Field, Fieldset.            |
| S7 7792  | S6 (conventions only)                  | Checkbox, Radio, Select, Textarea — same prop shape as S6.          |
| S8 7793  | S1 (tokens)                            | Card, FormStep, Container — layout primitives, independent of S6/S7.|
| S9 7794  | S6 (Button), S8 (Container)            | Header + Footer; JK Realty attribution content.                     |
| S10 7795 | S1 (`<Analytics />` gate)              | Env-gating + policy doc; tiny scope.                                |
| S11 7796 | S6 (Button CTA), S9 (chrome)           | Placeholder home page; integrates above.                            |

## Execution order

Topological order, tiebreaker = risk-first so blockers surface early:

1. **7787 — S3 File-based metadata** (M risk: preview-indexing gate is the correctness hotspot; needs `pnpm build` smoke)
2. **7791 — S6 Primitives: Button/Input/Label/Field/Fieldset** (M risk: foundational for S7/S9/S11)
3. **7792 — S7 Primitives: Checkbox/Radio/Select/Textarea** (L-M risk: form-semantics + a11y)
4. **7793 — S8 Primitives: Card/FormStep/Container** (L risk: layout-only)
5. **7794 — S9 Layout chrome: Header + Footer** (L-M risk: JK Realty attribution copy is compliance-adjacent)
6. **7795 — S10 Analytics gating + policy doc** (L risk: mostly doc + a small guard)
7. **7796 — S11 Placeholder home page** (L risk if prior all green; integrates chrome + Button)

Rationale for S3 first: it's unblocked by S2 (done), fits outside the primitives chain, and the preview-indexing gate is the biggest outstanding correctness risk in E1 — surface it before committing to the longer primitives chain.

## Per-story autopilot loop

For each story in order:

1. `zoo-core-dev-story <id>` — dev writes plan, implements, commits on `feature/e1-s{n}-{slug}-{id}` branch, opens PR.
2. `zoo-core-unit-testing` — up to 3 inner iterations; halt outer loop if still red at iteration 3.
3. `zoo-core-code-review` — verdict drives strike counter:
   - `pass` → close story, advance
   - `pass-with-issues` → record, advance
   - `fail` → increment strike, loop back to dev-story for fixes
4. **3-strike halt** on outer review loop per story — surface to user with last 3 verdicts + dev-story plan.
5. **EF migration halt** if dev-story emits Entity Framework migrations — pause for user apply-confirm (safety, not a strike). *Unlikely in E1 — no DB work.*
6. **Compact** between stories: preserve epic-plan.md + per-story summary, discard working ctx, re-enter loop with sidecar as orientation.

## Sidecar layout

```
_bmad-output/dev-working/
├─ epic-7777/
│  ├─ epic-plan.md                  ← this file (source of truth)
│  ├─ per-story/
│  │  ├─ 7787.md                    ← one-page rollup per story
│  │  ├─ 7791.md
│  │  └─ …
│  └─ summary-report.md             ← written at end
└─ {story-id}/                      ← managed by zoo-core-dev-story itself
```

## Branch + PR conventions

Inherited from merged stories (S1/S2/S4/S5 set the precedent):

- Branch: `feature/e1-s{n}-{short-slug}-{ado-id}`
- PR title mirrors story title; body links the ADO story URL
- Commit style: Conventional Commits (`feat(app): …`, `feat(lib): …`, `chore: …`)
- Git identity: `noahzoodealio / noah@zoodealio.com` (per repo memory — not personal account)

## Risk + rollback notes

- Next.js 16 / React 19 / Tailwind 4 is bleeding-edge — each dev-story invocation must cross-check `node_modules/next/dist/docs/` per `AGENTS.md` before coding. Training-data conventions will drift.
- Self-hosted fonts + no third-party analytics SDK is a structural invariant — any dev-story introducing a non-Vercel analytics SDK should fail code-review.
- Tailwind v4 `@theme` lives in `globals.css`; **no** `tailwind.config.ts` expected. Flag if a story tries to reintroduce one.
- ADO state words in use: `New → In Development → Code Review → Ready For Testing` (per memory; `Active` is invalid on this project's custom workflow).

## Success criteria for this autopilot run

- All 7 remaining child stories move from `New` to `Code Review` (matching the close-out state of S1/S2/S4/S5).
- Feature 7777 Definition-of-Done gates listed in its description are satisfied end-to-end (self-hosted fonts, sitemap/robots env-gated, `buildMetadata()` canonical+OG resolution, a11y focus rings, LCP < 2.5s on placeholder home, no non-Vercel analytics SDK).
- Summary report flags any story that halted for user decision, plus follow-ups bound for curate-memory.
