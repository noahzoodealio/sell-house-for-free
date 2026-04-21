# Implementation plan — Story 7792 (E1-S7)

Native-wrapper primitives **Checkbox, Radio, Select, Textarea** following S6's shape exactly. All four are "ComponentPropsWithoutRef<'…'> + ref-as-prop + spread + `cn()`" — no form state, no Radix, no custom listbox.

## Ecosystem context (from S6 + S1)

Conventions pinned by merged S6 code:

- **Type pattern:** `import type { ComponentPropsWithoutRef, Ref } from "react"`; `type FooProps = ComponentPropsWithoutRef<'…'> & { ref?: Ref<…>; …variant props }`.
- **Class-merge:** `import { cn } from "@/lib/cn"`; one-line `classes.filter(Boolean).join(" ")` helper.
- **No `'use client'`** on any primitive. Server-Component safe.
- **Focus-visible ring:** `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand`.
- **Error ring:** `aria-[invalid=true]:border-[var(--color-error)] aria-[invalid=true]:focus-visible:outline-[var(--color-error)]`.
- **Disabled:** `disabled:cursor-not-allowed disabled:opacity-50` (Button also adds `disabled:pointer-events-none`).
- **Input baseline:** `h-12 md:h-[52px] px-4 rounded-md border bg-surface text-ink-body placeholder:text-ink-muted font-[var(--font-inter)] text-[16px] leading-[24px]`.
- **Tokens already present in `globals.css`:** `--color-brand`, `--color-border`, `--color-error`, `--color-ink-*`, `--color-surface`, `--radius-md`, `--font-inter`. No token additions needed.

## File groups

### Group 1 — input-like primitives (3 files)

Checkbox, Radio, Textarea share the most surface area with `Input`. Bundle them together to minimize context churn.

**`src/components/ui/checkbox.tsx`**
- Native `<input type="checkbox">`.
- `w-5 h-5` (20 px, AC 3).
- `accent-[var(--color-brand)]` (AC 2 — zero custom DOM).
- `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand rounded-sm`.
- `disabled:cursor-not-allowed disabled:opacity-50`.
- Ref forward to `HTMLInputElement` (AC 1).
- Props: `ComponentPropsWithoutRef<'input'>` (strip `type` from prop surface — set it internally).

**`src/components/ui/radio.tsx`**
- Native `<input type="radio">` — structurally same as Checkbox but with `type="radio"` and `rounded-full`.
- Grouping via native `name` attribute — no `<RadioGroup>` wrapper.

**`src/components/ui/textarea.tsx`**
- Native `<textarea>` — mirrors Input's border/bg/text/focus/error treatment.
- Base: `block w-full min-h-[112px] px-4 py-3 rounded-md border bg-surface text-ink-body placeholder:text-ink-muted font-[var(--font-inter)] text-[16px] leading-[24px] resize-y`.
- No fixed `h-12` — height is `rows`-driven (default `rows={4}`, AC 8).
- Same `ok`/`invalid` splits as Input.
- Ref forward to `HTMLTextAreaElement`.

### Group 2 — Select (more complex: chevron + `appearance: none`)

**`src/components/ui/select.tsx`**
- Native `<select>`.
- `appearance-none` (Tailwind utility) — suppresses native arrow cross-browser (covers `-webkit-appearance` via Tailwind's preset).
- Custom chevron: inline SVG as `background-image` using `currentColor` so the stroke inherits `text-ink-body`. Positioned right 12 px center, no-repeat. Padding-right ≈ 40 px (AC 5).
- Size/border/focus identical to Input (AC 6) — `h-12 md:h-[52px] px-4 pr-10 rounded-md border bg-surface text-ink-body`.
- Same `ok`/`invalid` treatment as Input.
- Ref forward to `HTMLSelectElement`.
- No `placeholder` prop (AC 7 — consumer uses disabled-first-option idiom).

### Group 3 — smoke page extend

**`src/app/smoke-ui/page.tsx`** — extend the existing matrix to cover S7 primitives:
- Row: Checkbox (unchecked / checked / disabled / error)
- Row: Radio group (3 options via `<Fieldset>` + shared `name`)
- Row: Select (idle with placeholder-disabled-first-option / focused-state hint / error)
- Row: Textarea (idle / error with `<Field>` wrapper)
- Keep the page's `metadata.robots: { index: false, follow: false }` guarantee from S6.

### Group 4 — build verify + PR

- `npm run build` — TypeScript strict + Next.js compile (AC 14).
- If clean, push branch + open PR #7 against `main`.
- PR body lists per-AC verification grid + flags the 2 reviewer-side manual checks (axe-core, Figma visual-parity matrix).

## AC verification matrix (pre-flight)

| AC | Verified by | Notes |
|----|-------------|-------|
| 1 — ref forward | type inspection on each file | `ref?: Ref<…>` prop, passed to native element |
| 2 — `accent-color` not faked | Checkbox + Radio source | `accent-[var(--color-brand)]` utility, no extra DOM |
| 3 — 20 px box | Checkbox + Radio source | `w-5 h-5` |
| 4 — focus ring on Checkbox/Radio | source + smoke page tabbing | S6-identical outline |
| 5 — Select chevron via SVG bg-image + `appearance: none` | Select source | `currentColor` stroke, `pr-10` padding |
| 6 — Select border/bg matches Input | source diff vs input.tsx | same `h-12 md:h-[52px]`, `border`, `bg-surface` |
| 7 — no `placeholder` prop | type inspection | `ComponentPropsWithoutRef<'select'>` doesn't add `placeholder` |
| 8 — Textarea mirrors Input | source diff | same border/bg/text/focus/error classes; `resize-y`, default `rows={4}` |
| 9 — no `'use client'` | each file's top line | none present |
| 10 — token utilities only | grep each file for `#` literals | none (except SVG `currentColor`) |
| 11 — `<Field>` / `<Fieldset>` composition | smoke page renders each in both wrappers | ID wiring propagates through Field's `cloneElement` |
| 12 — disabled semantics | source + smoke page | `disabled:cursor-not-allowed disabled:opacity-50` |
| 13 — axe 0 violations | **reviewer-side manual check** | flagged in PR |
| 14 — build clean | `npm run build` | run in group 4 |
| 15 — visual parity matrix | **reviewer-side manual check** | flagged in PR |

## Risks + pre-emptive notes

- **Tailwind `appearance-none`** — Tailwind v4 ships this utility; expands to `appearance: none; -webkit-appearance: none;`. Confirmed in v4 docs but I'll grep generated output if suspicious.
- **Chevron SVG data URI** — use `stroke='currentColor'` so consumer can shift color via `text-*` utility. Caret shape: simple 2-point chevron (< 50 bytes).
- **`accent-[var(--color-brand)]`** — Tailwind v4 arbitrary values with CSS vars are supported. If it fails (unlikely), fall back to `[accent-color:var(--color-brand)]` explicit-property form.
- **Dirty working tree** — `.claude/settings.local.json`, `.gitignore`, `_bmad-output/dev-working/` carry across from prior stories per sidecar convention. Not staged.
