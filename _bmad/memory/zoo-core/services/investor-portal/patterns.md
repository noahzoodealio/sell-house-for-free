---
artifact: patterns
service: investor-portal
commit-sha: fa73b99cc3cccda1c404ea03329df9b99c3469f1
generated-at: 2026-04-15T00:00:00Z
---

# Zoodealio Investor Portal (ZIP) — Code Patterns

Concrete conventions observed in this service. Deviations from the `curated/patterns.md` baseline are flagged. Dev agents implementing here should follow **what this file says**, not what the baseline says, since baseline compliance has diverged in several places.

---

## Stack Baseline

### Backend

| Component | Value |
|---|---|
| .NET | 10 (`<TargetFramework>net10.0</TargetFramework>`) |
| EF Core | 10.0.5 (`Microsoft.EntityFrameworkCore.SqlServer`) |
| MediatR | 14.1.0 |
| AutoMapper | 16.1.1 |
| JWT | `Microsoft.AspNetCore.Authentication.JwtBearer` 10.0.5 + `System.IdentityModel.Tokens.Jwt` 8.17.0 |
| OpenAPI UI | Scalar (`Scalar.AspNetCore` 2.13.20) — **not Swashbuckle** |
| Zoodealio.Shared | 0.1.12803 |
| Azure Search | `Azure.Search.Documents` 11.7.0 |
| Azure Blob | `Azure.Storage.Blobs` 12.27.0 |
| Azure Service Bus | `Azure.Messaging.ServiceBus` 7.20.1 |
| SendGrid | `SendGrid` 9.29.3 |
| Cloudinary | `CloudinaryDotNet` 1.28.0 |
| Twilio | `Twilio` 7.14.3 |
| Solution format | `.sln` (classic) |

### Frontend

| Component | Value |
|---|---|
| Angular | **21.1.0** (baseline says 20 — ZIP has upgraded) |
| PrimeNG | **21.0.4** (baseline says 20 — ZIP has upgraded) |
| @primeuix/themes | 1.2.5 |
| TypeScript | 5.9.3 |
| RxJS | 7.8.0 |
| Node | no engines constraint in `package.json` |
| Build | Angular CLI (no Nx) |

Mapping libraries on the frontend: `leaflet` 1.9.4, `@maptiler/sdk` 3.10.2. PDF generation: `pdf-lib` 1.17.1. Charts: `chart.js` 4.5.1. Rich text: `quill` 2.0.3.

### Node/Tooling

- **ESLint 9** config at `investor-portal-spa/eslint.config.js` (flat-config format)
- **Custom lint rules** at `investor-portal-spa/eslint-rules/` (see Frontend Enforcement below)

---

## Backend Conventions

### Data access

- **DbContexts:** 4 registered (`InvestorPortalDbContext`, `OffervanaDbContext`, `OffervanaReadOnlyDbContext`, `TradeInHoldingsDbContext`)
- **Entity + DbContext source:** `Zoodealio.Shared` NuGet package — **no local Domain project**
- **No repository pattern** — services call DbContexts directly via LINQ-to-EF
  - `_ctx.Properties.AsNoTracking().Where(...).FirstOrDefaultAsync()` is the dominant style
- **No LegacyData project** — `OffervanaDbContext` is pulled from `Zoodealio.Shared` directly and used for both read and write against Offervana's DB
- **Migrations owned by `ZoodealioInvestorPortal.Infrastructure`** for `InvestorPortalDb` only; Offervana/TIH migrations live in their own repos
- **Auto-migration on startup** outside `Development` environment (via `Program.cs`)

### CQRS / business logic

- **MediatR** for Commands (6) and Queries (15+)
- **Records** for requests: `public record CreateOfferCommand(CreateOfferDto Input, Guid UserId) : IRequest<int>;`
- **Request shape:** `IRequest<TResponse>` or `IRequest<Unit>`
- **Handler naming:** `CreateOfferCommandHandler : IRequestHandler<CreateOfferCommand, int>`
- **Registration:** `services.AddMediatR(cfg => cfg.RegisterServicesFromAssembly(ApplicationAssembly))`
- **Services layer** coexists with MediatR — used for orchestration that doesn't map cleanly to a single request/response (Auth flows, Notifications, Search indexing, File upload pipelines)

### Mapping

- **AutoMapper** — single consolidated `Mapping/AutoMapperProfile.cs` in Application
- Injected as `IMapper` into handlers/services
- `_mapper.Map<OfferDto>(offer)` is the dominant call shape
- No Mapster, no manual mapping

### Validation

- **Data Annotations only** — `[Required]`, `[EmailAddress]`, `[MaxLength]`, `[StringLength]` on DTOs and request models (37 usages across 9 DTOs)
- **No FluentValidation** — does not depend on `FluentValidation.AspNetCore`
- Validation occurs via ASP.NET's `[ApiController]` automatic model validation (400 with ModelState on failure)

### Auth

- **JWT Bearer** on all API endpoints except `[AllowAnonymous]`
- **Symmetric signing key** (HS256) from `Application:Token` config
- **Custom attributes:**
  - `[AuthorizeRoles(Role.X, Role.Y)]` — hierarchical role match via `RoleHierarchy.ToAllowedRoleNames`
  - `[AuthorizeRolesOrInviteToken(Role.X, Role.Y)]` — role OR valid `?token=` against DB
- **Custom API-key middleware** (`OpenApiKeyMiddleware`) for `/openapi/*` — external-partner surface
- **Impersonation:** `x-impersonated-user-id` header (admin-only), resolved in `HttpUserContext`
- **`IUserContext` (scoped)** — the authoritative user-identity abstraction used throughout Application; exposes UserId, Role, Email, tenant/company/parent-company/child-user memberships

### Error handling

- **`UserFriendlyExceptionFilter`** — catches `UserFriendlyException`, returns HTTP **499** with the exception message (non-standard status code, intentional to distinguish user-facing errors from 400/500)
- **No global problem-details middleware**; other exceptions → default ASP.NET 500 response (stack trace suppressed in prod via `app.UseExceptionHandler`)
- **`UserFriendlyException`** type lives in `Zoodealio.Shared` — recommended throw for business-rule failures that should surface to the user

### Logging

- **Default `ILogger<T>`** via `Microsoft.Extensions.Logging` (host builder defaults)
- **No Serilog, no Langfuse, no structured logging library** — plain console logging
- **No Application Insights wiring** observed in code (may be environment-level)

### Rate limiting

- ASP.NET rate limiter (`AddRateLimiter` in `Program.cs`)
- **Only `forgotPassword` endpoint throttled** (3 requests per 15 min, fixed window)

### Testing

- **No test projects in the repo** — no xUnit / NUnit / MSTest / NSubstitute / Moq references found
- **No `*.Tests.csproj` or similar** alongside the solution
- This is a significant deviation from the baseline and CLAUDE.md expectations — flag if the dev-story workflow assumes unit tests exist here

### External service wrapper style

- `Integrations/` project hosts all external clients
- Clients implement a contract defined in `Integrations/Interfaces/` (e.g., `IEmailService`, `IBlobStorageClient`)
- HTTP clients are registered via `IHttpClientFactory` with typed clients (`services.AddHttpClient<IAttomClient, AttomClient>(…)`)
- SDK-based integrations (SendGrid, Cloudinary, Twilio) wrap the SDK client directly

---

## Frontend Conventions

### Component style

- **Standalone components only** — no NgModules (enforced by custom ESLint rule `enforce-standalone-components.js` / `no-standalone-components.js`)
- **`inject()` function for DI** — 125+ occurrences; only **1** legacy constructor-injection holdover (`click-outside.directive.ts`). Enforced by `no-constructor-di-in-components.js` and `no-constructor-di-in-services.js` ESLint rules.
- **`ChangeDetectionStrategy.OnPush`** on 125 components (effectively all non-trivial components). Enforced by `prefer-on-push-change-detection.js` ESLint rule.
- **Private members prefixed with `_`** — enforced by `require-private-underscore.js` ESLint rule
- **No Angular signals** — zero `signal()`, `computed()`, or `effect()` calls found. State management is still RxJS + services. ⚠️ Deviation from baseline's "signals where appropriate" guidance.

### ESLint — custom rules (authoritative enforcement)

Located at `investor-portal-spa/eslint-rules/`:

| Rule | Effect |
|---|---|
| `enforce-standalone-components.js` | Every component must be standalone |
| `no-standalone-components.js` | (paired/opposite rule — likely allows opt-out in specific folders) |
| `no-constructor-di-in-components.js` | `inject()` required in components |
| `no-constructor-di-in-services.js` | `inject()` required in services |
| `prefer-on-push-change-detection.js` | OnPush required |
| `require-private-underscore.js` | Private members must start with `_` |
| `no-deprecated-structural-directives.js` | Forbids `*ngIf` / `*ngFor` (use control flow `@if`/`@for`) |
| `no-inline-styles.js` | Forces external SCSS files |
| `no-inline-svg.js` | Forces external SVG |
| `no-ng-deep-in-styles.js` | Forbids `::ng-deep` |

**Implication for dev agents:** Lint will block any PR that violates these. Following these rules is non-negotiable for this service.

### TypeScript strictness

`tsconfig.json` enables:
- `strict: true`
- `noImplicitOverride: true`
- `noPropertyAccessFromIndexSignature: true`
- `noImplicitReturns: true`
- `noFallthroughCasesInSwitch: true`
- `strictTemplates: true` (Angular compiler option)
- `strictInjectionParameters: true`
- `strictInputAccessModifiers: true`
- `typeCheckHostBindings: true`

Target: ES2022, module: preserve.

### State management

- **RxJS + services** — no NgRx, no Akita, no signal-store
- **HTTP clients wrapped in services** (AuthService, DataService, FileService, TenantService, ValidationService, TermsConditionsService, ImpersonationService, RequestService)

### Routing

- **Standalone route configs** (`app.routes.ts` + per-module `*.routes.ts`)
- **Lazy-loaded feature modules** per role (Investor, Enterprise, Admin)
- **Guards:** `AuthGuard`, `RoleGuard`, `CompanyActiveGuard`
- **Role-based post-login redirect:** `/redirector` component routes user to the correct module based on role

### HTTP interceptors

At `investor-portal-spa/src/app/modules/shared/interceptors/`:

- `token.interceptor.ts` — attaches `Authorization: Bearer <jwt>` to every request
- `impersonation.interceptor.ts` — adds `x-impersonated-user-id` header when admin is impersonating
- `user-friendly-exception.interceptor.ts` — catches 499 responses and surfaces the user-facing message (matches backend `UserFriendlyExceptionFilter`)

### Forms

- **Reactive forms** via `@angular/forms` (FormBuilder, FormGroup, FormControl) — standard
- **ngx-mask** 20.0.3 for input masking
- Validators from `@angular/forms` (no FluentValidation-equivalent; validation is per-control)

### Styling

- **Component-level SCSS** per component (enforced by `no-inline-styles.js`)
- **PrimeNG theme system** via `@primeuix/themes` v1.2.5
- **Global SCSS:** `src/app/modules/shared/styles/`
- `::ng-deep` forbidden by lint rule

### Static assets

- Icons/SVGs kept as external files (not inline in templates) — enforced

---

## Build / Test / Deploy

### Backend

- `dotnet build` via `ZoodealioInvestorPortal.sln` at `investor-portal-services/ZoodealioInvestorPortal.Api/`
- No test projects → no `dotnet test` target
- No Dockerfile in the repo
- Auto-migration on startup in non-Development environments
- `global.json` pins SDK version (check the file for exact value)
- `nuget.config` for feed configuration (NUGET_AUTHENTICATION_LINUX.md indicates private feed setup)

### Frontend

- `npm start` / `ng serve` via Angular CLI
- `npm run build` — standard Angular production build
- ESLint via `eslint.config.js` (flat config, ESLint 9+)
- No Jest / Karma / Cypress configs observed in repo top-level (may exist but not identified)

### CI/CD

- **Not present in this repo** — no `.github/workflows/`, no `azure-pipelines.yml`
- `.coderabbit.yaml` at repo root → CodeRabbit reviews on PRs (baseline safety rule)
- Pipelines likely live externally (Azure DevOps Offervana_SaaS project)

### IaC

- **Not in this repo** — Terraform lives in the sibling `Zoodealio.Infrastructure` repo

---

## Deviations from Zoo-Core Baseline Patterns

Compared against `curated/patterns.md`:

| Baseline says | ZIP reality |
|---|---|
| "Two-database pattern — every service needing Offervana data has its own DbContext + read-only `OffervanaDbContext` via `LegacyData` project" | ✗ No `LegacyData` project. `OffervanaDbContext` comes directly from `Zoodealio.Shared` and is used **read/write**, not read-only |
| "Layered: `Api / Application / Domain / Infrastructure / LegacyData / Integrations`" | ✗ No local `Domain` project; no `LegacyData` project. 4 projects only. |
| "AutoMapper for DTO mapping" | ✓ Used |
| "JWT Bearer auth on all APIs" | ✓ Used |
| "Azure Blob Storage for file handling" | ✓ Used (2 accounts) |
| "SendGrid for email via `Integrations/` project" | ✓ Used |
| "Temporal.io for durable workflows" | ✗ Not used (baseline notes Temporal is "Offervana, Chat, MLS" — ZIP is not on that list, consistent) |
| "FluentValidation (or data annotations) for request validation" | ✓ Uses data annotations (no FluentValidation) |
| "Signals for reactive state where appropriate" | ✗ Zero signal usage — pure RxJS |
| "PrimeNG 20 for ZIP" | ✗ Actually PrimeNG 21 (upgraded) |
| "Angular 20 for ZIP" | ✗ Actually Angular 21 (upgraded) |
| "Standalone components only" | ✓ Enforced via custom ESLint rule |
| "OnPush change detection on all components" | ✓ Enforced via custom ESLint rule |
| "`inject()` for DI, not constructor injection" | ✓ Enforced via custom ESLint rule (1 legacy holdover) |
| "Private members prefixed with `_`" | ✓ Enforced via custom ESLint rule |
| "EF migrations halt for user application confirmation" | ✗ Auto-migrates on startup outside Development |

### Notable additional patterns (not in baseline)

- **Custom ESLint rule suite** — ZIP frontend has 10 project-local ESLint rules enforcing Angular conventions. Worth promoting back to baseline / `Zoodealio.Shared.lint` or equivalent.
- **HTTP 499 for user-friendly errors** — non-standard status code; matched on both sides (backend filter + frontend interceptor). Intentional pattern.
- **OpenAPI via Scalar (not Swashbuckle)** — different UI at `/scalar` and `/scalar-open`.
- **`OuterApi/` controllers** — external-partner surface under `openapi/[controller]` route prefix with DB-backed API-key auth.

---

## Offer Type Domain Model

ZIP consumes but does not author the offer-type DTOs. Defined in `Zoodealio.Shared.Dtos.Offers`:

| DTO | Purpose in ZIP |
|---|---|
| `CashOfferTypeDto` | Displayed in marketplace/offer views |
| `CashOfferPlusTypeDto` | Displayed; two-payout offer explanation |
| `FixListTypeDto` | Cash+ with repair escrow |
| `SellLeasebackTypeDto` | Seller stays post-sale |
| `ListOnMarketTypeDto` | Traditional listing |
| `CashBuyerTypeDto` | Direct cash buyer |

Offer authoring happens in Offervana_SaaS; ZIP reads/displays and mutates offer state (e.g., investor accept/counter/withdraw via `IBuyerOffers` table).
