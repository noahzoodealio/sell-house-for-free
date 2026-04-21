# Workspace Config — E1-S4 (7788)

## Repo

- **Name:** sell-house-for-free
- **Root:** `C:\Users\Noah\sell-house-for-free`
- **Remote:** `noahzoodealio/sell-house-for-free` (GitHub)
- **Git identity:** `noahzoodealio / noah@zoodealio.com`

## Branch

- **Feature branch:** `feature/e1-s4-global-ux-boundaries-7788`
- **Base:** `main` @ `10f7db7` (S3 merge commit — PR #3)
- **Status:** Created + checked out

## Validation markers

- `package.json` name = `sell-house-for-free` ✓
- `src/app/layout.tsx` exists with `SITE` import + `metadataBase` ✓
- `src/app/globals.css` with S1 `@theme` tokens ✓
- Next 16.2.3 in `package.json` ✓ (`unstable_retry` requires 16.2.0+)
- No pnpm lockfile — use `npm run` (not `pnpm`)

## Target files (all new)

- `src/app/error.tsx`
- `src/app/loading.tsx`
- `src/app/not-found.tsx`

## Build + smoke commands

- Lint: `npm run lint`
- Type + build: `set -a && . .vercel/.env.development.local && set +a && npm run build` (SITE throws at import without NEXT_PUBLIC_SITE_URL)
- Dev: `npm run dev`
- Smoke: `npm run start` (after build)

## Env vars consumed (transitively via root layout)

- `NEXT_PUBLIC_SITE_URL` — required at import time by `@/lib/site`
- `NODE_ENV` — gates `<Analytics />`
- `VERCEL_ENV` — not consumed by S4 directly
