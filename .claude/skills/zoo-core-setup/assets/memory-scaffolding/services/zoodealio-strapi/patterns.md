---
artifact: patterns
service: zoodealio-strapi
commit-sha: 09496f9dcc58e52d710e04cdf6e0770741bcc3fb
generated-at: 2026-04-16T00:00:00Z
---

# Patterns — Zoodealio.Strapi

## Stack baseline

| Layer | Choice | Version |
|---|---|---|
| Runtime | Node.js | `>=18.0.0 <=22.x.x` (`engines.node`) |
| Package manager | npm | `>=6.0.0` (`engines.npm`); pipeline uses `npm ci` |
| Language | TypeScript | `^5` (devDep) |
| Framework | Strapi | `5.23.4` (pinned exact) |
| Strapi plugins (installed) | `@strapi/plugin-cloud` 5.23.4, `@strapi/plugin-users-permissions` 5.23.4 | |
| Admin UI runtime deps | React 18, react-dom 18, react-router-dom 6, styled-components 6 | All caret-ranged. These exist because Strapi's admin UI is React; not consumed by `src/` business code. |
| Default DB driver | `better-sqlite3` 11.3.0 (pinned exact) | mysql/postgres clients are NOT installed — running against those drivers requires adding `pg` or `mysql2` first. |
| File-system helpers | `fs-extra` ^10, `mime-types` ^2.1.27 | Only used by `scripts/seed.js`. |
| Type defs | `@types/node` ^20, `@types/react` ^18, `@types/react-dom` ^18 | |

**No** ABP, MediatR, AutoMapper, EF Core, Temporal, FluentValidation, Serilog, Hangfire, AutoFixture, xUnit, Jest, Vitest, ESLint, Prettier, Husky, or any test runner. None of those concepts apply here.

## Backend conventions

Strapi imposes the conventions; this repo uses them as-shipped without overrides.

### Module structure

Every business domain is a `src/api/{name}/` module with the fixed sub-tree:

```
src/api/{name}/
├── content-types/{name}/schema.json   # Declarative schema (kind, attributes, relations, options)
├── controllers/{name}.ts              # factories.createCoreController('api::{name}.{name}')
├── routes/{name}.ts                   # factories.createCoreRouter('api::{name}.{name}')
└── services/{name}.ts                 # factories.createCoreService('api::{name}.{name}')
```

**All five modules are exact copies of this template** with only the UID changed. Zero overrides means: when you need to add custom logic later, the override pattern looks like this (example, not in repo):

```ts
// controllers/article.ts — override pattern
import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::article.article', ({ strapi }) => ({
  async find(ctx) {
    const result = await super.find(ctx);
    // custom logic
    return result;
  },
}));
```

### Data access

- **No EF Core / no ORM of the .NET sort.** Strapi's **Document Service API** (`strapi.documents('api::x.x').{find|findOne|create|update|delete}`) is the canonical access path. The seed script uses it (`scripts/seed.js:104`).
- The lower-level **Entity Service API** (`strapi.entityService.*`) and the raw **Query Engine** (`strapi.query('api::x.x').*`) are also available — the seed script uses `strapi.query('plugin::users-permissions.role')` for plugin tables.
- Underneath: **Knex** query builder against the runtime-selected SQL driver. No raw SQL in source.
- **Two-database pattern: N/A.** No second DB context. No `LegacyData` equivalent.
- **Repositories: N/A.** Strapi services are the repository layer.

### Query / command separation

**No CQRS.** Strapi's controllers handle both read and write through the same service. There is no MediatR, no command/query record types, no handler classes.

### Mapping

**No mapping library.** The Strapi response envelope (`{ data, meta }`) is shaped by Strapi internals. Custom serialization (when needed) is done by overriding the controller and reshaping the result inline. AutoMapper concept does not apply.

### Validation

**Schema-driven only** — `required: true`, `maxLength`, `unique` (via `uid`), and `allowedTypes` (for media) come from `schema.json`. Strapi validates these at the Document Service layer before write.

There is **no FluentValidation, no Joi config, no custom validators** in source. For body shapes Strapi rejects unknown attributes by default in v5.

### Error handling

**Default Strapi error responses.** No custom error middleware in `config/middlewares.ts` beyond the standard chain. Errors emerge as:

```json
{ "data": null, "error": { "status": 400, "name": "ValidationError", "message": "...", "details": {...} } }
```

The `strapi::errors` middleware in the chain converts thrown framework errors (`UnauthorizedError`, `ForbiddenError`, `NotFoundError`, `ValidationError`, `ApplicationError`) into this envelope. Custom controllers should `throw new errors.ApplicationError('msg', { ... })` (importing from `@strapi/utils`), not `ctx.throw(...)`.

### Logging

- **Pino** (Strapi's built-in via `strapi::logger`) — zero customization.
- Log level via env (`LOG_LEVEL`). No structured-fields convention enforced.
- The `server.js` wrapper uses bare `console.log` for boot messages (not Pino).
- The seed script forces `app.log.level = 'error'` to suppress noise.

### Auth

- **`@strapi/plugin-users-permissions`** ships REST endpoints under `/api/auth/*` and `/api/users/*` — login, register, forgot-password, reset-password, /me.
- JWT issuance: `JWT_SECRET` env var; tokens delivered via `Authorization: Bearer <token>`.
- **Static API tokens** (admin-generated, long-lived) are an alternative for server-to-server: also `Authorization: Bearer <token>`, hashed with `API_TOKEN_SALT`.
- **Admin UI** auth is a separate realm under `ADMIN_JWT_SECRET`.
- **All route grants live in the DB** (`up_permissions` table), not source. The seed script (`scripts/seed.js:240-247`) seeds public-role find/findOne grants for the five content types; without running it, every route is closed.

### Testing

**No tests, no test runner, no test scripts.** `package.json` has no `test` script. `tsconfig.json` excludes `**/*.test.ts` defensively but no such files exist.

### Lint / format

**None.** No `.eslintrc*`, no `.prettierrc*`, no `.editorconfig`. TypeScript `strict: true` in `tsconfig.json` is the only enforced quality bar.

## Frontend conventions

**N/A.** Strapi's React-based admin UI is not customized here. `src/admin/app.example.tsx` and `src/admin/vite.config.example.ts` exist only as `.example` templates — neither is active. There are no Angular/React/Vue components shipped from this repo for end users; the consuming Angular marketing app lives in a separate repo.

## Module system / TypeScript style

- **TypeScript source uses ESM** — `import` / `export default`, ESNext module resolution. Default-export factory pattern in every controller/router/service.
- **`scripts/seed.js` uses CommonJS** — `'use strict'`, `require(...)`. Different style because it runs as a standalone Node script outside Strapi's TS pipeline. Worth noting if anyone modifies it.
- `tsconfig.json` settings: `target: ESNext`, `module: ESNext`, `moduleResolution: Bundler`, `strict: true`, `noEmit: true` (Strapi handles transpilation via SWC), `jsx: react-jsx` (for admin customization stubs), `resolveJsonModule: true` (for content-type schema imports).

## Build, test, deploy

- **Build:** `npm run build` → `strapi build` (compiles admin UI + applies content-type definitions).
- **Dev:** `npm run develop` (autoReload on schema/code changes).
- **Start (prod):** `npm run start` → `strapi start`. On Azure this is replaced by `node server.js`, which spawns Strapi as a child process to work around iisnode's npm-script resolution issues on Windows.
- **CI:** Azure Pipelines (`azure-pipelines.yml`) — `npm ci` → `strapi build` → CopyFiles incl. `node_modules/` → zip → publish artifact.
- **Deploy:** Azure App Service Windows + IIS + iisnode. `.deployment` enables `SCM_DO_BUILD_DURING_DEPLOYMENT` and runs `POST_BUILD_COMMAND=npm install --production`. See `architecture.md` for the conflicting-install-paths concern.
- **No Dockerfile**, no Container Apps deployment, no Linux container path.

## Naming / casing conventions

- **Content-type UIDs:** `api::{singularName}.{singularName}` (Strapi convention; not configurable).
- **REST routes:** singular for single types (`/api/about`), plural for collections (`/api/articles`). Plurals come from `pluralName` in `schema.json` (e.g., `categories`, `abouts`).
- **DB tables:** taken from `collectionName` in `schema.json`. Snake_case, plural (`articles`, `authors`, `categories`, `abouts`, `globals`, `components_shared_*`).
- **Component UIDs:** `{category}.{name}` — only `shared.*` exists.
- **TypeScript files:** lowercase singular matching the module (`article.ts`, `author.ts`).

## Deviations from the Zoodealio baseline

The Zoodealio baseline (per `CLAUDE.md` and the curated patterns) is .NET 8/10 + Angular 20/21 + ABP/MediatR/EF Core/AutoMapper/Temporal. Strapi sits orthogonal to that baseline — almost everything here "deviates" because the stack is fundamentally different. The deviations worth flagging are the ones a Dev agent might trip over:

| Baseline expectation | What this service actually does | Implication for Dev agents |
|---|---|---|
| Layered DDD (`Api/Application/Domain/Infrastructure`) | Strapi module convention (routes/controllers/services/content-types) | Don't try to introduce a service layer or repository pattern — Strapi services *are* the layer. Override the factory if custom logic is needed. |
| MediatR CQRS | None | Don't add MediatR. Use the Document Service API directly inside controller overrides. |
| EF Core + DbContext | Knex (hidden under Document Service API) | Don't write `DbContext` code. Don't write raw SQL. Use `strapi.documents(...)` or `strapi.query(...)`. |
| AutoMapper profiles | Inline reshaping inside controller overrides | Don't add a mapping library. |
| FluentValidation | `schema.json` declarative validation only | Add validation by editing the content-type schema, not by adding validator classes. |
| Serilog with structured fields | Pino (Strapi default) | Use `strapi.log.info({ ... })`. Avoid `console.log` outside `server.js`. |
| Two-database pattern | Single DB only — no OffervanaDb access | Don't introduce a second connection. If Strapi needs Offervana data, the right move is a server-to-server REST call into Offervana_SaaS APIs (currently zero such calls in source). |
| Test infrastructure (xUnit/NUnit/Jest) | **None at all** | Adding tests is a greenfield decision — pick a runner (Jest is closest to Strapi's own test setup) and wire it. There's no convention to inherit. |
| ESLint + Prettier | **None at all** | Same — no convention to inherit. |
| Docker multi-stage build → ACR → Container Apps | Windows IIS + iisnode + zip-deploy via App Service | Do not propose Dockerfile changes; the deploy target is App Service Windows. A migration to Linux Container Apps would be a project-level decision, not an implementation detail. |
| `Zoodealio.Shared` DTOs | Not consumed | Strapi can't consume a .NET NuGet. If a shared shape is needed, mirror the type by hand in TypeScript. |
| JWT Bearer with global ASP.NET auth middleware | Strapi Users-Permissions (similar concept, different config surface) | Auth grants live in the admin DB (`up_permissions`), not in code. Modifying who can call what is an admin-UI/seed-script change, not a `[Authorize]` attribute change. |
| OnPush Angular components, `inject()`, standalone components | N/A — no Angular in this repo | The Angular consumer lives elsewhere. |
| Temporal workflows for durable processes | N/A — no durable workflow runtime | If a durable job is ever needed in Strapi, Strapi's built-in cron tasks (`config/cron.ts` — not present today) are the in-platform option. Cross-service Temporal would mean calling out to Offervana's worker. |

## Things to verify with the user

- **Are tests + lint actually missing intentionally?** A CMS with five default-template content types may not warrant test infrastructure today, but the absence of *any* quality gate (no lint, no format, no tests, no pre-commit hooks) is unusual relative to other Zoodealio services.
- **Is Windows + IIS the long-term hosting target,** or a temporary inheritance? A move to Linux App Service or Container Apps would simplify the `server.js`/`web.config`/`iisnode` triangle.
- **Should `@strapi/plugin-cloud` be removed** if Strapi Cloud is not on the roadmap? It's currently dead weight in the dependency tree.
