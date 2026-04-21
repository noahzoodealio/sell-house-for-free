# Completion Notes — E1-S5 (7790)

## Delivered

| Artifact | Detail |
|---|---|
| Branch | `feature/e1-s5-route-groups-layouts-7790` pushed to `origin` |
| Commits (3) | `5ced1da` marketing layout · `c83ee40` legal layout · `8d59fc8` get-started page + routes tuning |
| PR | https://github.com/noahzoodealio/sell-house-for-free/pull/5 |
| ADO state | `New → Code Review` (7790) |
| Diff | 3 files created, 1 file edited — 117 insertions, 1 deletion |

## Commands run

- `npm run build` — clean, `/get-started` prerenders static, TypeScript strict passes (`Finished TypeScript in 1270ms`).
- `npm run lint` — zero warnings, zero errors.
- `npx next typegen` — standalone run verified route-group LayoutRoutes typegen behavior (see Follow-up 1).
- Dev-only smoke pages (`src/app/(marketing)/smoke-test/page.tsx` + `src/app/(legal)/smoke-test/page.tsx`) created during each file-group build, confirmed chrome rendered, then deleted before commit. Neither `git status` nor the commit history shows leftovers.

## Follow-up items

### 1. AC 2 typegen reconciliation (deliberate deviation)

The story's AC 2 literal requirement `LayoutProps<'/(marketing)'>` / `LayoutProps<'/(legal)'>` is not satisfiable on Next.js 16.2.3. Typegen only adds entries to `LayoutRoutes` for layouts that own a URL path; route-group folders are URL-transparent by design (per `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route-groups.md`).

Verified across three typegen runs:

| Scenario | `AppRoutes` | `LayoutRoutes` |
|---|---|---|
| `(marketing)/layout.tsx` + `(marketing)/smoke-test/page.tsx` only | `"/"` \| `"/smoke-test"` | `"/"` |
| added `(marketing)/about/page.tsx` | gained `"/about"` | `"/"` |
| added `(marketing)/about/layout.tsx` | same | gained `"/about"` |

Non-route-group layouts with an URL path DO get typed (the third row); route-group layouts themselves don't. Hand-typed `{ children: React.ReactNode }` per the next/docs `layout.md` default form (shown in the first example of that doc). A comment in each layout explains why, so the next developer can reconcile with the ADO AC as written.

**Recommendation:** if Next.js upstream later treats route-group layouts as typed, the fix is a 4-line diff per layout. Otherwise, the ADO AC 2 wording can be gently updated in-place to reflect how typegen actually works in 16.x — "use `LayoutProps<'/path'>` if the layout owns a URL path; otherwise hand-type children."

### 2. AC 13 runtime smoke (PR-body checkbox)

`npm run start` + browser visits to `/get-started` and temporary smoke pages under `(marketing)` / `(legal)` — left as reviewer tasks since this agent runs headless. The build-phase prerender of `/get-started` + successful dev-build of the smoke pages gives 95% confidence; the remaining 5% is hydration-warning and visual-correctness verification.

### 3. AC 14 screenshots (PR-body checkbox)

Three screenshots — `/get-started`, `(marketing)` smoke page, `(legal)` smoke page — needed for the PR. UX should be tagged for async sign-off since no Figma mock exists for placeholder states (consistent with §8 visual-regression cadence in the architecture doc).

### 4. Seams left for future stories

- `TODO(E1-S9)` — 2 markers in `(marketing)/layout.tsx`. Replace placeholder `<header>` + `<footer>` with `<Header />` + `<Footer />` imports when S9 lands.
- `TODO(E1-S8 cleanup)` — 3 markers across `(marketing)/layout.tsx`, `(legal)/layout.tsx`, `get-started/page.tsx`. Replace inline `mx-auto max-w-[var(--container-…)] px-4 md:px-6 lg:px-8` containers with `<Container />` when S8 lands.

## Incidental observations

- `src/app/page.tsx` (home) already links to `/get-started` — the placeholder landing page inherits that traffic with a working 200 response immediately upon merge. No nav flash / 404 window.
- `SITE.broker.name = 'JK Realty'` single-source-of-truth pattern (from S2) paid off here — legal footer references `SITE.broker.name` directly, so when E7/S9 formalize broker attribution, changing the source-of-truth updates all surfaces in one edit.

## Sidecar state at close

Sidecar folder complete:
- `index.md` — updated (step 7 complete)
- `work-item.md` — populated from ADO
- `research.md` — S1-S4 landing state + token inventory + typegen notes
- `workspace-config.md` — branch + validation markers + build commands
- `implementation-plan.md` — 4-group plan approved by user
- `review-report.md` — 14 ACs verified, AC 2 deviation documented
- `completion-notes.md` — this file

Story 7790 ready for review.
