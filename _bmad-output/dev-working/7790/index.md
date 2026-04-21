---
work-item-id: 7790
work-item-type: story
parent-epic: 7777
repo: sell-house-for-free
branch: feature/e1-s5-route-groups-layouts-7790
file-groups:
  - group: 1
    files: [src/app/(marketing)/layout.tsx]
    commit: 5ced1da
    status: committed
  - group: 2
    files: [src/app/(legal)/layout.tsx]
    commit: c83ee40
    status: committed
  - group: 3
    files: [src/lib/routes.ts, src/app/get-started/page.tsx]
    commit: 8d59fc8
    status: committed
  - group: 4
    files: []
    status: verified
    note: verification gate — no commit
pr: https://github.com/noahzoodealio/sell-house-for-free/pull/5
last-completed-step: 7
last-completed-file-group: 4
ado-state: Code Review
started-at: 2026-04-20T00:00:00Z
closed-at: 2026-04-20T18:30:00Z
---

# Sidecar — Story 7790 (E1-S5) dev-story run

## Status

All 7 steps complete. PR #5 open, ADO 7790 in Code Review, branch pushed.

## Delivery summary

- 3 files created (`(marketing)/layout.tsx`, `(legal)/layout.tsx`, `get-started/page.tsx`) + 1 edit (`routes.ts` priority 0.9→0.7 per AC 10).
- 117 insertions, 1 deletion.
- `npm run lint` + `npm run build` clean. `/get-started` prerenders static with `<title>Get started | Sell Your House Free</title>` via S1 template.
- Sitemap contains `/get-started` with `priority: 0.7`, `changefreq: monthly`.
- 12/14 ACs mechanically satisfied. AC 2 hand-type deviation documented (Next 16 typegen doesn't emit LayoutRoutes for route-group folders). AC 13 runtime smoke + AC 14 screenshots are PR-body checkboxes for the reviewer.

## Incidental outcomes

- Private-folder gotcha surfaced early: `__smoke` (underscore-prefix) is treated by Next as private and excluded from routing/typegen. Renamed to `smoke-test` (no prefix) for the dev-only verification pages, which were deleted before any commit.
- Typegen behavior for route groups verified empirically across three runs and documented in review-report + completion-notes so the ADO AC author can reconcile.

## Artifacts

All under `_bmad-output/dev-working/7790/`: index.md, work-item.md, research.md, workspace-config.md, implementation-plan.md, review-report.md, completion-notes.md.
