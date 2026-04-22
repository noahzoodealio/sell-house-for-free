---
artifact: schemas
service: zoodealio-strapi
commit-sha: 09496f9dcc58e52d710e04cdf6e0770741bcc3fb
generated-at: 2026-04-15T00:00:00Z
entity-count: 10
---

# Schemas — Zoodealio.Strapi

## Summary

10 persistent shapes total: **5 content types** (3 collection, 2 single) + **5 reusable components** (all under the `shared.*` namespace, used as embedded values via Strapi's component / dynamiczone mechanism).

- **Data store:** single Strapi-managed relational DB. Driver is **runtime-selectable via `DATABASE_CLIENT`** (`sqlite` default, `mysql`, or `postgres`) — see `config/database.ts`. There is no fixed DB engine in source; production is presumably postgres or mysql but the choice is environment-only.
- **Two-database pattern: N/A.** Strapi does not connect to OffervanaDb. There is no `LegacyData` equivalent; this service shares no entities with Offervana_SaaS.
- **Migrations:** `database/migrations/` is empty (only `.gitkeep`). Schema is materialized at boot from the JSON definitions below — Strapi's content-type builder owns DDL.
- **Seed:** `scripts/seed.js` exists and `data/data.json` ships with example content (Strapi blog template defaults — coffee/pizza articles, "Thelonius Monk" quote, etc.). This is **demo data, not Zoodealio business data**.
- **Generated TypeScript types:** `types/generated/{components.d.ts,contentTypes.d.ts}` are committed (~37 KB total) — produced by `strapi develop`/`strapi build` and checked in. Cover the five content types, five components, plus all Strapi internal types (admin users, API tokens, transfer tokens, plugin tables).

## Strapi schema mechanics (read this once)

Every content type and component carries Strapi-managed columns in addition to the `attributes` declared in its `schema.json`:

- `id` (numeric, auto-increment) — Strapi v5 internal row id
- `documentId` (string, ULID) — Strapi v5 public id used in REST routes
- `createdAt`, `updatedAt`, `publishedAt` (publishedAt only if `draftAndPublish=true`)
- `createdBy`, `updatedBy` (admin user FKs)
- `locale` if i18n is enabled per content-type (none are, in source)

Relations create join tables auto-named by Strapi (e.g., `articles_author_lnk`, `articles_components`). Dynamiczone fields (`blocks`) materialize via the `*_components` polymorphic join — each row carries `component_type` (e.g., `shared.media`) and `component_id`.

`uid` attributes (slugs) are unique strings. With `targetField` set, Strapi auto-derives from the source column on save; without it, the caller must supply a value.

---

## Content types

### `api::about.about` (single type) — `abouts`

Source: `src/api/about/content-types/about/schema.json`. `draftAndPublish: false`.

| Attribute | Type | Required | Notes |
|---|---|---|---|
| title | string | no | |
| blocks | dynamiczone | no | Allowed components: `shared.media`, `shared.quote`, `shared.rich-text`, `shared.slider`. Stored via `abouts_components` join. |

### `api::article.article` (collection type) — `articles`

Source: `src/api/article/content-types/article/schema.json`. `draftAndPublish: true` — every row has both a draft and a published variant; `publishedAt` distinguishes.

| Attribute | Type | Required | Notes |
|---|---|---|---|
| title | string | no | |
| description | text | no | `maxLength: 80`. |
| slug | uid | no | `targetField: "title"` — auto-derived on save. |
| cover | media | no | Single. Allowed types: images, files, videos. FK to `files` table via `files_related_morphs`. |
| author | relation manyToOne → `api::author.author` | no | `inversedBy: "articles"`. Join table: `articles_author_lnk`. |
| category | relation manyToOne → `api::category.category` | no | `inversedBy: "articles"`. Join table: `articles_category_lnk`. |
| blocks | dynamiczone | no | Allowed components: `shared.media`, `shared.quote`, `shared.rich-text`, `shared.slider`. |

### `api::author.author` (collection type) — `authors`

Source: `src/api/author/content-types/author/schema.json`. `draftAndPublish: false`.

| Attribute | Type | Required | Notes |
|---|---|---|---|
| name | string | no | |
| avatar | media | no | Single. Allowed types: images, files, videos. |
| email | string | no | **No format validation, no uniqueness constraint.** |
| articles | relation oneToMany → `api::article.article` | — | `mappedBy: "author"` — inverse side, not stored on author row. |

### `api::category.category` (collection type) — `categories`

Source: `src/api/category/content-types/category/schema.json`. `draftAndPublish: false`.

| Attribute | Type | Required | Notes |
|---|---|---|---|
| name | string | no | |
| slug | uid | no | **No `targetField` — must be supplied by caller.** Unique. |
| articles | relation oneToMany → `api::article.article` | — | `mappedBy: "category"` — inverse side. |
| description | text | no | |

### `api::global.global` (single type) — `globals`

Source: `src/api/global/content-types/global/schema.json`. `draftAndPublish: false`.

| Attribute | Type | Required | Notes |
|---|---|---|---|
| siteName | string | **yes** | |
| favicon | media | no | Single. Allowed: images, files, videos. |
| siteDescription | text | **yes** | |
| defaultSeo | component `shared.seo` (non-repeatable) | no | Stored via `globals_components` join with `component_type='shared.seo'`. |

---

## Components (`shared.*`)

Components are reusable embedded shapes — they don't get their own REST routes, but they materialize as backing tables (`components_shared_*`) and are joined to parents via component join tables.

### `shared.media` — `components_shared_media`

Source: `src/components/shared/media.json`. Icon: `file-video`.

| Attribute | Type | Required | Notes |
|---|---|---|---|
| file | media | no | Single. Allowed: images, files, videos. |

### `shared.quote` — `components_shared_quotes`

Source: `src/components/shared/quote.json`. Icon: `indent`.

| Attribute | Type | Required | Notes |
|---|---|---|---|
| title | string | no | |
| body | text | no | |

### `shared.rich-text` — `components_shared_rich_texts`

Source: `src/components/shared/rich-text.json`. Icon: `align-justify`.

| Attribute | Type | Required | Notes |
|---|---|---|---|
| body | richtext | no | Markdown. |

### `shared.seo` — `components_shared_seos`

Source: `src/components/shared/seo.json`. Icon: `allergies`. Used by `api::global.global.defaultSeo`.

| Attribute | Type | Required | Notes |
|---|---|---|---|
| metaTitle | string | **yes** | |
| metaDescription | text | **yes** | |
| shareImage | media | no | Single. Allowed: **images only**. |

### `shared.slider` — `components_shared_sliders`

Source: `src/components/shared/slider.json`. Icon: `address-book`.

| Attribute | Type | Required | Notes |
|---|---|---|---|
| files | media | no | **Multiple**. Allowed: images only. |

---

## Relationship map

```
author ──oneToMany──▶ article ◀──manyToOne── category
                       │
                       ├── cover (media → file)
                       └── blocks (dynamiczone → shared.media | shared.quote | shared.rich-text | shared.slider)

about ── blocks (dynamiczone → shared.media | shared.quote | shared.rich-text | shared.slider)

global
  ├── favicon (media → file)
  └── defaultSeo (component → shared.seo)
                          └── shareImage (media → file)
```

No relation crosses out to Offervana_SaaS, TIH, ZIP, or any other Zoodealio service. All FKs are intra-service.

---

## DTOs that flow across service boundaries

**None.** Strapi exposes its own auto-generated REST envelope (`{ data, meta }`); no `Zoodealio.Shared` types are consumed or produced. Consumers (the Angular marketing frontend) shape against Strapi's response envelope directly.

---

## Ambiguities / surprises

1. **`draftAndPublish` only on Article.** About, Author, Category, Global all skip it. Editing About in the admin produces an immediately-live change with no preview workflow — confirm that's intentional for a production CMS.
2. **`category.slug` lacks `targetField`.** Articles auto-slug from title; categories don't. Either the admin user always types one (acceptable), or callers POSTing `/api/categories` will silently land empty slugs. Worth fixing in schema.
3. **`author.email` has no validation or uniqueness.** Two authors can share an email; an empty string is accepted.
4. **Demo seed shipped in repo.** `data/data.json` and `scripts/seed.js` are the Strapi blog template — unrelated to Zoodealio domain. Safe to ignore for any analysis of "what content lives here", but worth knowing the seed exists in case it gets imported by accident on a fresh env.
5. **Empty `database/migrations/`.** Knex migrations are not used; Strapi's content-type sync owns DDL. If a column drift happens between branches, it manifests at boot as a schema reconciliation against `strapi_database_schema`, not as an explicit migration.
6. **No content types matching Zoodealio domain.** The CMS today only carries blog primitives (article, author, category) and meta singletons (about, global). Anything offer-, property-, or investor-facing would have to be added — none exists today.
