---
work-item-id: 7785
work-item-type: User Story
title: "E1-S1 — Global scaffolding: root layout, fonts, theme tokens"
state: New
parent-epic-id: 7777
parent-epic-title: "E1 — Site Foundation & Design System"
ado-url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7785
area-path: Offervana_SaaS
iteration-path: Offervana_SaaS
pulled-at: 2026-04-20
---

# Story 7785 — E1-S1 Global scaffolding

## Scope

Three files in `sell-house-for-free` only:

- `src/app/layout.tsx` — rewrite
- `src/app/page.tsx` — trim to minimal shell (final hero is E1-S11)
- `src/app/globals.css` — rewrite `@theme` block with brand tokens

## User story

As a developer building on this repo, I want the `create-next-app` scaffold replaced with the Sell Your House Free foundation — branded fonts, brand-token `@theme`, dark-mode dropped, analytics gated to production — so that every downstream E1 story has the correct typography, color, and structural baseline to build against.

## Acceptance criteria (12)

1. **Self-hosted fonts** — zero requests to `fonts.googleapis.com` / `fonts.gstatic.com`; Inter + Open Sans `woff2` served from app origin via `next/font/google`.
2. **Font roles assigned** — `<html>` className carries `--font-inter` + `--font-open-sans`; body resolves to Open Sans; `h1`–`h6` resolve to Inter at `font-weight: 600`.
3. **Brand tokens resolve** — `class="text-brand bg-surface-tint rounded-lg shadow-elevated"` gives `color: #0653ab`, `background-color: #fafafa`, `border-radius: 8px`, `box-shadow: 0 8px 16px 0 #60617029, 0 2px 4px 0 #28293d0a`.
4. **Semantic ink + border tokens** — `text-ink-{title,body,muted,disabled}` → `#17233d / #212121 / #9e9e9e / #bdbdbd`; `bg-surface{,-dark}` → `#ffffff / #1f1f1f`; `border-border{,-strong}` → `#bdbdbd / #0653ab`.
5. **Radius scale** — `rounded-{sm,md,lg,xl}` = `4 / 6 / 8 / 12px`.
6. **Container tokens** — `--container-prose = 65ch`, `--container-form = 560px`, `--container-page = 1280px` addressable via `max-w-[var(--container-*)]`.
7. **Dark mode dropped** — body stays `#ffffff / #212121` under OS dark mode; no `@media (prefers-color-scheme: dark)` rule.
8. **Analytics gated** — dev: no `@vercel/analytics` script emitted. Prod: script emitted exactly once.
9. **`metadataBase` wired** — `metadataBase = new URL(process.env.NEXT_PUBLIC_SITE_URL)`; title template `"%s | Sell Your House Free"`; brand-aligned default title (not `Create Next App`).
10. **Arial fallback removed** — hardcoded `font-family: Arial, Helvetica, sans-serif` rule on `body` gone; font-family inherits from `--font-sans`.
11. **Dev + prod both clean** — `pnpm dev` and `pnpm build && pnpm start` start without font/CSS/metadata console errors/warnings.
12. **Visual parity check** — PR description includes side-by-side screenshot of (a) rendered H1 + body + brand-filled button vs (b) Figma node `877:787`.

## Technical notes (from ADO)

- Tailwind v4 tokens live in CSS `@theme`, not `tailwind.config.ts`.
- Font loader: `Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" })` + `Open_Sans(...)` at module scope.
- Analytics gate: `{process.env.NODE_ENV === "production" && <Analytics />}` — static build-time replacement.
- Semantic tokens (`--color-ink-title`) not scales.
- Type ramp stays inline in utilities — no `--text-h1` tokens.
- Add `@layer base` block so `html` inherits `--font-sans` and `h1`–`h6` inherit `--font-display` + `color: var(--color-ink-title)` + `font-weight: 600`.

## Out of scope (deferred)

- File-based metadata (`robots.ts`, `sitemap.ts`, `manifest.ts`, OG, icon) → E1-S3
- Error / loading / not-found pages → E1-S4
- Route groups + placeholder layouts → E1-S5
- UI primitives → E1-S6/S7/S8
- Header / Footer → E1-S9
- Analytics policy doc → E1-S10
- Final branded home-page hero → E1-S11
- `lib/site.ts` / `lib/seo.ts` / `lib/routes.ts` → E1-S2
- CSP / Sentry → E8

## References

- Architecture: `_bmad-output/planning-artifacts/architecture-e1-site-foundation.md` §3.1, §4, §6
- Figma: file `vjeoDtWUcnEtJdmZ0b7Okh` node `877:787`
- Plan: `_bmad-output/planning-artifacts/project-plan-sell-house-for-free.md`
- Next.js 16 docs: `node_modules/next/dist/docs/01-app/01-getting-started/{13-fonts.md,11-css.md,14-metadata-and-og-images.md}`

## Prior activity

- 2026-04-16: Story filed as child of Feature 7777. State: `New`. Revision: 1. No comments.
