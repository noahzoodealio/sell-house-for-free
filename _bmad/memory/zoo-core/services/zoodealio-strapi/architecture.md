---
artifact: architecture
service: zoodealio-strapi
commit-sha: 09496f9dcc58e52d710e04cdf6e0770741bcc3fb
generated-at: 2026-04-15T00:00:00Z
---

# Architecture — Zoodealio.Strapi

## At a glance

**Strapi 5.23.4 headless CMS, single-process Node 18+ TypeScript monolith.** Hosted on Azure App Service (Windows) behind IIS via the `iisnode` module. Database engine selected at runtime via `DATABASE_CLIENT` (sqlite default; mysql or postgres in production). Zero custom application code beyond default-factory routers/controllers/services and content-type schema definitions — this is essentially a default Strapi install with five content types and five components.

| Dimension | Value |
|---|---|
| Stack | Node 18+ (≤22), TypeScript, Strapi 5.23.4, React 18 (admin UI runtime, not source) |
| App layout | Single Strapi project — no monorepo, no workspaces, no separate frontend |
| Process model | Single Node process; Strapi serves HTTP + admin UI on the same port (1337 default) |
| Runtime DB | sqlite (dev) / mysql / postgres (prod) — chosen by env var |
| Hosting | Azure App Service Windows + IIS + iisnode + `server.js` wrapper |
| CI/CD | Azure Pipelines (`azure-pipelines.yml`) → zip artifact → App Service deploy |
| Cross-service calls | None |
| Background workers | None configured |
| Auth | Strapi Users-Permissions plugin (JWT-based); admin uses separate ADMIN_JWT_SECRET |

## Project layout

There is one project. Strapi enforces a fixed convention; this repo follows it without modification.

```
Zoodealio.Strapi/
├── config/                    # All runtime config (server, db, admin, middlewares, plugins, api)
│   ├── admin.ts               # Admin JWT secret, API token salt, transfer-token salt, encryption key, EE flags
│   ├── api.ts                 # REST defaults: defaultLimit=25, maxLimit=100, withCount=true
│   ├── database.ts            # Multi-driver db config (sqlite/mysql/postgres)
│   ├── middlewares.ts         # Strapi middleware chain incl. CORS (localhost:4200 only)
│   ├── plugins.ts             # Empty: () => ({})
│   └── server.ts              # host/port/APP_KEYS
├── data/
│   ├── data.json              # Strapi blog template seed (demo data — coffee/pizza)
│   └── uploads/               # Seed media files
├── database/migrations/       # Empty (.gitkeep only) — Strapi sync owns DDL
├── public/                    # Static asset root served at /
├── scripts/seed.js            # Imports data/data.json into the running Strapi instance
├── src/
│   ├── admin/                 # Admin UI customization stubs (.example files only — not active)
│   ├── api/                   # Five content-type modules: about, article, author, category, global
│   │   └── {name}/{routes,controllers,services,content-types}/...
│   ├── components/shared/     # Five reusable components: media, quote, rich-text, seo, slider
│   ├── extensions/            # Empty (.gitkeep)
│   └── index.ts               # register() + bootstrap() lifecycle hooks — both empty
├── types/generated/           # Strapi-generated TS types (created at build time, not committed)
├── server.js                  # Azure/IIS entry point — spawns Strapi via node_modules/@strapi/strapi/bin/strapi.js
├── web.config                 # IIS routing + iisnode handler config
├── azure-pipelines.yml        # CI: npm ci → npm run build → zip drop → publish artifact
├── .deployment                # Azure SCM: SCM_DO_BUILD_DURING_DEPLOYMENT=true; POST_BUILD_COMMAND=npm install --production
├── .env.example               # Required env vars: HOST, PORT, APP_KEYS, API_TOKEN_SALT, ADMIN_JWT_SECRET, TRANSFER_TOKEN_SALT, JWT_SECRET, ENCRYPTION_KEY
├── package.json               # Strapi dependencies + npm scripts
└── tsconfig.json              # ESNext + Bundler resolution + strict mode + noEmit (Strapi handles emit)
```

## Layer responsibilities

Strapi has its own layering vocabulary that doesn't map onto the .NET `Api/Application/Domain/Infrastructure` pattern. The actual structure:

| Strapi layer | Where | What lives here in this repo |
|---|---|---|
| **Routes** | `src/api/{type}/routes/{type}.ts` | All five files use `factories.createCoreRouter('api::{type}.{type}')` — zero custom routes. |
| **Controllers** | `src/api/{type}/controllers/{type}.ts` | All five files use `factories.createCoreController(...)` — zero overrides, no business logic. |
| **Services** | `src/api/{type}/services/{type}.ts` | All five files use `factories.createCoreService(...)` — zero custom business logic. |
| **Content-type schema** | `src/api/{type}/content-types/{type}/schema.json` | Five JSON definitions — see `schemas.md`. |
| **Components** | `src/components/{category}/{name}.json` | Five `shared.*` reusable embedded shapes. |
| **Lifecycle hooks** | `src/index.ts` (global) and `src/api/{type}/content-types/{type}/lifecycles.ts` (per-type) | Global `register()` and `bootstrap()` are empty. **No per-type lifecycle files exist.** |
| **Middleware** | `config/middlewares.ts` | Default Strapi chain plus a custom CORS block. |
| **Policies** | (none in source) | `src/policies/` does not exist. |

**No layered DDD pattern, no MediatR, no AutoMapper, no DI container of the .NET sort, no `Application`/`Domain`/`Infrastructure` separation.** This is Strapi's plugin-style architecture: each content-type module is self-contained and the framework wires it.

## Data flow

```
Client (Angular at localhost:4200 in dev)
    │
    │ HTTP — Bearer JWT (from /api/auth/local) OR API token OR anonymous
    ▼
IIS (web.config rewrite) ──▶ iisnode ──▶ server.js (spawns) ──▶ node @strapi/strapi/bin/strapi.js start
    │
    ▼
Koa middleware chain (config/middlewares.ts)
    logger → errors → security → CORS → poweredBy → query → body → session → favicon → public
    │
    ▼
Strapi router → matches `/api/:resource[/:id]` → resolves `api::{resource}.{resource}` UID
    │
    ▼
factories.createCoreController.{find|findOne|create|update|delete}
    │
    ▼
factories.createCoreService.{same}  ──▶ Strapi document service / entity service
    │
    ▼
Knex query builder ──▶ sqlite | mysql | postgres
    │
    ▼
Response: { data, meta }  (or { data: null, error: {...} })
```

There is no Temporal workflow path, no MediatR command path, no Azure Function path, no message queue. Every request is synchronous Koa → Knex → DB → response.

## Integration points

### External services consumed

| Service | How it's wired | Notes |
|---|---|---|
| Strapi Cloud | `@strapi/plugin-cloud` 5.23.4 in dependencies | Plugin is installed but **not configured** (`plugins.ts` is empty). It's available for `strapi deploy` (npm script `deploy`) but no Cloud-specific behavior is active in production. |
| Azure App Service | `server.js` + `web.config` + `.deployment` | Hosting platform. Build runs in App Service's Kudu/SCM; `SCM_DO_BUILD_DURING_DEPLOYMENT=true` triggers npm install + build on push. |
| iisnode | `web.config` `<handlers>` | IIS module that hosts Node processes. Routes all non-file requests through `server.js`. |

**Not consumed:** SendGrid, ATTOM, Azure Blob (no upload provider override — Strapi Upload defaults to local disk at `public/uploads/`), OpenAI, Temporal, Azure Service Bus, Azure AI Search, Cosmos.

### Internal Zoodealio services consumed

**None.** No `axios`, `fetch`, or HTTP client imports anywhere in `src/`. Strapi makes no calls to Offervana_SaaS, TIH, ZIP, MLS, Chat, or any other Zoodealio service.

### Internal Zoodealio services that consume Strapi

**Inferred from CORS config:** the marketing frontend (an Angular app served at `localhost:4200` in dev) is the only known consumer. There is no allowlist of production origins in source — the production consumer's origin must be set via deploy-time CORS override or proxied to look same-origin. Worth confirming with the marketing-site owner.

### Shared packages

- `Zoodealio.Shared` — **not consumed**. Strapi is a Node project; the shared NuGet is .NET-only.
- No internal npm packages; all dependencies are Strapi core + plugin packages.

## Durable workflows / background processing

**None present.**

- No Temporal workflows or activities.
- No `IHostedService`-equivalents (Strapi has cron tasks via `config/cron.ts` and `server.cron`, but neither is configured in this repo).
- No Hangfire/Quartz/BullMQ.
- `src/index.ts` `bootstrap()` is empty — there is no startup work.
- The only "background work" Strapi does on its own is internal: webhook delivery, search-index rebuilding for the admin UI, etc. — none customized.

## Authentication + authorization

Two distinct auth realms:

| Realm | Token | Secret env var | Used for |
|---|---|---|---|
| Public REST API | Bearer JWT (issued by Users-Permissions `/api/auth/local`) **or** Strapi API token (long-lived static, generated in admin) | `JWT_SECRET` (REST) / `API_TOKEN_SALT` (api tokens) | `/api/*` routes — what the marketing frontend uses. |
| Admin UI | Bearer JWT (issued by admin login) | `ADMIN_JWT_SECRET` | `/admin` UI and `/content-manager`, `/users-permissions`, etc. internal admin routes. |
| Data transfer | Transfer token | `TRANSFER_TOKEN_SALT` | `strapi transfer` CLI for cross-environment data sync. |

**Authorization rules** for the public API are not defined in source — they are stored in the `up_permissions` table and configured via the admin UI under Settings → Users & Permissions Plugin → Roles. Two roles ship by default:

- `Public` — anonymous callers; permissions default to `false` until granted.
- `Authenticated` — anyone who registered/logged in via `/api/auth/local`.

There is no source-side allowlist of which routes are public. Without inspecting a running admin DB, the catalog cannot tell you which `/api/articles` calls are reachable anonymously. **Treat every endpoint as "off until granted."**

No service-to-service auth, no API keys for MCP tools (Strapi is not consumed by Zoodealio.Chat or any agent tool today).

## Config surface

### `.env` / `.env.example` (required at runtime)

| Variable | Default | Purpose |
|---|---|---|
| `HOST` | `0.0.0.0` | Bind address |
| `PORT` | `1337` | Bind port |
| `APP_KEYS` | (must be set) | Comma-separated session signing keys |
| `API_TOKEN_SALT` | (must be set) | Salt for hashing static API tokens |
| `ADMIN_JWT_SECRET` | (must be set) | Admin UI JWT secret |
| `TRANSFER_TOKEN_SALT` | (must be set) | `strapi transfer` token salt |
| `JWT_SECRET` | (must be set) | Public REST API JWT secret |
| `ENCRYPTION_KEY` | (must be set) | Strapi-internal field encryption key |

### Database env vars (consumed by `config/database.ts`)

`DATABASE_CLIENT` (default `sqlite`), then per-driver: `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_NAME`, `DATABASE_USERNAME`, `DATABASE_PASSWORD`, `DATABASE_URL` (postgres only — preferred over discrete vars), `DATABASE_SCHEMA` (postgres), `DATABASE_SSL` + the SSL chain (`DATABASE_SSL_KEY`, `DATABASE_SSL_CERT`, `DATABASE_SSL_CA`, `DATABASE_SSL_CAPATH`, `DATABASE_SSL_CIPHER`, `DATABASE_SSL_REJECT_UNAUTHORIZED`), `DATABASE_FILENAME` (sqlite), `DATABASE_POOL_MIN`/`MAX`, `DATABASE_CONNECTION_TIMEOUT`.

### Admin flags

`FLAG_NPS` (default true), `FLAG_PROMOTE_EE` (default true) — both enable Strapi's NPS prompt and EE upsell in the admin UI.

### MCP integrations

**None.** Strapi is not registered as an MCP server and consumes no MCP tools.

## CI/CD

- **`azure-pipelines.yml`** — agent pool `Azure Pipelines` (Microsoft-hosted) with `npm` capability. Steps: checkout → `npm ci` → `npm run build` (strapi build) → CopyFiles to staging (includes `node_modules/`!) → ArchiveFiles to `$(BuildId).zip` → PublishBuildArtifacts as `drop`. The artifact carries committed `node_modules` to avoid re-installing on App Service — a meaningful zip-size choice.
- **`.deployment`** — sets `SCM_DO_BUILD_DURING_DEPLOYMENT=true` and `POST_BUILD_COMMAND=npm install --production`. **This conflicts with the pipeline shipping `node_modules/` in the artifact** — both paths exist for installing deps, and they both run if a deployment uses the SCM build step. Worth verifying which path is actually live.
- **No release pipeline in source** — the pipeline only builds and publishes a zip. The deploy step (zip → App Service) lives outside the repo.

## Surprises / things to verify

1. **Hosting target is Windows + IIS + iisnode** — atypical for Node services in 2026. Most Node workloads run on Linux App Service or Container Apps. Reason unclear; may be inherited environment.
2. **`node_modules/` shipped in build artifact** — unusual choice; a common alternative is to install at deploy time. Combined with `.deployment`'s `POST_BUILD_COMMAND=npm install --production`, the install path is ambiguous.
3. **`@strapi/plugin-cloud` is installed but unconfigured.** Either intentional dead weight, or someone planned a Strapi Cloud migration that never landed.
4. **No tests, no lint, no formatter** — `package.json` has no `test`, `lint`, or `format` scripts. There is no `.eslintrc`, `.prettierrc`, or test framework dependency.
5. **`scripts/seed.js` ships with the demo blog template.** Anyone running `npm run seed:example` against a production DB would inject "coffee-art.jpg" articles. The seed exists for local dev but isn't gated.
6. **No `.git`-managed admin customizations.** `src/admin/` contains only `.example` files — there's no custom admin theme, no extension panels, no overridden landing screen.
7. **No upload provider override.** Production media uploads go to local disk (`public/uploads/`), which on Azure App Service Windows is non-persistent across slot swaps unless persistent storage is mounted. Production almost certainly needs `@strapi/provider-upload-azure-storage` configured in `plugins.ts`.
