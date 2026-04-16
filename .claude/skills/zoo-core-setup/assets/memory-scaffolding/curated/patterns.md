# Zoo-Core Baseline Patterns

Authoritative cross-service conventions for the Zoodealio ecosystem. Read on every agent activation. Deviations in a specific service are captured in that service's `services/{service}/patterns.md`; approved deviations that emerge repeatedly are candidates for promotion here via `zoo-core-curate-memory` (maintainer mode).

---

## Backend (.NET)

### Data access

- **Two-database pattern** — every service that needs Offervana data has its own DbContext + a read-only `OffervanaDbContext` via a `LegacyData` project.
- **New DB → DI services:** `public class MyService(MyDbContext context, IMapper mapper) : IMyService`
- **Legacy DB → MediatR CQRS:** `public record GetDataQuery(int Id) : IRequest<Dto>`

### Project structure

Layered: `Api / Application / Domain / Infrastructure / LegacyData / Integrations`.

### Libraries + conventions

- **AutoMapper** for DTO mapping
- **JWT Bearer** auth on all APIs
- **Azure Blob Storage** for file handling
- **SendGrid** for email via `Integrations/` project
- **Temporal.io** for durable workflows (Offervana, Chat, MLS use it)
- **ABP / ABP Zero** framework in Offervana_SaaS only
- **FluentValidation** (or data annotations) for request validation

## Frontend (Angular)

### Component conventions

- **Standalone components only** — no NgModules
- **OnPush** change detection on all components
- **`inject()`** function for DI, not constructor injection
- **Private members prefixed with `_`**
- **Signals** for reactive state where appropriate

### UI library

- **PrimeNG** is the component library. Version per service:
  - TIH: PrimeNG 21
  - ZIP: PrimeNG 20
  - Offervana: check service's `package.json`
- Feature-based module structure under `src/app/modules/`

## Infrastructure

- **Docker** — multi-stage builds, Azure Container Apps deployment
- **Azure Container Registry** — `devzoodealioacr.azurecr.io`
- **Terraform** — modular, per-environment tfvars (`dev/`, `uat/`, `prod/`)

## Offer type domain model

Defined in `Zoodealio.Shared`, created in `Offervana_SaaS`, displayed in `TradeInHoldings` + `investor-portal`, explained by `Zoodealio.Chat`:

| Offer Type | DTO | Description |
|---|---|---|
| Cash | `CashOfferTypeDto` | Simple cash purchase |
| Cash+ | `CashOfferPlusTypeDto` | Two-payout: immediate cash + holdback at resale |
| Cash+ with Repairs | `FixListTypeDto` | Cash+ with repair escrow (Hola Home Constructions) |
| Sell Leaseback | `SellLeasebackTypeDto` | Seller stays in home post-sale |
| List on Market | `ListOnMarketTypeDto` | Traditional listing option |
| Cash Buyer | `CashBuyerTypeDto` | Direct cash buyer variant |

## Integrations

### Azure DevOps

- **Org:** `tf-offervana`, **Project:** `Offervana_SaaS`
- Work item hierarchy: Feature → Epic → Story / Bug → Task / Test Case
- PM agent uses Azure DevOps MCP server

### External services

- **ATTOM Data API** — property data, AVM, comps. Wrapped in `IAttomService` classes; see `zoo-core-attom-reference` subprocess for inline context.
- **BLAST** — Zoodealio's property data API suite surfaced by Offervana_SaaS to consumers.
- **OpenAI Agents SDK** — used by `Zoodealio.Chat`.
- **Figma MCP server** — design spec retrieval for UX agent.
- **GitHub CLI (`gh`)** — used for GitHub-origin PRs in `zoo-core-pr-triage`.

## Safety rules

- **EF migrations halt for user application confirmation** — no auto-apply across any dev workflow.
- **CodeRabbit compliance** — required before close-out on all code-producing workflows.
- **Never commit in PR triage** — developer commits; triage only modifies the working tree.

## Service stack snapshot (as of last curation)

| Service | Backend | Frontend | Notable |
|---|---|---|---|
| Offervana_SaaS | .NET 8, ABP Zero | Angular | System of record for OffervanaDb |
| Zoodealio.TradeInHoldings | .NET 10, MediatR, EF Core | Angular 21, PrimeNG 21 | TIH ops platform |
| investor-portal | .NET 10, EF Core | Angular 20, PrimeNG 20 | ZIP — investor/funder portal |
| Zoodealio.MLS | .NET 8, Azure Functions | — | MLS data service, Azure AI Search |
| Zoodealio.Chat | Python, Chainlit, OpenAI Agents | — | AI chat, Temporal |
| Zoodealio.Shared | .NET 8, NuGet package | — | Shared DTOs (offer types, iBuyer interfaces) |
| Zoodealio.Strapi | Node.js, TypeScript | — | Strapi 5 CMS |
| Zoodealio.Infrastructure | Terraform, Azure | — | IaC |
