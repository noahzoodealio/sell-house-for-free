# Self-review — Story 7792 (E1-S7)

## Method

Per-AC evidence from source inspection, static checks, and `npm run build`.

## AC evidence grid (15 criteria)

| # | AC | Status | Evidence |
|---|----|--------|----------|
| 1 | All four forward `ref` to native element | ✅ | Each file: `ref?: Ref<HTMLInputElement \| HTMLSelectElement \| HTMLTextAreaElement>` prop; passed to native element. Props derive from `ComponentPropsWithoutRef<'…'>` so native attrs spread through. |
| 2 | Checkbox + Radio use native `accent-color`, not a faked check | ✅ | `checkbox.tsx` + `radio.tsx`: `accent-[var(--color-brand)]` on the native input. Zero extra DOM; no SVG check mark; no hidden-input+styled-span. |
| 3 | Checkbox + Radio 20 px box | ✅ | `w-5 h-5` on the native input directly — no wrapper. |
| 4 | Focus-visible ring on Checkbox + Radio matches S6 posture | ✅ | `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand` on both; identical to Button/Input strings in S6. |
| 5 | Select chevron via CSS bg-image + `appearance: none`, chevron color ≈ ink-body | ✅ | `appearance-none bg-no-repeat` + `backgroundImage: var(--chevron-down)` via inline style; SVG stroke hex (`%23212121`) colocated with tokens in `globals.css` `@theme` block. `pr-10` leaves ≈ 40 px for chevron per AC. |
| 6 | Select border, background, focus match Input | ✅ | Base class string matches `input.tsx` except for `appearance-none` + `pl-4 pr-10` (vs `px-4`): `h-12 md:h-[52px]`, `rounded-md border`, `bg-surface text-ink-body`, `font-[var(--font-inter)] text-[16px] leading-[24px]`. Same `ok` / `invalid` splits. |
| 7 | Select has no `placeholder` prop | ✅ | `SelectProps = ComponentPropsWithoutRef<'select'>` — native `<select>` has no `placeholder` attribute, so the type surface doesn't expose one. Consumer uses `<option value="" disabled>Select one…</option>` (demonstrated in smoke page). |
| 8 | Textarea mirrors Input | ✅ | `textarea.tsx` reuses Input's base/ok/invalid class strings verbatim modulo: `min-h-[112px]` instead of `h-12 md:h-[52px]`, `py-3 px-4` instead of `px-4`, and `resize-y`. Default `rows={4}` via default param. |
| 9 | No `'use client'` directive on any of the four | ✅ | `grep -n "use client"` across the four files: no matches. |
| 10 | Token utilities throughout — no hex in JSX | ✅ | `grep -n "#[0-9a-f]\{6\}"` across the four files: zero hits. AC 2 / AC 5 exceptions satisfied via `var(--color-brand)` on `accent-*` and `var(--chevron-down)` on `backgroundImage`. The chevron's embedded hex lives in `globals.css` `@theme`. |
| 11 | Composition with `<Field>` and `<Fieldset>` | ✅ | Smoke page demonstrates `<Field label="…"><Select/></Field>`, `<Field…><Textarea/></Field>`, `<Fieldset legend="Property type">` with shared `name="property-type"` on three Radios. Field's `cloneElement` path works because Select/Textarea are single-element function components whose outermost element is the interactive native control — `id` / `aria-describedby` / `aria-invalid` land on `<select>` / `<textarea>`. |
| 12 | Disabled states | ✅ | All four carry `disabled:cursor-not-allowed disabled:opacity-50`. Smoke page exercises disabled Checkbox, Radio, Select, Textarea. |
| 13 | Accessibility spot check — axe 0 violations | ⏳ reviewer-side | Smoke page `/smoke-ui` renders each primitive inside labeled `<Field>` / `<Fieldset>` with `name` attrs on grouped controls. Flagged in PR test plan. |
| 14 | Build clean + runtime smoke | ✅ | `npm run build` — Next.js 16.2.3 Turbopack "Compiled successfully in 1746ms", "Finished TypeScript in 1606ms", 11/11 static pages generated incl. `/smoke-ui`. No lint/warning output in the four new files. |
| 15 | Visual parity screenshots vs Figma node 877:787 | ⏳ reviewer-side | Smoke page renders all cells; flagged in PR test plan. |

**Summary:** 13 of 15 verified in-branch; 2 reviewer-side manual checks (same posture as S6 close-out).

## Pattern-compliance notes

- **React 19 ref-as-prop.** Every file uses `ref?: Ref<…>` as a regular prop — no `forwardRef` anywhere. Matches S6.
- **No `'use client'`.** Each primitive is Server-Component-safe. Consumers opt into client boundaries themselves.
- **`cn()` helper.** Imported from `@/lib/cn` in all four files.
- **`aria-[invalid=true]` error ring.** Textarea + Select honor it identically to Input. Checkbox + Radio also honor it (border + outline color shift), even though the story doesn't mandate invalid states on box-style controls.
- **Dirty working tree** preserved across commits (`.claude/settings.local.json`, `.gitignore`, `_bmad-output/dev-working/`) per sidecar convention — none touched.

## Risk callouts

- **`accent-[var(--color-brand)]` arbitrary value.** Tailwind v4 accepts CSS variables inside arbitrary values. Build succeeded, so the utility resolved. If a browser were ever to drop `accent-color` support, the fallback is the native system-accent checkbox — still functional.
- **`var(--chevron-down)` via inline `style`.** The background-position and background-size are also inline. Tailwind cannot compose URL arbitrary values from CSS vars (can't put `var()` inside `url()`), so inline style is the cleanest path. This keeps the SVG hex in `globals.css` alongside other tokens.
- **Checkbox / Radio border color during `aria-invalid`.** The native `accent-color` paints the check mark, but the surrounding box border is controlled by our `border-border` / `aria-[invalid=true]:border-[var(--color-error)]` rule. Visually the border shifts to error red while the accent stays brand — matches the story intent (error signals the input, not the brand relationship).

## Files touched

- `src/components/ui/checkbox.tsx` — new (21 lines)
- `src/components/ui/radio.tsx` — new (21 lines)
- `src/components/ui/textarea.tsx` — new (30 lines)
- `src/components/ui/select.tsx` — new (36 lines)
- `src/app/globals.css` — add `--chevron-down` CSS var (4 lines)
- `src/app/smoke-ui/page.tsx` — extend matrix (+122 lines)

Total: 5 new files, 1 extension. 233 lines of delta.

## Verdict

Ready for external review. All 13 in-branch ACs satisfied; 2 reviewer-side manual checks (axe + Figma) flagged in the PR test plan.
