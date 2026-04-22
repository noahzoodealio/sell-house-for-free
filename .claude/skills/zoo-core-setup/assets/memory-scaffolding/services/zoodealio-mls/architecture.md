---
artifact: architecture
service: zoodealio-mls
commit-sha: d42572f923c06d9445403b4a9716adeaeab8c6db
generated-at: 2026-04-16T00:00:00Z
---

# Zoodealio.MLS — Architecture

**At a glance.** .NET 8. 6 projects, 2 hosts (ASP.NET Core API + Azure Functions Isolated Worker), 1 Temporal workflow with 1 activity. No SQL `DbContext` anywhere — persistence is Azure AI Search + Blob + Table + Service Bus. The Temporal worker runs **in-process inside the API host** via an `IHostedService`, not as a separate worker. Outbound integrations: Azure services + Temporal Cloud; nothing else. Zoo.MLS does not call any other Zoodealio service — it is a read-endpoint + ingestion pipeline only.

## 1. Projects

Six projects in `Zoodealio.MLS.sln`:

| Project | Kind | TargetFramework | Purpose |
|---|---|---|---|
| `Zoodealio.MLS.Api` | ASP.NET Core executable | net8.0 | HTTP API host; 1 controller (`PropertiesController`) dispatching MediatR queries. Also hosts the Temporal worker in-process. Swagger enabled. |
| `Zoodealio.MLS.Application` | Library | net8.0 | MediatR query handlers for property search/details/history, JWT token service, AutoMapper-style projection to DTOs. No command side. |
| `Zoodealio.MLS.Common` | Library | net8.0 | Config POCOs, generic handler-chain abstractions (`IHandler<TContext>`, `BaseHandler<TContext>`), middleware (exception + logging context), shared validators/extensions (batch processing, JSON options). |
| `Zoodealio.MLS.Storage` | Library | net8.0 | Azure SDK wrappers: `IAzureSearchService`, `IBlobStorageService`, `IServiceBusService`, `ITableStorageService<MlsProcessingLogEntity>`. DI registration + config validation. |
| `Zoodealio.MLS.FunctionApp` | Azure Functions Isolated Worker executable | net8.0 | 4 HTTP-triggered functions (UnZipBlob, ProcessFileImages, GetFilesByAction, NotifyStatus). Uses custom handler chains — not MediatR. |
| `Zoodealio.MLS.Temporal` | Library | net8.0 | `PhotoProcessingWorkflow` + `PhotoProcessingBatchActivity`, Temporal client/worker DI registration, `TemporalHostedService` that creates/updates the schedule on startup. |

**Key NuGets (by project):**
- Api: `Swashbuckle.AspNetCore` 10.1.3, `Microsoft.ApplicationInsights.AspNetCore` 3.0.0, `System.IdentityModel.Tokens.Jwt` 8.16.0
- Application: `MediatR` 14.0.0, `Microsoft.AspNetCore.Authentication.JwtBearer` 8.0.24
- Common: `FluentValidation` 12.1.1, `morelinq` 4.4.0
- Storage: `Azure.Search.Documents` 11.7.0, `Azure.Storage.Blobs` 12.27.0, `Azure.Data.Tables` 12.9.1, `Azure.Messaging.ServiceBus` 7.18.2
- FunctionApp: `Microsoft.Azure.Functions.Worker` 2.51.0, `Azure.Identity` 1.17.0, `FluentValidation` 12.1.1
- Temporal: `Temporalio` 1.2.0, `Temporalio.Extensions.Hosting` 1.2.0

## 2. Layering (and where it diverges from the Zoodealio standard)

Zoo.MLS does **not** follow the canonical `Api / Application / Domain / Infrastructure / LegacyData / Integrations` layering. Concretely:

- No `Domain` project — business logic is thin and lives in Application handlers
- No `Infrastructure` project — persistence is in `Storage`
- No `LegacyData` project — this service has zero SQL surface and does not read from `OffervanaDbContext`
- No `Integrations` project — there are no outbound service integrations (SendGrid, ATTOM, OpenAI, etc.) from this repo

Effective layering:

| Layer | Project | Holds |
|---|---|---|
| Web host (read) | `Api` | Controllers, DI wiring, middleware, Swagger, auth |
| Function host (write/ingestion) | `FunctionApp` | HTTP-triggered function entry points + per-function handler chains |
| Application / CQRS-read | `Application` | MediatR `IRequestHandler<TQuery, TResult>` for property queries |
| Shared | `Common` | Config POCOs, `IHandler<TContext>` chain abstraction, middleware |
| Storage | `Storage` | Azure Search/Blob/Table/Service Bus abstractions |
| Orchestration | `Temporal` | Workflow + Activity + hosted service for schedule bootstrap |

The Function App deliberately **does not use MediatR**. Each function owns a per-invocation context object (`UnZipContext`, `ProcessFileImagesContext`) and runs a handler chain (`IHandler<TContext>` implementations composed via a per-function `ChainConfigurator`). Handlers short-circuit by checking `context.HasErrors` — no exceptions are thrown across chain boundaries. This is an intentional split from the read path.

## 3. Internal dependency graph

```
Api ──► Application ──► Storage ──► Common
 │         ▲                │
 │         └────────────────┘
 ├──► Storage
 ├──► Common
 └──► Temporal ──► Storage
              └──► Common

FunctionApp ──► Storage
         └────► Common
```

No project depends on `Api`. No cross-service HTTP references (no `HttpClientFactory` registrations for peer Zoodealio services). The only `HttpClient` registered is `"ImageDownloader"` (2-minute timeout) in `Zoodealio.MLS.Temporal/StartupExtensions.cs:22`, used by the activity to fetch photos from upstream URLs.

## 4. Entry points / hosts

### ASP.NET Core API host

`Zoodealio.MLS.Api/Program.cs` wires (line refs in file):

- `AddControllers()` (line 10)
- Swagger with JWT security scheme (lines 13–29)
- `AddApplicationServices()` — registers MediatR scanning `IApplicationAssembly` (line 34)
- `AddStorageServices()` — registers all Azure clients (line 35)
- `AddJwtTokenConfigurations()` — JWT bearer validation (line 36)
- `AddTemporalServices()` + `ConfigureTemporalClient()` + `ConfigureTemporalWorker()` — registers Temporal client + in-process worker (lines 38–40)
- `UseZoodealioMiddlewares()` — global exception handler + logging-context middleware (line 50)
- `UseAuthentication()` + `UseAuthorization()` (lines 53–54)

There is **no health-check endpoint** and **no CORS policy** registered.

### Azure Functions host

`Zoodealio.MLS.FunctionApp/Program.cs` uses the `FunctionsApplication.CreateBuilder()` pattern with `ConfigureFunctionsWebApplication()` (line 14). Application Insights is wired for the worker (lines 16–18). DI is scoped per-function via four startup extensions: `AddUnZipBlobServices()`, `AddProcessFileImagesServices()`, `AddGetFilesByActionServices()`, `AddNotifyStatusServices()` (lines 23–26). Each extension registers the function's validator (FluentValidation) and the handlers that compose its chain.

`host.json` carries only logging config and Application Insights sampling (exclude `Request` type). No function-level bindings are defined there; triggers are attribute-based on the functions themselves.

### Temporal hosted service (in the API host)

`Zoodealio.MLS.Temporal/Services/TemporalHostedService.cs` (lines 14–52) runs in the API process:

1. On `StartAsync`, ensures the Temporal Schedule `photo-processing-schedule` exists with cron `0 6,18 * * *` and timezone `Europe/Kyiv`, pointing at `PhotoProcessingWorkflow.RunAsync()` with input `{ TargetContainer: "mlsimages", BatchSize: 100, ImageBatchSize: 50 }`.
2. The same host registers the Temporal worker via `ConfigureTemporalWorker()`, polling task queue `default-task-queue` for workflow tasks and activity tasks.

This is the only `IHostedService` in the solution — no Hangfire, Quartz, or timer-triggered functions elsewhere.

## 5. External integrations

All outbound traffic is to Azure services or Temporal Cloud.

| Integration | Wired via | Config section |
|---|---|---|
| Azure AI Search | `AzureSearchService : IAzureSearchService` (`Zoodealio.MLS.Storage/AzureSearch/Services/AzureSearchService.cs`) using `SearchClient` | `AzureSearch` (`ServiceEndpoint`, `ApiKey`, `IndexName`) |
| Azure Blob Storage | `BlobStorageService : IBlobStorageService`, `BlobServiceClient` | `BlobStorage` + `AzureWebJobsStorage` conn string |
| Azure Table Storage | `TableStorageService<TEntity> : ITableStorageService<TEntity>`, `TableClient` | `AzureWebJobsStorage` conn string |
| Azure Service Bus | `ServiceBusService : IServiceBusService` using `ServiceBusClient` (`PeekLock`) | `ServiceBus` (`ConnectionString`, `QueueName`, `MaxConcurrentCalls`, `PrefetchCount`, `MaxBatchSize`) |
| Temporal Cloud | `TemporalClient` + `ConfigureTemporalWorker()` with mTLS (`ClientCertificate` + `ClientKey` from config) | `Temporal` + `Temporal:PhotoProcessing` |
| Azure Application Insights | `AddApplicationInsightsTelemetryWorkerService()` (FunctionApp) and `AspNetCore` package (API) | connection string from config/env |
| HTTP image downloader | named `HttpClient "ImageDownloader"` (2-min timeout) | n/a (in-process, used by Temporal activity) |

**Not present in this service:** SendGrid, OpenAI, direct ATTOM SDK, Figma, ADO MCP. `AttomId` is carried in search documents but Zoo.MLS does not fetch from ATTOM itself — ingestion upstream populates `AttomId` from a data source external to this repo.

## 6. Cross-service calls

**Inbound:** other Zoodealio services (and possibly external consumers) call `GET /api/properties/...` on the API, authenticating with a JWT issued by `IJwtTokenService` (local HMAC-signed).

**Outbound:** none. No `HttpClient` registrations for other Zoodealio services. Consumers of this service (e.g., Zoodealio.Chat, Offervana_SaaS) are expected to reach this API; those relationships are documented upstream, not here.

## 7. Durable workflows / background processing

### `PhotoProcessingWorkflow` (`Zoodealio.MLS.Temporal/Workflows/PhotoProcessingWorkflow.cs`)

Loop that calls `PhotoProcessingBatchActivity.ProcessBatchAsync` repeatedly. Exits after three consecutive empty batches. Each activity call has a 30-minute schedule-to-close timeout. Accumulates `ProcessBatchResult` totals into `PhotoProcessingWorkflowResult`.

### `PhotoProcessingBatchActivity` (`Zoodealio.MLS.Temporal/Activities/PhotoProcessingBatchActivity.cs`)

Per invocation:
1. Receives up to `BatchSize` messages from `mls-photo-processing-queue` in `PeekLock` mode.
2. For each `PhotoProcessingEvent`, enumerates `photo_1.jpg`..`photo_{PhotoCount}.jpg` against `{Url}/`, downloads via the `ImageDownloader` `HttpClient` in parallel batches of `ImageBatchSize` (default 50).
3. Uploads each image to the blob container `TargetContainer` (default `mlsimages`) at path `{MlsRecordId}/photo_{N}.jpg`. Skips if the target blob already exists (idempotent re-runs).
4. Completes successful messages; dead-letters failed ones (reason string recorded).
5. Returns counts (received / downloaded / skipped / succeeded / failed) and an errors list.

### Schedule

Schedule ID `photo-processing-schedule` on task queue `default-task-queue`, cron `0 6,18 * * *`, timezone `Europe/Kyiv`. Created/ensured by `TemporalHostedService` at API startup.

### Other background processing

None. There are no timer-triggered functions, no Hangfire, no ABP jobs, no additional hosted services.

## 8. Authentication & authorization

**API (Zoodealio.MLS.Api)**

- Scheme: `JwtBearerDefaults.AuthenticationScheme`, configured in `Zoodealio.MLS.Application/StartupExtensions.cs` (`AddJwtTokenConfigurations`)
- Validation parameters: `ValidateIssuer`, `ValidateAudience`, `ValidateLifetime`, `ValidateIssuerSigningKey` all `true`; `ClockSkew = 0`
- Signing: **symmetric HMAC-SHA256** via `SymmetricSecurityKey` built from `Jwt:SecretKey` (base64-decoded). No JWKS, no rotation — rotating the secret requires a host restart.
- Issuer/audience: constants `zoodealio-mls-api` / `zoodealio-mls-clients` from config
- Token minting: `IJwtTokenService.GenerateToken()` in `Zoodealio.MLS.Application/JwtToken/JwtTokenService.cs` (no HTTP endpoint exposes minting — tokens must be issued out-of-band, likely manually or by another Zoo service)
- Roles / policies / scopes: **none defined.** Auth is binary (valid JWT or 401).

**Function App (Zoodealio.MLS.FunctionApp)**

All four functions declare `AuthorizationLevel.Anonymous`. No function-key check, no IP restriction in `host.json`, no network isolation evidence in this repo. Any network-level protection would have to come from the Container Apps / Function App deployment configuration (not present in this repo — infra lives in `Zoodealio.Infrastructure`).

## 9. Happy-path data flows

### Query path — `GET /api/properties/search?address=…`

```
PropertiesController.SearchByAddress
  → MediatR ISender.Send(GetPropertyByAddressQuery)
    → GetPropertyByAddressQueryHandler.Handle
      → IAzureSearchService.SearchByAddressAsync(address, page, pageSize)
        → SearchClient.SearchAsync<PropertySearchDocument>(text, SearchOptions { Skip, Top, SearchFields })
      → project PropertySearchDocument → PropertySearchResultDto
  → return PaginatedResult<PropertySearchResultDto>
```

`GetPropertyDetailsByAttomIdQuery` and `GetPropertyHistoricalChangesQuery` follow the same shape, calling `GetByAttomIdAsync` and `GetHistoricalChangesByMLSRecordIdAsync` respectively.

### Ingestion path — `POST /api/UnZipBlob`

```
UnZipBlobFunction.Run
  → IValidator<UnZipBlobRequest>.ValidateAsync
  → build UnZipContext { SourceContainer, TargetContainer, BlobPath }
  → UnZipBlobChainConfigurator composes handlers:
      ValidateZipBlobHandler
        → blob existence + ZIP magic-byte check
      DownloadBlobHandler
        → BlobClient.DownloadStreamingAsync → ZipStream
      ExtractTxtFilesHandler
        → iterate ZipArchive entries, keep only *.txt → ExtractedTxtFiles dict
      UploadFilesHandler
        → BlobClient.UploadAsync per txt file → TargetContainer
  → return UnZipBlobResponse { Success, UploadedFiles[], TotalFilesProcessed, Errors[] }
```

Each handler short-circuits if `context.HasErrors`. The chain never throws; errors are collected in `context.Errors`.

### Image-processing pipeline — `POST /api/ProcessFileImages` → Service Bus → Temporal

```
ProcessFileImagesFunction.Run
  → ValidateAsync
  → build ProcessFileImagesContext
  → ProcessFileImagesChainConfigurator composes:
      DownloadSourceFileHandler    (source blob → string)
      ParseFileHandler             (parse → List<MlsImageRecord>)
      ProcessImagesHandler         (url normalization / filtering)
      SendToServiceBusHandler      (for each record, PhotoProcessingEvent; batched 1000 per ServiceBusSender.SendMessagesAsync)
  → return ProcessFileImagesResponse

[async, scheduled by Temporal at 06:00 / 18:00 Kyiv time]

Temporal: PhotoProcessingWorkflow.RunAsync
  loop:
    PhotoProcessingBatchActivity.ProcessBatchAsync
      → ServiceBusReceiver.ReceiveMessagesAsync(BatchSize)
      → for each message: download photos in parallel (ImageBatchSize) → upload to {TargetContainer}/{MlsRecordId}/photo_{N}.jpg
      → ServiceBusReceiver.CompleteMessageAsync or DeadLetterMessageAsync
    accumulate; exit after 3 empty batches
```

`NotifyStatus` and `GetFilesByAction` are orthogonal — they mutate/read `MlsProcessingLogEntity` in Table Storage for pipeline-stage tracking; see schemas.md and api-catalog.md.

## 10. Config surface (`appsettings.json`)

| Section | Keys | Drives | Required? |
|---|---|---|---|
| `Logging` | `LogLevel.*` | Log levels | optional |
| `AllowedHosts` | `"*"` | ASP.NET allow list | optional |
| `AzureSearch` | `ServiceEndpoint`, `ApiKey`, `IndexName` | Azure Search client | **required** |
| `Jwt` | `SecretKey`, `Issuer`, `Audience`, `ExpirationDays` | JWT validation + token minting | **required** (SecretKey/Issuer/Audience) |
| `BlobStorage` | `ServiceEndpoint`, `ImageContainerName`, `ImageContainerSaas` | photo URL building + container defaults | optional (defaults in code) |
| `AzureWebJobsStorage` | connection string | Blob + Table clients | **required** |
| `ServiceBus` | `ConnectionString`, `QueueName`, `MaxConcurrentCalls`, `PrefetchCount`, `MaxBatchSize` | Service Bus client | **required** (conn + queue) |
| `Temporal` | `ServerAddress`, `Namespace`, `UseTls`, `ClientCertificate`, `ClientKey` | Temporal client + worker | **required** |
| `Temporal:PhotoProcessing` | `Cron`, `TimeZone`, `BatchSize`, `ImageBatchSize`, `TargetContainer` | schedule + workflow input | **required** |
| `ApplicationInsights` | `ConnectionString` | telemetry | optional but used |

MCP servers (ADO, Figma) are not referenced by this service at runtime.

## 11. Deployment / infra signals

- No `Dockerfile` in this repo. Container images are built from `Zoodealio.Infrastructure` (not in this project).
- No pipeline YAML in-repo.
- `host.json` is the only deployment-adjacent config file; it only tunes logging + Application Insights sampling.

## 12. Deviations from Zoodealio norms — callouts for the Architect agent

1. **No two-database pattern.** Unlike Offervana_SaaS / TradeInHoldings / investor-portal, Zoo.MLS has no SQL DbContext and no `LegacyData`. Don't attempt to shape new work around `OffervanaDbContext` here.
2. **Two executable hosts in one solution** (`Api` + `FunctionApp`). API serves read queries; the Function App owns ingestion/processing. They share `Storage` + `Common` but ship/deploy separately.
3. **Temporal worker is in-process with the API.** The API's `IHostedService` both bootstraps the schedule and hosts workflow/activity workers. Restarting the API blocks scheduled runs until startup completes.
4. **Functions use a custom `IHandler<TContext>` chain — not MediatR.** Errors propagate via `context.Errors` + `context.HasErrors`, not exceptions. Follow the same pattern when adding Function work; don't introduce MediatR into `FunctionApp`.
5. **JWT uses symmetric HMAC, not JWKS.** Rotating `Jwt:SecretKey` requires a restart. No scope/role/policy checks exist — all authenticated callers have full access.
6. **All Azure Functions are `AuthorizationLevel.Anonymous`.** Any access control is delegated to deployment-level network restrictions, which are not visible in this repo.
7. **No cross-Zoodealio HTTP calls.** This service is inbound-only at the HTTP layer. The only outbound HTTP is the image downloader inside the Temporal activity.
8. **`TargetContainer` is configurable per request** for `UnZipBlob` and `ProcessFileImages`, but the downstream Temporal activity uses a **single target container** from workflow input (default `mlsimages`) — the Function-level target and the Activity-level target are independent inputs and can diverge.
9. **Schedule timezone is `Europe/Kyiv`.** Likely a legacy artifact from the original author's timezone; the cron `0 6,18 * * *` resolves to Kyiv wall-clock, not UTC.
