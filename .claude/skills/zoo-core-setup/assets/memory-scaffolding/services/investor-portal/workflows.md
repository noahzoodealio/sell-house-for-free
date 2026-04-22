---
artifact: workflows
service: investor-portal
commit-sha: fa73b99cc3cccda1c404ea03329df9b99c3469f1
generated-at: 2026-04-15T00:00:00Z
temporal-workflow-count: 0
hosted-service-count: 1
scheduled-job-count: 0
---

# Zoodealio Investor Portal (ZIP) — Workflows & Background Processing

## Summary

- **Temporal workflows:** 0 (not used)
- **Hosted services (BackgroundService):** 1 (`ServiceBusQueueConsumer` — minimal/test-only wiring)
- **Scheduled jobs:** 0 (no Hangfire, Quartz, ABP jobs, or periodic timers)
- **Service Bus:** 1 queue (`testqueue`) with 1 handler (`TestQueueMessageHandler` — TODO stub)
- **Azure Functions:** 0 (not an Azure Functions host)
- **MediatR INotification handlers:** 0 (not used — only IRequest/IRequestHandler CQRS shape is used)

**Overall:** This service has essentially no durable async workflow. All "side effects" (emails, Slack posts, Azure Search indexing) run synchronously in-request under MediatR handlers and Application services. The Service Bus infrastructure is scaffolded but not productionized; only a test queue with a stub handler exists.

---

## Temporal.io Workflows

**Not used.** No `Temporal.*` package references, no `Workflow` / `Activity` attributes, no workflow classes. This contradicts CLAUDE.md's Temporal.io claim for Offervana/Chat/MLS — but ZIP is explicitly not on that list in the baseline patterns, so the absence is consistent.

---

## Hosted Services (IHostedService / BackgroundService)

### `ServiceBusQueueConsumer`

- **File:** `investor-portal/investor-portal-services/ZoodealioInvestorPortal.Integrations/Services/ServiceBusQueueConsumer.cs`
- **Kind:** `BackgroundService`, implements `IServiceBusQueueConsumer`
- **Registered:** `services.AddHostedService<ServiceBusQueueConsumer>();` in `IntegrationsDiContainer.cs:37`
- **Purpose:** Listens on each queue in `ServiceBusQueues.ActiveQueues`, dispatches messages through `IMessageHandlerRegistry` keyed by (queue, subject).
- **Startup behavior:**
  - If `ActiveQueues` is empty → logs warning and returns (consumer does not start)
  - Otherwise → creates one `ServiceBusProcessor` per queue
- **Per-queue processor options:**
  - `MaxConcurrentCalls = 1`
  - `AutoCompleteMessages = false`
- **Message dispatch flow:**
  1. Build `MessageContext` (body, subject, correlation ID, enqueued time, properties)
  2. Resolve `IMessageHandlerRegistry` from scoped service provider
  3. `registry.GetHandlers(queueName, args.Message.Subject)` → list of handlers
  4. If zero handlers → log warning, still complete message
  5. Invoke each handler's `HandleAsync(context, cancellationToken)`
  6. **Always** call `args.CompleteMessageAsync(args.Message)` in `finally`
- ⚠️ **Silent-drop failure mode:** Exceptions in handlers are caught and logged but the message is still marked complete. **No retry, no dead-letter routing.** A transient failure loses the message.
- **Error handler (`ProcessErrorAsync`):** Logs the error with `ErrorSource`, returns `Task.CompletedTask`.
- **Shutdown behavior (`StopAsync`):** Stops each processor, disposes, clears the processor list, then delegates to `base.StopAsync`.

---

## Scheduled Jobs

**None.** No Hangfire (`Hangfire.*`), no Quartz (`Quartz.*`), no ABP `IBackgroundJobManager`, no custom `PeriodicTimer` / `Task.Delay` loops, no cron expressions found anywhere in the service. There are no time-driven background jobs.

The **one** rate-limited endpoint (`forgotPassword`, 3 req / 15 min fixed window) is request-time throttling, not a scheduled job.

---

## Azure Functions

**Not applicable.** ZIP is an ASP.NET Core Web API, not an Azure Functions host.

---

## Event Consumers / Producers (Service Bus)

### Producers

#### `IServiceBusQueuePublisher` / `ServiceBusQueuePublisher`

- **File:** `investor-portal/investor-portal-services/ZoodealioInvestorPortal.Integrations/Services/ServiceBusQueuePublisher.cs`
- **Registered:** `services.AddScoped<IServiceBusQueuePublisher, ServiceBusQueuePublisher>();`
- **API:**
  - `PublishMessageToQueueAsync<T>(T data, string queueName)`
  - `PublishMessageToQueueAsync<T>(T data, string queueName, string correlationId)`
- **Message envelope:**
  - `MessageId` = new `Guid` per message
  - `Subject` = `typeof(T).Name` (e.g., `"OfferAcceptedEvent"`)
  - Body = `JsonSerializer.Serialize(data)`
  - Application properties: `Timestamp` (UTC), `Queue` (name)
  - Optional `CorrelationId` on the second overload
- **Sender lifecycle:** A new `ServiceBusSender` is created and disposed per publish (`await using`).

### Production callers

Grepping for `queuePublisher.` usages:

| Caller | Location | What it publishes |
|---|---|---|
| `OfferController` (test action around `superBebra`) | `ZoodealioInvestorPortal.Api/Controllers/Legacy/Offer/OfferController.cs:150` | `"superBebra"` (string) → `testQueue` |

**That is the only usage.** No production code publishes real domain events to Service Bus.

### Consumers

#### `TestQueueMessageHandler`

- **File:** `investor-portal/investor-portal-services/ZoodealioInvestorPortal.Integrations/QueueHandlers/TestQueueMessageHandler.cs`
- **Registered via:** `IMessageHandlerRegistry` (lookup by `QueueName` + optional `MessageType`)
- **`QueueName`:** `ServiceBusQueues.TestQueue` (`"testqueue"`)
- **`MessageType`:** `null` — matches **any** subject on the queue
- **Behavior:** Deserializes body to `JsonElement`, logs `"Processing test message. MessageId: {MessageId}"`, returns. Contains a `// TODO:` comment — real handler logic not implemented.

### Active queues

```csharp
// ServiceBusQueues.cs
public const string TestQueue = "testqueue";
public static readonly string[] ActiveQueues = [ TestQueue ];
```

Only `testqueue` is currently consumed. To activate additional queues, add to the `ActiveQueues` array and register a matching handler.

---

## MediatR INotification / Domain Events

**Not used.** MediatR is wired but only `IRequest<T>` + `IRequestHandler<TRequest, TResponse>` shapes are employed (Commands + Queries). No `INotification` / `INotificationHandler` publications were found. All cross-component coordination happens via direct service calls.

## ABP Event Bus

**Not applicable.** ZIP is not an ABP-based service.

---

## Inbound Webhook-Driven Notifications

These are not technically "workflows" (no durable state), but they are the closest thing to event-driven processing in the service. They're triggered by **Offervana_SaaS** calling into ZIP's `[AllowAnonymous]` endpoints:

| Endpoint | Handler | Downstream side effects |
|---|---|---|
| `POST /api/Offer/NotifyInvestorOnOfferStatusChange` | OfferController → `INotificationService` | SendGrid email to investor |
| `POST /api/Offer/NotifyInvestorOnOfferAccepted` | OfferController → `INotificationService` | SendGrid email to investor |
| `POST /api/Offer/NotifyTeamOnOfferAccepted` | OfferController → `INotificationService` | SendGrid email to team |
| `POST /api/Offer/NotifyUsersBuyboxMatchEmailAsync` (legacy) | OfferController → `INotificationService` | SendGrid email per buybox match |
| `POST /api/Offer/NotifyUsersBuyboxMatchBatch` | OfferController → `INotificationService` | Consolidated SendGrid email (15-min batch per property) |

All synchronous. No queue, no durable state, no retry — a failure returns an error to the caller (Offervana_SaaS) which presumably handles retry itself. Code comments flag migration to Service Bus as a TODO.

---

## Gaps / Orphans

1. **`ServiceBusQueuePublisher` is injected into `OfferController` but has only one call site — a test endpoint** (`superBebra`/`testQueue`). This is plumbing awaiting real usage; harmless but worth knowing.
2. **`TestQueueMessageHandler` is the only handler in `IMessageHandlerRegistry`** — if someone adds a new queue to `ActiveQueues` without also registering a matching handler, messages on that queue will log "No handlers found" and be silently completed (dropped).
3. **No retry/DLQ strategy** on the consumer. Design choice pending; production messaging should not rely on this consumer until policy is added.
4. **Webhook endpoints marked `[AllowAnonymous]`** (noted in api-catalog.md) with no signature/shared-secret — the TODO comment suggests migrating these to Service Bus to gain durability + auth.
