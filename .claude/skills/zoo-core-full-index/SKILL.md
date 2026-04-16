---
name: zoo-core-full-index
description: Generates the 5 service knowledge files from a first-time crawl of a Zoodealio reference repo. Use when the user requests 'full index a service' or runs '/zoo-core-full-index', or when zoo-core-onboard offers initial indexing.
---

# Zoo-Core Full Index

## Overview

First-time indexing of a Zoodealio reference repo. Crawls the codebase across seven sequential stages and produces 5 authoritative knowledge files that ship with the zoo-core module and propagate to every consumer install:

- `api-catalog.md` — controllers, routes, auth, request/response shapes
- `schemas.md` — entities, DbContexts, relationships
- `architecture.md` — projects, layers, integrations, durable workflows
- `patterns.md` — conventions, frameworks, libraries
- `workflows.md` — Temporal workflows, hosted services, scheduled jobs

Each stage writes to a per-service sidecar as it goes and requires user approval before the next stage begins. Stages can resume across context compactions by re-reading the sidecar.

Act as a senior code archaeologist — systematic, thorough, grounded in what the code actually says rather than what it's supposed to say. Capture what's there; flag what's missing or inconsistent.

## Activation Guard — Maintainer Mode Only

This workflow writes to the authoritative shared memory source at `{project-root}/src/modules/zoo-core/zoo-core-setup/assets/memory-scaffolding/services/{service-name}/`, which lives exclusively in the zoo-core source repo. If invoked in a consumer workspace, halt with:

> This workflow only runs in the zoo-core source repo. It writes authoritative shared memory that propagates to consumer installs via re-install. Service indexing is not a consumer-side operation.

Detect maintainer mode by checking that **both** `{project-root}/src/modules/zoo-core/zoo-core-setup/assets/memory-scaffolding/` and `{project-root}/src/modules/zoo-core/module.yaml` exist. If either is absent, halt with the message above.

## On Activation

Load config from `{project-root}/_bmad/config.yaml` (`zoo-core` section) and `config.user.yaml`. If missing, let the user know `zoo-core-setup` can configure the module; continue with sensible defaults.

**Preflight:** invoke `zoo-core-onboard` (auto-trigger — handles pending installs + first-time setup silently), then resume.

## Inputs

- **Service name** — key from `repo_directories` in `{project-root}/_bmad/memory/zoo-core/repo-paths.yaml` (e.g., `offervana-saas`, `zoodealio-trade-in-holdings`, `investor-portal`). If not provided, list available services and ask.
- **Resume** (implicit) — if a sidecar exists for the service, offer to resume from the next uncompleted stage or restart from stage 01.

## Outputs

**Authoritative knowledge base (written at finalize after user approval):**

- `{project-root}/src/modules/zoo-core/zoo-core-setup/assets/memory-scaffolding/services/{service-name}/api-catalog.md`
- `{project-root}/src/modules/zoo-core/zoo-core-setup/assets/memory-scaffolding/services/{service-name}/schemas.md`
- `{project-root}/src/modules/zoo-core/zoo-core-setup/assets/memory-scaffolding/services/{service-name}/architecture.md`
- `{project-root}/src/modules/zoo-core/zoo-core-setup/assets/memory-scaffolding/services/{service-name}/patterns.md`
- `{project-root}/src/modules/zoo-core/zoo-core-setup/assets/memory-scaffolding/services/{service-name}/workflows.md`

**Metadata updates:**

- `{project-root}/src/modules/zoo-core/zoo-core-setup/assets/memory-scaffolding/staleness.md` — append an entry with service name, indexed commit SHA, ISO timestamp
- `{project-root}/src/modules/zoo-core/zoo-core-setup/assets/memory-scaffolding/index.md` — ensure the service is listed in the orientation index

**Sidecar (working state, preserved across compactions):** `{output_folder}/full-index-working/{service-name}/`

## Workflow

Seven sequential stages. Each stage is a focused reference file — load it when beginning that stage, unload when moving on to keep context lean. Every stage reads the sidecar on entry to recover state.

1. `references/stage-01-setup.md` — resolve repo path, validate, create sidecar, capture commit SHA
2. `references/stage-02-crawl-apis.md` — API catalog (controllers, routes, auth, shapes)
3. `references/stage-03-crawl-schemas.md` — entities + DbContexts + relationships
4. `references/stage-04-crawl-architecture.md` — projects, layers, integrations
5. `references/stage-05-crawl-patterns.md` — conventions, frameworks, libraries
6. `references/stage-06-crawl-workflows.md` — Temporal, hosted services, scheduled jobs
7. `references/stage-07-finalize.md` — review → write authoritative artifacts → update staleness.md + index.md

**Sidecar survival contract.** The sidecar's `index.md` tracks `last-completed-stage`, `service-name`, `repo-path`, `commit-sha`, and per-stage status. Any stage can recover full context from the sidecar alone — so even after compaction, the LLM reads the sidecar and continues.

**Resume behavior.** On activation, if the sidecar exists for this service, ask:
- Resume from the next uncompleted stage, preserving sidecar content, **or**
- Restart from stage 01, clearing sidecar content.

## Next Steps

After finalize, recommend running `zoo-core-curate-memory` (maintainer mode) to distill any newly-learned durable patterns into `curated/patterns.md`.

## Related Skills

- `zoo-core-diff-update` — incremental maintenance once this service has been fully indexed
- `zoo-core-curate-memory` — distills learnings into curated files post-index
- `zoo-core-onboard` — prerequisite; must have resolved repo paths before this workflow can run
