---
work-item-id: 7786
work-item-type: story
parent-epic: 7777
repo: sell-house-for-free
branch: feature/e1-s2-src-lib-foundations-7786
pr: https://github.com/noahzoodealio/sell-house-for-free/pull/2
file-groups:
  - group: 1
    files: [src/lib/site.ts]
    commit: 056ab8a
    status: committed
  - group: 2
    files: [src/lib/seo.ts]
    commit: 30aaf81
    status: committed
  - group: 3
    files: [src/lib/routes.ts]
    commit: 38c2eb8
    status: committed
  - group: 4
    files: [src/app/layout.tsx]
    commit: 9a92e83
    status: committed
    note: "metadataBase reads SITE.url; npm run build smoke-checked both paths"
last-completed-step: 7
last-completed-file-group: 4
ado-state: Code Review
ado-comment-id: 5532012
started-at: 2026-04-20T00:00:00Z
closed-at: 2026-04-20T16:10:34Z
---

# Sidecar — Story 7786 dev-story run

## Status

Closed. All 7 steps complete. PR #2 open against `main`.

## Current repo state (observed)

- Branch: `main` (E1-S1 merged as PR #1 → commit `731232a`)
- Working tree: dirty on `.claude/settings.local.json`, `.gitignore`, untracked `_bmad-output/dev-working/` (sidecar state — gitignored pattern)
- `src/app/layout.tsx`:
  - `metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000")` — direct env read with fallback; AC 7 replaces this
  - Title template + Inter/Open Sans fonts + gated Analytics already in place (from S1)
- `src/lib/` does not exist yet

## Planned file-groups (provisional — confirmed in step 4)

1. **`src/lib/site.ts`** — `SITE` constant + env validation
2. **`src/lib/seo.ts`** — `buildMetadata()` helper
3. **`src/lib/routes.ts`** — `RouteEntry` type + `ROUTES` registry
4. **`src/app/layout.tsx`** — one-line refactor + smoke check (`pnpm lint`, `pnpm build`)

## Notes

- S1's root-layout fallback `?? "http://localhost:3000"` gets removed as part of AC 2 — the whole point of S2 is that unset `NEXT_PUBLIC_SITE_URL` should fail loudly.
- `.env.example` convention: per user memory, env vars come from `vercel env pull` → `.vercel/.env.development.local`; do NOT create `.env.example`.
