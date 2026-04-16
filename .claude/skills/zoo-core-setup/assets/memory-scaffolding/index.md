# Zoo-Core Shared Memory Index

Orientation doc for every zoo-core skill. Read this on activation, then selectively load only what's relevant to the current task.

---

## Services indexed

_Populated by `zoo-core-full-index` as services are indexed; per-service summaries are one line each._

<!-- service-summaries:start -->
<!-- service-summaries:end -->

See `staleness.md` for per-service indexed-date + SHA.

## Curated files

- `curated/patterns.md` — Zoodealio architectural baseline (load on activation)
- `curated/recent-changes.md` — distilled cross-service change log (load when recency matters)
- `curated/user-preferences.md` — user-specific stylistic + workflow preferences (load on activation; consumer-local)

## Per-service knowledge

`services/{service-name}/` contains 5 files per service: `api-catalog.md`, `schemas.md`, `architecture.md`, `patterns.md`, `workflows.md`. Load only the service directories your current task touches.

## Daily activity log

`daily/YYYY-MM-DD.md` — append-only per-agent activity log (consumer-local). Load only when cross-agent handoff context matters.

## Budget

This file has a soft 200-line budget. When it crosses that, `zoo-core-curate-memory` is due — trims prose, preserves every service + curated pointer.
