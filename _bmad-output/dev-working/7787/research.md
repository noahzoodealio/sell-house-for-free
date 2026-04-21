# Research — Story 7787 (E1-S3)

## Ecosystem context

**Single-service story** — `sell-house-for-free` only. No cross-service integration, no ATTOM, no DB, no Zoodealio backend APIs. All work is local to `src/app/` and consumes `src/lib/` contracts from E1-S2.

No `zoo-core-context-search`, `zoo-core-find-endpoint`, `zoo-core-show-schema`, or `zoo-core-attom-reference` needed for this story.

## Repo state

- **Package manager:** npm (`package-lock.json` present). Story writes `pnpm build` — use `npm run build` per project convention (matches E1-S2 completion notes).
- **Stack:** Next.js 16.2.3, React 19.2.4, Tailwind 4, TypeScript strict. Eslint flat config (`eslint.config.mjs`).
- **`src/app/` today:** `layout.tsx`, `page.tsx`, `globals.css`, `favicon.ico` (scaffold).
- **`src/lib/` available contracts (from E1-S2, PR #2 merged):**
  - `SITE` — `{ name, shortName, url (trailing-slash stripped), description, locale, region, broker }`. Import-time throws if `NEXT_PUBLIC_SITE_URL` is unset/invalid.
  - `buildMetadata()` — per-page metadata helper (not used by this story; file conventions auto-wire).
  - `ROUTES` — `readonly RouteEntry[]` with `{ path, title, showInNav, showInSitemap, changeFrequency?, priority? }`. Currently holds `/` and `/get-started`.
- **Root layout:** `metadataBase: new URL(SITE.url)` already set (E1-S2). This is what resolves convention-emitted `og:image` + `icon` URLs to absolute at render time. No `openGraph.images` override present — correct, file convention wins.

## Next.js 16 file conventions — verified against `node_modules/next/dist/docs/`

### `robots.ts`
- Default-export function returning `MetadataRoute.Robots`.
- Cached by default; stays static if it avoids Request-time APIs + dynamic config.
- Shape: `{ rules: { userAgent, allow, disallow }, sitemap }`. `sitemap` is a `string` (single entry is fine).

### `sitemap.ts`
- Default-export returning `MetadataRoute.Sitemap` (array of `{ url, lastModified?, changeFrequency?, priority? }`).
- Cached by default. No async needed.
- `changeFrequency` enum: `'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'` — matches `RouteEntry` type.

### `manifest.ts`
- Default-export returning `MetadataRoute.Manifest`. Served at `/manifest.webmanifest`.
- Root `app/` directory only. Cached by default.

### `opengraph-image.tsx` / `icon.tsx`
- `ImageResponse` from `next/og`. Module-level `export const` for `alt` (OG only), `size`, `contentType`.
- Next 16 automatically emits `<meta property="og:image">`, `og:image:type/width/height/alt`, and reuses for `<meta name="twitter:image">` when no `twitter-image.tsx` exists. Confirmed in `opengraph-image.md`.
- Docs example note: local assets (fonts, logos) via `readFile(join(process.cwd(), ...))` — defer per story tech-note (system sans is V1 acceptable).

### Caching behavior (AC 11)
Per `robots.md` / `sitemap.md` / `manifest.md` / `opengraph-image.md` / `app-icons.md`: all five files are Route Handlers cached by default. Triggers that break static caching: `headers()`, `cookies()`, `draftMode()`, reading `request.url` from props, or `export const dynamic = 'force-dynamic'` / `revalidate = 0`. None of those are required for this story — all five stay static.

## Figma brand reference (node `877:787`)

Style guide page at `vjeoDtWUcnEtJdmZ0b7Okh/877:787` — typography + button system. **Not** a pre-designed OG card; the story calls for a wordmark-only treatment, so we render our own within brand constraints.

**Confirmed brand tokens (from Figma variables + story ACs):**
- Brand blue: `#0653ab` (AC 6, 8, 9 — consistent across manifest theme, OG bg, icon bg).
- White: `#ffffff` / `#fdfdfd` acceptable (AC 8).
- Greyscale palette: `#212121` (900), `#BDBDBD` (400), `#9E9E9E` (500), `#FAFAFA` (50) — not needed for E1-S3.

**Confirmed typography:**
- Headings: **Inter Semibold** (weight 600). Desktop H1 = 80px — matches AC 8 "≥80px" for the OG wordmark.
- Body: **Open Sans**. Not needed for OG/icon.
- Font-loading inside `ImageResponse`: skipped for V1 per story tech-note. Satori's default system sans is close enough to Inter Semibold for an OG card; revisit if AC 8 parity fails.

**Design notes applied:**
- "Sell Your House Free" wordmark → white (`#ffffff`) on brand blue (`#0653ab`). Centered, dominant (~88px for visual weight at 1200×630).
- Icon: brand blue tile, single white glyph. Use "S" capital — matches `shortName: "SYHF"` but a single letter reads better at 32×32. System sans bold, ~24–26px filling the tile.

## Risk map

1. **Indexing gate (AC 2, 3)** — biggest correctness risk per story. Implement the exact condition from tech notes: `VERCEL_ENV === 'production' || (!VERCEL_ENV && NODE_ENV === 'production')`. Unit-smoke by toggling env locally.
2. **URL construction** — use template literal `${SITE.url}${path}`, NOT `new URL(path, SITE.url)`. S2 normalized `SITE.url` trailing-slash-off; `new URL` would drop segments.
3. **`ImageResponse` CSS vars** — hex values must be inline literals. CSS custom properties from `globals.css` don't cascade into Satori-rendered `ImageResponse`.
4. **No `openGraph.images` in root layout** — verified it's absent today. Don't add it; file convention wins.
5. **AC 13 visual parity** — requires `npm run build && npm run start` + curl/browser capture of `/opengraph-image` and `/icon`, plus Figma side-by-sides. User will attach to PR description.

## Package manager / script calls

- Smoke + build: `npm run build && npm run start`
- Lint: `npm run lint`
- Local env: `vercel env pull` already ran per sidecar — `.vercel/.env.development.local` has `NEXT_PUBLIC_SITE_URL`. For AC 2 smoke, shell-set `VERCEL_ENV=preview` before `npm run start` to confirm `/robots.txt` flips.

## Open questions (none blocking)

- AC 13 screenshots require Figma reference captures for OG + icon. The style-guide node is a typography/button sheet rather than a brand-card comp — the "Figma reference" for the OG side-by-side is the wordmark treatment in Inter Semibold on brand blue, which this implementation reproduces directly. User can snip the relevant corner of the style guide for the PR; no blocker for implementation.
