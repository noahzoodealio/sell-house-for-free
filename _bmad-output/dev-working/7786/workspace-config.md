# Workspace config — Story 7786 (E1-S2)

## Target repo

- **Repo:** `sell-house-for-free`
- **Path (local):** `C:\Users\Noah\sell-house-for-free`
- **Remote:** `noahzoodealio/sell-house-for-free` (GitHub — per user memory, code on GitHub, PM on ADO)

## Validation markers

| Marker | Expected | Observed |
|---|---|---|
| `package.json` name | `sell-house-for-free` | ✅ |
| `next` dep | `^16.x` | `16.2.3` ✅ |
| `react` dep | `^19.x` | `19.2.4` ✅ |
| `tailwindcss` dep | `^4.x` | `^4` ✅ |
| `src/app/layout.tsx` exists (E1-S1 merged) | yes | ✅ |
| `src/lib/` directory | absent (this story creates) | ✅ (absent) |
| `tsconfig.json` `strict` | `true` | ✅ |
| `@/*` path alias | `./src/*` | ✅ |

## Branch

- **Base:** `main` (commit `731232a` — merge of PR #1 for E1-S1)
- **Feature branch:** `feature/e1-s2-src-lib-foundations-7786`
- **Status:** created ✅ (`git checkout -b feature/e1-s2-src-lib-foundations-7786`)
- **Naming convention:** matches E1-S1 (`feature/e1-s1-global-scaffolding-7785`).

## Commit convention

Conventional Commits, one per file-group, matching the S1 precedent:
- `feat(lib): add SITE constant with import-time env validation`
- `feat(lib): add buildMetadata helper`
- `feat(lib): add RouteEntry type and ROUTES registry`
- `refactor(layout): read metadataBase from SITE.url`

## Out-of-tree notes

- `.claude/settings.local.json` + `.gitignore` — uncommitted local edits from prior sessions (not this story's concern; leave untouched).
- `_bmad-output/dev-working/` — gitignored sidecar state (per repo `.gitignore`).
