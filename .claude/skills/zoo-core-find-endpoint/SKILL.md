---
name: zoo-core-find-endpoint
description: Searches API endpoints across Zoodealio services by name, path, method, or keyword. Use when the user requests to 'find endpoint', runs '/zoo-core-find-endpoint', or when an agent needs an endpoint reference.
---

# Zoo-Core Find Endpoint

## Overview

Stateless API endpoint lookup. Given a keyword, path fragment, or HTTP method, finds matching endpoints across all indexed services and returns method + URL + auth + request/response shapes with citations.

Invokable by user (`/zoo-core-find-endpoint`) or by any zoo-core agent needing an endpoint reference mid-task (Dev looking for a cross-service call, Architect verifying a contract exists, PM confirming an acceptance criterion is testable).

Act as a precise endpoint directory — ranked matches (exact before fuzzy), full detail per match, never guess an endpoint that isn't in the catalog.

## On Activation

Load config if available; no custom config needed.

**Preflight:** invoke `zoo-core-onboard` (auto-trigger — handles pending installs + first-time setup silently).

## Inputs

- **Search term** — can be any of:
  - Endpoint name / keyword (e.g., "accept offer", "offer acceptance")
  - Path fragment (e.g., "/api/offers", "offers/bulk")
  - HTTP method + fragment (e.g., "POST /offers")
  - Fully-qualified controller.method (e.g., "OffersController.Accept")
- **Service scope** (optional) — restrict to specific services. If omitted, search all.

## Outputs

Ranked list of matches, exact matches first. Per match:

- **Method + route** (e.g., `POST /api/offers/{id}/accept`)
- **Service** hosting the endpoint
- **Controller / handler** — class + method with source file path
- **Auth** — anonymous / authenticated / role or policy name
- **Request shape** — body DTO, query params, route params (types)
- **Response shape** — success DTO + status codes
- **Notable behavior** — pagination, caching, Temporal triggers, side effects, cross-service calls
- **Indexed date** — flag if the source service is older than 30 days

Rank by:

1. Exact method + path match (highest)
2. Exact path match (any method)
3. Substring path match
4. Controller.method name match
5. Description keyword match (lowest)

If the top match is significantly better than the rest, present it first + mention "N other less-likely matches" without flooding the output.

## Implementation

1. Parse the search term — is it `METHOD /path`, a path fragment, a controller.method, or freeform keyword?
2. Search `{project-root}/_bmad/memory/zoo-core/services/*/api-catalog.md` via Grep with query-appropriate patterns
3. For each match, Read the surrounding section to extract the full endpoint block
4. Consult `staleness.md` for service freshness
5. Rank and assemble output

**Never hallucinate endpoints.** If the search returns no match, say so clearly. Suggest: either the caller should use `zoo-core-context-search` with a broader query, or the relevant service may need a fresh `zoo-core-diff-update`.

## Related Skills

- `zoo-core-show-schema` — for DTOs used by these endpoints
- `zoo-core-context-search` — broader ecosystem lookup
- `zoo-core-diff-update` — if indexed endpoints feel out of date
