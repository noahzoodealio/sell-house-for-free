---
artifact: architecture
service: investor-portal
commit-sha: fa73b99cc3cccda1c404ea03329df9b99c3469f1
generated-at: 2026-04-15T00:00:00Z
---

# Zoodealio Investor Portal (ZIP) — Architecture

## At a Glance

.NET 10 backend (139 HTTP endpoints) + Angular 20 / PrimeNG 21 frontend with standalone components. Backend: 4 layered projects (Api / Application / Infrastructure / Integrations). **No local Domain project** — entities + `InvestorPortalDbContext` live in sibling `Zoodealio.Shared` NuGet package. **No LegacyData project, no Temporal.io** — departs from CLAUDE.md's standard Zoodealio pattern. Connects to 4 databases: `InvestorPortalDb` (owns migrations), `OffervanaDb` (read/write), Offervana failover (read-only queries), `TradeInHoldingsDb`. External integrations: SendGrid, Cloudinary, ATTOM, HomeJunction, Azure Blob (2 accounts), Azure Search (5 indexes), Slack, Twilio, Azure Service Bus. Inbound webhooks from Offervana_SaaS; **no outbound cross-service HTTP calls** detected. One `BackgroundService` (`ServiceBusQueueConsumer`) for async messaging; no other hosted services. JWT Bearer auth with custom `[AuthorizeRoles]` + `[AuthorizeRolesOrInviteToken]` + API-key gating for `/openapi/*`. No Dockerfile, no CI/CD, no IaC in repo.

---

## 1. Solution & Project Layout

### Backend Projects

All paths relative to `investor-portal/investor-portal-services/`. Solution: `ZoodealioInvestorPortal.Api/ZoodealioInvestorPortal.sln`.

#### `ZoodealioInvestorPortal.Api` — HTTP surface & composition root

Entry point. Hosts controllers across 9+ feature areas, JWT Bearer auth, rate limiting, custom authorization, CORS, Scalar OpenAPI UI. Registers DI from Application / Infrastructure / Integrations. Uses MediatR dispatch from controllers into Application.

Key NuGet deps:
- `MediatR` 14.1.0
- `AutoMapper` 16.1.1
- `Microsoft.AspNetCore.Authentication.JwtBearer` 10.0.5
- `Scalar.AspNetCore` 2.13.20
- `System.IdentityModel.Tokens.Jwt` 8.17.0
- `Zoodealio.Shared` 0.1.12803

Folders:
- `Attributes/` — `AuthorizeRolesAttribute`, `AuthorizeRolesOrInviteTokenAttribute`, `OpenApiKeyMiddleware` (API-key validation for `/openapi/*`)
- `Controllers/` — 22 controllers grouped by domain; `Legacy/*` for Offervana read-only; `OuterApi/*` external-partner surface
- `Filters/` — `UserFriendlyExceptionFilter` (maps `UserFriendlyException` → HTTP 499); `OpenApiScalarFilterMiddleware` (hides `/openapi/*` from `/scalar-open`)
- `Extensions/` — `ClaimsPrincipalExtensions` (JWT claim helpers)
- `Services/` — `HttpUserContext` implements `IUserContext` (scoped, resolves user identity + memberships from JWT + DB)
- `wwwroot/` — HTML email templates, static assets
- `Program.cs` — DI wiring, JWT validation, CORS, rate limiting, pipeline, migrations, Scalar config
- `appsettings.json` — connection strings, JWT, SendGrid, Cloudinary, ATTOM, HomeJunction, Azure Search, Slack, Twilio, Service Bus

#### `ZoodealioInvestorPortal.Application` — Business logic (MediatR + Services)

Class library. CQRS-lite via MediatR: Commands for writes, Queries for reads, plus Services for domain orchestration that doesn't fit the CQRS request-per-operation shape. Interfaces layer decouples controllers/handlers from implementations. Single consolidated `AutoMapperProfile` maps DTOs ↔ entities.

Key NuGet deps:
- `MediatR` 14.1.0
- `AutoMapper` 16.1.1
- `Azure.Search.Documents` 11.7.0
- `Twilio` 7.14.3
- `Zoodealio.Shared` 0.1.12803

Folders:
- `Commands/` — 6 write ops: `CreateOfferCommand`, `EditOfferCommand`, `DeleteOfferCommand`, `PatchPropertyCommand`, `PropertyVisibilityCommand`, `PropertyWatchlistCommand`
- `Queries/` — 15+ read queries (offers, properties, tenants, ibuyers, offer statuses, notifications)
- `DTOs/` — 78 DTOs across 16 domain folders (Auth, Buybox, Company, Enterprise, File, Notifications, Offer, Profile, Property, Search, Tenant, User, UserTenancy, etc.)
- `Interfaces/` — Service contracts per domain
- `Services/` — Implementations: Auth, Offer, Company, User, Buybox, Property, Profile, Access, File, Notifications, Search, Index, Sms, Url, UserTenancy
- `Mapping/AutoMapperProfile.cs` — all mapping config

#### `ZoodealioInvestorPortal.Infrastructure` — Data access wiring

Class library. **Does not define entities or DbContexts** — both live in `Zoodealio.Shared`. Owns EF migrations for `InvestorPortalDb` only; registers all 4 DbContexts via DI extension methods.

Key NuGet deps:
- `Microsoft.EntityFrameworkCore` 10.0.5
- `Microsoft.EntityFrameworkCore.SqlServer` 10.0.5
- `Microsoft.EntityFrameworkCore.Tools` 10.0.5
- `Zoodealio.Shared` 0.1.12803

Folders:
- `Data/DbInitializer.cs` — dev-time seed
- `Migrations/` — EF migrations for InvestorPortalDb; `Scripts/` for pre/post-deploy SQL

#### `ZoodealioInvestorPortal.Integrations` — External service wrappers + Service Bus

Class library. Thin wrappers for cloud SDKs (Blob, Email, CDN, Property data, SMS, Slack). Service Bus publisher/consumer wiring plus handler registry.

Key NuGet deps:
- `Azure.Storage.Blobs` 12.27.0
- `Azure.Messaging.ServiceBus` 7.20.1
- `CloudinaryDotNet` 1.28.0
- `SendGrid` 9.29.3
- `Microsoft.Extensions.Http` 10.0.5
- `Microsoft.Extensions.Hosting.Abstractions` 10.0.5
- `Zoodealio.Shared` 0.1.12803

Folders:
- `Services/`
  - `BlobStorageClient` (InvestorPortal blob account)
  - `OffervanaBlobStorageClient` (Offervana blob account)
  - `SendGridService`, `EmailService`
  - `CloudinaryClient`
  - `AttomClient`, `HomeJunctionClient`
  - `SlackClient`
  - `ServiceBusQueuePublisher`, `ServiceBusQueueConsumer` (BackgroundService)
- `Interfaces/` — contracts (`IEmailService`, `IBlobStorageClient`, etc.)
- `QueueHandlers/` — `IMessageHandlerRegistry`, `ServiceBusQueues.ActiveQueues`, `TestQueueMessageHandler` (only handler currently wired)
- `Models/MessageContext.cs` — Service Bus message metadata

### Frontend Project

Path: `investor-portal/investor-portal-spa/`

Angular 20 standalone-component app. No NgModules. No Nx — plain Angular CLI workspace. Custom ESLint rules live in `eslint-rules/`.

`src/app/` layout:
- `AppComponent` — standalone root, imports `RouterOutlet`, `ToastModule`, layout wrappers
- `app.routes.ts` — top-level lazy routes:
  - `/landing` — public
  - `/auth` — register/login/password flows
  - `/investor` — Investor pages (AuthGuard + CompanyActiveGuard)
  - `/enterprise-user` — Enterprise pages (role guard)
  - `/host-admin` — Admin pages (role guard)
  - `/enterprise` — Enterprise onboarding (standalone)
  - `/style-showcase` — dev only
  - `/redirector` — role-based post-login redirect
- `modules/`
  - `auth/` — auth.routes.ts + components
  - `landing/`
  - `investor/` — offers, properties, watchlist, buybox, profile
  - `enterprise-user/` — enterprise dashboard, team mgmt, reports
  - `host-admin/` — admin user/tenancy management
  - `shared/` — eagerly loaded
    - `components/` (navbar, footer, redirector, env tag, impersonation indicator)
    - `controls/` (custom form controls)
    - `services/` (AuthService, DataService, FileService, ValidationService, TenantService, ImpersonationService, etc.)
    - `guards/` (AuthGuard, RoleGuard, CompanyActiveGuard)
    - `interceptors/` (auth token attach, error handling)
    - `models/`, `directives/`, `pipes/`, `styles/`, `utils/`, `configs/`

Key `package.json` deps:
- `@angular/*` 21.1.0 — **actual installed version is 21, not 20 as CLAUDE.md says**
- `primeng` 21.0.4 + `@primeuix/themes` 1.2.5
- `leaflet` 1.9.4 + `@maptiler/sdk` 3.10.2
- `chart.js` 4.5.1
- `quill` 2.0.3
- `ngx-mask` 20.0.3
- `pdf-lib` 1.17.1
- `heic-to` 1.3.0
- `rxjs` ~7.8.0

---

## 2. Layer Responsibilities (grounded in code)

### Api
- HTTP binding (controllers, routes)
- DI composition (`Program.cs`)
- Middleware: CORS, auth, rate limiting, custom API-key middleware, Scalar filter
- Filters: `UserFriendlyExceptionFilter`
- Attributes: custom authorization
- `IUserContext` implementation (request-scoped)

### Application
- MediatR Commands/Queries (business ops)
- Services for orchestration that doesn't map cleanly to single request/response
- AutoMapper profile
- DTO definitions (request/response payloads)
- Interface layer for Services

### Infrastructure
- DbContext registration (all 4 contexts)
- Migration ownership (InvestorPortalDb only)
- Dev seed data

### Integrations
- External SDK wrappers
- Service Bus publisher + consumer
- Message handler registry

### Domain (delegated to `Zoodealio.Shared`)
- 16 entities at `Zoodealio.Shared/InvestorPortal/Domain/Entities/`
- 9 enums at `Zoodealio.Shared/InvestorPortal/Domain/Enum/`
- `InvestorPortalDbContext` at `Zoodealio.Shared/InvestorPortal/Infrastructure/`
- `UserFriendlyException` and cross-service DTOs

### Deviations from CLAUDE.md's standard

1. **No local Domain project** — all Domain code lives in `Zoodealio.Shared`.
2. **No LegacyData project**, no `OffervanaDbContext` projection — the service talks to Offervana's DB directly via the `Zoodealio.Shared`-provided `OffervanaDbContext`.
3. **No Temporal.io** — background work is synchronous MediatR or Service Bus-based.
4. **No repository pattern** — services query DbContexts directly with LINQ-to-EF.

---

## 3. Integration Points

### External services consumed

| Service | Wrapper | Config keys | Purpose |
|---|---|---|---|
| **SendGrid** | `SendGridService` (Integrations) + `IEmailService` | `SendGrid:ApiKey`, `SendGrid:DefaultFromEmail`, `SendGrid:DefaultFromName`, `SendGrid:PrimaryIpPoolName`, `SendGrid:SecondaryIpPoolName` | Transactional email (welcome, offer status, invites, password reset); IP-pool rotation |
| **Cloudinary** | `CloudinaryClient` | `Cloudinary:CloudName`, `Cloudinary:ApiKey`, `Cloudinary:ApiSecret`, `Cloudinary:Environment` | Image hosting / CDN |
| **ATTOM** | `AttomClient` (HttpClient via IHttpClientFactory) | `Attom:PrivateToken` | Property data enrichment |
| **HomeJunction** | `HomeJunctionClient` (HttpClient via IHttpClientFactory) | `HomeJunction:PrivateToken` | Alternate property data source |
| **Azure Blob (InvestorPortal)** | `BlobStorageClient` | `ConnectionStrings:AzureStorage`, `Azure:BlobBaseUrl`, `Azure:BlobPublicContainer` | InvestorPortal file storage |
| **Azure Blob (Offervana)** | `OffervanaBlobStorageClient` | `ConnectionStrings:OffervanaAzureStorage` | Offervana asset storage |
| **Azure AI Search** | Direct `Azure.Search.Documents` client in Application services | `AzureSearch:Endpoint`, `AzureSearch:AccessKey`, + 5 index name keys | Full-text search for Properties, Offers, Customers, Users, Notifications |
| **Slack** | `SlackClient` (HttpClient) | `Slack:BotToken`, `Slack:BaseUrl`, `Slack:Channels:Preliminary`, `Slack:Channels:OfferStatus` | Team channel notifications (offer status, preliminary offers) |
| **Twilio** | `TwilioSmsSender` (direct SDK) | `Twilio:AccountSid`, `Twilio:AuthToken`, `Twilio:SenderNumber` | SMS notifications |
| **Azure Service Bus** | `ServiceBusClient` (singleton), publisher, consumer | `ConnectionStrings:ServiceBus` | Async messaging (minimal usage currently) |

### Internal services

**Outbound HTTP calls to other Zoodealio services:** None detected. This service does not call Offervana_SaaS or TIH via HTTP.

**Database coupling:**
- `OffervanaDbContext` — read/write access to Offervana_SaaS's DB for Properties, Customers, IBuyers, IBuyerOffers, PropertyCompanyStatus, Tenants, etc.
- `OffervanaReadOnlyDbContext` — failover connection for read queries (separate `FailoverDb` connection string)
- `TradeInHoldingsDbContext` — read/write to TIH's DB for lien/asset data
- `UserTenancy.TenancyId` links to Offervana `Tenant.Id` (app-layer only, no FK constraint)

⚠️ **Cross-service data coupling:** This service writes directly to Offervana_SaaS's database (`IBuyerOffers`, `PropertyCompanyStatus`) and TIH's database. This is a significant departure from standard microservice isolation and the CLAUDE.md "Offervana_SaaS (only writer)" claim.

**Inbound webhooks (Offervana_SaaS → ZIP):**
- `POST /api/Offer/NotifyInvestorOnOfferStatusChange`
- `POST /api/Offer/NotifyInvestorOnOfferAccepted`
- `POST /api/Offer/NotifyTeamOnOfferAccepted`
- `POST /api/Offer/NotifyUsersBuyboxMatchEmailAsync` (legacy single)
- `POST /api/Offer/NotifyUsersBuyboxMatchBatch` (consolidated 15-min batches per property)

All marked `[AllowAnonymous]` — ⚠️ not gated by shared secret or signature. Flagged as TODO in code comments for migration to Service Bus.

### Shared package namespaces consumed

- `Zoodealio.Shared.InvestorPortal.Domain.Entities.*` — 16 entity types
- `Zoodealio.Shared.InvestorPortal.Domain.Enum.*` — 9 enums
- `Zoodealio.Shared.InvestorPortal.Infrastructure.InvestorPortalDbContext`
- `Zoodealio.Shared.Offervana.LegacyData.*` — OffervanaDbContext + legacy entities (Property, Customer, IBuyer, IBuyerOffer, Tenant, PropertyCompanyStatus)
- `Zoodealio.Shared.Dtos.Offers.*` — shared offer-type DTOs (CashOfferTypeDto, CashOfferPlusTypeDto, FixListTypeDto, SellLeasebackTypeDto, ListOnMarketTypeDto, CashBuyerTypeDto)

---

## 4. Durable Workflows & Background Processing

### Temporal.io
Not present. No `Workflow`, `Activity`, or `Temporal.Client` references found.

### IHostedService / BackgroundService
- **`ServiceBusQueueConsumer`** (Integrations, implements `BackgroundService`)
  - Starts on app init
  - Creates `ServiceBusProcessor` per queue in `ServiceBusQueues.ActiveQueues`
  - Dispatches messages via `IMessageHandlerRegistry` keyed by queue + message subject
  - Max concurrency: 1 per queue
  - Auto-complete disabled; manual ack in handlers
  - No retry policy → failed messages drop

### Hangfire / Quartz / ABP background jobs
Not present.

### Rate limiting
- `forgotPassword` — 3 requests per 15 min (fixed-window; applied via `[EnableRateLimiting("forgotPassword")]`)
- No other endpoints rate-limited

### Immediate side-effects (within request)
- Email send (SendGrid), Slack post, Azure Search index, DB writes — all synchronous in-request
- Service Bus publish is fire-and-forget but synchronous from the caller's view

---

## 5. Authentication & Authorization

### JWT Bearer scheme
- Issuer: `Application:Issuer` (e.g., `"ZoodealioInvestorPortal"`)
- Audience: `Application:Audience` (e.g., `"PortalInvestorsAudience"`)
- Signing key: `Application:Token` (symmetric HS256)
- Validates issuer, audience, lifetime, signature

### Emitted claims
- `ClaimTypes.NameIdentifier` — user GUID
- `ClaimTypes.Email`, `ClaimTypes.Name`, `ClaimTypes.MobilePhone`
- `ClaimTypes.Role` — Role enum as string
- `"CompanyIsActive"` — active/inactive check for gate
- `"CompanyId"` — primary company
- `"TenancyId"` — Offervana tenant linkage

### Custom authorization attributes
- **`[AuthorizeRoles(role1, role2, …)]`** — role-hierarchy aware via `RoleHierarchy.ToAllowedRoleNames`. 401 on mismatch.
- **`[AuthorizeRolesOrInviteToken(role1, role2, …)]`** — passes authenticated role-match OR unauthenticated users carrying a valid `?token=…` query param. Validates token in DB against `GlobalInviteLinks` / `CompanyInvites` (expiry + revocation).

### `IUserContext` (`HttpUserContext`)
Scoped service; exposes:
- `UserId`, `Role`, `Email`
- `IsImpersonating`, `RealUserId` (via `x-impersonated-user-id` header, admin-only)
- `CanSeeAllProperties` (User shadow column)
- `TenantIds()`, `CompanyIds()`, `ParentCompanyIds()`, `ChildUserIds()` — async, DB-backed, used for access control & team-hierarchy visibility

### API-Key path (for `/openapi/*`)
- Middleware: `OpenApiKeyMiddleware`
- Header: `API-KEY: <guid>`
- DB lookup: `Users.FirstOrDefault(u => u.ApiKey == apiGuid)`
- Issues synthetic `NameIdentifier` + `Role` claims on match

### Impersonation
- Header: `x-impersonated-user-id`
- Admin-only; validated against DB
- Invalid header or non-admin → warning log, impersonation not applied

---

## 6. Data Flow Patterns

### Happy path
1. HTTP request → pipeline (CORS → rate-limit → auth → custom attribute)
2. Controller extracts `IUserContext`, validates, dispatches either:
   - `IMediator.Send(command_or_query)` — CQRS path
   - Direct `_service.DoX(…)` — Service path
3. Handler/Service:
   - Validates input + business rules
   - Queries DbContexts (InvestorPortal, Offervana, failover, TIH)
   - Applies access control via `IUserContext` membership helpers
   - Maps via AutoMapper
   - Calls Integrations (SendGrid, Blob, Search, etc.)
   - Optionally publishes Service Bus message
   - Writes and `SaveChangesAsync`
4. Response JSON, 200/204
5. Exceptions: `UserFriendlyException` → 499 via filter; others → 500 (no detail leak)

### CQRS conventions
- Commands: `public record CreateOfferCommand(CreateOfferDto Input, Guid UserId) : IRequest<int>;`
- Queries: `public record GetOffersQuery(OfferFilterDto Filter, Guid UserId) : IRequest<PaginatedResult<OfferDto>>;`
- Handlers implement `IRequestHandler<TRequest, TResponse>`
- Registered via `services.AddMediatR(cfg => cfg.RegisterServicesFromAssembly(ApplicationAssembly))`

### DbContext access
- Direct LINQ-to-EF in services / handlers (`_ctx.Properties.AsNoTracking().Where(...).FirstOrDefaultAsync()`)
- No repository abstraction

---

## 7. Config Surface

Top-level `appsettings.json` sections (structure, not secrets):

- `ConnectionStrings` — `InvestorPortalDb`, `OffervanaDb`, `FailoverDb`, `TradeInHoldingsDb`, `AzureStorage`, `OffervanaAzureStorage`, `ServiceBus`
- `Application` — `Token`, `Issuer`, `Audience`, `SpaHost`, `ServicesHost`, `SupportTeamEmail`
- `SendGrid` — `ApiKey`, `PrimaryIpPoolName`, `SecondaryIpPoolName`, `DefaultFromEmail`, `DefaultFromName`
- `Cloudinary` — `CloudName`, `ApiKey`, `ApiSecret`, `Environment`
- `EmailTemplates` — `BasePath` (`wwwroot/emailtemplates`)
- `Cors` — `AllowedOrigins` (CSV/JSON; defaults to `localhost:4200`/`4600` + HTTPS variants)
- `HomeJunction` — `PrivateToken`
- `Attom` — `PrivateToken`
- `AzureSearch` — `Endpoint`, `AccessKey`, `PropertiesIndexName`, `OffersIndexName`, `CustomerSearchIndex`, `UsersSearchIndex`, `NotificationsIndexName`
- `Slack` — `BotToken`, `BaseUrl`, `Channels:Preliminary`, `Channels:OfferStatus`
- `Twilio` — `AccountSid`, `AuthToken`, `SenderNumber`
- `OffervanaApp` — `ClientRootAddress`, `OfferDashboard`, `Unsubscribe` (templated with `{TENANCY_NAME}`, `{Customer_Ref}`)
- `Azure` — `BlobBaseUrl`, `BlobPublicContainer`

Environment variable override uses standard `Section__Key` binding. No feature flags, no MCP integrations (Figma, ADO).

---

## 8. Deployment Surface

- **Dockerfile** — not present in repo
- **Azure Pipelines / GitHub Actions** — not present
- **IaC (Bicep / Terraform / Helm / K8s manifests)** — not present in this repo (Terraform lives separately in `Zoodealio.Infrastructure`)

Runtime behavior from `Program.cs`:
- Runs EF migrations automatically outside `Development`
- Different connection strings for primary vs. failover suggest load-balanced or active-passive DB setup
- Scalar UI enabled in Development only

---

## Summary of Deviations from CLAUDE.md Conventions

1. No local Domain project — entities live in `Zoodealio.Shared`
2. No LegacyData project — `OffervanaDbContext` comes from `Zoodealio.Shared` directly
3. No Temporal.io
4. No repository pattern
5. Service writes to **OffervanaDb and TradeInHoldingsDb directly** (contradicts "Offervana_SaaS only writer" in CLAUDE.md dependency graph)
6. Webhooks from Offervana_SaaS are `[AllowAnonymous]` — no shared-secret / signature verification; TODO comments indicate planned migration to Service Bus
7. API-key middleware for `/openapi/*` is custom and not standard Zoodealio pattern
8. Frontend is Angular 21 (installed), not 20 as CLAUDE.md states
