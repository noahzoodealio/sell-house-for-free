---
artifact: architecture
service: zoodealio-trade-in-holdings
commit-sha: 29a8d56facd353a71227ec0107ba88b321a7bc3a
shared-lib-commit-sha: 5f042c74c8ce9495bada0705ab902bbf3e71c5da
generated-at: 2026-04-15T00:00:00Z
---

# TIH Architecture

## At a glance

- **.NET 10 + Angular 21** — TIH is an internal ops platform for Trade-In Holdings (largest investor on the Zoodealio platform).
- **4 backend projects** (Api / Application / Infrastructure / Integrations) in a split-directory solution at `TradeInHoldings/TradeInHoldings-services/TradeInHoldings.slnx`. **No local `Domain` or `LegacyData` project** — the on-repo `ARCHITECTURE_OVERVIEW.md` describes a 6-project layout that no longer reflects reality; domain + legacy have been extracted into the `Zoodealio.Shared` NuGet package (v0.1.12819).
- **1 Angular SPA** (`TradeInHoldings-spa`) — 10 feature modules, standalone components, PrimeNG 21 on Aura theme, default port 4800.
- **3 DbContexts wired** — `TradeInHoldingsDbContext` (own DB, writable), `OffervanaDbContext` + `OffervanaReadOnlyDbContext` (cross-service, read-write despite "legacy read-only" labelling), `InvestorPortalDbContext` (ZIP DB, registered read-write but used read-only).
- **No durable workflow runtime** — no Temporal, no Hangfire, no `IHostedService` implementations. Workflow/Stage/Task concepts in this service are **data-model constructs**, not orchestration runtimes.
- **Integrations:** SendGrid (email), Cloudinary (property photos), Azure Blob Storage (documents + funding requests), Azure AI Search (properties index). Azure Service Bus client is registered but no consumer is wired (commented out in `IntegrationsDiContainer`). ATTOM / HomeJunction clients are imported in the file but registration is commented out.
- **No outbound HTTP to sibling Zoodealio services.** Cross-service reach is through shared databases.

## Repo layout

```
Zoodealio.TradeInHoldings/
├── TradeInHoldings/
│   ├── TradeInHoldings-services/              # .slnx lives here
│   │   ├── TradeInHoldings.Api/               # ASP.NET Core host
│   │   ├── TradeInHoldings.Application/       # services, MediatR handlers, DTOs, AutoMapper profiles
│   │   ├── TradeInHoldings.Infrastructure/    # DI wiring + migrations (no DbContext class — that's in Shared)
│   │   └── TradeInHoldings.Integrations/      # SendGrid, Cloudinary, Blob, Service Bus client
│   └── TradeInHoldings-spa/                   # Angular 21 + PrimeNG 21
│       └── src/app/
│           ├── modules/                       # 10 feature areas
│           ├── shared/                        # guards, interceptors, components, services
│           ├── app.config.ts
│           └── app.routes.ts
├── _bmad/                                     # project-local BMad workspace (not indexed here)
├── _bmad-output/                              # project-local planning output
├── docs/                                      # partial: ICONS_, REFRESH_TOKEN_, ROLES_PERMISSIONS_ IMPLEMENTATION.md
├── figma-docs/                                # Figma exports for UX reference
├── funder-figma-docs/                         # Figma exports for funder-facing UX
├── ARCHITECTURE_OVERVIEW.md                   # stale — describes 6-project layout
├── BACKEND_GUIDELINES.md                      # code conventions
├── FRONTEND_GUIDELINES.md                     # code conventions
├── PROJECT_README.md                          # setup guide
└── README.md
```

## Backend layers

### `TradeInHoldings.Api` (net10.0)

- ASP.NET Core host. `Program.cs` wires CORS (`AllowAngularApp`), rate limiter (policy `login` = 3/15min, not attached to any action), JWT bearer auth, DI containers from the 3 other projects, Scalar OpenAPI docs at `/scalar/v1`.
- **Startup side effects:** migrates `TradeInHoldingsDbContext` (unconditionally, then again under a second scope), seeds via `DbInitializer.SeedAsync`, and runs `IPermissionService.SyncPermissionsFromCodebaseAsync()` which reflects over `[RequirePermission]` attributes and writes them to `Permissions` + default Host Admin role assignments. (Note the double migration under two separate scopes — first guarded by `!IsDevelopment`, then unconditionally — the second scope effectively runs migrations in dev too.)
- `Controllers/` — 28 attribute-routed controllers (see `api-catalog.md`).
- `Filters/` — `ApiExceptionFilter`, `UserFriendlyExceptionFilter`, and the custom auth filters `RequirePermissionAttribute` (TypeFilter resolving `IUserPermissionService`) + `RequireHostAdminAttribute` (unused on live endpoints).
- `Extensions/` — `ClaimsPrincipalExtensions` (`User.GetUserId()` helper).

### `TradeInHoldings.Application` (net10.0)

Layer responsibilities (observed, not just nominal):

- `Services/` — business logic per feature folder (Auth, Contractor, Investor, Department, Underwrite, Transaction, WorkflowConfig, CustomField, CustomFieldLayout, CustomPropertyField, PropertyListing, FundingRequest, ChangeRequest, Roles, TeamMember, Document, Email, Search). Services are injected directly into controllers and wired as `Scoped` in `ApplicationDiContainer`.
- `Interfaces/` — one per service, mirroring the `Services/` tree.
- `Dtos/` — request/response DTOs, grouped by feature.
- `Mappings/` — AutoMapper profiles, auto-registered via `services.AddAutoMapper(typeof(ApplicationDiContainer))`.
- `Commands/` — MediatR `IRequest<...>` commands. Only two observed: `PatchPropertyCommand` (writes Offervana) and `PublishOffersToOffervanaCommand` (writes Offervana's 5 offer-type tables + `PropertyOfferStatus` + `PropertyCompanyStatus`).
- `Queries/` — MediatR `IRequest<...>` queries: `Agent/GetAgentByIdQuery`, `Agent/GetAgentByPropertyIdQuery`, `IBuyerOffer/GetIBuyerOffersByPropertyIdQuery`, `Zip/GetZipUsersQuery`.
- `Constants/` — `AuthConstants`, `ValidationConstants`.
- `Exceptions/` — `NotFoundException`, `ForbiddenAccessException`. (`ChangeRequestRequiredException` lives in `Zoodealio.Shared/TradeInHoldings/Domain/Exceptions/`.)
- `Utilities/` — `PhoneNumberHelper`.

MediatR is **selectively applied**: all Offervana reads/writes plus the ZIP user read go through MediatR; everything else goes through direct service injection. This contradicts the stale `ARCHITECTURE_OVERVIEW.md` recommendation to use MediatR for all Offervana interactions and DI for all own-DB interactions — the rule holds per-DbContext, but the existence of Offervana *write* commands is itself the divergence.

### `TradeInHoldings.Infrastructure` (net10.0)

Thin layer — effectively a composition root:

- `InfrastructureDiContainer.cs` — calls `AddTradeInHoldingsDbContext` (from Zoodealio.Shared), `AddInvestorPortalDbContext`, `AddOffervanaDbContext`, `AddOffervanaReadOnlyDbContext`. Specifies the migrations assembly for the TIH context as the local Infrastructure assembly, and for ZIP as `"ZoodealioInvestorPortal.Infrastructure"` (meaning TIH does **not** own ZIP migrations).
- `Data/DbInitializer.cs` — startup seeder (invoked from `Program.cs`).
- `Migrations/` — 17 EF migrations owned by TIH for the TIH context; the current model snapshot is `TradeInHoldingsDbContextModelSnapshot.cs`. Migrations name TIH-Domain entities by their `Zoodealio.Shared` namespace (`TradeInHoldings.Domain.Entities.*`), confirming that the entity types are resolved from the shared library at compile time.
- **No DbContext class defined here.** The `TradeInHoldingsDbContext` class, all Fluent API configs, and all entity classes live in the `Zoodealio.Shared` NuGet package.

### `TradeInHoldings.Integrations` (net10.0)

- `IntegrationsDiContainer.cs` — registers `IEmailTemplateProvider` (singleton), `ISendGridService`, `ICloudinaryClient`, `IBlobStorageClient` (scoped), and an Azure `ServiceBusClient` (singleton). Service Bus consumer / publisher / handlers are commented out pending use. ATTOM + HomeJunction client registrations are also commented out.
- `SendGrid/` — wrappers + template provider.
- `Services/BlobStorageClient.cs`, `Services/CloudinaryClient.cs`.
- `Interfaces/IBlobStorageClient.cs`, `Interfaces/ICloudinaryClient.cs`.

## Frontend (TradeInHoldings-spa)

- **Angular 21.1**, **PrimeNG 21**, **Aura theme**, default dev port **4800**.
- `app.config.ts` providers: router, http-client with JSONP + `TokenInterceptor` + `UserFriendlyExceptionInterceptor` HTTP interceptors, PrimeNG config (dark-mode detection explicitly disabled), MessageService + ConfirmationService + DialogService, `ngx-mask`, APP_INITIALIZER that bootstraps `ConfigService.load()` before app start (runtime config fetched from `assets/config/config.json`).
- **No NgModules.** Every route loads a standalone component or lazy routes file.
- **Routing** (`app.routes.ts`) — entry redirector at `/`, public auth routes (login, forgot/reset/check-inbox), then permission-guarded feature areas:
  - `/properties` (`transactions.read`)
  - `/underwrites` (`underwrites.read`)
  - `/contacts` (`contacts.contractors.read` OR `contacts.capitalproviders.read`, `mode: 'any'`)
  - `/property-transactions` (`transactions.read`)
  - `/change-requests` (`changerequests.read`)
  - `/workflows`, `/settings`, `/dashboard`, `/documents` — auth only, no specific permission gate at route level (feature components enforce)
- **Guards:** `authGuard`, `permissionGuard` (reads `data.permission` / `data.permissions` with optional `mode: 'any' | 'all'`).
- **Feature modules** (`src/app/modules/`): auth, change-requests, contact, dashboard, documents, properties, settings, transactions, underwrites, workflows.
- **Shared** (`src/app/shared/`): `components/` (redirector, session-expired, access-denied, contact-admin, etc.), `configs/`, `controls/`, `directives/`, `guards/`, `interceptors/`, `models/`, `pipes/`, `services/`, `styles/`, `utils/`.
- **Extras** outside Angular deps: MapTiler SDK + Leaflet (property maps), Chart.js, Quill (rich text), DOMPurify, heic-to (HEIC→JPEG conversion for iOS uploads), ngx-mask.

## Happy-path data flow

### Own-DB read (most endpoints)

```
HTTP → Controller action
     → [Authorize] + [RequirePermission] (via RequirePermissionAttribute TypeFilter → IUserPermissionService)
     → inject IContractorService (or similar)
     → TradeInHoldingsDbContext query
     → AutoMapper → DTO
     → ActionResult
```

### Legacy read (3 endpoints)

```
HTTP → Legacy/* Controller
     → MediatR.Send(GetAgentByIdQuery)
     → Handler(OffervanaDbContext) — actually uses the read-only failover context where appropriate
     → AutoMapper → DTO
     → ActionResult
```

### ZIP user read (1 endpoint)

```
HTTP → ZipUserController
     → MediatR.Send(GetZipUsersQuery)
     → Handler(InvestorPortalDbContext)
     → ZipUserDto
```

### Offer publish (cross-DB write)

```
HTTP POST /api/Underwrites/{id}/offers/publish
     → UnderwritesController
     → IUnderwriteOfferService
     → MediatR.Send(PublishOffersToOffervanaCommand)
     → Handler(OffervanaDbContext write) — inserts into 5 concrete offer-type tables + PropertyOfferStatus + PropertyCompanyStatus
     → also resolves investor company by joining InvestorPortalDbContext.Companies + CompanyUsers
     → returns publish result
```

## Authentication + authorization

- **Scheme:** JWT Bearer. Symmetric signing key (`Jwt:Key`), issuer `TradeInHoldings`, audience `TradeInHoldings`, all validated.
- **Token issuance:** `AuthController` + `IAuthService`. Refresh tokens stored in the TIH `User` entity (field `RefreshToken` + `RefreshTokenExpiryTime`). `/api/auth/refresh-token` rotates.
- **Claims shape:** custom claims surfaced via `ClaimsPrincipalExtensions.GetUserId()`; `Auth/GetClaims` exposes id/email/name/firstname/lastname + raw claims list to the SPA.
- **Permission system:** dot-path keys (`contacts.contractors.read`, `transactions.update`, `underwrites.approve`, `settings.roles.create`, etc.). Permissions are auto-discovered from `[RequirePermission("...")]` attributes at startup and written to the `Permissions` table; new keys are created, stale keys removed, and all existing keys assigned to the "Host Admin" role so that admin access remains unbroken across code changes. Users get roles via `UserRolesController`; `UserRole` + `Role` + `RolePermission` tables drive runtime checks inside `IUserPermissionService`.
- **`RequireHostAdminAttribute`** exists but is not attached to any action. Reserved for reconfiguration endpoints that don't currently exist.
- **SPA side:** `TokenInterceptor` attaches bearer header; `permissionGuard` consults `userroles/me/permissions` (the only endpoint gated by `[Authorize]` with no permission requirement).

## External integrations (how each is wired)

| Integration | Config key prefix | Wrapper / client | Lifetime | Notes |
|---|---|---|---|---|
| SendGrid (email) | `SendGrid:ApiKey`, `SendGrid:DefaultFromEmail`, `...DefaultFromName`, `PrimaryIpPoolName`, `SecondaryIpPoolName` | `ISendGridService` + `IEmailTemplateProvider` (templates) | Scoped service, Singleton provider | Used for password reset, team invites, funding-request notifications |
| Cloudinary (photos) | `Cloudinary:CloudName`, `ApiKey`, `ApiSecret`, `Environment` | `ICloudinaryClient.GetCloudinaryBatchAsync` | Scoped | `/api/Property/photos` fans out to this |
| Azure Blob Storage | `ConnectionStrings:AzureStorage` | `IBlobStorageClient` | Scoped | Documents + funding-request file packets |
| Azure AI Search | `AzureSearch:Endpoint`, `AccessKey`, `PropertiesIndexName` | `ISearchService` (`properties-index`) | Scoped | Property search + facets; consumed by `PropertyController.SearchAsync` and `UnderwritesController.SearchAsync` |
| Azure Service Bus | `ConnectionStrings:ServiceBus` | `ServiceBusClient` singleton | Singleton | **Client registered, no producers or consumers wired** |

## Durable workflows / background processing

**None present.** No Temporal, no `IHostedService` / `BackgroundService`, no Hangfire or Quartz. The service's "workflows" are a data-model concept (`WorkflowConfig` → `Workflow` → `WorkflowStage` → `WorkflowStageTask` driving the `PropertyTransaction` state machine), not a runtime orchestration engine. Stage advancement, task completion, and change-request gating happen synchronously inside request handlers via `ITransactionService` / `IChangeRequestService`.

The only startup-time background work is:

1. `TradeInHoldingsDbContext.Database.MigrateAsync()` — run twice, under two scopes (first conditionally in non-dev, then unconditionally)
2. `DbInitializer.SeedAsync(context)` — seeds baseline rows
3. `IPermissionService.SyncPermissionsFromCodebaseAsync()` — reconciles permission registry

All three run inline during `WebApplication.Build` → `Run`; there is no recurring schedule.

## Config surface

`appsettings.json` (full surface; note the committed-secret flag in the observations):

- `Logging:LogLevel:Default`, `Logging:LogLevel:Microsoft.AspNetCore`
- `AllowedHosts`
- `ConnectionStrings:TradeInHoldingsDb` — own SQL DB
- `ConnectionStrings:OffervanaDb` — Azure SQL `zoodealio-dev`
- `ConnectionStrings:FailoverDb` — Offervana read-only failover target
- `ConnectionStrings:AzureStorage` — blob storage for docs/funding packets
- `ConnectionStrings:InvestorPortalDb` — ZIP SQL
- `ConnectionStrings:ServiceBus` (inferred — consumer commented out)
- `Cors:AllowedOrigins` — CSV fallback to localhost 4200/4600/4800 (http+https)
- `Jwt:Key`, `Jwt:Issuer`, `Jwt:Audience`
- `AzureSearch:Endpoint`, `AzureSearch:AccessKey`, `AzureSearch:PropertiesIndexName`
- `Application:SpaHost`, `Application:ServicesHost`, `Application:ZipClientHost`
- `SendGrid:*`
- `Cloudinary:*`

**No MCP integrations** on the TIH side (ADO/Figma MCPs are BMad-level tools in the workspace, not consumed by the service runtime).

## Notable observations

1. **Stale architecture doc:** `ARCHITECTURE_OVERVIEW.md` still describes `TradeInHoldings.Domain/` and `TradeInHoldings.LegacyData/` projects that no longer exist. Agents reading the repo docs will build an incorrect mental model unless pointed at this index.
2. **Domain lives in Zoodealio.Shared.** Any entity change requires coordinated PRs across two repos. The namespace `TradeInHoldings.Domain.Entities.*` is preserved inside the shared library, so code reads like the Domain is local even though it isn't.
3. **Committed secrets:** `appsettings.json` includes live-looking values for `Jwt:Key`, Azure SQL credentials (dev + failover), Azure Storage key, Azure Search access key, SendGrid API key, Cloudinary secret. These should be environment-supplied and rotated if they're actually valid. Flag for the maintainer.
4. **Double migration at startup** (`Program.cs` L106–118) — the first `if (!IsDevelopment)` block runs `MigrateAsync`, then the second unconditional scope runs it again and seeds. The first block is redundant in dev, and in non-dev the migration runs twice under two scopes. Works, but worth simplifying.
5. **No Temporal**, despite the CLAUDE.md workspace guide noting that TIH "could adopt" Temporal like Offervana/Chat/MLS. This service is strictly synchronous.
6. **Service Bus plumbing is half-built** — the client is registered, but the consumer, handler registry, and publisher interface are all commented out in `IntegrationsDiContainer`. Treat it as "not available" until uncommented.
7. **Selective MediatR** — MediatR is used only when a DbContext other than `TradeInHoldingsDbContext` is involved (Offervana or InvestorPortal). Own-DB features use direct DI services. Agents designing new features that touch Offervana or ZIP should use MediatR; anything strictly in TIH's own DB uses a `Scoped` service.
8. **No Dockerfile / azure-pipelines.yml in the repo** — deployment pipeline lives elsewhere (likely `Zoodealio.Infrastructure` + ADO pipelines). Out of scope for this index.
