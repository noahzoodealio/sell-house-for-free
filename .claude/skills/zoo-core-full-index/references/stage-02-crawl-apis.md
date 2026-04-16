# Stage 02 — Crawl APIs

**Goal:** Produce `api-catalog.md` in the sidecar — the authoritative record of every API endpoint this service exposes, with enough detail that an agent can pick a method/route and know how to call it.

## What to capture per endpoint

For every HTTP endpoint:

- **Method + route** (e.g., `GET /api/offers/{id}`)
- **Controller/handler** — fully-qualified class + method name with source file path
- **Auth** — anonymous? authenticated? role requirements? custom policy?
- **Request shape** — body DTO, query params, route params (name + type)
- **Response shape** — success DTO, status codes
- **Notable behavior** — pagination, filtering, caching, rate limits, Temporal triggers, side effects
- **Cross-service calls** — does it call out to other Zoodealio services? which endpoints?

## Zoodealio-specific endpoint sources (look everywhere relevant)

Don't stop at one category — a single service can span several:

- **ASP.NET Core controllers** — `[ApiController]` classes, `[HttpGet/Post/Put/Delete/Patch]` attributes
- **ABP AppServices** (Offervana_SaaS only) — ABP auto-generates routes from service classes; check `OffervanaAppServiceBase` descendants
- **Azure Functions** — `[HttpTrigger]` functions (Zoodealio.MLS)
- **Minimal API endpoints** — `MapGet`/`MapPost` calls in Program.cs or endpoint registrations
- **Angular API service methods** — frontend consumers that reveal intended route contracts (useful for cross-checking)
- **Strapi auto-generated endpoints** — Zoodealio.Strapi auto-generates REST endpoints from content types
- **BLAST API endpoints** (Zoodealio.Chat consumer of Offervana_SaaS) — OpenAI tools that wrap internal APIs

## Organization of `api-catalog.md`

Group endpoints by functional area (e.g., "Offers", "Properties", "Users") — not by controller. Within each group, list endpoints in a readable table or per-endpoint block. Include a top-level summary count (e.g., "141 endpoints across 12 functional areas").

## Frontmatter for the sidecar artifact

```yaml
---
artifact: api-catalog
service: {service-name}
commit-sha: {from sidecar index}
generated-at: {ISO timestamp}
endpoint-count: {total}
---
```

## Review gate

Present a summary to the user: count of endpoints found, functional area breakdown, any ambiguities or surprises. Ask for approval. On approval, update sidecar `index.md` with `last-completed-stage: apis` and move on.

## Next

`references/stage-03-crawl-schemas.md`
