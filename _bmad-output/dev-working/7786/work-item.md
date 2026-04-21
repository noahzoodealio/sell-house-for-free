---
work-item-id: 7786
work-item-type: User Story
title: "E1-S2 — src/lib/ foundations: site config, buildMetadata, routes registry"
state: New
parent-epic-id: 7777
parent-epic-title: "E1 — Site Foundation & Design System"
ado-url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7786
area-path: Offervana_SaaS
iteration-path: Offervana_SaaS
pulled-at: 2026-04-20
---

# Story 7786 — E1-S2 src/lib/ foundations

**Parent:** Feature 7777 — E1 Site Foundation & Design System.
**Story order:** 2 of 11 in E1. **Size:** XS.
**Blocks:** E1-S3 (file-based metadata), E1-S9 (Header nav), every per-page `metadata` export in E2 / E7.
**Depends on:** E1-S1 (already merged as PR #1 → `main`).
**Scope:** `sell-house-for-free` only — 3 new modules under `src/lib/` + one-line touch to `src/app/layout.tsx`.

## User story

As a developer authoring pages in E2, E7, and the file-based metadata files in E1-S3, I want a single `SITE` constant, a `buildMetadata()` helper, and a typed `ROUTES` registry, so that brand facts (URL, name, broker attribution), per-page Open Graph / canonical / Twitter metadata, and sitemap + nav entries all read from one authoritative source instead of being copy-pasted per page.

## Files touched

- `src/lib/site.ts` — create
- `src/lib/seo.ts` — create
- `src/lib/routes.ts` — create
- `src/app/layout.tsx` — one-line refactor: `metadataBase: new URL(SITE.url)` replaces the direct `process.env.NEXT_PUBLIC_SITE_URL` read

## Acceptance criteria (9)

1. **`SITE` shape.** Exposes `{ name: 'Sell Your House Free', shortName: 'SYHF', url, description, locale: 'en_US', region: 'AZ', broker }` where `broker = { name: 'JK Realty', licenseNumber: string, stateOfRecord: 'AZ' }`; declared `as const` so TS narrows each field to its literal type.
2. **`SITE.url` validates at import time.** `NEXT_PUBLIC_SITE_URL` unset or unparseable → clear error thrown (e.g. `Missing or invalid NEXT_PUBLIC_SITE_URL`); `pnpm build` fails loudly rather than silently emitting `undefined`.
3. **`SITE.url` is normalized (no trailing slash).** `NEXT_PUBLIC_SITE_URL="https://sellyourhousefree.com/"` → `SITE.url === "https://sellyourhousefree.com"`.
4. **`buildMetadata` shape.** `buildMetadata({ title: 'About', description: 'X', path: '/about' })` returns Next 16 `Metadata` containing:
   - `title: 'About'` (template wraps to `"About | Sell Your House Free"` at render time)
   - `description: 'X'`
   - `alternates.canonical: '/about'` (resolved against `metadataBase` at render time)
   - `openGraph: { title, description, url: '/about', type: 'website', locale: 'en_US', siteName: 'Sell Your House Free' }`
   - `twitter: { card: 'summary_large_image', title, description }`
5. **Image override behavior.** Explicit `image: '/og/about.png'` → both `openGraph.images` and `twitter.images` include it. `image` omitted → neither key is set (E1-S3's file-based `opengraph-image.tsx` owns the fallback; don't hard-code a default).
6. **`ROUTES` shape.** `RouteEntry = { path; title; showInNav; showInSitemap; changeFrequency?; priority? }` with `changeFrequency` typed from `MetadataRoute.Sitemap[number]['changeFrequency']`. `ROUTES` is a `readonly RouteEntry[]` seeded with `/` and `/get-started`.
7. **Root layout consumes `SITE.url`.** `src/app/layout.tsx` uses `metadataBase: new URL(SITE.url)` imported from `@/lib/site` — not a direct `process.env` read.
8. **Pure modules, safe from RSC or client.** No imports of `fs`, `path`, `net`, `http`, or any Node-only built-in; only non-package dependency is the Web-standard `URL`. No `"use client"`. No module-level side effects beyond the env validation throw.
9. **Build clean.** `pnpm build` with `NEXT_PUBLIC_SITE_URL` set → TS strict passes, no warnings reference the new modules.

## Technical notes

- **`as const` for `SITE`** so `SITE.region === 'AZ'` (literal, not `string`).
- **Env validation pattern:** `const raw = process.env.NEXT_PUBLIC_SITE_URL; if (!raw) throw new Error('Missing NEXT_PUBLIC_SITE_URL'); new URL(raw); // throws TypeError on malformed`. Then `url: raw.replace(/\/$/, '')`. No zod / valibot / `@t3-oss/env-nextjs` for one variable.
- **`buildMetadata` returns `Metadata`**, not a partial; caller writes `export const metadata = buildMetadata(...)`. Root layout's `title.template` wraps the bare title — never pass `"About | Sell Your House Free"`.
- **Canonical URL pattern:** `alternates.canonical: path` (relative). Next resolves against `metadataBase` at render time. Don't build absolute URL manually.
- **Reuse Next types:** `import type { MetadataRoute } from 'next'`; type `changeFrequency` as `MetadataRoute.Sitemap[number]['changeFrequency']`.
- **`ROUTES` export:** `export const ROUTES = [...] as const satisfies readonly RouteEntry[]` — preserves literal inference while enforcing entry shape.
- **Broker license:** placeholder `'LC-TBD'` + `// TODO(E7): confirm AZ license number with JK Realty`.

## Out of scope (deferred)

- File-based metadata (`robots.ts`, `sitemap.ts`, `manifest.ts`, `opengraph-image.tsx`, `icon.tsx`) → E1-S3 (they *consume* `SITE` and `ROUTES`).
- Per-page `metadata` exports via `buildMetadata` → per-page in E2 / E7.
- Header / Footer rendering of `ROUTES` → E1-S9.
- `cn()` className helper — deferred to first primitive story (E1-S6).
- Env schema library (zod / valibot / `@t3-oss/env-nextjs`).
- Route-entry metadata beyond sitemap/nav basics.

## References

- Architecture: `_bmad-output/planning-artifacts/architecture-e1-site-foundation.md` §3.4, §5
- Project plan: `_bmad-output/planning-artifacts/project-plan-sell-house-for-free.md` §4 E1, §7 Q2, §7 Q8
- Next.js 16 docs (check these, not training data): `node_modules/next/dist/docs/01-app/01-getting-started/14-metadata-and-og-images.md`, `.../03-file-conventions/01-metadata/sitemap.md`, `.../03-file-conventions/src-folder.md`

## Prior activity

- 2026-04-16: Story filed as child of Feature 7777. State: `New`. Revision: 1. No comments.
- 2026-04-20: E1-S1 (7785) merged to `main` as PR #1 — current `src/app/layout.tsx` uses `process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"`, which AC 7 replaces with `new URL(SITE.url)`.
