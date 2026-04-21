# Work Item 7787 — E1-S3

**Title:** E1-S3 — File-based metadata: robots, sitemap, manifest, OG image, icon
**Type:** User Story | **State:** New | **Priority:** 2 | **Size:** S
**Parent:** Feature 7777 — E1 Site Foundation & Design System (story 3 of 11)
**URL:** https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7787
**Area / Iteration:** Offervana_SaaS
**Created:** 2026-04-16 by Noah Neighbors

## Dependencies

- **Hard dep:** E1-S2 (7786) — reads `SITE` + `ROUTES` registry from `src/lib/`. Already merged (PR #2).
- **Soft dep:** E1-S1 (7785) — root layout's `metadataBase` resolves convention-emitted `og:image` to absolute URL.
- **Blocks:** E8 launch gate (prod indexing posture); enables E2 / E7 pages to inherit sitemap + OG defaults.
- **Scope:** `sell-house-for-free` only — five new files in `src/app/`.

## User Story

As a developer shipping the Sell Your House Free site to production, I want `robots.ts`, `sitemap.ts`, `manifest.ts`, `opengraph-image.tsx`, and `icon.tsx` wired via Next.js 16 file conventions — with production indexing gated on `VERCEL_ENV` and OG / manifest values sourced from `SITE` + `ROUTES` — so that search engines index only the production host (never preview), every page inherits a brand-correct OG card and installable PWA manifest for free, and E2 / E7 pages don't need per-page OG or sitemap boilerplate.

## Files Touched (all creates)

- `src/app/robots.ts`
- `src/app/sitemap.ts`
- `src/app/manifest.ts`
- `src/app/opengraph-image.tsx`
- `src/app/icon.tsx`

Not touched: `src/app/favicon.ico` (scaffold stays); `src/app/layout.tsx` (convention wins automatically — no override).

## Acceptance Criteria (13)

1. **`robots.ts` returns `MetadataRoute.Robots`** — absolute `sitemap: ${SITE.url}/sitemap.xml`, single entry.
2. **Production allows, every other env disallows** — `VERCEL_ENV === 'production'` → `Allow: /`; anything else → `Disallow: /`. **Single biggest correctness risk.**
3. **`NODE_ENV` is not the indexing gate** — key off `VERCEL_ENV` primarily; `NODE_ENV === 'production'` only as fallback when `VERCEL_ENV` is undefined. Vercel preview runs `NODE_ENV=production`, so keying off `NODE_ENV` alone would leak indexing to preview.
4. **`sitemap.ts` reads `ROUTES`** — `/` and `/get-started` present with absolute URLs; `showInSitemap: false` entries excluded; no hard-coded URLs.
5. **Sitemap entry shape** — `lastModified` ISO date from module-scope `BUILT_AT`; `changeFrequency` / `priority` from `RouteEntry` when present.
6. **`manifest.ts` shape** — `name/short_name/description` from `SITE`; `start_url: '/'`; `display: 'standalone'`; `background_color: '#ffffff'`; `theme_color: '#0653ab'`; icons includes `/favicon.ico` (any, image/x-icon) and `/icon` (32x32, image/png).
7. **`opengraph-image.tsx` emits 1200×630 PNG** — `Content-Type: image/png`, exact dims, <8 MB. Module exports `alt` (non-empty brand-worded string), `size = { width: 1200, height: 630 }`, `contentType = 'image/png'`.
8. **OG image brand-correct** — bg `#0653ab`, wordmark "Sell Your House Free" in white (`#fdfdfd` or `#ffffff`) ≥80px. Inline hex (no CSS vars — `ImageResponse` doesn't resolve them).
9. **`icon.tsx` emits 32×32 PNG** — `size = { width: 32, height: 32 }`, `contentType = 'image/png'`. Brand-blue tile, white monogram glyph filling most of the tile.
10. **`<head>` integration** — `<link rel="manifest" href="/manifest.webmanifest">`, `<link rel="icon" href="/icon?…" type="image/png" sizes="32x32">` alongside the scaffold favicon link, `<meta property="og:image" …>` absolute URL with type/width/height/alt companions, `<meta name="twitter:image" …>` reusing opengraph-image (Next 16 default).
11. **No Request-time APIs** — no `headers()`/`cookies()`/`draftMode()`/`request.url`; no `export const dynamic = 'force-dynamic'` or `revalidate = 0`. All five stay statically cached.
12. **Build clean** — `pnpm build` output has route entries for `/robots.txt`, `/sitemap.xml`, `/manifest.webmanifest`, `/opengraph-image`, `/icon`; no warnings; TypeScript strict passes; each route returns 200 under `pnpm start`.
13. **Visual parity check** — PR description includes side-by-side screenshots: (a) `/opengraph-image` vs Figma brand-card reference, (b) `/icon` vs Figma favicon/app-mark reference.

## Technical Notes (from story)

- **Env gate:** `const isProd = process.env.VERCEL_ENV === 'production' || (!process.env.VERCEL_ENV && process.env.NODE_ENV === 'production');`
- **`sitemap.ts` pure + static** — no async, no I/O; `BUILT_AT = new Date()` at module scope keeps XML byte-identical across requests.
- **`manifest.ts` icons** — point at `/favicon.ico` AND `/icon`; never at `/opengraph-image` (wrong aspect).
- **`ImageResponse`** — uses `next/og`; hard-code hex values; system sans for V1 (defer Inter loading until parity forces it).
- **No `openGraph.images` override in layout** — file convention wins automatically.
- **Twitter image reuse** — omit `twitter-image.tsx`; Next 16 reuses `opengraph-image`.
- **URL construction** — template literal `${SITE.url}${path}` (S2 normalized trailing slash off). Do NOT use `new URL(path, SITE.url).toString()` — drops last segment without trailing slash on base.
- **Alt text** — module-level `export const alt` string, not sidecar `.alt.txt`.

## Out of Scope

`favicon.ico` replacement · `apple-icon.tsx` · `twitter-image.tsx` (Next reuses OG) · per-crawler rules (`GPTBot`/`CCBot` — defer to E8) · per-page OG overrides · custom font loading in `ImageResponse` · `generateSitemaps` · CSP/security headers/Sentry (E8).

## References

- Architecture: `_bmad-output/planning-artifacts/architecture-e1-site-foundation.md` §3.1, §4, §6 (decision #5), §8 row E1-S3
- Project plan: `_bmad-output/planning-artifacts/project-plan-sell-house-for-free.md` §4 E1, §3 non-functionals
- Siblings: 7785 (E1-S1), 7786 (E1-S2)
- Next.js 16 docs (check, don't assume): `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/01-metadata/{robots,sitemap,manifest,opengraph-image,app-icons}.md`; `01-getting-started/14-metadata-and-og-images.md`; `03-api-reference/03-functions/image-response.md`
- Design reference: Figma `vjeoDtWUcnEtJdmZ0b7Okh`, node `877:787` — brand hex `#0653ab`, wordmark treatment

## Notes

Next.js 16 / React 19 / Tailwind 4 is intentionally bleeding-edge — confirm every convention against `node_modules/next/dist/docs/` per `AGENTS.md` rather than training-data assumptions.
