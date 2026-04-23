---
artifact: patterns
service: zoodealio-mls
commit-sha: d42572f923c06d9445403b4a9716adeaeab8c6db
generated-at: 2026-04-16T00:00:00Z
---

# Zoodealio.MLS — Patterns

What Zoo.MLS **actually does** in code. Dev agents should follow these when adding work to this service.

## 1. Stack baseline

- **Target framework:** `net8.0` across all 6 projects
- **Project-wide csproj defaults:** `<Nullable>enable</Nullable>`, `<ImplicitUsings>enable</ImplicitUsings>`
- **No central package management** — no `Directory.Build.props` / `Directory.Packages.props`; version numbers are per-csproj

### Key packages / versions

| Package | Version | Project |
|---|---|---|
| `MediatR` | 14.0.0 | Application |
| `Swashbuckle.AspNetCore` | 10.1.3 | Api |
| `System.IdentityModel.Tokens.Jwt` | 8.16.0 | Api, Application |
| `Microsoft.AspNetCore.Authentication.JwtBearer` | 8.0.24 | Application |
| `Microsoft.ApplicationInsights.AspNetCore` | 3.0.0 | Api |
| `Microsoft.ApplicationInsights.WorkerService` | 2.23.0 | FunctionApp |
| `Azure.Search.Documents` | 11.7.0 | Storage |
| `Azure.Storage.Blobs` | 12.27.0 | Storage, Application |
| `Azure.Data.Tables` | 12.9.1 | Storage |
| `Azure.Messaging.ServiceBus` | 7.18.2 | Storage, Temporal |
| `Azure.Identity` | 1.17.0 | FunctionApp |
| `Microsoft.Azure.Functions.Worker` | 2.51.0 | FunctionApp |
| `Temporalio` | 1.2.0 | Temporal |
| `Temporalio.Extensions.Hosting` | 1.2.0 | Temporal |
| `FluentValidation` | 12.1.1 | Common, FunctionApp |
| `Microsoft.Extensions.Options` | 10.0.3 | Common, Storage, Temporal |
| `morelinq` | 4.4.0 | Common |

### Language features leaned on

- **`required init` properties** across DTOs, context objects, and Function request/response models (`ProcessFileImagesContext`, `UnZipContext`, `MlsImageRecord`, all Function request DTOs).
- **Primary constructors** in middleware and `TemporalHostedService` — e.g., `public class ExceptionMiddleware(RequestDelegate next, ILogger<ExceptionMiddleware> logger)`.
- **`sealed` classes** for concrete implementations (context objects, chain configurators, validators, configurations, hosted service).
- **File-scoped namespaces** everywhere.
- **No records.** Query/command types are `class` with properties, not `record` with positional params — this is a deliberate deviation from the Zoodealio baseline; see §8.
- **`ConfigureAwait(false)` is not used.** Idiomatic `await` throughout.

## 2. Backend conventions

### Data access

- **No EF Core. No repositories. No unit of work.** Every Azure dependency is wrapped as a single-responsibility interface and called directly from handlers:
  - `IAzureSearchService` → `AzureSearchService` (wraps `SearchClient`)
  - `IBlobStorageService` → `BlobStorageService` (wraps `BlobServiceClient` / `BlobContainerClient`)
  - `ITableStorageService<TEntity> where TEntity : class, ITableEntity, new()` → `TableStorageService<TEntity>` (wraps `TableClient`)
  - `IServiceBusService` → `ServiceBusService` (wraps `ServiceBusClient` + `ServiceBusSender` + `ServiceBusReceiver`, mode `PeekLock`)

### MediatR query pattern (Application layer)

Queries are **plain `class`es implementing `IRequest<TResult>`** — not records.

```csharp
public class GetPropertyByAddressQuery : IRequest<PaginatedResult<PropertySearchResultDto>>
{
    public string Address { get; init; } = string.Empty;
    public int PageNumber { get; init; } = 1;
    public int PageSize { get; init; } = 20;
}
```

- **Naming:** `Get{Noun}Query` / `Get{Noun}ByXQuery` (e.g., `GetPropertyByAddressQuery`, `GetPropertyDetailsByAttomIdQuery`, `GetPropertyHistoricalChangesQuery`, `GetPropertyImagesQuery`).
- **Handler naming:** `{QueryName}Handler` implementing `IRequestHandler<TQuery, TResult>`.
- **Handler location:** `Application/Properties/Commands/` (yes — even the query handlers live under `Commands/`; this is a directory-naming quirk, not a semantic one).
- **Ctor DI style:** traditional constructor with underscore-prefixed fields, not primary constructors, in handlers.
- **MediatR registration:** assembly scan via `AddMediatR(cfg => cfg.RegisterServicesFromAssembly(typeof(IApplicationAssembly).Assembly))` using a marker interface `IApplicationAssembly`.
- **`CancellationToken`** is threaded from controller → handler → service call, always.

### Response shape

- Paginated queries return `PaginatedResult<TDto>` directly (`Items`, `TotalCount`, `PageNumber`, `PageSize`, computed `TotalPages`, `HasPreviousPage`, `HasNextPage`).
- Single-item queries return the DTO directly, with nullable return type (e.g., `PropertyDetailsDto?`). The controller translates `null` to HTTP 404.
- **No `Result<T>` / `OperationResult` envelope.** Raw DTOs flow from handler to controller.

### Mapping

- **No AutoMapper, no Mapster, no profile classes.**
- Handlers do **manual inline field-by-field projection** via `private static {Dto} MapTo{Dto}({Source} doc)` methods in the same file as the handler. For the full property-details DTO this is a ~100-line method; treat it as the canonical pattern for future mappings.

### Validation

- **FluentValidation** only.
- **API side:** no `IValidator<T>` wired into the MediatR pipeline. Handlers validate manually (e.g., `if (pageSize > 100) throw new BadRequestException(...)`).
- **FunctionApp side:** every function has `Validators/{Function}RequestValidator.cs` subclassing `AbstractValidator<TRequest>` and registered as `AddScoped<IValidator<TRequest>, {Validator}>()` in the per-function startup extension. The function awaits `await _validator.ValidateAsync(request, ct)` and branches to `BadRequestObjectResult` if `IsValid == false`.

### Error handling

- **Global middleware** `UseZoodealioMiddlewares()` registers `LoggerContextMiddleware` then `ExceptionMiddleware` (order matters — logger scope before exception handler). Both use primary-constructor form.
- **ExceptionMiddleware** (`Common/Middlewares/ExceptionMiddleware.cs`) maps:
  - `BadRequestException` (custom in `Common/Models/Exceptions/`) → 400
  - `UnauthorizedAccessException` → 401
  - any other `Exception` → 500 (DEBUG-only `Debugger.Break()`)
- **Response envelope:** `ErrorDetails { StatusCode, Message, DisplayMessage }` serialized via custom `ToString()` — **not** ASP.NET Core's `ProblemDetails`.

### Logging

- `ILogger<T>` from `Microsoft.Extensions.Logging`. No Serilog, no OpenTelemetry, no Langfuse.
- **Structured-log key conventions used consistently:** `{Address}`, `{Count}`, `{Total}`, `{Duration}`, `{MlsRecordId}`, `{AttomId}`, `{BlobPath}`, `{Container}`, `{Error}`, `{LineNumber}`, `{PhotoNumber}`, `{MessageId}`, `{ImageCount}`. Use these keys when adding new logs for dashboards/alerts to stay aligned.

### Dependency injection

- Every project exposes `StartupExtensions.Add{X}Services(this IServiceCollection, IConfiguration)`:
  - `AddApplicationServices()` — MediatR, JWT token service
  - `AddStorageServices()` — all Azure clients
  - `AddTemporalServices()`, `ConfigureTemporalClient()`, `ConfigureTemporalWorker()` — Temporal client + worker
  - `AddJwtTokenConfigurations()` — bearer validation
  - Per-function: `AddProcessFileImagesServices()`, `AddUnZipBlobServices()`, `AddGetFilesByActionServices()`, `AddNotifyStatusServices()`
- **Config binding is mixed:**
  - Most configs use **direct binding**: `var cfg = new FooConfiguration(); configuration.GetSection("Foo").Bind(cfg); services.AddSingleton(cfg);` (AzureSearch, BlobStorage, ServiceBus, Jwt).
  - **Temporal** uses `services.Configure<TemporalConfigurations>(configuration.GetSection("Temporal"))` (`IOptions<T>` style).
  - **Prefer direct binding** when adding new config — it's the majority pattern here.
- **No `IValidateOptions<T>`.** Required-field validation lives in startup code, throwing `InvalidOperationException` when a setting is missing or blank.

### Naming

- Interfaces: `IFoo`
- Private fields: `_foo`
- DTOs: `FooDto`
- MediatR queries: `GetFooQuery` (class, not record)
- MediatR handlers: `GetFooQueryHandler`
- FluentValidators: `FooRequestValidator`
- Configurations: `FooConfiguration`
- Azure clients: `FooService` + `IFooService`
- Function entry classes: `FooFunction`
- Handler-chain handlers: `{Verb}Handler` (e.g., `DownloadSourceFileHandler`, `ParseFileHandler`, `SendToServiceBusHandler`)
- Response builders (static): `FooResponseBuilder`
- Chain composers: `FooChainConfigurator`
- Pipeline contexts: `FooContext`
- Enums: `FooEnum` (e.g., `ActionEnum`)
- Constants: bare noun (`TemporalConstants`)

### Folder layout

- `Api/Controllers/`, `Api/Models/{Request,Response}Models/`
- `Application/Properties/{Queries,Commands,Models}/`
- `Application/JwtToken/`
- `Common/{Extensions,Handlers,Middlewares,Models/{Configurations,Exceptions,Events}}/`
- `Storage/AzureSearch/{Entities,Services,Models}/`, `Storage/BlobStorage/{Tables/Entities}/`, `Storage/ServiceBus/{Events}/`
- `FunctionApp/{FunctionName}/{Functions,Handlers,Handlers/Models,Models,Validators,Configurations,Builders,Enums,Startup}.cs`
- `Temporal/{Workflows,Activities,Models,Services,Constants,Extensions}/`

## 3. FunctionApp patterns

### Per-function folder template

Every function follows:

```
{FunctionName}/
  Functions/{FunctionName}Function.cs        — sealed public HttpTrigger class
  Handlers/{VerbHandler}.cs                  — each : BaseHandler<TContext>
  Handlers/Models/{FunctionName}Context.cs   — the per-invocation context (sealed, IAsyncDisposable)
  Models/{FunctionName}Request.cs
  Models/{FunctionName}Response.cs
  Validators/{FunctionName}RequestValidator.cs
  Configurations/{FunctionName}ChainConfigurator.cs
  Builders/{FunctionName}ResponseBuilder.cs  — static Create* methods
  StartupExtensions.cs                       — Add{FunctionName}Services(...)
```

### Chain composition

```csharp
public sealed class ProcessFileImagesChainConfigurator(
    DownloadSourceFileHandler download,
    ParseFileHandler parse,
    ProcessImagesHandler process,
    SendToServiceBusHandler send)
{
    public IHandler<ProcessFileImagesContext> ConfigureChain()
    {
        download.SetNext(parse).SetNext(process).SetNext(send);
        return download;
    }
}
```

- `IHandler<TContext>` and `BaseHandler<TContext>` live in `Common/Handlers/`. The base implements `SetNext`, iterates the chain, and guards each step with `if (context.HasErrors) return;`.
- **Handlers never throw across the chain** — they accumulate errors into `context.Errors`. The function entry point catches `Exception` only as a last-resort 500 mapper.
- Handler lifetime is `Transient`; validator lifetime is `Scoped`; chain configurator is usually `Transient`.

### Context objects

- Sealed, implement `IAsyncDisposable` (not `IDisposable`).
- Share a common shape: `SourceContainer`, `TargetContainer`, `BlobPath` as `required init string`.
- Hold `List<string> Errors`, `List<string> ProcessedRecords`, etc., as mutable collections.
- Thread-safe counters use `Interlocked.Add(ref _total, count)` (see `ProcessFileImagesContext.IncrementImagesDownloaded`).
- `DisposeAsync` clears collections and releases streams.

### Request deserialization

- Every function does `await JsonSerializer.DeserializeAsync<TRequest>(req.Body, jsonOptions, ct)` and null-checks the result.
- `JsonSerializerOptions` are centralized in `Common/Extensions/JsonSerializerExtensions.AddJsonOptions()`:
  - `PropertyNameCaseInsensitive = true`
  - `PropertyNamingPolicy = JsonNamingPolicy.CamelCase`
  - `DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull`
- Functions consume them via `IOptions<JsonSerializerOptions>`.

### Response building

Status codes come from a static `{Function}ResponseBuilder` with methods like `CreateSuccessResponse`, `CreateValidationErrorResponse`, `CreatePartialSuccessResponse`, `CreateCancellationResponse` (→ 499 `Status499ClientClosedRequest`), `CreateInternalErrorResponse`. Function body is roughly:

```csharp
var context = CreateContext(request);
await using (context) { await _chain.HandleAsync(context, ct); }
return context.HasErrors
    ? Builder.CreatePartialSuccessResponse(context)
    : Builder.CreateSuccessResponse(context);
```

## 4. Temporal patterns

- **Workflow decoration:** `[Workflow]` on the class; `[WorkflowRun] public async Task<TResult> RunAsync(TInput input)` on the entrypoint.
- **Activity decoration:** `[Activity] public async Task<TResult> ProcessBatchAsync(TInput input)` on the method; activity class is a regular DI-registered class (constructor injection).
- **Activity registration:** `services.AddScopedActivities<PhotoProcessingBatchActivity>()` (Temporalio extension). Scoped — a new activity instance per execution.
- **Determinism:** workflows call only `Workflow.UtcNow`, `Workflow.Logger`, `Workflow.DelayAsync`, and `Workflow.ExecuteActivityAsync`. No `HttpClient`, no `DateTime.Now`, no random, no blocking I/O inside the workflow. The `HttpClient` is used only inside the activity (via `IHttpClientFactory.CreateClient("ImageDownloader")`).
- **Activity options:** `new ActivityOptions { StartToCloseTimeout = TimeSpan.FromMinutes(30) }`. **No explicit `RetryPolicy`** — Temporal defaults apply.
- **Schedule bootstrap** (`TemporalHostedService.StartAsync`): idempotent. Calls `Client.GetScheduleHandle(id).DescribeAsync()`, catches not-found, then `Client.CreateScheduleAsync(id, new Schedule(action, spec))` where `spec.CronExpressions = [cron]` and `spec.TimeZoneName = "Europe/Kyiv"`.
- **Error propagation in activities:** try/catch per message, push errors into result list, dead-letter Service Bus messages via `ServiceBusReceiver.DeadLetterMessageAsync` with a reason string. Workflow aggregates the activity's error list across iterations.

## 5. Storage patterns

### Azure Search

- `SearchOptions` built fluently: `Size = pageSize, Skip = skip, IncludeTotalCount = true, QueryType = SearchQueryType.Full`.
- **Filter construction is string-concatenated OData** with escaping via private `EscapeODataString(s)` (`'` → `''`). Use that helper — don't hand-roll OData filters.
- Wildcard address search: `$"{address}*"` prefix match.
- `SearchFields` are explicitly added via `searchOptions.SearchFields.Add("propertyAddressFull")` (etc.) — the index field set is wide, so specifying reduces noise.
- Results returned as `Azure.Search.Documents.Models.SearchResults<PropertySearchDocument>`; the service layer returns a custom `PropertySearchResponse` wrapper (`Results` + `TotalCount`).

### Blob Storage

- Public image URL composition: `BlobStorageConfiguration.BuildImageUrl(blobPath)` — concatenates `ServiceEndpoint` + container name + blob path, optionally appending a SAS token from `ImageContainerSaas`. Use this helper, don't hand-concat URLs.
- Blob upload/download uses `BlobContainerClient.GetBlobClient(name).{UploadAsync,DownloadStreamingAsync}` — no custom streaming abstraction.

### Table Storage

- `TableStorageService<T>` generic. Query via `table.QueryAsync<T>(filter: odataFilter, cancellationToken: ct)`, returning `AsyncPageable<T>`.
- Upsert via `UpsertEntityAsync(entity, TableUpdateMode.Merge | Replace)` — ETag is ignored (no optimistic concurrency — see schemas.md §8.5).

### Service Bus

- Send via `ServiceBusSender.SendMessagesAsync(IEnumerable<ServiceBusMessage>)` — no explicit `CreateMessageBatch`/`TryAddMessage` is used, so **caller is responsible for keeping payload under the 256KB limit**. The existing 1000-per-send batching in `SendToServiceBusHandler` works because `PhotoProcessingEvent` is tiny, but new message types need to check size.
- Receive via `ServiceBusReceiver.ReceiveMessagesAsync(maxMessages, maxWaitTime)` in `PeekLock` mode; complete or dead-letter each message explicitly.

## 6. Testing

**No test project exists.** No `*.Tests.csproj`, no xUnit/NUnit/MSTest references, no assertion library. This is a pattern gap: any new test work needs to introduce the first test project — there is no in-repo convention to follow yet. Flag for curation.

## 7. Build / CI / lint

- No `.editorconfig`.
- No `Directory.Build.props` / `Directory.Packages.props`.
- No `.github/workflows/`, no `azure-pipelines.yml` in this repo.
- `README.md` is boilerplate.
- No `Dockerfile`, `docker-compose.yml`, or `Makefile`.

Expect infrastructure/pipelines to live in `Zoodealio.Infrastructure` (outside this repo).

## 8. Deviations from the Zoodealio baseline

These are the things Dev agents familiar with the broader Zoodealio stack need to **un-learn** when working in Zoo.MLS:

1. **No EF Core, no two-database pattern, no `LegacyData`.** Persistence is Azure AI Search + Blob + Table + Service Bus.
2. **Queries are `class`es, not `record`s.** `public class GetFooQuery : IRequest<Bar>` with `init`-set properties.
3. **Query handlers live in `Application/Properties/Commands/`** (directory name lies — it holds query handlers too).
4. **No AutoMapper.** Inline `MapToXxxDto` static methods in the handler file.
5. **`Integrations/` project doesn't exist.** This service has no SendGrid/ATTOM SDK/OpenAI dependencies to wrap.
6. **JWT is symmetric HMAC-SHA256**, not JWKS; no role/scope/policy auth — auth is binary.
7. **Two hosts per solution** (`Api` + `FunctionApp`) — a single-repo pattern that doesn't exist in Offervana/TIH/ZIP.
8. **FunctionApp avoids MediatR** on purpose. Use the `IHandler<TContext>` chain instead. Errors do not throw across chain boundaries; they accumulate in `context.Errors`.
9. **Mixed config binding.** Most configs use manual `GetSection().Bind()`; Temporal uses `IOptions<T>`. Prefer direct `Bind()` for new config.
10. **Custom `ErrorDetails` envelope**, not ASP.NET Core `ProblemDetails`.
11. **No test project.** There is no testing pattern to match — new tests establish the convention.
12. **Temporal worker co-located with the API host** via `IHostedService`. A restart of the API also resets the worker; no separate worker deployment.
13. **Azure Functions are `AuthorizationLevel.Anonymous`** in code. Access control is delegated to deployment-level network policies (not in this repo).

These are deliberate in most cases (cloud-native persistence, no OLTP need, single-customer auth model). The testing gap and the anonymous-functions gap are the two items worth flagging as potential curation targets rather than "the way we do it."
