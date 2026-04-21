# Completion notes — Story 7791 (E1-S6)

## Outcome

Shipped. 7 commits, 7 new files, 1 PR.

- Branch: `feature/e1-s6-ui-primitives-button-input-7791`
- PR: https://github.com/noahzoodealio/sell-house-for-free/pull/6

## Deliverables

- `src/app/globals.css` — added `--color-error: #c62828` to `@theme`
- `src/lib/cn.ts` — 1-line class-merge helper
- `src/components/ui/button.tsx` — Button (3 variants × 5 sizes)
- `src/components/ui/input.tsx` — Input with aria-invalid error surface
- `src/components/ui/label.tsx` — Label with required htmlFor (TS-level)
- `src/components/ui/field.tsx` — Field composition wrapper with useId
- `src/components/ui/fieldset.tsx` — Fieldset + legend
- `src/app/smoke-ui/page.tsx` — dev-only matrix page (noindex)

## AC status

16 of 18 verified in-branch; 2 are reviewer-side manual checks (axe-core CLI + Figma visual-parity matrix) flagged in PR test plan. See `review-report.md` for the full evidence grid.

## ADO state flip — queued

MCP `azure-devops` disconnected mid-session. Queued: 7791 `New → Code Review` + close-out comment referencing PR #6.

## Decisions

- **React 19 ref-as-prop, no forwardRef.** Each primitive accepts `ref?: Ref<HTMLButtonElement>` etc. as a regular prop.
- **Plain Record maps for variants/sizes.** No `class-variance-authority`. Button is ~55 lines total.
- **`Children.only` + try/catch** for Field's single-child constraint. Dev-only throw; silent prod fall-through.
- **Smoke folder rename `__smoke-ui` → `smoke-ui`.** Next.js 16 private-folder convention excludes `_`-prefixed dirs from routing. Swapped to `metadata.robots: { index: false, follow: false }` on the page for the noindex guarantee.

## Follow-ups

1. **error.tsx retry button swap** (S4 optional) — trivial post-merge.
2. **Home page `<a>`-styled-as-button → `<Button>`** — E1-S11 scope.
3. **Axe-core automation** — future epic when a test/lint pipeline exists.
4. **Smoke-ui delete-or-keep** — reviewer decision in PR #6. If keep, noindex guard is in place; if delete, one-line removal.

## Memory candidates

- Next.js 16 private-folder rule — folders starting with `_` are excluded from routing. Small footgun; would save cycles next time someone picks an underscore-prefixed test/debug route.

## Pre-existing dirty state (not touched)

- `M .claude/settings.local.json`
- `M .gitignore`

Carry across stories per sidecar convention.
