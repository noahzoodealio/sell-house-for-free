---
artifact: api-catalog
service: zoodealio-mls
commit-sha: d42572f923c06d9445403b4a9716adeaeab8c6db
generated-at: 2026-04-15T20:55:13Z
endpoint-count: 7
---

# Zoodealio.MLS — API Catalog

**7 HTTP endpoints across 3 functional areas**, split between two deployment models:

- **ASP.NET Core API** (`Zoodealio.MLS.Api`) — 3 endpoints for property search and lookup, JWT-protected, MediatR-dispatched.
- **Azure Functions** (`Zoodealio.MLS.FunctionApp`) — 4 endpoints for file/image processing pipelines, anonymous auth, custom handler chains (not MediatR).

| Functional area | Endpoints |
|---|---|
| Property Search & Details | 3 |
| File Status Management | 2 |
| File Processing Workflows | 2 |

---

## 1. Property Search & Details

All endpoints live on `PropertiesController` (`Zoodealio.MLS.Api/Controllers/PropertiesController.cs`). Auth is enforced globally via `app.UseAuthentication()` / `app.UseAuthorization()` in `Zoodealio.MLS.Api/Program.cs:53–54`; JWT bearer is configured via `StartupExtensions.AddJwtTokenConfigurations()` (`Zoodealio.MLS.Api/Extensions/StartupExtensions.cs:27–60`), reading `Jwt:Issuer`, `Jwt:Audience`, `Jwt:SecretKey` from config (symmetric HS256). No per-method `[Authorize]` attributes — global middleware enforces it.

### GET /api/properties/search

| Field | Value |
|---|---|
| Handler | `PropertiesController.SearchByAddress` (`Zoodealio.MLS.Api/Controllers/PropertiesController.cs:32`) |
| Auth | JWT bearer (global) |
| Query params | `address` (string, required), `pageNumber` (int, default 1), `pageSize` (int, default 20, max 100) |
| MediatR | `GetPropertyByAddressQuery` → `GetPropertyByAddressQueryHandler` |
| Backing call | `IAzureSearchService.SearchByAddressAsync()` |
| Response 200 | `PaginatedResult<PropertySearchResultDto>` |
| Response 400 | `{ error: string }` when `address` missing or `pageSize > 100` |
| Response 401 | JWT validation failed |
| Notes | Summary-only DTO (not full property details). Pagination is enforced. |

### GET /api/properties/attom/{attomId}

| Field | Value |
|---|---|
| Handler | `PropertiesController.GetByAttomId` (`Zoodealio.MLS.Api/Controllers/PropertiesController.cs:108`) |
| Auth | JWT bearer (global) |
| Route params | `attomId` (string, required) |
| MediatR | `GetPropertyDetailsByAttomIdQuery` → `GetPropertyDetailsByAttomIdQueryHandler` |
| Backing call | `IAzureSearchService.GetByAttomIdAsync()` |
| Response 200 | `PropertyDetailsDto` (full 100+ field record — agent/office/tax/features/schools/etc.) |
| Response 404 | `{ error: "Property with ATTOM ID '...' not found." }` |
| Response 400 | Missing `attomId` |
| Response 401 | JWT validation failed |

### GET /api/properties/{mlsRecordId}/history

| Field | Value |
|---|---|
| Handler | `PropertiesController.GetHistoricalChanges` (`Zoodealio.MLS.Api/Controllers/PropertiesController.cs:71`) |
| Auth | JWT bearer (global) |
| Route params | `mlsRecordId` (string, required) |
| Query params | `pageNumber` (int, default 1), `pageSize` (int, default 20, max 100) |
| MediatR | `GetPropertyHistoricalChangesQuery` → `GetPropertyHistoricalChangesQueryHandler` |
| Backing call | `IAzureSearchService.GetHistoricalChangesByMLSRecordIdAsync()` |
| Response 200 | `PaginatedResult<PropertyHistoricalChangeDto>` (price/status/date change snapshots) |
| Response 400 | Missing `mlsRecordId` or `pageSize > 100` |
| Response 401 | JWT validation failed |

---

## 2. File Status Management (Azure Functions)

All functions use `AuthorizationLevel.Anonymous`. They read/write `MlsProcessingLogEntity` in Azure Table Storage (partition `mls`, row key = file name; boolean flags `Unzipped`, `Indexed`, `ImagesProcessed`).

### GET|POST /api/GetFilesByAction

| Field | Value |
|---|---|
| Handler | `GetFilesByActionFunction.Run` (`Zoodealio.MLS.FunctionApp/GetFilesByAction/Functions/GetFilesByActionFunction.cs:33`) |
| Auth | Anonymous |
| Request (POST) | JSON `GetFilesByActionRequest { Action: ActionEnum }` |
| Request (GET) | Query `action=<int>` |
| Backing call | `ITableStorageService<MlsProcessingLogEntity>.QueryAsync()` with OData filter on stage flag |
| Response 200 | `List<FileItem>` (file names matching the stage) |
| Response 400 | Validation failure `{ success: false, errors: string[] }` |
| Response 500 | `{ success: false, error: string }` |
| Notes | `ActionEnum` values: 0=Created, 1=Unzipped, 2=Indexed, 3=ImagesProcessed. `Created` produces a null filter (all records match) — likely intentional, flag for curation. |

### POST /api/NotifyStatus

| Field | Value |
|---|---|
| Handler | `NotifyStatusFunction.Run` (`Zoodealio.MLS.FunctionApp/NotifyStatus/Functions/NotifyStatusFunction.cs:33`) |
| Auth | Anonymous |
| Request | JSON `NotifyStatusRequest { FileName: string, Action: ActionEnum }` — body required |
| Backing calls | `ITableStorageService.GetEntityAsync()` then `UpsertEntityAsync()` (creates entity if absent, flips flag for action stage, upserts) |
| Response 200 | `NotifyStatusResponse { Success: bool, Message: string }` |
| Response 400 | Null body `{ success: false, message }` or validation errors |
| Response 500 | `{ success: false, error: string }` |
| Notes | Not idempotent in the sense that repeated calls succeed silently; flag state becomes `true` on first call and stays true. |

---

## 3. File Processing Workflows (Azure Functions)

Long-running pipelines composed of sequential handler classes (not MediatR). Both publish side effects (Service Bus, Blob Storage uploads). Both use `AuthorizationLevel.Anonymous`.

### POST /api/ProcessFileImages

| Field | Value |
|---|---|
| Handler | `ProcessFileImagesFunction.Run` (`Zoodealio.MLS.FunctionApp/ProcessFileImages/Functions/ProcessFileImagesFunction.cs:46`) |
| Auth | Anonymous |
| Request | JSON `ProcessFileImagesRequest { SourceContainer, TargetContainer, BlobPath }` — all required, validated via `IValidator<ProcessFileImagesRequest>` (FluentValidation) |
| Response 200 | `ProcessFileImagesResponse { Success, Message, ProcessedRecords[], SkippedRecords[], TotalRecordsProcessed, Errors[] }` |
| Response 400 | Validation or JSON parse failure; also partial-failure signals |
| Response 499 | Operation cancelled (client timeout) |
| Response 500 | `{ success: false, error: string }` |
| Pipeline | `DownloadSourceFileHandler` → `ParseFileHandler` → `ProcessImagesHandler` → `SendToServiceBusHandler` |
| Side effects | Blob download (source); Service Bus publish of `PhotoProcessingEvent { MlsRecordId, PhotoCount, Url }` (batched in groups of 1000) |
| Notes | Constructs URLs via `BlobStorageConfiguration.BuildImageUrl()`. Partial success supported. |

### POST /api/UnZipBlob

| Field | Value |
|---|---|
| Handler | `UnZipBlobFunction.Run` (`Zoodealio.MLS.FunctionApp/UnZipBlob/Functions/UnZipBlobFunction.cs:48`) |
| Auth | Anonymous |
| Request | JSON `UnZipBlobRequest { SourceContainer, TargetContainer, BlobPath }` — all required, validated via `IValidator<UnZipBlobRequest>` |
| Response 200 | `UnZipBlobResponse { Success, Message, UploadedFiles[], Errors[], TotalFilesProcessed }` |
| Response 400 | Validation/parse failure; also partial-failure signals |
| Response 499 | Cancelled |
| Response 500 | `{ success: false, error: string }` |
| Pipeline | `ValidateZipBlobHandler` → `DownloadBlobHandler` → `ExtractTxtFilesHandler` → `UploadFilesHandler` |
| Side effects | Blob downloads (source ZIP); Blob uploads (extracted `.txt` files to target container). Non-`.txt` entries are skipped. |

---

## Cross-Service & Infrastructure Dependencies

| Dependency | Abstraction | Used by |
|---|---|---|
| Azure Search | `IAzureSearchService` | Endpoints 1–3 (property queries) |
| Azure Table Storage | `ITableStorageService<MlsProcessingLogEntity>` | Endpoints 4–5 (processing log) |
| Azure Blob Storage | `IBlobStorageService` | Endpoints 6–7 (file download/upload) |
| Azure Service Bus | `IServiceBusService` | Endpoint 6 (publishes `PhotoProcessingEvent`) |

No direct outbound HTTP calls to other Zoodealio services were observed at this layer.

---

## Shared DTOs (response contracts)

- **`PaginatedResult<T>`** — `{ Items: IReadOnlyList<T>, TotalCount, PageNumber, PageSize, TotalPages (computed), HasPreviousPage, HasNextPage }`
- **`PropertySearchResultDto`** — lightweight summary (ATTOM/MLS IDs, address breakdown, price, beds/baths, photo prefix/key, listing status, etc.)
- **`PropertyDetailsDto`** — superset of `PropertySearchResultDto` with 100+ fields: agent, office, tax assessor, owner vesting, features, schools, zoning, APN, building attributes.
- **`PropertyHistoricalChangeDto`** — subset focused on changes: price/status/date deltas, DOM (current and cumulative), agent/office.
- **`PropertyImagesDto`** — `{ MlsRecordId, ImageUrls: IReadOnlyList<string>, TotalCount }` (not exposed via HTTP endpoint in this service — reference only).
- **`ActionEnum`** — `Created=0, Unzipped=1, Indexed=2, ImagesProcessed=3`.

---

## Non-HTTP triggers observed (deferred to stage 06)

- `Zoodealio.MLS.Api/Program.cs` references `AddTemporalServices()`, `ConfigureTemporalClient()`, `ConfigureTemporalWorker()` — Temporal workflows exist but are not HTTP-triggered.
- `ProcessFileImages` publishes `PhotoProcessingEvent` to Service Bus — downstream consumer may live in another service or in this repo under a Service Bus trigger (to verify in stage 06).

## Ambiguities / items flagged for curation

1. Azure Functions are all anonymous. The ASP.NET Core API requires JWT. Confirm whether the Functions sit behind network/IP restrictions or are intentionally open (e.g., called from internal orchestrators).
2. `ActionEnum.Created` yields a null filter in `GetFilesByActionHandler.BuildFilterForAction()` — confirm this is intentional ("all files") and not a missing branch.
3. `NotifyStatus` is not idempotent in spirit — repeated calls silently no-op. No optimistic concurrency on the upsert.
4. `PropertyImagesDto` appears in shared code but no HTTP endpoint exposes it — may be internal only or be consumed by a downstream service.
5. Historical-snapshot ingest mechanism is not HTTP-triggered — presumably a backend indexer (revisit stage 06).
