---
artifact: api-catalog
service: zoodealio-strapi
commit-sha: 09496f9dcc58e52d710e04cdf6e0770741bcc3fb
generated-at: 2026-04-15T00:00:00Z
endpoint-count: 21
---

# API Catalog — Zoodealio.Strapi

## Summary

Strapi 5 CMS exposing **21 auto-generated REST endpoints** across **5 content types** in **2 functional areas**: blog content (3 collection types) and site-wide singletons (2 single types).

- **Custom endpoints:** none — every router/controller/service is the default `factories.createCoreXxx(uid)` with zero overrides.
- **Auth model:** Strapi Users-Permissions plugin. Role/permission grants live in the admin DB (configured at runtime via the admin UI), not in source. Public role grants determine what is anonymous; authenticated role grants gate the rest. JWT bearer for authenticated calls. **Source files do not declare auth** — assume "blocked unless granted in admin" until verified against a running instance or a seed.
- **Pagination defaults** (`config/api.ts`): `defaultLimit=25`, `maxLimit=100`, `withCount=true` on every collection list endpoint.
- **CORS** (`config/middlewares.ts`): origin whitelist = `http://localhost:4200` only (Angular dev). Methods: `GET POST PUT PATCH DELETE OPTIONS`. Headers: `*`. **Production CORS is not configured in source** — must be set per environment or this service is unreachable from any non-localhost frontend.
- **Response envelope:** standard Strapi v5 shape — `{ data: {...} | [...], meta: { pagination: {...} } }`. Errors: `{ data: null, error: { status, name, message, details } }`.
- **Query params (all collection list endpoints):** `pagination[page]`, `pagination[pageSize]`, `pagination[start]`, `pagination[limit]`, `pagination[withCount]`, `sort`, `filters[*]`, `populate`, `fields`, `locale`, `status` (draft/published — articles only).

## Functional area: Blog content (collection types)

### Articles — `api::article.article`

Source: `src/api/article/{routes,controllers,services}/article.ts` — all default factory.
Schema: `src/api/article/content-types/article/schema.json` (collectionType, draftAndPublish=**true**).

| Method | Route | Handler | Notes |
|---|---|---|---|
| GET    | `/api/articles`         | `article.find`   | Paginated list. Default 25 / max 100. Supports filters, sort, populate, status (draft/published). |
| POST   | `/api/articles`         | `article.create` | Body: `{ data: { title, description, slug?, cover?, author?, category?, blocks? } }`. Slug auto-derived from title via uid attribute. |
| GET    | `/api/articles/:id`     | `article.findOne`| Returns a single article. `:id` is the document id (Strapi v5 string id). Supports populate, fields, locale. |
| PUT    | `/api/articles/:id`     | `article.update` | Body: `{ data: { ...partial } }`. |
| DELETE | `/api/articles/:id`     | `article.delete` | |

### Authors — `api::author.author`

Source: `src/api/author/{routes,controllers,services}/author.ts` — all default factory.
Schema: `src/api/author/content-types/author/schema.json` (collectionType, draftAndPublish=false).

| Method | Route | Handler | Notes |
|---|---|---|---|
| GET    | `/api/authors`       | `author.find`    | Paginated list. |
| POST   | `/api/authors`       | `author.create`  | Body: `{ data: { name, email?, avatar?, articles? } }`. |
| GET    | `/api/authors/:id`   | `author.findOne` | |
| PUT    | `/api/authors/:id`   | `author.update`  | |
| DELETE | `/api/authors/:id`   | `author.delete`  | |

### Categories — `api::category.category`

Source: `src/api/category/{routes,controllers,services}/category.ts` — all default factory.
Schema: `src/api/category/content-types/category/schema.json` (collectionType, draftAndPublish=false).

| Method | Route | Handler | Notes |
|---|---|---|---|
| GET    | `/api/categories`     | `category.find`    | Paginated list. |
| POST   | `/api/categories`     | `category.create`  | Body: `{ data: { name, slug?, description?, articles? } }`. **Slug is a `uid` attribute with no `targetField`** — must be supplied or generated client-side; it will not auto-populate. |
| GET    | `/api/categories/:id` | `category.findOne` | |
| PUT    | `/api/categories/:id` | `category.update`  | |
| DELETE | `/api/categories/:id` | `category.delete`  | |

## Functional area: Site singletons (single types)

Strapi single types expose three routes (no `:id` — there is one document).

### About — `api::about.about`

Source: `src/api/about/{routes,controllers,services}/about.ts` — all default factory.
Schema: `src/api/about/content-types/about/schema.json` (singleType, draftAndPublish=false).

| Method | Route | Handler | Notes |
|---|---|---|---|
| GET    | `/api/about` | `about.find`   | Returns the singleton. Supports `populate`, `fields`, `locale`. |
| PUT    | `/api/about` | `about.update` | Body: `{ data: { title?, blocks? } }`. Creates the singleton on first PUT if it doesn't exist. |
| DELETE | `/api/about` | `about.delete` | Clears the singleton. |

### Global — `api::global.global`

Source: `src/api/global/{routes,controllers,services}/global.ts` — all default factory.
Schema: `src/api/global/content-types/global/schema.json` (singleType, draftAndPublish=false). `siteName` and `siteDescription` are required.

| Method | Route | Handler | Notes |
|---|---|---|---|
| GET    | `/api/global` | `global.find`   | Returns site-wide settings. |
| PUT    | `/api/global` | `global.update` | Body: `{ data: { siteName, siteDescription, favicon?, defaultSeo? } }`. Required attrs must be present on first create. |
| DELETE | `/api/global` | `global.delete` | |

## Built-in plugin endpoints (not in `src/api/`)

These ship with Strapi core. They are reachable in any default Strapi install and the consumer-side Angular app may depend on them, so they are listed for completeness — full reference lives in Strapi docs.

| Plugin | Mount | Notable routes (non-exhaustive) |
|---|---|---|
| Users-Permissions | `/api/auth/*`, `/api/users/*` | `POST /api/auth/local` (login), `POST /api/auth/local/register`, `GET /api/users/me`, `POST /api/auth/forgot-password`, `POST /api/auth/reset-password`. |
| Upload | `/api/upload/*`, `/api/upload/files/*` | `POST /api/upload`, `GET /api/upload/files`, `GET /api/upload/files/:id`, `DELETE /api/upload/files/:id`. |
| i18n | `/api/i18n/locales` | List configured locales. |
| Content-API documentation | (none — no `documentation` plugin in `config/plugins.ts`) | Not exposed. |

`config/plugins.ts` is empty (`export default () => ({});`), so no plugin overrides are in effect — defaults apply.

## Cross-service calls

**None.** Strapi is a leaf service in the Zoodealio dependency graph: it is consumed by the marketing frontend (Angular at `localhost:4200` per CORS config) and emits no outbound calls to Offervana_SaaS, TIH, ZIP, or any other Zoodealio service. No `axios`/`fetch`/HTTP-client imports anywhere in `src/`.

## Ambiguities / surprises

1. **No production CORS origins configured.** Only `http://localhost:4200` is whitelisted. Either CORS is overridden at the platform layer (Azure App Service `web.config` / Container App ingress), or production callers must come through a same-origin reverse proxy. Worth verifying with the deploy owner.
2. **Auth grants are not in source.** Every endpoint's "who can call this" lives in the admin DB (the `up_permissions` table populated via the Users-Permissions admin UI). The catalog cannot tell you which routes are public without a DB dump or live admin inspection.
3. **`category.slug` has no `targetField`.** Unlike `article.slug` (which auto-derives from title), category slugs must be supplied explicitly on create, or the field will be empty. Likely an oversight in schema.
4. **Empty plugin config.** `config/plugins.ts` returns `{}` — Users-Permissions and Upload run on default settings (e.g., default upload provider = local filesystem at `public/uploads/`). For production this almost certainly needs an Azure Blob provider override that isn't checked in.
5. **Default `register` and `bootstrap` in `src/index.ts`.** No seed data, no startup hooks, no custom plugin registration.
