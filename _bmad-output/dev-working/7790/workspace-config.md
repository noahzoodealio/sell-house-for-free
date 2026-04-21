# Workspace Config — E1-S5 (7790)

## Repo

- **Name:** sell-house-for-free
- **Root:** `C:\Users\Noah\sell-house-for-free`
- **Remote:** `noahzoodealio/sell-house-for-free` (GitHub)
- **Git identity:** `noahzoodealio / noah@zoodealio.com`

## Branch

- **Feature branch:** `feature/e1-s5-route-groups-layouts-7790`
- **Base:** `main` @ `dc94d49` (S4 merge commit — PR #4)
- **Status:** To be created after plan approval

## Validation markers

- `package.json` name = `sell-house-for-free` ✓
- `next` 16.2.3 ✓ (typegen emits `LayoutProps` global)
- `src/app/layout.tsx` supplies root fonts + `metadataBase` + title template ✓
- `src/app/globals.css` S1 tokens present ✓
- `src/lib/seo.ts` `buildMetadata` present ✓ (AC 8 prefers this path)
- `src/lib/routes.ts` has `/get-started` entry ✓ (needs priority correction: `0.9 → 0.7` per AC 10)
- No pnpm lockfile — commands use `npm`, not `pnpm`

## Target files

### Create
- `src/app/(marketing)/layout.tsx`
- `src/app/(legal)/layout.tsx`
- `src/app/get-started/page.tsx`

### Edit
- `src/lib/routes.ts` — `/get-started` priority `0.9 → 0.7`

### Dev-only (delete before commit)
- `src/app/(marketing)/__smoke/page.tsx`
- `src/app/(legal)/__smoke/page.tsx`

## Build + smoke commands

- Lint: `npm run lint`
- Build: `npm run build` (auto-loads root `.env.local` per Next 16.2.3 + prior S4 env-pull fix)
- Dev: `npm run dev`
- Smoke: visit `/get-started`, `/__smoke` under each group (delete after)

## Env vars consumed (transitively)

- `NEXT_PUBLIC_SITE_URL` — required by `@/lib/site` (imported via `buildMetadata`)
- `NODE_ENV` — gates `<Analytics />` in root layout (inherited)
