---
artifact: workflows
service: zoodealio-strapi
commit-sha: 09496f9dcc58e52d710e04cdf6e0770741bcc3fb
generated-at: 2026-04-16T00:00:00Z
temporal-workflow-count: 0
hosted-service-count: 0
scheduled-job-count: 0
---

# Workflows — Zoodealio.Strapi

## Summary

This service has **no durable, scheduled, or background work** of any kind in source. Every category below is explicitly **none / not used** — the service is a synchronous request/response Strapi instance with no async post-processing, no time-based jobs, and no message-queue participation.

| Category | Count | Status |
|---|---|---|
| Temporal workflows | 0 | Not used. No `@temporalio/*` deps. |
| Hosted services / `IHostedService` | 0 | N/A — Node service, not .NET. |
| Strapi cron tasks | 0 | `config/cron.ts` does not exist; `server.cron` not enabled. |
| Strapi lifecycle hooks (per-content-type) | 0 | No `lifecycles.ts` files in any `src/api/{type}/content-types/{type}/`. |
| Strapi global lifecycle hooks (`register`, `bootstrap`) | 0 | `src/index.ts` has both methods empty. |
| Strapi webhooks | (config-only) | No webhooks declared in source — Strapi webhooks live in admin DB. |
| Azure Functions | 0 | N/A — service hosts on App Service IIS, not Functions. |
| Service Bus / Event Grid / queue consumers or producers | 0 | Not used. |
| Other schedulers (Hangfire / Quartz / BullMQ / node-cron) | 0 | No deps. |

## Temporal workflows

**None.** No `@temporalio/client`, `@temporalio/worker`, or `@temporalio/workflow` packages in `package.json`. No worker process, no workflow files, no activities. Strapi does not participate in the Zoodealio Temporal cluster.

## Hosted services / background services

**N/A.** Strapi is a Node application; the .NET `IHostedService` / `BackgroundService` concept does not apply.

The closest equivalents in Strapi would be:

- **`bootstrap()` in `src/index.ts`** — runs once at startup, intended for seeding or registering startup work. **Empty in this repo.**
- **`register()` in `src/index.ts`** — runs before the app initializes, intended for code extensions. **Empty in this repo.**

## Scheduled / cron jobs

**None.** Strapi supports cron tasks two ways:

1. **`config/cron.ts`** — declarative cron task registry. **File does not exist in this repo.**
2. **`server.cron.enabled = true` in `config/server.ts`** — enables the cron runtime. **Not set in `config/server.ts`.**

There are no `node-cron`, `croner`, `agenda`, or other scheduler dependencies either. Nothing in this service runs on a timer.

## Per-content-type lifecycle hooks

Strapi supports per-content-type lifecycle hooks via `src/api/{type}/content-types/{type}/lifecycles.{ts,js}`. These would let you intercept `beforeCreate`, `afterCreate`, `beforeUpdate`, `afterUpdate`, `beforeFindMany`, `afterFindMany`, `beforeDelete`, `afterDelete`, etc.

**No `lifecycles.*` files exist** for any of the five content types (`about`, `article`, `author`, `category`, `global`). Every write goes straight from controller → service → DB with no hook-fired side effects.

## Webhooks

Strapi has a built-in webhook system (Settings → Webhooks in the admin UI) that fires on entry create/update/delete/publish/unpublish events. **Webhook definitions live in the admin database (`strapi_webhooks` table), not in source.** This catalog cannot tell you which webhooks fire today without inspecting a running admin DB.

There are no webhooks **declared in source** (no `bootstrap()` calls to `strapi.webhookRegistry.add(...)`).

## Azure Functions / event triggers

**Not applicable.** This service deploys as a Node web app on Azure App Service Windows (see `architecture.md`). It is not an Azure Functions project, has no `host.json`, no `function.json`, and no Functions binding code.

## Message-bus producers / consumers

**None.** No Service Bus, Event Grid, RabbitMQ, Kafka, or other broker client packages in `package.json`. Strapi neither publishes nor consumes events on any Zoodealio bus.

## Process supervision (operationally relevant — not application workflows)

Worth recording even though this is platform-level rather than application-level:

- **`server.js`** wraps Strapi in a child-process spawn so that iisnode (which expects a `.js` entry file) can boot the app on Windows App Service. The wrapper forwards `SIGTERM`/`SIGINT` to the Strapi child, but does not implement health checks, restart-on-crash logic, or back-pressure. If Strapi crashes, the child exits non-zero and `server.js` exits with the same code; iisnode then restarts the parent.
- **iisnode** itself provides the auto-restart-on-crash and the request-queueing layer in front of the Node process.

This is process supervision provided by the host, not an in-app workflow.

## One-shot scripts (not recurring, not background)

For completeness, these exist but they are operator-invoked CLI scripts, not background workflows:

| Script | Purpose | Invocation | Side effects |
|---|---|---|---|
| `scripts/seed.js` | Imports the demo blog content from `data/data.json` (categories, authors, articles, global, about) into a fresh Strapi DB. **Also grants public-role find/findOne permissions** on all five content types. Idempotent — gated by a `setup.initHasRun` flag in the plugin store; subsequent runs no-op with "Seed data has already been imported" message. | `npm run seed:example` | DB writes; uploads files from `data/uploads/` via the Upload plugin; modifies `up_permissions` for the public role. |
| `npm run upgrade` | Runs `npx @strapi/upgrade latest` — Strapi version-migration tool. | manual | Modifies `package.json`, dependencies, and may rewrite content-type schemas. |
| `npm run upgrade:dry` | Same with `--dry` — no writes. | manual | None. |
| `npm run console` | `strapi console` — interactive REPL with `strapi` global available. | manual | Whatever the operator types. |
| `npm run deploy` | `strapi deploy` — pushes to Strapi Cloud. **Requires `@strapi/plugin-cloud` to be configured**, which it isn't (`config/plugins.ts` is empty). Today this command would error out. | manual | Would deploy to Strapi Cloud if configured. |

## Surprises / things to verify

1. **The seed script grants public read permissions** for all five content types (`scripts/seed.js:240-247`). If anyone runs `npm run seed:example` against a non-pristine DB by accident — say in a misconfigured environment — they will (a) skip seed import (because `initHasRun` is true) but (b) **not** re-run the permission grants. So that risk is bounded to the first-run path. Worth noting nonetheless: the canonical "make /api/articles publicly readable" answer in this repo is "run the seed script once" — not "edit a config file."
2. **No source-side automation at all.** Every cross-environment automation (cache invalidation on publish, search-index reindex, downstream webhook fan-out, scheduled republish, etc.) would have to be added — none exists today. If the marketing-site requires any of these, they're either missing or live elsewhere (CDN purge at the platform layer, etc.).
3. **`package.json` declares `npm run deploy` → `strapi deploy`**, but Strapi Cloud is unconfigured — the script would fail. Either delete it or wire `@strapi/plugin-cloud` properly.
