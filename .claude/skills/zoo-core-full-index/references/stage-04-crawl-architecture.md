# Stage 04 — Crawl Architecture

**Goal:** Produce `architecture.md` in the sidecar — the service's structural layout, layers, integration points, and durable workflow presence. This is the doc the Architect agent reads when designing a feature that touches this service.

## What to capture

### Solution / project layout

- List every .NET project (or Angular project, or Python package, etc.) in the service with a one-line purpose
- Note the layered pattern if present (`Api` / `Application` / `Domain` / `Infrastructure` / `LegacyData` / `Integrations`)
- Frontend: distinguish `apps/` vs `libs/`, standalone-component regions, feature-module structure under `src/app/modules/`

### Layer responsibilities

For each layer, a concise "what lives here" description grounded in what you actually see, not what the pattern book says. If the service deviates from the standard layered pattern, call that out explicitly.

### Integration points

- **External services consumed** — ATTOM, SendGrid, Azure Blob, OpenAI, Figma, ADO APIs, GitHub, etc. Name each + how it's wired (config key, wrapper class, package)
- **Internal services consumed** — other Zoodealio services this one calls out to. Capture: which service, which endpoints (cross-reference api-catalog), auth pattern used
- **Internal services that consume this one** — if known from context clues (e.g., comments, README, Postman collections); else skip
- **Shared packages** — `Zoodealio.Shared` DTOs used, AutoMapper profiles, common middleware

### Durable workflows / background processing

- **Temporal.io** presence — list Workflow classes and Activities, where they're registered, which services trigger them
- **Hosted services** — `IHostedService` implementations, what they do, on what schedule
- **Background jobs** — Hangfire, Quartz, ABP background jobs, or custom scheduler — capture the job list

### Authentication + authorization

- Auth scheme (JWT Bearer is the Zoodealio baseline; ABP auth in Offervana_SaaS)
- Role/policy definitions
- Special auth behaviors (service-to-service auth, API keys for MCP/external tools)

### Data flow patterns

- How does the primary happy-path data flow through the service? (e.g., "Request → Controller → MediatR command → Domain service → EF Core → DB; OR → Temporal workflow → Activities → external API")
- Call out any notable deviations (ABP AppServices, minimal APIs, Azure Functions invocation paths)

### Config surface

- Key `appsettings.json` / `.env` / Terraform variables that drive behavior
- MCP server integrations (ADO MCP, Figma MCP)

## Organization

Structure `architecture.md` top-down: one-line service purpose → project layout → layer responsibilities → data flow → integrations → workflows → auth → config. Include a quick "at a glance" summary at the top (e.g., ".NET 8 + Angular 17 + ABP Zero; 14 .NET projects; 38 Temporal workflows; primary DB: Offervana; consumes ATTOM, SendGrid, Azure Blob").

## Frontmatter

```yaml
---
artifact: architecture
service: {service-name}
commit-sha: {from sidecar index}
generated-at: {ISO timestamp}
---
```

## Review gate

Summarize: project count, layers observed, integration points, workflow count. Flag any surprises (e.g., "no MediatR despite layered pattern," "hosted services that don't match the known set"). Get user approval. Update sidecar and advance.

## Next

`references/stage-05-crawl-patterns.md`
