---
artifact: workflows
service: zoodealio-mls
commit-sha: d42572f923c06d9445403b4a9716adeaeab8c6db
generated-at: 2026-04-16T00:00:00Z
temporal-workflow-count: 1
hosted-service-count: 1
scheduled-job-count: 1
---

# Zoodealio.MLS — Workflows, Hosted Services, Schedules

Summary: **1 Temporal workflow** (with **1 activity**), **1 hosted service** (bootstraps the Temporal schedule and hosts the worker in-process with the API), **1 scheduled job** (the Temporal cron that fires that workflow). **All Azure Functions are HTTP-triggered** — no Timer/ServiceBus/Blob/Queue triggers exist. **No MediatR notifications / ABP events / Hangfire / Quartz.**

## 1. Temporal workflows

### `PhotoProcessingWorkflow`

**Source:** `Zoodealio.MLS.Temporal/Workflows/PhotoProcessingWorkflow.cs` (decorated `[Workflow]`; entry `[WorkflowRun] RunAsync`)

| Field | Value |
|---|---|
| Workflow ID | `photo-processing-schedule` (reused from the Schedule ID — one workflow ID per schedule tick, configured in `TemporalHostedService`) |
| Task queue | `default-task-queue` (from `TemporalConstants.DefaultQueue`) |
| Purpose | Drains `mls-photo-processing-queue` of `PhotoProcessingEvent` messages, downloads each record's photos in parallel, and uploads them to a blob container. Runs until the queue is empty for 3 consecutive activity invocations. |
| Trigger | Temporal Schedule (see §3). No manual / HTTP trigger in-code. |
| Input | `PhotoProcessingWorkflowInput { TargetContainer = "mlsimages", BatchSize = 100, ImageBatchSize = 50 }` (values come from `Temporal:PhotoProcessing` config; workflow input defaults in the class are `TargetContainer="mlsimages"`, `BatchSize=100`, `ImageBatchSize=10` — the schedule passes 50 for `ImageBatchSize`, overriding the class default) |
| Output | `PhotoProcessingWorkflowResult { TotalMessagesProcessed, TotalImagesDownloaded, FailedMessages, SkippedRecords, TotalDuration, Errors }` |
| Signals / Queries | None |
| Child workflows | None |
| Activities called | `PhotoProcessingBatchActivity.ProcessBatchAsync` — invoked in a loop with `ActivityOptions { StartToCloseTimeout = TimeSpan.FromMinutes(30) }` and no explicit `RetryPolicy` (Temporal defaults apply) |
| Termination | After 3 consecutive empty batch results, the workflow returns its aggregate counts. No max-iteration guard beyond the empty-streak check. |
| Side effects (aggregated from activity) | Service Bus `Complete`/`DeadLetter` operations; Blob uploads to `{TargetContainer}/{MlsRecordId}/photo_{N}.jpg`; outbound HTTP GETs to photo source URLs |

**Determinism notes:** the workflow only uses `Workflow.Logger`, tracks iteration state in local variables, and delegates all I/O to the activity. No `HttpClient`, `DateTime.Now`, or `Random` inside the workflow body.

### `PhotoProcessingBatchActivity`

**Source:** `Zoodealio.MLS.Temporal/Activities/PhotoProcessingBatchActivity.cs` (method decorated `[Activity]` — regular DI-registered class)

- **Registration:** `services.AddScopedActivities<PhotoProcessingBatchActivity>()` (Temporalio.Extensions.Hosting) — scoped lifetime; a new activity instance per execution.
- **Dependencies (constructor-injected):** `IServiceBusService`, `IBlobStorageService`, `IHttpClientFactory` (uses named client `"ImageDownloader"` with 2-min timeout), `ILogger<PhotoProcessingBatchActivity>`.
- **Per-invocation steps:**
  1. `ReceiveMessagesAsync(BatchSize)` from `mls-photo-processing-queue` in `PeekLock` mode.
  2. Deserialize each message to `PhotoProcessingEvent`. Failures → dead-letter with reason `"DeserializationError"`.
  3. For each event, enumerate `photo_1.jpg`..`photo_{PhotoCount}.jpg` against `{Url}/`, download via the `ImageDownloader` `HttpClient` in parallel batches of `ImageBatchSize`.
  4. Upload each photo to `{TargetContainer}/{MlsRecordId}/photo_{N}.jpg`. Skip if the blob already exists (idempotent re-runs).
  5. `CompleteMessageAsync` on success; `DeadLetterMessageAsync(reason)` on failure.
- **Output:** `ProcessBatchResult { MessagesReceived, ImagesDownloaded, SkippedRecords, SuccessfulMessages, FailedMessages, Errors }`.

## 2. Hosted services (`IHostedService` / `BackgroundService`)

### `TemporalHostedService`

**Source:** `Zoodealio.MLS.Temporal/Services/TemporalHostedService.cs` (sealed, primary-constructor form: `TemporalHostedService(ITemporalClient temporalClient, IConfiguration configuration)`)

| Field | Value |
|---|---|
| What it does | Ensures the Temporal Schedule `photo-processing-schedule` exists at startup (idempotent: describe → on not-found, create). Registers workflow and activities by virtue of running inside the process configured with `ConfigureTemporalWorker()` in the API host. |
| Schedule | Runs on `StartAsync` (host bootstrap). `StopAsync` is a no-op. |
| Host | Runs **inside the ASP.NET Core API** (`Zoodealio.MLS.Api`), not a separate worker. |
| Dependencies | `ITemporalClient`, `IConfiguration` (reads `Temporal:PhotoProcessing:Cron`, `:TimeZone`, `:BatchSize`, `:ImageBatchSize`, `:TargetContainer`). |
| Notable side effects | On first start in a fresh Temporal namespace, creates the schedule. Subsequent starts are harmless no-ops. An API restart does not disturb an existing schedule. |

**This is the only `IHostedService` / `BackgroundService` in the solution.**

## 3. Scheduled jobs

### Temporal Schedule — `photo-processing-schedule`

| Field | Value |
|---|---|
| Schedule ID | `photo-processing-schedule` (from `TemporalConstants.PhotoProcessingScheduleId`) |
| Cron | `0 6,18 * * *` (daily at 06:00 and 18:00) |
| Time zone | `Europe/Kyiv` (from `Temporal:PhotoProcessing:TimeZone`) |
| Target | Starts `PhotoProcessingWorkflow` with the workflow input described in §1 |
| Configurable? | Yes — all fields (cron, timezone, batch sizes, target container) are in `appsettings.json` under `Temporal:PhotoProcessing`. Schedule changes require the bootstrap logic to update-or-recreate; current code only creates on not-found — **changes to the schedule in config do not propagate to an existing schedule** (flag as ambiguity for curation). |
| Bootstrapped by | `TemporalHostedService.StartAsync` (§2) |
| Namespace | `zoodealio-mls.ig4su` (Temporal Cloud) |

**No other scheduled jobs exist.** No Hangfire, Quartz, ABP background jobs, cron-like hosted services, or Timer-triggered Functions.

## 4. Azure Functions triggers

All four functions use `HttpTrigger` only:

| Function | Trigger | Route |
|---|---|---|
| `GetFilesByActionFunction` | `HttpTrigger(AuthorizationLevel.Anonymous, "get", "post")` | `/api/GetFilesByAction` |
| `NotifyStatusFunction` | `HttpTrigger(AuthorizationLevel.Anonymous, "post")` | `/api/NotifyStatus` |
| `ProcessFileImagesFunction` | `HttpTrigger(AuthorizationLevel.Anonymous, "post")` | `/api/ProcessFileImages` |
| `UnZipBlobFunction` | `HttpTrigger(AuthorizationLevel.Anonymous, "post")` | `/api/UnZipBlob` |

**No** `TimerTrigger`, `ServiceBusTrigger`, `BlobTrigger`, `QueueTrigger`, `EventHubTrigger`, or `CosmosDBTrigger` anywhere in the repo (confirmed by grep across the full tree). A future indexing/processing pipeline that wanted to be event-driven from storage would have to add one of these — none exist today.

## 5. Event producers / consumers

### Service Bus: `mls-photo-processing-queue`

| Direction | Component | File |
|---|---|---|
| Producer | `SendToServiceBusHandler` (within `ProcessFileImagesFunction` handler chain) | `Zoodealio.MLS.FunctionApp/ProcessFileImages/Handlers/SendToServiceBusHandler.cs` |
| Consumer | `PhotoProcessingBatchActivity.ProcessBatchAsync` (driven by the Temporal workflow above) | `Zoodealio.MLS.Temporal/Activities/PhotoProcessingBatchActivity.cs` |
| Message shape | `PhotoProcessingEvent { MlsRecordId, PhotoCount, Url }` (see schemas.md §4) |
| Mode | `PeekLock` on receive; explicit `Complete` or `DeadLetter` |
| Batching | Producer sends in groups of 1000 per `SendMessagesAsync` call |

**No other Service Bus queues/topics** are referenced. The connection string and queue name come from `ServiceBus:ConnectionString` / `ServiceBus:QueueName`.

### MediatR notifications / ABP events

**None.** `grep` for `INotificationHandler` returned zero matches across the repo. MediatR is used only for request/response (`IRequest<T>`), not for pub/sub.

## 6. Orphans / ambiguities

1. **Schedule drift.** `TemporalHostedService` only creates the schedule on not-found; it never updates an existing schedule. If cron/timezone/batch sizes are changed in `appsettings.json`, the running schedule in Temporal Cloud will keep its old values until the schedule is deleted and the host restarts. Worth curating into an explicit update step.
2. **Empty-batch termination is the only exit.** `PhotoProcessingWorkflow` has no max-iteration cap. A continuously-filled queue would keep the workflow running indefinitely within a single schedule tick, potentially overlapping with the next tick. Temporal's default overlap policy for schedules (`Skip`) protects against double-starts but a runaway workflow tick is still possible.
3. **No signal/query handlers on the workflow.** Runtime introspection (e.g., "how many messages processed so far") isn't possible without workflow code changes.
4. **Time zone `Europe/Kyiv`.** Previously flagged; confirm operational intent vs. UTC.
