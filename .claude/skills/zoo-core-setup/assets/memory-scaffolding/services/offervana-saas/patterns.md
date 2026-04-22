---
artifact: patterns
service: offervana-saas
commit-sha: 61581dc184777cb7293ae594294d917556a35ca4
generated-at: 2026-04-16
---

# Offervana_SaaS — Patterns

## Overview

ABP Zero .NET 8 platform using traditional layered architecture with ABP conventions. AppServices are the primary API surface (auto-generated REST endpoints). Temporal.io handles all durable workflows and scheduled jobs. Three scheduler frameworks present (Quartz, Hangfire, Temporal) but only Temporal is actively used.

## Naming Conventions

| Element | Convention | Example |
|---------|-----------|---------|
| Classes | PascalCase | `BlastWorkflow`, `CustomerAppServiceV2` |
| Private members | `_` prefix | `_dbContext`, `_emailService` |
| Private methods | `_` prefix | `_proceedEmail`, `_getEmails` |
| AppServices | `*AppService.cs` | `PropertyAppService`, `IBuyerOfferAppService` |
| OuterApi Controllers | `*Controller.cs` | `OffersV2Controller`, `CustomersController` |
| DTOs | `*Dto.cs`, `*Input.cs`, `*Output.cs` | `GetCustomerDto`, `CreatePropertyInput`, `PropertyOutput` |
| Entities | PascalCase (no suffix) | `Property`, `Customer`, `IBuyerOffer`, `OfferBonus` |
| Enums | PascalCase | `OfferType`, `CustomerLeadSource` |
| Temporal Workflows | `*Workflow.cs` | `BlastWorkflow`, `GhlContactUpsertWorkflow`, `RecalculateOffersWorkflow` |
| Temporal Activities | `*Activities.cs` | `BlastActivities`, `ExecutorActivities`, `RecalculateOffersActivities` |
| Mapping extensions | `*MappingConfiguration.cs` | `PropertyMappingConfiguration`, `OfferBonusMappingConfiguration` |

## Code Organization

### File/Folder Structure Pattern

Domain-organized folders within each project layer:

```
Offervana.Core/
  Domain/
    Admin/         → IBuyer, OfferTypes, OfferConfig, SourceKeys, OfferBonus (new)
    Brokerage/     → Agent, Brokerage, Checklist, Pixels
    Customer/      → Customer, Property, IBuyerOffer, Note, Message, OfferDocument
    Blast/         → BlastEdition, BlastJobExecutable, BouncedAddress
    Common/        → Group, Links, LandingText, LoginAlert
    History/       → HistoryLog, Activity
  Authorization/   → User, Role extensions, OrganizationRoleDisplayService

Offervana.Application/
  Agent/           → AgentAppService
  Customer/        → CustomerApplicationService, CustomerAppServiceV2
  Property/        → PropertyAppService, GlobalPropertyAppService, PropertyFileAppService
  IBuyer/          → IBuyerAppService
  IBuyerOffer/     → IBuyerOfferAppService
  OfferBonus/      → OfferBonusAppService (new)
  OfferFile/       → OfferFileAppService (OfferExplainer/OfferDocumentSlots DTOs)
  Blast/           → BlastAppService
  BlastBoard/      → BlastBoardAppService
  OuterApi/        → External API controllers (Customers, Offers, Properties, etc.)
  MappingConfigurationExtensions/ → AutoMapper config extensions (one per domain)

Offervana.Application.Shared/
  OfferBonus/Dto/  → CreateOfferBonusInput, UpdateOfferBonusInput, GetOfferBonusesInput, OfferBonusDto
  OfferFile/Dto/   → OfferExplainerOutput, OfferDocumentSlotsOutput
  Onboarding/Services/ → OnboardingSharedService + Temporal (RecalculateOffers, ValidateAvmValue)
```

### Common File Types

| Pattern | Purpose | Example |
|---------|---------|---------|
| `*AppService.cs` | ABP application service (auto-exposed REST) | `PropertyAppService.cs` |
| `*Controller.cs` | MVC/OuterApi controller | `OffersV2Controller.cs` |
| `*Dto.cs` | Data transfer object | `GetCustomerDto.cs` |
| `*Input.cs` / `*Output.cs` | Request/response models | `CreatePropertyInput.cs` |
| `*Workflow.cs` | Temporal workflow definition | `BlastWorkflow.cs` |
| `*Activities.cs` | Temporal activity implementations | `BlastActivities.cs` |
| `*MappingConfiguration.cs` | AutoMapper extension | `PropertyMappingConfiguration.cs` |
| `*Filter.cs` | Action filter / middleware | `OuterApiExceptionFilter.cs` |

## AutoMapper / DTO Mapping

- **Central mapper:** `CustomDtoMapper.CreateMappings()` in `Offervana.Application`
- **Domain-organized mapping extension files** in `Application/MappingConfigurationExtensions/` (one per domain)
- Pattern: Extension methods on `IMapperConfigurationExpression` (not AutoMapper Profiles)
- Some entities use `[AutoMapFrom]`/`[AutoMapTo]` attributes (ABP convention)

## Error Handling

| Pattern | Scope | Details |
|---------|-------|---------|
| ABP built-in | Global | Handles `UserFriendlyException`, `AbpValidationException`, `AbpAuthorizationException` |
| `OuterApiExceptionFilter` | OuterApi controllers | Maps exceptions → HTTP status (404, 403, 409). Logs to Application Insights |
| Dev exception page | Dev only | `UseDeveloperExceptionPage()` |
| Prod error handler | Prod | `UseExceptionHandler("/Error")` |

## Middleware Pipeline

| Middleware | Purpose |
|------------|---------|
| `UserVerificationAccessFilterMiddleware` | Blocks unconfirmed phone users (403) with endpoint allowlist |
| `UserLastLoginMiddleware` | Tracks last login timestamp |
| `JwtTokenMiddleware` | JWT Bearer authentication |
| `BlogSeoMiddleware` | Server-rendered SEO metadata injection for blog URLs (new 2026-04-06) |

## Logging

- ABP built-in `ILogger` (Castle.Core) for most AppServices
- `Console.WriteLine` used in Temporal activities (anti-pattern)
- Application Insights for telemetry + `OuterApiExceptionFilter` logging
- `[DisableAuditing]` on read-heavy endpoints

## Testing

| Project | Framework | Coverage |
|---------|-----------|---------|
| Offervana.Application.Tests | MSTest + Moq | Small coverage + new OfferBonus validation tests (`CreateOfferBonusInputValidationTests`, `UpdateOfferBonusInputValidationTests`) |
| Offervana.Core.Tests | MSTest + Moq | 1 test file |
| Zoodealio.Temporal.Tests | MSTest + Moq + EF InMemory | 2 test files |

**Significant gap** — handful of test files across the entire solution. No integration or API tests.

## Shared Utilities

| Utility | Location | Purpose |
|---------|----------|---------|
| `OffervanaRepositoryBase<T>` | EntityFrameworkCore | Custom EF repo with failover, read-only, eager loading |
| `CosmosRepository<T, K>` | Offervana.Storage | Generic Cosmos DB repository |
| `BlobUrlHelper` | Core | Azure Blob URL generation |
| `BinaryObjectPublicUrlBuilder` | Application/Storage | Public URL builder for binary objects (updated 2026-04-09) |
| `EmailService` | Core | Email orchestration (SendGrid) |
| `IndexAppService` | Application | Azure AI Search indexing |
| `CustomDtoMapper` | Application | Central AutoMapper configuration |
| `BatchHelper` | Application | Temporal workflow batch size limits |
| `OnboardingSharedService` | Application.Shared | Shared onboarding logic callable from multiple layers |
| `BlogSeoHtmlRenderer` | Web.Host/Middleware | Server-side SEO metadata rendering |

## Anti-Patterns / Technical Debt

| Issue | Impact | Location |
|-------|--------|----------|
| Secrets in appsettings.json | Security risk — API keys, passwords in source | Web.Host appsettings |
| Three scheduler frameworks | Confusion — Quartz + Hangfire + Temporal (only Temporal active) | Web.Core, Application |
| Duplicate Function Apps | Maintenance — identical SendGrid webhook in 2 projects | FunctionApp + Functions |
| `Console.WriteLine` in Temporal | Missing structured logging | BlastActivities, ExecutorActivities, EmailActivities |
| `new HttpClient()` in constructors | Connection pool exhaustion risk | ExecutorActivities, EmailActivities |
| Migrator on netcoreapp3.1 | End-of-life framework | Offervana.Migrator |
| Mixed C# LangVersion | Inconsistent language features | Various .csproj files |
| Large commented-out code | Noise — Quartz jobs, DTO projections, HistoryLogAppService, EquityAppService | Application, Startup |
| Hardcoded URLs | Fragile — blob URLs in migration workflows | Temporal workflows |
| Minimal test coverage | Handful of test files for 88+ AppServices | All test projects |
