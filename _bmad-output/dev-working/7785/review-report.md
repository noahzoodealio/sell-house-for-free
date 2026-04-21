# Self-Review Report — Story 7785 (E1-S1 Global scaffolding)

## Verdict

**Code-verifiable ACs (1, 2, 4–6, 8–11): all PASS.**
**Runtime-only ACs (3, 7, 12): DEFERRED to user PR review — require browser inspection / OS dark-mode toggle / Figma screenshot. Code is shaped to satisfy them.**

Build + lint clean on commit `685c2dd`.

## AC-by-AC

### AC 1 — Self-hosted fonts ✓ (code) / deferred (network-tab proof)

`src/app/layout.tsx:2` imports `Inter`, `Open_Sans` from `next/font/google`. Per Next.js 16 fonts doc, `next/font/google` self-hosts by default (`node_modules/next/dist/docs/01-app/01-getting-started/13-fonts.md` line 96: *"Fonts are included stored as static assets and served from the same domain as your deployment, meaning no requests are sent to Google by the browser"*). Network-tab verification is a PR-review step.

### AC 2 — Font roles assigned ✓

`layout.tsx:38` — `className={\`${inter.variable} ${openSans.variable} h-full antialiased\`}` applies both CSS variables to `<html>`.
`globals.css:36-37` — `--font-sans: var(--font-open-sans), ...` and `--font-display: var(--font-inter), ...`.
`globals.css:45-61` — `@layer base` binds `html` to `--font-sans` and all heading levels to `--font-display` + `font-weight: 600`. Body inherits from html.

### AC 3 — Brand tokens resolve (deferred — requires browser)

`globals.css:8` — `--color-brand: #0653ab` → `text-brand` utility
`globals.css:19` — `--color-surface-tint: #fafafa` → `bg-surface-tint` utility
`globals.css:29` — `--radius-lg: 8px` → `rounded-lg` utility
`globals.css:33` — `--shadow-elevated` → `shadow-elevated` utility

All four utilities are exercised in `page.tsx` or are auto-generated from `@theme` tokens. Exact-value verification is a PR-review computed-style inspection.

### AC 4 — Semantic ink + border + surface tokens ✓

`globals.css:12-15` — ink-title/body/muted/disabled = `#17233d / #212121 / #9e9e9e / #bdbdbd` ✓
`globals.css:18-20` — surface/surface-tint/surface-dark = `#ffffff / #fafafa / #1f1f1f` ✓
`globals.css:23-24` — border/border-strong = `#bdbdbd / #0653ab` ✓

All match ADO spec values exactly.

### AC 5 — Radius scale ✓

`globals.css:27-30` — `sm/md/lg/xl` = `4/6/8/12 px` ✓

### AC 6 — Container tokens ✓

`globals.css:40-42` — `--container-prose: 65ch`, `--container-form: 560px`, `--container-page: 1280px` ✓
`page.tsx:6, 9` uses `max-w-[var(--container-prose)]` — arbitrary-value form proven to compile (build succeeds on `685c2dd`).

### AC 7 — Dark mode dropped (deferred — requires OS toggle)

No `@media (prefers-color-scheme: dark)` rule anywhere in `globals.css`. `grep` in `src/` returns zero matches for `prefers-color-scheme`. No dark-mode utility classes in `page.tsx`. OS-toggle verification is a PR-review step.

### AC 8 — Analytics gated ✓

`layout.tsx:42` — `{process.env.NODE_ENV === "production" && <Analytics />}`. `NODE_ENV` is statically replaced at build time so dev-mode renders `false` and DCE keeps `@vercel/analytics` out of the dev bundle. Prod-bundle presence is a PR-review step but architecturally guaranteed.

### AC 9 — `metadataBase` wired ✓

`layout.tsx:19-28`:
- `metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000")` — reads the env var per AC, with a localhost fallback (user confirmed env managed via Vercel; `NEXT_PUBLIC_SITE_URL` not yet in current `vercel env pull`).
- `title.template: "%s | Sell Your House Free"` ✓
- `title.default: "Sell Your House Free — Arizona"` — brand-aligned, non-scaffold string ✓
- `description` is a brand-aligned non-scaffold string ✓

### AC 10 — Arial fallback removed ✓

`globals.css` no longer contains `font-family: Arial`. Body inherits from `html { font-family: var(--font-sans); }` per `@layer base`. Confirmed: `grep` for "Arial" in `src/` returns zero matches.

### AC 11 — Dev + prod clean ✓

- `pnpm lint` — clean (eslint output empty) ✓
- `pnpm build` — clean after the `@source not` fix on `685c2dd`. No font/CSS/metadata warnings. 4 static pages generated. Turbopack compile time 1.5s.
- `pnpm dev` start verification — standard next-dev behavior; no code path changed that would affect dev-server boot. PR review will confirm.

### AC 12 — Visual parity check (deferred — PR attachment)

`page.tsx` renders one H1 (44/80px, Inter Semibold, ink-title `#17233d`), one body paragraph (18/20px, Open Sans, ink-body `#212121`), and one brand-filled "Get started" button (`bg-brand` + `rounded-lg` 8px, Inter Semibold 18px). These are the three surfaces the ADO screenshot acceptance requires. The user-taken side-by-side vs Figma node `877:787` is the PR attachment step.

## Pattern compliance

- **Tailwind v4 tokens in CSS `@theme`** (not `tailwind.config.ts`) ✓
- **`next/font/google` variable usage** ✓ (no per-weight loads — using variable fonts as recommended)
- **Semantic token names** (`--color-ink-title`, not `--color-navy-700`) ✓
- **Type ramp inline at utilities, not as `--text-h1` tokens** ✓
- **Analytics gate uses static `NODE_ENV` check** (not a wrapper) ✓
- **No new runtime deps** — all three files changed; no `package.json` touched ✓

## Deviations from plan

1. **File-group 1 needed a follow-up commit (`685c2dd`)** to add `@source not` exclusions. Tailwind v4 scanned `_bmad-output/` sidecar markdown and picked up literal `max-w-[var(--container-*)]` paraphrases, producing an invalid wildcard CSS rule. Fix is durable — future sidecar docs can't leak into the compiled CSS. Added as a commit, not an amend.
2. **File-group 4 produced no file changes** (per user feedback — env managed via Vercel CLI, no `.env.example`). Layout.tsx gained a `?? "http://localhost:3000"` fallback instead.

## Out-of-scope confirmed

`git diff main..HEAD --stat` shows changes ONLY in:
- `src/app/globals.css`
- `src/app/layout.tsx`
- `src/app/page.tsx`

No E1-S2/S3/S4/S5/S6/S7/S8/S9/S10/S11 territory touched. No `lib/*`, no `api/*`, no route groups, no primitives, no `robots.ts`/`sitemap.ts`/`manifest.ts`/`opengraph-image.tsx`/`icon.tsx`, no `error.tsx`/`loading.tsx`/`not-found.tsx`.

## Follow-ups to flag in completion-notes

1. **Add `NEXT_PUBLIC_SITE_URL` to Vercel env** (prod + preview) before first deploy. Then `vercel env pull` locally.
2. **PR attachments** — screenshots for ACs 1 (network tab), 7 (OS dark-mode), 12 (Figma parity).
3. **E1-S2 refactor** — when `lib/site.ts` lands, replace `process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"` with `SITE.url`.
