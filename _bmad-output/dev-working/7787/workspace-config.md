# Workspace config — Story 7787 (E1-S3)

## Repo

- **Path:** `C:\Users\Noah\sell-house-for-free`
- **Service:** `sell-house-for-free` (solo — no cross-repo scope)
- **Remote:** `noahzoodealio/sell-house-for-free` (GitHub)
- **Package manager:** npm (`package-lock.json`)

## Branch

- **Base:** `origin/main` at `2a38c28` (PR #2 merge — E1-S2 foundations)
- **Feature branch:** `feature/e1-s3-file-based-metadata-7787`
- **Created:** 2026-04-20

## Git identity

- `user.name`: `Noah`
- `user.email`: `noah@zoodealio.com`

## Pre-existing working-tree state (carried from S1/S2 baseline — not touched by this story)

- `M .claude/settings.local.json` — local tool allowlist edits; committed as-needed in prior stories
- `M .gitignore` — carries `_bmad-output/dev-working/` ignore rule from prior stories
- `?? _bmad-output/dev-working/` — sidecar state (gitignored)

These were already dirty on `main` before the branch cut; will be addressed at close-out, not treated as story-7787 work.

## Validation

- Next.js 16 docs present at `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/01-metadata/` — all five referenced files exist (`robots.md`, `sitemap.md`, `manifest.md`, `opengraph-image.md`, `app-icons.md`).
- `src/lib/{site,seo,routes}.ts` present (E1-S2 contracts).
- `src/app/{layout,page}.tsx`, `src/app/favicon.ico`, `src/app/globals.css` present. None of the five target files (`robots.ts`, `sitemap.ts`, `manifest.ts`, `opengraph-image.tsx`, `icon.tsx`) exist yet — clean creates.
- `NEXT_PUBLIC_SITE_URL` pulled via `vercel env pull` → `.vercel/.env.development.local` (per prior-run convention).

## Smoke-test plan

After implementation:

1. `npm run lint` — no errors on five new files
2. `npm run build` — build clean; output lists route entries for `/robots.txt`, `/sitemap.xml`, `/manifest.webmanifest`, `/opengraph-image`, `/icon`; no warnings on new files; TS strict passes
3. `npm run start` — fetch each of the five routes, confirm 200 + expected content
4. AC 2 / 3 flip test: relaunch `npm run start` with `VERCEL_ENV=preview` override → `/robots.txt` returns `Disallow: /`
5. `<head>` integration check on `/` → confirm manifest link, icon link, og:image tags, twitter:image tag
