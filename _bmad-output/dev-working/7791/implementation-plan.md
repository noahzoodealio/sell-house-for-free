---
work-item-id: 7791
branch: feature/e1-s6-ui-primitives-button-input-7791
base-branch: main
ac-count: 18
---

# 7791 implementation plan — E1-S6 primitives

## File-groups (order = commit order)

### Group 1 — foundations (prereqs for the primitives)
- `src/lib/cn.ts` — 1-line `(...classes) => classes.filter(Boolean).join(' ')`
- `src/app/globals.css` — add `--color-error: #c62828` inside `@theme`

### Group 2 — Button
- `src/components/ui/button.tsx`
  - React 19 ref-as-prop (no `forwardRef`)
  - Variants via plain `Record<Variant, string>` map (no CVA)
  - Sizes via plain `Record<Size, string>` map
  - Server-component safe (no `"use client"`)
  - `aria-disabled` when disabled, `cursor-not-allowed`, `opacity-50`
  - Tokens only: `bg-brand`, `text-brand-foreground`, `border-brand`, `text-ink-body`, `bg-surface-tint` (hover/ghost)

### Group 3 — Label
- `src/components/ui/label.tsx`
  - `htmlFor` is a **required** prop (override React's native optional) via intersection type
  - `font-[var(--font-inter)]` semibold 14 / 16

### Group 4 — Input
- `src/components/ui/input.tsx`
  - Token border / focus ring / placeholder
  - Height `h-12 md:h-[52px]` (48 / 52 to match Button md)
  - `aria-invalid` → `border-[var(--color-error)]` + `focus-visible:outline-[var(--color-error)]`

### Group 5 — Field
- `src/components/ui/field.tsx`
  - Uses `React.useId()`
  - Single-child constraint via `React.Children.only` — dev-only throw, silently fall through in prod (`process.env.NODE_ENV !== "production"`)
  - Clones child with `id`, `aria-describedby`, `aria-invalid`
  - Renders `<Label>` → child → help `<p>` (hidden if error present) → error `<p>`
  - Accepts `className` on outer `<div>`

### Group 6 — Fieldset
- `src/components/ui/fieldset.tsx`
  - `<fieldset>` + `<legend>` wrapper
  - Legend typography matches Label (Inter semibold 16)
  - `border-none p-0 m-0` default; consumer can add border via className

### Group 7 — smoke + verify
- `src/app/__smoke-ui/page.tsx` — dev-only matrix page (variants × sizes + Input states + Field states + Fieldset)
- Manual verify: `npm run build`, visit `/`__smoke-ui, capture screenshots for PR AC 18
- Delete or move `__smoke-ui` before final commit (per AC 17)

## Pattern-discipline guards (from story tech notes)

- ❌ No `forwardRef` — use React 19 ref-as-prop
- ❌ No `clsx`, `tailwind-merge`, `class-variance-authority`
- ❌ No Radix, no shadcn/ui, no polymorphic `as` prop
- ❌ No hex literals in className or style (use tokens)
- ❌ No form state library (`react-hook-form`, `formik`, `zod`) imports
- ❌ No `crypto.randomUUID` / `Math.random` for IDs — only `React.useId()`
- ❌ No animation on focus ring — snap on / snap off
- ❌ No `src/components/ui/index.ts` barrel
- ✅ Each primitive ≤ ~80 lines

## Commits (one per file-group)

1. `feat(styles): add --color-error token to @theme`
2. `feat(lib): add cn() class-merge helper`
3. `feat(ui): add Button primitive with variant + size ramp`
4. `feat(ui): add Label primitive with required htmlFor`
5. `feat(ui): add Input primitive with aria-invalid error ring`
6. `feat(ui): add Field composition wrapper with useId wiring`
7. `feat(ui): add Fieldset primitive for grouped controls`
8. `chore(dev): add UI smoke matrix at /__smoke-ui` (delete before merge or keep as matrix-only)

*Groups 1 and 2 may be one commit — trivial files; will decide at write time.*

## AC coverage map

| AC  | Group | Test vector                                                               |
|-----|-------|---------------------------------------------------------------------------|
| 1   | 2-6   | ref forwards on all 4 non-Field primitives; Field accepts `className`     |
| 2   | 2-6   | TS types from `React.ComponentPropsWithoutRef<'button'>` etc.             |
| 3   | 2     | Primary/Secondary/Ghost variant token mapping                             |
| 4   | 2     | Size ramp 42/44/48-52/56/64                                               |
| 5   | 2     | `disabled` + `aria-disabled` + cursor-not-allowed + opacity-50            |
| 6   | 2-6   | `focus-visible:outline-2 outline-brand outline-offset-2` on all           |
| 7   | 4     | Input idle token styling                                                  |
| 8   | 1,4   | `--color-error` token + `aria-invalid` error ring                         |
| 9   | 3     | Label `htmlFor` type-required (override optional)                         |
| 10  | 5     | Field composition DOM + `useId` + `aria-describedby`/`aria-invalid`       |
| 11  | 5     | `React.Children.only` dev-throw                                           |
| 12  | 6     | Fieldset + legend typography                                              |
| 13  | 2-6   | No `"use client"` on any primitive                                        |
| 14  | 2-6   | Grep for hex in new files — zero hits                                     |
| 15  | 2-6   | Grep for `react-hook-form`/`formik`/`zod` — zero hits                     |
| 16  | 7     | `@axe-core/cli` on smoke page — 0 violations                              |
| 17  | 7     | `npm run build` clean + smoke page or matrix                              |
| 18  | 7     | PR screenshot matrix                                                      |

## Out-of-scope reminders (per story)

- Checkbox/Radio/Select/Textarea → S7
- Card/FormStep/Container → S8
- Header/Footer → S9
- Validation, form state → E3
- Storybook, dark mode, animations → future epics
