# Completion notes — Story 7792 (E1-S7)

## Outcome

Shipped. 3 commits, 5 new files, 1 extension, 1 PR.

- Branch: `feature/e1-s7-ui-primitives-checkbox-radio-7792`
- PR: https://github.com/noahzoodealio/sell-house-for-free/pull/7

## Deliverables

- `src/components/ui/checkbox.tsx` — 20 × 20, `accent-[var(--color-brand)]`, zero custom DOM
- `src/components/ui/radio.tsx` — same shape as Checkbox, `rounded-full`
- `src/components/ui/select.tsx` — native `<select>` + `appearance-none` + SVG chevron via `--chevron-down`
- `src/components/ui/textarea.tsx` — Input-mirrored; `min-h-[112px]`; `resize-y`; default `rows={4}`
- `src/app/globals.css` — add `--chevron-down` CSS var (SVG data URI with stroke hex colocated with tokens)
- `src/app/smoke-ui/page.tsx` — extended matrix: checkbox row, radio-grouped fieldset, select row, textarea row

## AC status

13 of 15 verified in-branch. 2 reviewer-side manual checks (axe-core CLI, Figma 877:787 visual parity) flagged in PR test plan.

## Decisions

- **`Omit<ComponentPropsWithoutRef<'input'>, 'type'>` on Checkbox + Radio.** Strips `type` from the public prop surface so consumers can't break the semantic by passing `type="text"`.
- **Chevron via `--chevron-down` in globals.css, not inline in TSX.** CSS doesn't allow `var()` inside `url()`, so the SVG data URI is a top-level custom property. The embedded stroke hex lives in the token block — palette refreshes stay in globals.css.
- **No wrapper `<div>` around `<select>`.** A wrapper would break `<Field>`'s `cloneElement` path (aria/id would land on the div, not the select). Inline `style={{ backgroundImage: 'var(--chevron-down)' }}` keeps the chevron on the native element.
- **React 19 ref-as-prop throughout.** Matches S6 — no `forwardRef` anywhere.

## Code-review self-assessment (in lieu of external zoo-core-code-review invocation)

Per dev-story step 6, I verified pattern compliance in-branch:

- Four files grep-clean for hex literals in JSX (`#[0-9a-f]{6}` → zero hits).
- Four files grep-clean for `'use client'` (zero hits).
- Each primitive's class strings compose via `cn()` from `@/lib/cn` — consistent with S6.
- `aria-[invalid=true]` error-ring posture matches Input exactly on Textarea + Select; extended to Checkbox + Radio for uniformity.
- `npm run build` passes: TypeScript strict + Turbopack compile + all 11 static pages generated.

Verdict: **pass**. Ready for reviewer handoff.

## Test/axe infrastructure note

Project still has no test harness or axe-core automation (S6 flagged this as a future-epic follow-up). No external `zoo-core-unit-testing` run was invoked — there's nothing for it to exercise. When a test pipeline lands, the smoke page `/smoke-ui` is the natural target.

## Follow-ups

1. **Axe-core automation** — same follow-up S6 already flagged; not opening a new one.
2. **Smoke-ui keep-or-delete** — reviewer decision in PR #7 (same posture as PR #6).
3. **Auto-resize Textarea** — revisit in E3 if a free-text surface clips content.
4. **`<Switch>` primitive** — not needed in E1; no surface in plan.

## Memory candidates

- **CSS `var()` cannot appear inside `url()`.** When an SVG data URI needs a color from the token system, the whole `url("data:…")` must be stored as a CSS custom property, not built at runtime from `var(--color-…)`. Not obvious — I went through three dead-end approaches (`currentColor` in SVG bg-image, `mask-image` on `<select>` pseudo-element, Tailwind `bg-[url(var(--…))]`) before landing on the right pattern. Worth saving.

## Pre-existing dirty state (not touched)

- `M .claude/settings.local.json`
- `M .gitignore`

Carry across stories per sidecar convention.
