---
artifact: patterns
service: zoodealio-trade-in-holdings
commit-sha: 29a8d56facd353a71227ec0107ba88b321a7bc3a
shared-lib-commit-sha: 5f042c74c8ce9495bada0705ab902bbf3e71c5da
generated-at: 2026-04-15T00:00:00Z
---

# TIH Patterns

## Stack baseline (as of indexed commit)

### Backend (.NET 10)

| Package | Version | Scope |
|---|---|---|
| `net10.0` target framework | 10.0 | all 4 projects |
| `MediatR` | **14.1.0** | selective — Offervana/ZIP handlers only |
| `AutoMapper` | **16.1.1** | registered assembly-wide |
| `Microsoft.EntityFrameworkCore` | 10.0.5 | |
| `Microsoft.EntityFrameworkCore.SqlServer` | 10.0.5 | Infrastructure only |
| `Microsoft.EntityFrameworkCore.Design` | 10.0.5 | Api — `PrivateAssets=all` |
| `Microsoft.EntityFrameworkCore.Relational` | 10.0.5 | Api |
| `Microsoft.AspNetCore.Authentication.JwtBearer` | 10.0.5 | Api |
| `Microsoft.AspNetCore.Identity` | 2.3.9 | Application + Infrastructure |
| `Microsoft.IdentityModel.Tokens` | 8.17.0 | Application |
| `System.IdentityModel.Tokens.Jwt` | 8.17.0 | Application + Api |
| `Microsoft.AspNetCore.OpenApi` | 10.0.5 | Api |
| `Scalar.AspNetCore` | 2.13.20 | Api — serves `/scalar/v1` |
| `Azure.Search.Documents` | 11.7.0 | Application |
| `Azure.Storage.Blobs` | 12.27.0 | Integrations |
| `Azure.Messaging.ServiceBus` | 7.20.1 | Integrations — client registered, consumer commented out |
| `CloudinaryDotNet` | 1.28.0 | Integrations |
| `SendGrid` | 9.29.3 | Integrations |
| `Microsoft.Extensions.Hosting.Abstractions` | 10.0.5 | Integrations |
| `Zoodealio.Shared` | **0.1.12819** | all 4 projects — source of DbContexts, entities, User/Role/Permission, OffervanaDbContext, InvestorPortalDbContext |

**No test project present in the solution.** No xUnit, NUnit, MSTest, Moq, NSubstitute, FluentAssertions references anywhere in the four project files. Test coverage is not part of the build today.

`<Nullable>enable</Nullable>` and `<ImplicitUsings>enable</ImplicitUsings>` on every project.

### Frontend (Angular 21)

| Package | Version |
|---|---|
| `@angular/*` | **^21.1.0** |
| `@angular/cdk` | ^21.1.0 |
| `primeng` | **^21.1.1** (Aura theme preset from `@primeuix/themes`) |
| `@primeuix/themes` | ^1.2.5 |
| `ngx-mask` | ^20.0.3 |
| `rxjs` | ~7.8.0 |
| `zone.js` | ^0.16.0 |
| `chart.js` | ^4.4.0 |
| `quill` | ^2.0.3 |
| `dompurify` | ^3.3.3 |
| `@maptiler/leaflet-maptilersdk` | ^4.1.1 |
| `@maptiler/sdk` | ^3.10.2 |
| `leaflet` | ^1.9.4 |
| `heic-to` | ^1.3.0 |
| TypeScript | ~5.9.3 |
| Karma + Jasmine | karma ~6.4.0 / jasmine-core ~5.8.0 — scaffolded, no tests authored |
| ESLint | ^9.39.2 (flat config) + typescript-eslint ^8.53.0 + angular-eslint ^21.1.0 + prettier ^3.8.0 |
| `packageManager` | npm@11.5.1 |

## Backend conventions (observed)

### Data access — two-DbContext rule

| Context | Pattern | Lifetime | When to use |
|---|---|---|---|
| `TradeInHoldingsDbContext` | Direct `Scoped` service in `Application/Services/**` | Scoped | All own-DB features — controllers call a service, service calls the DbContext |
| `InvestorPortalDbContext` | MediatR via `Application/Queries/Zip/` | Scoped | Read ZIP `Users`, `Companies`, `CompanyUsers` only |
| `OffervanaReadOnlyDbContext` | MediatR query handler | Scoped | Offervana reads (prefer the `ReadOnly` variant — see GetAgentByIdQueryHandler line 12) |
| `OffervanaDbContext` | MediatR command handler | Scoped | Offervana writes (`PatchPropertyCommand`, `PublishOffersToOffervanaCommand`) — anti-pattern flag |

**AsNoTracking** is the default on reads (e.g., `ContractorService.GetAllAsync`, `GetByIdAsync`). Writes use tracking.

**Primary constructors (C# 12+)** are the default for services and handlers:

```csharp
public class ContractorService(
    TradeInHoldingsDbContext context,
    IMapper mapper) : IContractorService
```

### MediatR record-based requests

```csharp
public record GetAgentByIdQuery(int Id) : IRequest<AgentDto?>;

public class GetAgentByIdQueryHandler(
    OffervanaReadOnlyDbContext offervanaDbContext,
    IMapper mapper) : IRequestHandler<GetAgentByIdQuery, AgentDto?>
```

MediatR scanner: `services.AddMediatR(cfg => cfg.RegisterServicesFromAssembly(typeof(ApplicationDiContainer).Assembly));`. Assembly scan is limited to `TradeInHoldings.Application`.

### AutoMapper

`services.AddAutoMapper(cfg => { }, typeof(ApplicationDiContainer));` — scans the Application assembly for `Profile` subclasses. Profiles live at `Application/Mappings/<Feature>Profile.cs`.

### Validation

- Route constraints on attributes: `{id:guid}`, `{propertyId:int}` — preferred over manual parsing
- No FluentValidation, no DataAnnotations validators of note. Service methods throw `ArgumentException` / `UserFriendlyException` for business validation
- Phone normalization via `PhoneNumberHelper.Normalize`
- State / contractor-type validation via `ConvertAndValidateState` / `ConvertAndValidateContractorType` — pattern is enum parse or throw `UserFriendlyException` with a domain-appropriate message

### Error handling (two global filters)

Order on `AddControllers` matters: `UserFriendlyExceptionFilter` is added first, `ApiExceptionFilter` second. Both are `IExceptionFilter`.

| Thrown | Caught by | Status | Body shape |
|---|---|---|---|
| `UserFriendlyException` (from `Zoodealio.Shared/TradeInHoldings/Domain/Exceptions/`) | `UserFriendlyExceptionFilter` | **499** (non-standard) | `{ message, type: "UserFriendlyException" }` — SPA `UserFriendlyExceptionInterceptor` converts to toast |
| `NotFoundException` | `ApiExceptionFilter` | 404 | `{ message }` |
| `ForbiddenAccessException` | `ApiExceptionFilter` | 403 | `{ message }` |
| `UnauthorizedAccessException` | `ApiExceptionFilter` | 401 | `{ message }` |
| `InvalidOperationException` with message `AuthConstants.InvalidEmailOrPassword` or `TokenNotValidOrExpired` | `ApiExceptionFilter` | 401 | `{ message }` |
| `InvalidOperationException` (other) | `ApiExceptionFilter` | 400 | `{ message }` |
| `ChangeRequestRequiredException` | surfaces in controller `catch` → `Conflict(...)` | 409 | `{ code: "CHANGE_REQUEST_REQUIRED", message }` |
| Other | unhandled (ASP.NET default) | 500 | |

**ProblemDetails is NOT used** — error bodies are plain anonymous objects.

### Authentication & authorization — the `[RequirePermission]` pattern

```csharp
[Authorize]
[HttpGet("{id:guid}")]
[RequirePermission("contacts.contractors.read")]
public async Task<ActionResult<ContractorDto>> GetByIdAsync(Guid id) { ... }
```

- `[Authorize]` establishes identity; `[RequirePermissionAttribute]` is a `TypeFilterAttribute` that instantiates `PermissionAuthorizationFilter(permissionKey, IUserPermissionService)` per request.
- Permission keys are **dot-path strings** (e.g., `settings.roles.read`, `workflows.customfields.update`, `underwrites.approve`). The permission set is auto-discovered from attributes at startup by `IPermissionService.SyncPermissionsFromCodebaseAsync()`.
- Failure shapes are NOT ProblemDetails — they're anonymous objects:
  - 401: `{ error: "Unauthorized", code: "UNAUTHORIZED", message }`
  - 403: `{ error: "Forbidden", code: "INSUFFICIENT_PERMISSIONS", message: "You do not have the required permission: <key>" }`
- `User.GetUserId()` / `GetUserIdOrDefault()` (in `TradeInHoldings.Api.Extensions.ClaimsPrincipalExtensions`) reads the user id from claims — use this everywhere, don't hand-roll claim access.

### Pagination

- `PaginatedResult<T>` DTO at `Application/Dtos/Pagination/PaginatedResult.cs`. Contains `Items`, `TotalCount`, `PageNumber`, `PageSize`, computed `HasNextPage`, `HasPreviousPage`, `TotalPages`.
- `request.NormalizePagination()` extension clamps `PageNumber >= 1` and `PageSize` within bounds (observed usage in `FilesController`); see the extension class for exact bounds.
- Default page size is 20 in most list endpoints; `RoleFilterDto` clamps 1–100.

### Audit fields

Convention (not enforced by a base class) on TIH-owned entities:
- `CreatedDate : DateTime` + `CreatedByUserId : Guid`
- `UpdatedOn : DateTime?` + `UpdatedByUserId : Guid?`

Set manually in services (`contractor.CreatedDate = DateTime.UtcNow; contractor.CreatedByUserId = currentUserId.Value;`). **No global SaveChanges interceptor** — if the service forgets, the columns stay null.

### Logging

`ILogger<T>` defaults from `Microsoft.Extensions.Logging`. No Serilog, Seq, Application Insights SDK, or OpenTelemetry references in any csproj. Log levels configured via `appsettings.json:Logging:LogLevel`.

## Frontend conventions (observed + ESLint-enforced)

The SPA has **10 custom ESLint rules** under `eslint-rules/` — these are the hard-enforced conventions (with `'error'` severity), not mere guidance:

| Custom rule | Enforces |
|---|---|
| `enforce-standalone-components` | Every `@Component` must be `standalone: true` |
| `prefer-on-push-change-detection` | `changeDetection: ChangeDetectionStrategy.OnPush` |
| `no-constructor-di-in-components` | Use `inject()`, not constructor parameters |
| `no-constructor-di-in-services` | Same for `@Injectable`-decorated services |
| `require-private-underscore` | Private class members prefixed `_` |
| `no-ng-deep-in-styles` | Forbid `::ng-deep` in component styles |
| `no-inline-styles` (HTML) | No `style="..."` in templates |
| `no-inline-svg` (TS + HTML) | Use the icon component, not raw `<svg>` |
| `no-deprecated-structural-directives` (HTML) | `@if` / `@for` / `@switch` — not `*ngIf` / `*ngFor` / `*ngSwitch` |
| `no-standalone-components` | **Intentionally `'off'`** (the `enforce-standalone-components` rule is the enabled inverse) |

Plus stock rules on error:
- `@typescript-eslint/explicit-function-return-type`, `no-explicit-any`, `explicit-member-accessibility`
- `@typescript-eslint/naming-convention` — camelCase / UPPER_CASE / PascalCase for variables; parameters allow leading underscore
- `@angular-eslint/component-class-suffix: ['Component']`, `directive-class-suffix: ['Directive']`, `no-empty-lifecycle-method`
- `no-console`, `no-debugger`

Prettier config is inline in `package.json`: `printWidth: 100`, `singleQuote: true`, HTML parser = Angular. ESLint + prettier integrated via `eslint-plugin-prettier` and `eslint-config-prettier`.

### Routing + DI patterns

- **All routes are lazy**, either `loadComponent` or `loadChildren`.
- **Route guards:** `authGuard` (sync token check) + `permissionGuard` (reads `data.permission: string` or `data.permissions: string[]` with `mode: 'any' | 'all'`). Example: `data: { permissions: ['contacts.contractors.read', 'contacts.capitalproviders.read'], mode: 'any' }`.
- **HTTP interceptors** (registered in `app.config.ts` via `withInterceptorsFromDi()`):
  - `TokenInterceptor` — attaches bearer, triggers session-expired redirect on 401
  - `UserFriendlyExceptionInterceptor` — catches backend status **499** and raises a toast
- **Config bootstrap:** `APP_INITIALIZER` → `ConfigService.load()` runs before first route render. Fetches `assets/config/config.json` at runtime so environments can swap URLs without rebuilding.
- **Forms:** reactive forms (inferred from module layout); no Signals-based forms observed.
- **State management:** none (no NgRx / Akita / component-store). State lives in services + RxJS subjects.

## Build / test / deploy

- Backend: `dotnet build` / `dotnet run`. No test project. No Dockerfile in the repo. No `azure-pipelines.yml` in the repo — CI/CD lives outside this checkout.
- Frontend: `npm run build` / `build-dev` / `build-prod`; `npm run start` = `ng serve --live-reload false`; `npm run lint` = `eslint . --ext .ts,.html`; `npm test` = Karma/Jasmine (no specs authored).
- `tsconfig.json` / `tsconfig.app.json` / `tsconfig.spec.json` present — strict mode inferred; full contents not re-read here.

## Deviations from the Zoodealio baseline (per workspace CLAUDE.md)

1. **No `Domain` or `LegacyData` project locally.** The workspace CLAUDE.md prescribes a `Api / Application / Domain / Infrastructure / LegacyData / Integrations` 6-layer split; TIH collapses Domain + LegacyData into `Zoodealio.Shared` NuGet. This IS the modern pattern for TIH — future services may want to inherit it or revert to local Domain. Ask the maintainer which is authoritative going forward.
2. **Non-standard HTTP 499 status code** for user-friendly errors. No other Zoodealio service has this established convention yet (verify during later indexes).
3. **Error body shape is anonymous object `{ message }` or `{ error, code, message }` — not ProblemDetails (RFC 7807).** SPA `UserFriendlyExceptionInterceptor` depends on the 499 contract.
4. **No test project exists.** Not deviation from lack-of-pattern, but a gap vs. the QA discipline expected by the BMad QA agent.
5. **MediatR version 14** and **AutoMapper version 16** — the in-repo `BACKEND_GUIDELINES.md` still documents MediatR 12 / AutoMapper 12 / EF Core 8. The doc is stale; the actuals are newer.
6. **Offervana "read-only" context is written to** from MediatR command handlers (`PatchPropertyCommand`, `PublishOffersToOffervanaCommand`). The code even uses `OffervanaReadOnlyDbContext` for reads (good) but falls back to `OffervanaDbContext` for writes (intentional — but cross-service writes remain an architectural red flag).
7. **Permission gating is inconsistent** (flagged in api-catalog.md): ~7 controllers have `[Authorize]` but no `[RequirePermission]`. New endpoints should default to requiring a permission; audit existing ones when touching them.
8. **`HttpClient` is registered** (`services.AddHttpClient()` in Program.cs) but no named / typed clients exist. Currently only used for the incidental defaults; outbound HTTP is essentially unused.
