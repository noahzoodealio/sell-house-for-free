# Completion Notes — E1-S4 (7788)

## Delivered

- **PR #4** → https://github.com/noahzoodealio/sell-house-for-free/pull/4
- **Branch:** `feature/e1-s4-global-ux-boundaries-7788`
- **Commits:** `d604eeb` (error) → `a0afe89` (not-found) → `7f1613b` (loading)
- **Diff:** 3 files, +94 lines, 0 deletions
- **ADO 7788:** moved New → Code Review; PR link + AC summary posted as comment

## AC coverage

12/14 mechanically satisfied. The remaining two are PR-body handoffs:

- **AC 13 — runtime smoke:** `npm run lint` + `npm run build` clean; user-confirmed local dev renders the three surfaces. Reviewer should validate `/does-not-exist` 404+noindex, suspense fallback, and thrown-error retry flow via the Test plan checklist in the PR body.
- **AC 14 — screenshots:** no Figma mocks exist for these three states. PR body tags UX for async sign-off; screenshots TBD before merge.

## Follow-up items surfaced during the story

### 1. Env workflow correction (landed, but worth calling out)

**Problem:** `npm run dev` threw `Missing NEXT_PUBLIC_SITE_URL` mid-implementation because prior runs used bare `vercel pull`, which writes to `.vercel/.env.development.local` — a path Next.js never reads.

**Resolution:** pulled via the canonical `vercel env pull .env.local --environment=development --yes`. Root `.env.local` is now auto-loaded by both `npm run dev` and `npm run build`. The previous `set -a && . .vercel/... && set +a` workaround is obsolete.

**Memory updates landed:**
- `feedback_env_vercel.md` — canonical pull command + "do NOT use bare `vercel pull`" rule
- `feedback_build_env_sourcing.md` — sourcing workaround deprecated
- `MEMORY.md` index — both entries re-described

**Not touched:** the old `.vercel/.env.development.local` file still exists on disk (git-ignored, harmless). Left for the user to delete if desired.

### 2. `.gitignore` side-effects (informational)

`vercel env pull` appended two redundant rules to `.gitignore` (`.vercel` and `.env*.local`), both already covered by existing entries on lines 34 + 37. No cleanup done — harmless, would noise the diff. Existing `M .gitignore` in working tree is pre-existing.

### 3. UX sign-off outstanding

PR body calls out the absence of Figma mocks for error / 404 / loading states. Someone (likely the UX designer on the team) needs to:
- Confirm current visual is acceptable for launch, OR
- Provide mocks for a later polish pass (could be its own XS story if visual enrichment is desired)

## Next up in E1

Remaining E1 stories per Epic 7777 decomposition (`_bmad-output/planning-artifacts/project-plan-sell-house-for-free.md` §4 E1):

- **E1-S5** — Route groups + placeholder layouts `(marketing)`, `(legal)`, `get-started` shell (ID: 7790)
- **E1-S6** — UI primitives: Button, Input, Label, Field, Fieldset (ID: 7791)
- **E1-S7** — UI primitives: Checkbox, Radio, Select, Textarea (ID: 7792)
- **E1-S8** — UI primitives: Card, FormStep, Container (ID: 7793)
- **E1-S9** — Layout chrome: Header + Footer (ID: 7794)
- **E1-S10** — Analytics gating + policy note (ID: 7795)
- **E1-S11** — Placeholder home page final copy (ID: 7796)

Once S6 (`<Button>`) ships, a small cleanup story can swap the inline Tailwind button in `error.tsx` + `not-found.tsx` for the primitive (AC 5 explicitly permits the inline approach while S6 is pending).

## Artifacts

- `_bmad-output/dev-working/7788/index.md` — sidecar (step 7 complete)
- `_bmad-output/dev-working/7788/work-item.md` — ADO pull
- `_bmad-output/dev-working/7788/research.md` — Next.js 16 doc findings + S1 token inventory
- `_bmad-output/dev-working/7788/workspace-config.md` — branch + env setup
- `_bmad-output/dev-working/7788/implementation-plan.md` — approved file-group plan
- `_bmad-output/dev-working/7788/review-report.md` — 14-AC walkthrough
- `_bmad-output/dev-working/7788/completion-notes.md` — this file
