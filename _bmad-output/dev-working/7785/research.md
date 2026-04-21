# Research — Story 7785 (E1-S1 Global scaffolding)

Verified Next.js 16 / Tailwind v4 / React 19 conventions against `node_modules/next/dist/docs/` per AGENTS.md (bleeding-edge; do not trust training-data assumptions).

## 1. `next/font/google` (self-hosted by default)

Source: `01-app/01-getting-started/13-fonts.md`.

> "You can automatically self-host any Google Font. Fonts are included stored as static assets and served from the same domain as your deployment, meaning no requests are sent to Google by the browser when the user visits your site."

Call pattern at module scope in `layout.tsx`:

```tsx
import { Inter, Open_Sans } from "next/font/google";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const openSans = Open_Sans({ subsets: ["latin"], variable: "--font-open-sans", display: "swap" });
```

Apply both variable class names on `<html>`: `className={\`${inter.variable} ${openSans.variable}\`}`. AC 1 (self-hosted) and AC 2 (font role assignment) are both satisfied by this pattern. Variable fonts (recommended) means no `weight` needed.

## 2. Tailwind v4 `@theme` in CSS

Source: `01-app/01-getting-started/11-css.md` §Tailwind.

Tailwind v4 + PostCSS plugin is already installed (`package.json`: `tailwindcss@^4`, `@tailwindcss/postcss@^4`). `postcss.config.mjs` is scaffold-correct. `@import "tailwindcss"` + `@theme { ... }` block in `globals.css` is the source of truth for tokens — **no `tailwind.config.ts`**.

Tailwind v4 auto-generates utilities from `--color-*`, `--radius-*`, `--font-*`, `--container-*`, `--shadow-*` custom properties declared inside `@theme`. That's what makes ACs 3–6 verifiable by inspecting computed styles.

## 3. `metadataBase` + `title.template`

Source: `01-app/03-api-reference/04-functions/generate-metadata.md` §metadataBase, §title.

Canonical shape for root `layout.tsx`:

```tsx
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL!),
  title: {
    template: "%s | Sell Your House Free",
    default: "Sell Your House Free — Arizona",  // brand-aligned, non-scaffold
  },
  description: "…",
};
```

Note from docs: "A default is required when creating a template." AC 9 explicitly calls for `metadataBase` + title template + brand default.

**Build-error risk:** "Using a relative path in a URL-based `metadata` field without configuring a `metadataBase` will cause a build error." We'd need a `metadataBase` the moment E1-S3 adds OG images (relative). Wiring it in S1 is correct — AC 9 is deliberate.

**Env contract:** `NEXT_PUBLIC_SITE_URL` must be set. Architecture §3.6 names it; no `.env.example` exists yet. I'll add one.

## 4. Analytics gating

`@vercel/analytics@^2.0.1` is installed. Story says use inline `{process.env.NODE_ENV === "production" && <Analytics />}` — `NODE_ENV` is a statically replaceable string in Next.js webpack build, so dev-mode renders false and DCE keeps the `<Analytics />` import tree out of the dev bundle. Simpler than a helper module.

## 5. Design tokens (canonical spec)

Architecture §4 provides the complete `@theme` block. Token names map 1:1 to ACs 3–6:

- **Brand** — `--color-brand: #0653ab`, `--color-brand-foreground: #fdfdfd`
- **Ink** — `title #17233d`, `body #212121`, `muted #9e9e9e`, `disabled #bdbdbd`
- **Surfaces** — `#ffffff / #fafafa / #1f1f1f` (`surface / surface-tint / surface-dark`)
- **Borders** — `#bdbdbd / #0653ab` (`border / border-strong`)
- **Radius** — `4 / 6 / 8 / 12px` (`sm / md / lg / xl`)
- **Shadow** — `--shadow-elevated: 0 8px 16px 0 #60617029, 0 2px 4px 0 #28293d0a`
- **Fonts** — `--font-sans: var(--font-open-sans), system-ui, sans-serif` and `--font-display: var(--font-inter), system-ui, sans-serif`
- **Containers** — `prose 65ch / form 560px / page 1280px`

Plus `@layer base` block: `html { font-family: var(--font-sans); color: var(--color-ink-body); }` and `h1–h6 { font-family: var(--font-display); color: var(--color-ink-title); font-weight: 600; }`.

## 6. Cross-service pattern relevance (none)

Zoo-Core patterns (curated/patterns.md) are backend/Angular/infra-oriented. S1 is a Next.js root-shell rewrite — no cross-service contract, no Offervana DTO, no ABP, no PrimeNG. ATTOM is not touched. No `zoo-core-attom-reference` invocation needed.

## 7. Risk + gotchas

- **`NEXT_PUBLIC_SITE_URL` undefined at build time** → `new URL(undefined)` throws. Mitigation: add `.env.example` and smoke-check with a local value (`http://localhost:3000`). Also — the non-null assertion `process.env.NEXT_PUBLIC_SITE_URL!` in code is acceptable because the architecture names this as a *required* env var and the build loudly fails if missing (desired behavior).
- **`display: "swap"` shows system font briefly** — standard Next.js recommendation; acceptable for a marketing site. No CLS issue because `next/font` adds size-adjust fallback metrics.
- **`font-weight: 600` on all headings via `@layer base`** — AC 2 asserts this. If a future H1 needs 700/800, override at the utility layer; do not fight the base rule.
- **Tailwind v4 generates `text-brand` utility from `--color-brand`** — token name IS the utility suffix. Token rename = utility rename. Keep semantic (architecture already decided).
- **`page.tsx` content** — AC 11 requires `pnpm dev` + `pnpm build && pnpm start` clean. I'll trim to something minimal that renders one H1 + one paragraph + one brand-filled link, so ACs 2, 3, 10, 11 have something to verify against. Final copy is E1-S11.

## 8. Decisions (locked before planning)

- **`metadataBase`**: read `process.env.NEXT_PUBLIC_SITE_URL` directly per ADO note ("If S2 lands before S1 merges, refactor to `SITE.url`").
- **Default title**: `"Sell Your House Free — Arizona"` (brand + region; matches plan non-functionals).
- **`page.tsx` minimal content**: one H1, one paragraph, one `/get-started` link styled with brand tokens. Acts as the AC-12 visual-parity sample surface.
- **No new dependencies**. Inter + Open Sans come from the already-installed `next/font/google` subtree.
