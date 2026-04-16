---
name: zoo-core-context-search
description: Searches the Zoo-Core knowledge base for ecosystem information with inline citations. Use when the user requests to 'search context', 'look up ecosystem info', runs '/zoo-core-context-search', or when an agent needs cross-service knowledge.
---

# Zoo-Core Context Search

## Overview

Stateless query tool over the shipped Zoodealio knowledge base. Takes a natural-language query, searches the relevant knowledge files, returns matched sections with source path + indexed-date citations so callers can trust what they're reading.

Invokable two ways:

- **User-facing** — `/zoo-core-context-search` or a direct request. User gets a formatted answer.
- **Agent-internal** — any zoo-core agent invokes this as a subroutine when it needs ecosystem context mid-task. Agent gets the raw results and integrates them into its own response.

Act as a precise ecosystem librarian — never fabricate, always cite, warn when sources are stale.

## On Activation

Load config from `{project-root}/_bmad/config.yaml` (`zoo-core` section) if available; this skill needs no custom config beyond defaults.

**Preflight:** invoke `zoo-core-onboard` (auto-trigger — handles pending installs + first-time setup silently).

## Inputs

- **Query** — natural-language question or keyword set (e.g., "how does TIH handle offer acceptance," "temporal workflows in Offervana")
- **Service scope** (optional) — restrict search to specific services. If omitted, search all indexed services.

## Outputs

A structured answer with:

- **Direct quote or summary** from each matching source section
- **Citation** — source file path + section anchor + indexed date (from `staleness.md`)
- **Freshness indicator** — if any cited source is older than 30 days, flag with "⚠ indexed {N} days ago"
- **Confidence note** — when results are partial or ambiguous, say so rather than synthesize

If invoked internally by an agent, return raw structured results (agent formats for its own output). If invoked by a user via slash command, format as a readable answer.

## Implementation

1. Read `{project-root}/_bmad/memory/zoo-core/index.md` to discover which services are indexed
2. Parse query intent — is it about APIs, schemas, architecture, patterns, or workflows? (determines which artifact file(s) to search per service)
3. Search the appropriate `{project-root}/_bmad/memory/zoo-core/services/{service}/{artifact}.md` files — use Grep for keyword matches, Read for section extraction
4. Consult `{project-root}/_bmad/memory/zoo-core/staleness.md` for each service's indexed date
5. Assemble results with citations

**Never invent.** If the query has no matches, say so clearly. If the query is ambiguous (e.g., "offers" — could mean Offers in Offervana, OffersAppService, OfferDto, etc.), ask for clarification or present the ambiguous candidates.

**Check curated context.** If the query touches a topic covered in `{project-root}/_bmad/memory/zoo-core/curated/patterns.md` or `curated/recent-changes.md`, surface the curated take as authoritative — those are distilled from multiple diffs/passes and typically more useful than raw service artifacts.

## Related Skills

- `zoo-core-show-schema` — prefer this for schema lookups (narrower, faster)
- `zoo-core-find-endpoint` — prefer this for endpoint lookups (narrower, faster)
- `zoo-core-diff-update` — if the user asks "what changed recently?" and `recent-changes.md` is sparse, a diff-update run might be due
