---
work-item-id: 7787
work-item-type: story
parent-epic: 7777
repo: sell-house-for-free
branch: feature/e1-s3-file-based-metadata-7787
file-groups:
  - group: 1
    files: [src/app/robots.ts]
    commit: 67482ca
    status: committed
  - group: 2
    files: [src/app/sitemap.ts]
    commit: 7d64fa7
    status: committed
  - group: 3
    files: [src/app/manifest.ts]
    commit: 2c0d533
    status: committed
  - group: 4a
    files: [src/app/icon.tsx]
    commit: e480441
    status: committed
  - group: 4b
    files: [src/app/opengraph-image.tsx]
    commit: f0cb384
    status: committed
pr: https://github.com/noahzoodealio/sell-house-for-free/pull/3
last-completed-step: 7
last-completed-file-group: 4
ado-state: pending-user (MCP disconnected — see completion-notes.md)
closed-at: 2026-04-20T17:15:00Z
started-at: 2026-04-20T16:16:00Z
reconciliation-run:
  at: 2026-04-20T18:45:00Z
  under: /zoo-core-dev-epic autopilot for Feature 7777
  action: re-verified all 13 ACs on main, re-ran `npm run build` (default + VERCEL_ENV=preview), flipped ADO 7787 New → Code Review
---

# Sidecar — Story 7787 (E1-S3) dev-story run

## Status

Step 1 complete — work item loaded. Awaiting user confirmation before proceeding to step 2 (research).

## Observed repo state

- Branch: `main` (E1-S2 merged as PR #2 → commit `2a38c28`)
- Working tree: dirty on `.claude/settings.local.json`, `.gitignore`, untracked `_bmad-output/dev-working/` (sidecar)
- `src/lib/` present: `site.ts`, `seo.ts`, `routes.ts` (from S2)
- `src/app/` present: `layout.tsx`, `page.tsx`, `globals.css`, `favicon.ico` (scaffold). None of the five target files exist yet.

## Provisional file-groups (confirmed in step 4)

1. **`src/app/robots.ts`** — env-aware robots, VERCEL_ENV gate
2. **`src/app/sitemap.ts`** — reads ROUTES + SITE, BUILT_AT constant
3. **`src/app/manifest.ts`** — PWA manifest, brand theme
4. **`src/app/icon.tsx`** — 32×32 brand-blue monogram tile
5. **`src/app/opengraph-image.tsx`** — 1200×630 brand card

Groups 4 and 5 may merge into one (both are ImageResponse siblings — tiny files, same lint+build pass). Revisit in step 4.

## Notes

- Next.js 16 file conventions — must read `node_modules/next/dist/docs/` before implementing per AGENTS.md.
- No `src/lib/` additions — this story consumes S2 contracts only.
- No EF migrations in this story; no DB; compaction gate between file-groups is simple (re-read sidecar + plan).
