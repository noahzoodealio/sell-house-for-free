# Workspace Config — Story 7785

## Repo

- **Service:** `sell-house-for-free` (single-service story — no cross-service touch)
- **Path:** `C:\Users\Noah\sell-house-for-free`
- **Stack:** Next.js 16.2.3 / React 19.2.4 / Tailwind v4 (pinned in `package.json`)
- **Validation markers:** `package.json` with `"next": "16.2.3"`, `src/app/layout.tsx`, `src/app/globals.css`, `tsconfig.json` with `@/*` path alias — all present ✓

## Branch

- **Name:** `feature/e1-s1-global-scaffolding-7785`
- **Base:** `main` @ `ea10e79` ("stories complete")
- **Remote:** `origin` → `github.com/noahzoodealio/sell-house-for-free` (fetched; parity confirmed)
- **Created:** 2026-04-20

## Git identity

Per auto-memory: work account — noahzoodealio / noah@zoodealio.com.

## Package manager

- `pnpm` (scripts in `package.json`: `pnpm dev`, `pnpm build`, `pnpm start`, `pnpm lint`)

## Smoke-check commands

- `pnpm lint` — per-file-group after writes
- `pnpm dev` — final AC-11 dev smoke
- `pnpm build && pnpm start` — final AC-11 prod smoke (optional; `pnpm build` alone catches font/CSS/metadata warnings)
