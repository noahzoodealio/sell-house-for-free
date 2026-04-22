---
artifact: workflows
service: zoodealio-trade-in-holdings
commit-sha: 29a8d56facd353a71227ec0107ba88b321a7bc3a
generated-at: 2026-04-15T00:00:00Z
temporal-workflow-count: 0
hosted-service-count: 0
scheduled-job-count: 0
azure-function-count: 0
event-subscription-count: 0
---

# TIH Workflows

## At a glance

**TIH has no durable or background processing.** All API calls are synchronous end-to-end. The service deliberately does not use Temporal, Hangfire, Quartz, `IHostedService`, Azure Functions, or MediatR notifications. The only non-inline work is startup scaffolding (migrations, seeds, permission sync) that runs before `app.Run()`.

This absence is not a gap in this index — it is verified by a repo-wide grep for every relevant framework keyword returning zero matches.

## Temporal workflows

**None.** TIH does not reference the Temporal .NET SDK. No `[Workflow]`, `[WorkflowInterface]`, `[WorkflowMethod]`, `[Activity]`, `ITemporalClient`, `TemporalWorker`, or `WorkflowEnvironment` usage anywhere in the solution.

If Offervana_SaaS / Zoodealio.Chat / Zoodealio.MLS initiate a Temporal workflow that calls an HTTP endpoint exposed by TIH, that invocation is *to* TIH (captured in `api-catalog.md`), not a TIH-owned workflow.

## Hosted services (`IHostedService` / `BackgroundService`)

**None.** No class in the solution inherits from `BackgroundService` or implements `IHostedService`. `services.AddHostedService<...>()` is present only as a commented-out line in `TradeInHoldings.Integrations/IntegrationsDiContainer.cs` (line 39 — `//services.AddHostedService<ServiceBusQueueConsumer>();`).

## Scheduled / background jobs

**None.** No Hangfire (`GlobalConfiguration`, `IBackgroundJobClient`, `RecurringJob`), no Quartz (`IJobDetail`, `ITrigger`, `IScheduler`), no ABP background jobs. No custom timer / scheduler wrapper. No `System.Threading.Timer` / `PeriodicTimer` in production code paths.

## Azure Functions

**None.** TIH is an ASP.NET Core Web API, not a Functions app. No `Microsoft.Azure.Functions.Worker` package, no `FunctionAttribute`, no host.json, no function.json.

## Event consumers / producers

### Azure Service Bus

**Wired but dormant.** `TradeInHoldings.Integrations.IntegrationsDiContainer` registers an `Azure.Messaging.ServiceBus.ServiceBusClient` as a singleton with the connection string `ConnectionStrings:ServiceBus`. No publisher wrapper, no message handler, no consumer host is active — the following registrations are all commented out in the same file:

- `services.AddScoped<IServiceBusQueuePublisher, ServiceBusQueuePublisher>();`
- `services.AddScoped<IMessageHandler, TestQueueMessageHandler>();`
- `services.AddScoped<IMessageHandlerRegistry, MessageHandlerRegistry>();`
- `services.AddHostedService<ServiceBusQueueConsumer>();`

Treat Service Bus as **not available at runtime**. If a feature needs it, the plumbing must be completed first.

### MediatR notifications

**None.** The solution uses MediatR only for `IRequest<T>` / `IRequest` (command/query) dispatch. No `INotification` types and no `INotificationHandler<T>` implementations are defined.

### Domain events

No domain-event abstraction (no `DomainEventDispatcher`, no `IEventPublisher`, no ABP `IEventBus`, no `MassTransit`, no Wolverine, no NServiceBus).

## Startup-time inline work

These run synchronously in `Program.cs` before `app.Run()` — not background work, but worth documenting since they're invisible to request-response call sites:

1. **EF migration — non-dev path** (`Program.cs` L106–111): `if (!app.Environment.IsDevelopment()) { ...db.Database.MigrateAsync(); }`. Uses `TradeInHoldingsDbContext` under its own DI scope.
2. **EF migration + seed — unconditional path** (L113–118): a second scope that runs `MigrateAsync` again and then `DbInitializer.SeedAsync(context)`. This is the only codepath that seeds. Because it's unconditional, migrations run twice in production environments (once per scope).
3. **Permission registry sync** (L121–125): `IPermissionService.SyncPermissionsFromCodebaseAsync()` reflects over `[RequirePermission]` attributes on every controller action in the loaded Api assembly, diffs against the `Permissions` table, creates new keys, removes stale keys, and re-assigns the full current set to the "Host Admin" role.

All three are **idempotent** and block request handling until complete.

## Transaction workflow state machine (data-model, not runtime)

Although TIH has no orchestration runtime, it *models* multi-step transactions through these entities:

- `WorkflowConfig` → `WorkflowStageConfig` → `WorkflowStageTaskConfig` (the template — what stages/tasks a transaction should have)
- `Workflow` → `WorkflowStage` → `WorkflowStageTask` (the live instance — per `PropertyTransaction`)

Stage advancement is driven by **synchronous API calls**, not a scheduler:

| Trigger | Endpoint | Effect |
|---|---|---|
| User clicks "Advance" | `PUT /api/Transaction/{id}/advance` | Marks current stage done, pulls next `WorkflowStageConfig`, creates the next `WorkflowStage` |
| User completes a task | `PUT /api/Transaction/tasks/{taskId}/complete` | Marks `WorkflowStageTask.IsCompleted = true`; may throw `ChangeRequestRequiredException` → 409 if the task requires a change-request approval gate that hasn't been satisfied |
| User reviews a task | `PUT /api/Transaction/tasks/{taskId}/review` | Marks reviewed |
| User terminates | `PUT /api/Transaction/{id}/terminate` | Sets `IsTerminated`; ends the state machine |
| User completes transaction | `PUT /api/Transaction/{id}/complete` | Sets `IsCompleted` |

All logic lives in `ITransactionService` + `IChangeRequestService`. No background compensation, no retry, no timeout — if a user abandons a transaction mid-stage, it stays there until another user acts on it.

## Summary table

| Category | Count | Notes |
|---|---|---|
| Temporal workflows | 0 | Not used |
| Hosted services | 0 | Slot for Service Bus consumer is commented out |
| Scheduled jobs | 0 | No Hangfire/Quartz/ABP jobs |
| Azure Functions | 0 | N/A (ASP.NET Core host) |
| MediatR notifications | 0 | MediatR used for requests only |
| Service Bus consumers | 0 | Client registered, consumer plumbing commented out |
| Service Bus publishers | 0 | Same |
| Startup inline tasks | 3 | Double migration, seed, permission sync |
