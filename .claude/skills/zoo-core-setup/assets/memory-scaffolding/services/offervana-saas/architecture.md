---
artifact: architecture
service: offervana-saas
commit-sha: 61581dc184777cb7293ae594294d917556a35ca4
generated-at: 2026-04-16
---

# Offervana_SaaS — Architecture

## Overview

**Stack:** .NET 8 (ABP Zero), Angular 15, PrimeNG 15, SQL Server (EF Core 8.0.6), Temporal.io, Redis, Azure Functions, Docker
**Project Type:** Multi-tenant SaaS platform (web API + Angular SPA + Temporal worker + Azure Functions)
**Solution Structure:** 11 `src/` projects + 3 `.Tests/` projects + 2 external Azure Function apps

## Project Structure

```
Offervana_SaaS/
├── aspnet-core/
│   ├── Offervana.Web.sln
│   ├── src/
│   │   ├── Offervana.Core.Shared/           # Shared constants, enums, ABP base types (leaf)
│   │   ├── Offervana.Core/                  # Domain: entities, email templates, Azure Search
│   │   ├── Offervana.EntityFrameworkCore/   # EF Core DbContext, migrations, SQL scripts
│   │   ├── Offervana.Application.Shared/    # Shared DTOs, Temporal workflow contracts, shared onboarding
│   │   ├── Offervana.Application/           # AppServices, OuterApi, Temporal activities, AutoMapper
│   │   ├── Offervana.Web.Core/              # Auth middleware, JWT, Hangfire, Redis, SignalR, Swagger
│   │   ├── Offervana.Web.Host/              # Main API host — Startup, DI, Temporal client, BlogSeoMiddleware
│   │   ├── Offervana.Web.Public/            # Public-facing web host
│   │   ├── Offervana.Storage/               # Cosmos DB generic repository (independent)
│   │   ├── Offervana.Migrator/              # Legacy DB migrator (netcoreapp3.1)
│   │   ├── Zoodealio.Temporal/              # Temporal worker (Docker container)
│   │   ├── Offervana.Application.Tests/     # MSTest + Moq
│   │   ├── Offervana.Core.Tests/            # MSTest + Moq
│   │   └── Zoodealio.Temporal.Tests/        # MSTest + Moq + EF InMemory
│   ├── Zoodealio.FunctionApp/               # Azure Functions: SendGrid webhook (current)
│   └── Zoodealio.Functions/                 # Azure Functions (legacy duplicate)
├── angular/                                 # Angular 15 SPA
├── docker-compose.local.yml
└── scripts/
```

Tests live **under `aspnet-core/src/` as siblings** to the app projects, not in a separate `test/` folder.

### Project Descriptions

| Project | Purpose | Key Dependencies |
|---------|---------|-----------------|
| Offervana.Core.Shared | Shared constants, enums, ABP base types | ABP.Zero.Common (leaf node) |
| Offervana.Core | Domain entities, email templates, Azure Search indexes | Zoodealio.Shared NuGet, Temporalio, SendGrid, Twilio, Recurly, Cloudinary, Azure.Search.Documents |
| Offervana.EntityFrameworkCore | EF Core DbContext (100+ DbSets), migrations, SQL scripts | EF Core 8.0.6, SQL Server provider |
| Offervana.Application | AppServices (88+ concrete classes), OuterApi controllers, Temporal activities, AutoMapper, Quartz | Recurly, CsvHelper, EPPlus, ZeroBounce |
| Offervana.Application.Shared | Shared DTOs, Temporal workflow contracts, cross-project shared onboarding (`OnboardingSharedService`, `RecalculateOffersWorkflow`, `ValidateAvmValueWorkflow`) | Core.Shared, Core, EntityFrameworkCore |
| Offervana.Web.Core | Auth middleware, JWT config, Redis cache, SignalR, Swagger | Abp.RedisCache, Hangfire.SqlServer, Swashbuckle |
| Offervana.Web.Host | API entry point — Startup, DI, Temporal client config, **BlogSeoMiddleware** | Azure SignalR, App Insights, HealthChecks |
| Offervana.Web.Public | Public-facing web host (separate entry) | Web.Core |
| Offervana.Storage | Cosmos DB generic repository pattern | Microsoft.Azure.Cosmos |
| Zoodealio.Temporal | Standalone Temporal worker (Docker) | Application, Core, EF, Storage, Azure.ResourceManager.* |
| Zoodealio.FunctionApp | Azure Functions v4 — SendGrid webhook ingest | Core |
| Zoodealio.Functions | Legacy Azure Functions (duplicate) | Core |

## Layering & Architecture Pattern

ABP Zero layered architecture with domain-driven structure:

### Dependency Flow

```
Core.Shared (leaf)
  └─▶ Core (domain)
       └─▶ EntityFrameworkCore (data)
            └─▶ Application.Shared (shared DTOs + shared onboarding)
            └─▶ Application (business logic)
                 └─▶ Web.Core (middleware/infra)
                      └─▶ Web.Host (API entry — includes BlogSeoMiddleware)
                      └─▶ Web.Public (public entry)

Storage (independent leaf — Cosmos DB)
  └─▶ referenced by Application, Web.Host, Temporal

Zoodealio.Temporal (standalone worker)
  └─▶ Application, Core, EntityFrameworkCore, Storage, Web.Core
```

## Dependency Injection

### Service Registration

ABP module system + extension methods in Startup.cs. Key registration points:
- `Startup.ConfigureServices()` — main DI composition root
- `OffervanaWebCoreModule.PreInitialize()` — ABP module pre-init
- `ConfigureTemporalClient()` — Temporal client with mTLS
- `services.AddScheduler()` — Quartz (all jobs commented out)

### Key Registrations

| Interface | Implementation | Lifetime | Purpose |
|-----------|---------------|----------|---------|
| `IRepository<T>` | `OffervanaRepositoryBase<T>` | Scoped | Custom EF repo with failover + read-only support |
| `ICosmosRepository<T, K>` | `CosmosRepository<T, K>` | Scoped | Cosmos DB generic repo |
| `IEmailService` | `EmailService` | Scoped | Email orchestration |
| `IBlobUrlHelper` | `BlobUrlHelper` | Scoped | Azure Blob URL generation |
| `IIndexService` | `IndexAppService` | Transient | Azure AI Search operations |
| `IOnboardingSharedService` | `OnboardingSharedService` | Scoped | Shared onboarding logic callable from multiple layers |
| `IOrganizationRoleDisplayService` | `OrganizationRoleDisplayService` | Scoped | Org role display resolution |
| `ITemporalClient` | (factory) | Singleton | Temporal Cloud connection |
| ABP AppServices | Auto-registered | Transient | All `*AppService` classes |
| `OuterApiKeyFilter` | (TypeFilter) | Per-request | API key auth for OuterApi |

## Configuration

### appsettings / Environment Variables

| Key | Purpose | Source |
|-----|---------|--------|
| `ConnectionStrings:Default` | SQL Server primary | appsettings |
| `ConnectionStrings:Failover` | SQL Server read replica | appsettings |
| `ConnectionStrings:CosmosDb` | Cosmos DB for AI sessions | appsettings |
| `Abp:RedisCache:ConnectionString` | Redis cache | appsettings |
| `Azure:BlobStorage:ConnectionString` | Azure Blob | appsettings |
| `Azure:Search:*` | Azure AI Search (5 indexes) | appsettings |
| `App:ServerRootAddress` / `ClientRootAddress` | Base URLs | appsettings |
| `Authentication:JwtBearer:*` | JWT auth config | appsettings |
| `Twilio:*` | SMS sending | appsettings |
| `HomeJunction:*` / `Attom:*` / `AirDNA:*` | Property data APIs | appsettings |
| `Cloudinary:*` | Image hosting | appsettings |
| `Recurly:*` | Subscription billing | appsettings |
| `Ghl:*` | GoHighLevel CRM (3 sub-accounts) | appsettings |
| `ZIP:Url` | Investor Portal URL | appsettings |
| `Slack:*` | Bot notifications | appsettings |
| `Temporal*` | Temporal Cloud (namespace, mTLS) | appsettings |
| `Schedules:*` | CRON expressions for Temporal workflows | appsettings |
| `Amplitude:*` / `Langfuse:*` | Analytics / AI observability | appsettings |
| `Cloudflare:*` | DNS management | appsettings |
| `Strapi:*` | CMS API | appsettings |

## External Dependencies

| Dependency | Purpose | Connection |
|------------|---------|------------|
| SQL Server (Azure) | Primary database + failover | `ConnectionStrings:Default/Failover` |
| Azure Cosmos DB | AI chat session storage | `ConnectionStrings:CosmosDb` |
| Redis (Azure) | Distributed cache | `Abp:RedisCache:ConnectionString` |
| Azure Blob Storage | File/document storage, webhook buffering | `Azure:BlobStorage:ConnectionString` |
| Azure AI Search | Full-text search (customers, users, properties, notifications, offers) | `Azure:Search:*` |
| Azure SignalR | Real-time notifications | `Azure:SignalR:ConnectionString` |
| Application Insights | Telemetry/monitoring | `ApplicationInsights:InstrumentationKey` |
| Temporal Cloud | Durable workflow orchestration | `TemporalHost`, mTLS certs |
| SendGrid | Email delivery + webhooks | API key in config |
| Twilio | SMS/voice | `Twilio:AccountSid/AuthToken` |
| Recurly | Subscription billing | `Recurly:ApiKey` |
| Cloudinary | Image hosting/transformation | `Cloudinary:*` |
| Cloudflare | DNS management (custom domains) | `Cloudflare:ApiKey` |
| Google Places API | Address autocomplete/geocoding | `App:GoogleApiKey` |
| HomeJunction | Property data/AVM | `HomeJunction:*` |
| ATTOM | Property valuations/market data | `Attom:*` |
| AirDNA | Short-term rental estimates | `AirDNA:*` |
| Amplitude | Analytics event tracking | `Amplitude:*` |
| Langfuse | AI observability | `Langfuse:*` |
| GoHighLevel | CRM sync (3 sub-accounts) | `Ghl:*` |
| Strapi | CMS content API | `Strapi:*` |
| Slack | Bot notifications | `Slack:*` |
| ZeroBounce | Email validation | API key in config |
| CoinGecko | BTC exchange rate | Public API |
| Smarty Streets | USPS address verification | API key in config |
| Zoodealio.Shared (NuGet) | Shared DTOs across services | Pinned version in Core.csproj |

## Middleware Chain (Web.Host)

Notable middleware in pipeline order:

1. `UserVerificationAccessFilterMiddleware` — blocks unconfirmed phone users (403) with endpoint allowlist
2. `UserLastLoginMiddleware` — tracks last login timestamp
3. `JwtTokenMiddleware` — JWT Bearer authentication
4. **`BlogSeoMiddleware`** (new 2026-04-06, PR 8741) — intercepts blog-URL requests, injects server-rendered SEO metadata into the Angular SPA shell via `BlogSeoHtmlRenderer` for crawlers.
