# Stage 03 — Crawl Schemas

**Goal:** Produce `schemas.md` in the sidecar — every entity, DbContext, and notable DTO an agent might need to reason about, with complete field definitions and relationships.

## What to capture per entity

For every entity / table / persistent shape:

- **Name + table name** (if different via `[Table(...)]`)
- **DbContext it belongs to** — critical for services using the two-database pattern
- **Full column list** — name, CLR type, nullable, default value, constraints (keys, indexes, unique, required)
- **Relationships** — navigation properties, FKs (with target entity), nav type (one-to-one / one-to-many / many-to-many)
- **Source file path**
- **Notable attributes** — `[Column]`, `[MaxLength]`, `[ConcurrencyCheck]`, ABP auditing base classes, soft-delete markers

**Never truncate column definitions.** The whole point of this artifact is that agents don't have to go read the entity source — the full definition lives here.

## Two-database awareness (critical for most .NET services)

Many services use the two-database pattern:

- **Own DbContext** — service-specific entities, writable
- **`OffervanaDbContext` via `LegacyData`** — read-only view of the Offervana DB, used via MediatR CQRS queries

Separate these clearly in `schemas.md`:

- Section 1: the service's own entities (per-DbContext if multiple)
- Section 2: `LegacyData` entities referenced (read-only) — note these are subsets of the authoritative Offervana_SaaS schema

## DTOs worth capturing

Not every DTO belongs here — only the ones that flow across service boundaries or represent stable contracts. Specifically:

- DTOs from `Zoodealio.Shared` that this service consumes or produces (e.g., `OfferDto` and the 6 offer-type DTOs)
- Response DTOs on API endpoints (cross-reference with api-catalog)
- Temporal workflow data shapes (immutable contracts by nature)

Skip transient / request-only DTOs unless they have nontrivial structure.

## Azure Search / Cosmos / NoSQL shapes (where relevant)

- **Zoodealio.MLS** uses Azure AI Search — capture the index definition (field list with types, facetable/filterable/searchable flags)
- **Cosmos** containers — partition key + document shape
- **Strapi** content types → their schema.json structure (Zoodealio.Strapi only)

## Organization of `schemas.md`

Group by DbContext / data store. Within each, sorted alphabetically by entity name. Top-level summary with counts (e.g., "25 entities across 2 DbContexts; references 12 LegacyData entities").

## Frontmatter

```yaml
---
artifact: schemas
service: {service-name}
commit-sha: {from sidecar index}
generated-at: {ISO timestamp}
entity-count: {total}
---
```

## Review gate

Present a summary: entity count per DbContext, notable relationships, any entities that appear to be duplicated/diverged from Offervana_SaaS. Get user approval. Update sidecar `last-completed-stage: schemas` and advance.

## Next

`references/stage-04-crawl-architecture.md`
