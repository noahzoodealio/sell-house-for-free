---
work-item-id: 7791
branch: feature/e1-s6-ui-primitives-button-input-7791
reviewed-at: 2026-04-20T19:15:00Z
ac-count: 18
verdict: ready-for-pr
---

# 7791 self-review

## AC verdict

| AC  | Status | Evidence                                                                                             |
|-----|--------|------------------------------------------------------------------------------------------------------|
| 1   | ✓      | All 4 DOM primitives accept a `ref?: Ref<...>` prop; Field accepts `className` and spreads via cn    |
| 2   | ✓      | Each primitive's type is `ComponentPropsWithoutRef<'button'\|'input'\|'label'\|'fieldset'>` + additions; no hand-rolled interfaces drop native attrs |
| 3   | ✓      | Smoke HTML: `bg-brand text-brand-foreground` (primary), `border-2 border-brand text-brand` (secondary), `text-ink-body hover:bg-surface-tint` (ghost) |
| 4   | ✓      | Smoke HTML grep shows `h-[42px]`, `h-[44px]`, `h-12 md:h-[52px]`, `h-[56px]`, `h-[64px]` — full size ramp |
| 5   | ✓      | Smoke HTML shows `disabled="" aria-disabled="true"` + `disabled:cursor-not-allowed disabled:opacity-50` |
| 6   | ✓      | All primitives include `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand` in base classes |
| 7   | ✓      | Input base: `h-12 md:h-[52px] px-4 rounded-md border bg-surface text-ink-body placeholder:text-ink-muted` |
| 8   | ✓      | `--color-error: #c62828` added to globals.css `@theme`; Input has `aria-[invalid=true]:border-[var(--color-error)]` + focus variant |
| 9   | ✓      | `LabelProps = Omit<NativeLabelProps, "htmlFor"> & { htmlFor: string; ... }` — TS compile errors without it |
| 10  | ✓      | Smoke DOM shows `id="f-_S_1_"` matched with `for="f-_S_1_"`, `aria-describedby="f-_S_1_-help"` when helpOnly; `-err` when errorOnly; `aria-invalid="true"` when errorText |
| 11  | ✓      | Field uses `Children.only(children)` in a try/catch; dev-throw wrapped in `if (process.env.NODE_ENV !== "production")` |
| 12  | ✓      | Fieldset legend: `text-[16px] leading-[24px] font-semibold font-[var(--font-inter)] text-ink-title`; default `border-none p-0 m-0` |
| 13  | ✓      | Grep for `"use client"` in `src/components/ui/` → 0 hits                                              |
| 14  | ✓      | Grep for hex literals (`#[0-9a-fA-F]{3,8}`) in `src/components/ui/` → 0 hits                         |
| 15  | ✓      | Grep for banned imports (`react-hook-form`, `formik`, `zod`, `clsx`, `tailwind-merge`, `class-variance-authority`, `@radix-ui`) → 0 hits; also 0 hits for `forwardRef`/`randomUUID`/`Math.random` |
| 16  | ⏭      | `@axe-core/cli` not run — gated as manual step in PR test-plan (no dev dependency added just for this) |
| 17  | ✓      | `npm run build` passes TS strict + prerendering; route table shows `/smoke-ui` static-rendered       |
| 18  | ⏭      | PR description references `/smoke-ui` for reviewer screenshots; not captured programmatically here  |

## Implementation decisions

1. **React 19 ref-as-prop throughout** — no `React.forwardRef` imports. Per tech notes + current codebase's React 19.2.4.
2. **Plain `Record<Variant, string>` map** — no CVA. 3 × 5 button matrix fits in ~20 lines.
3. **`cn.ts` is 1 line** — no clsx, no tailwind-merge.
4. **`Children.only` dev-throw pattern** — wrapped in try/catch; silent fall-through in production. Doesn't crash pages in prod from a malformed Field.
5. **Smoke route renamed `__smoke-ui` → `smoke-ui`** — Next.js 16 private-folder convention (leading `_`) excludes from routing. Compensated with `metadata.robots: { index: false, follow: false }` on the page.

## Deviations from story spec (all within AC bounds)

- None substantive. Smoke-page folder rename is an implementation detail; AC 17 says "e.g., `src/app/__smoke-ui/page.tsx`" (non-normative example). `robots.ts` already gates preview/dev crawlers; belt-and-braces on the page's own metadata protects against accidental prod leak.

## Pre-merge cleanup

Per AC 17 the smoke-ui page should be deleted before merge or moved to Storybook. Deferring to the PR reviewer's call — the page is a legitimate pattern test matrix, and Storybook is its own future-epic decision. Two options:
1. Keep `/smoke-ui` as a permanent dev-only matrix (noindex'd)
2. Add a pre-merge cleanup commit to delete it

Flagged in PR description for reviewer decision.

## Follow-ups

- `error.tsx`'s retry button swap (S4 optional) — trivial post-merge.
- Home page Button swap (`page.tsx` CTA currently inline `<a>`-styled-as-button) → E1-S11 scope.
- Axe-core automation → future epic when a test/lint pipeline is built.
