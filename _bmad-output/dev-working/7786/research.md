# Ecosystem research — Story 7786 (E1-S2)

Pulled 2026-04-20 for dev-story run.

## Architecture reference

`_bmad-output/planning-artifacts/architecture-e1-site-foundation.md` — the authoritative design.

- **§3.4** lists the `src/lib/` modules — `site.ts`, `seo.ts`, `routes.ts`, `cn.ts`. Story scopes *only the first three*; `cn.ts` deferred to E1-S6 per out-of-scope.
- **§3.6** declares `NEXT_PUBLIC_SITE_URL` as required (all envs) and consumed by `metadataBase`, sitemap, OG URLs — confirms AC 2's build-time throw.
- **§5 Integration contracts** — `buildMetadata()` is the E2 + E7 extension point; `ROUTES` is what E1-S3's `sitemap.ts` and E1-S9's `<Header />` will filter.
- **§6 Decision 6** — Next.js 16 `PageProps<'/…'>` / `LayoutProps<'/…'>` globals exist; params/searchParams are now `Promise<…>` (not relevant to this story's files, but noted for future).

## Next.js 16 docs (local — `node_modules/next/dist/docs/`)

- `01-app/01-getting-started/14-metadata-and-og-images.md` — static `metadata` object, `Metadata` type export from `next`. Confirms `metadata` + `generateMetadata` are **Server-Component-only** exports; but pure helper modules that *return* a `Metadata` object are safe anywhere.
- `01-app/03-api-reference/03-file-conventions/01-metadata/sitemap.md` — `MetadataRoute.Sitemap` type; `changeFrequency` values `'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'`, `priority` is a number 0–1. AC 6 says type `changeFrequency` as `MetadataRoute.Sitemap[number]['changeFrequency']` — avoids drift.
- `01-app/03-api-reference/04-functions/generate-metadata.md`:
  - §243 `title.template` — parent `layout.tsx` defines template; child passes **bare** `title`. Confirms AC 4's "root layout's template wraps it at render time, `buildMetadata` passes the bare page title".
  - §823 `alternates.canonical` — relative paths get resolved against `metadataBase`. Confirms AC 4's `canonical: path` pattern (no manual absolute URL).
- `01-app/01-getting-started/03-file-conventions/src-folder.md` — `src/` is first-class; `@/*` alias already configured in `tsconfig.json`.

## Current repo state (observed, branch `feature/e1-s2-src-lib-foundations-7786`)

- `src/app/layout.tsx:18-28` — current `metadata` export:
  - `metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000")` — **the thing AC 7 replaces** (drops the `??` fallback because S2's `SITE.url` validation throws loudly instead).
  - `title.template: "%s | Sell Your House Free"` and `title.default: "Sell Your House Free — Arizona"` — already in place, child metadata passes bare titles.
  - `description: "Sell your Arizona home for free — no agent, no listing fees."`
- `src/lib/` does not exist yet.
- `tsconfig.json`: `strict: true`, `moduleResolution: 'bundler'`, `@/*` → `./src/*`.
- `package.json`: `next@16.2.3`, `react@19.2.4` — matches architecture assumptions.

## Patterns to adhere to

- **Zoodealio pattern alignment** — this is a pure TypeScript concern; nothing to pull from the `.NET` / Angular patterns files for the three `src/lib/` modules. Relevant conventions are all Next.js 16 + TypeScript strict.
- **No `"use client"`** on `site.ts`, `seo.ts`, `routes.ts` — they need to be importable from the Metadata API, Server Components, and Route Handlers alike (AC 8).
- **No Node built-ins** (`fs`, `path`, `net`, `http`) — `URL` constructor only (AC 8).
- **`as const satisfies`** is the idiomatic TS pattern for `ROUTES` — preserves literal inference while enforcing the entry shape.

## Pattern risks / watch-outs

- **`"use client"` directive** — must not appear in any of the three new files. `buildMetadata` returns a `Metadata` object; callers import it into `page.tsx` / `layout.tsx` that export `metadata` synchronously. If a Client Component ever needs `SITE.name`, that's fine — the modules are pure and dependency-free.
- **Module-level throw** — AC 2 requires the env validation throws at import time. This means *any* build step that imports `@/lib/site` (dev server start, `pnpm build`, `pnpm lint`) fails without `NEXT_PUBLIC_SITE_URL`. That is the intended behavior. The smoke check for this story should verify both the happy path and the failing path.
- **Vercel CLI env flow** (user memory) — env vars come from `vercel env pull` → `.vercel/.env.development.local`. Do **not** create `.env.example` / `.env.local`. For local dev smoke, either confirm `.vercel/.env.development.local` has `NEXT_PUBLIC_SITE_URL`, or export it inline for the build check.

## Not applicable

- **ATTOM** — no ATTOM touchpoint in this story. `zoo-core-attom-reference` not invoked.
- **Cross-service endpoints / schemas** — story is single-repo (`sell-house-for-free` only). `zoo-core-find-endpoint` / `zoo-core-show-schema` not needed.
