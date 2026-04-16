---
name: zoo-core-show-schema
description: Looks up entity schemas across Zoodealio services with full column tables, relationships, and cross-service diffs. Use when the user requests to 'show schema', runs '/zoo-core-show-schema', or when an agent needs entity structure.
---

# Zoo-Core Show Schema

## Overview

Stateless entity / table / DTO lookup. Given a name, finds every occurrence across indexed services and returns the full column definitions — never truncated — with relationship details, source service attribution, and freshness warnings.

Invokable by user (`/zoo-core-show-schema`) or by any zoo-core agent needing entity structure mid-task (Architect designing a feature, Dev wanting to know what columns are available, QA generating test data).

Act as a precise schema reference — full detail always; highlight when the same entity exists in multiple services with divergent shapes.

## On Activation

Load config from `{project-root}/_bmad/config.yaml` if available; no custom config needed.

**Preflight:** invoke `zoo-core-onboard` (auto-trigger — handles pending installs + first-time setup silently).

## Inputs

- **Entity name** — case-insensitive (e.g., `OfferDto`, `offer_dto`, `Offer`). Normalize before searching.
- **Service scope** (optional) — restrict to specific services. If omitted, search all.

## Outputs

For each match:

- **Entity name** as it appears in the source
- **Service** + DbContext / data store (primary DB, LegacyData, Azure Search index, Cosmos container, etc.)
- **Full column/field list** — name, CLR type, nullable, default, constraints (keys, unique, required), attributes
- **Relationships** — navigation properties, FKs, relationship type
- **Source file path** — citation for anyone wanting to open the source
- **Indexed date** — from `staleness.md`; flag if older than 30 days with "⚠ indexed {N} days ago"

If the entity appears in multiple services:

- List all occurrences with explicit service attribution
- Highlight **field-level differences** if shapes diverge (e.g., "Offervana_SaaS has `LegacyStatus: int`; TIH has `LegacyStatus: string`")
- Flag the authoritative source where known (usually Offervana_SaaS for shared entities, or `Zoodealio.Shared` for DTOs)

## Implementation

1. Normalize the input entity name (case-insensitive, tolerate `snake_case` / `PascalCase` variants)
2. Search `{project-root}/_bmad/memory/zoo-core/services/*/schemas.md` via Grep for the normalized name + common variants
3. For each match, Read the surrounding section to extract the full entity block
4. Consult `staleness.md` for indexed-date per service
5. Assemble results, grouped by service with cross-service diffs called out

**Never truncate.** The entire point of this skill is that the caller doesn't have to open the source. If an entity has 50 columns, list all 50.

**No match handling.** If there's no match, say so clearly. Suggest `zoo-core-context-search` for a broader search if the caller might have used a related term.

## Related Skills

- `zoo-core-find-endpoint` — for endpoints touching this entity
- `zoo-core-context-search` — broader ecosystem search when schema lookup isn't specific enough
- `zoo-core-full-index` / `zoo-core-diff-update` — if indexed data is stale, flag the maintainer to refresh
