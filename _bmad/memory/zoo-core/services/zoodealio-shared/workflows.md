# Zoodealio.Shared — Workflows (Temporal, hosted services, scheduled jobs)

## Summary

**None.** `Zoodealio.Shared` is a declaration-only NuGet package. It has no runtime component, no process, no host, no entry point. Therefore there are:

- **No Temporal.io workflows or activities** defined in this package.
- **No `IHostedService` / `BackgroundService` implementations.**
- **No Azure Function entry points** (no `[Function]`, `[FunctionName]`, or `FunctionsStartup` types).
- **No `Quartz` / `Hangfire` / cron-scheduled jobs.**
- **No message-bus handlers** (`Azure.Messaging.ServiceBus`, `MassTransit`, etc. are not referenced).
- **No timer-driven code of any kind.**

A grep for `IHostedService`, `BackgroundService`, `Temporal`, `Workflow` (as Temporal SDK type), `Activity` (as Temporal SDK type), `Function` attribute, `ServiceBus`, or `Scheduled*` returns nothing under this package.

## Related domain concepts that are NOT Temporal workflows

### TIH Transaction Workflows (domain model, not orchestration)

TIH's `Workflow` / `WorkflowStage` / `WorkflowStageTask` entities (in `TradeInHoldings.Domain.Entities.TransactionWorkflows.WorkingEntities`) are a **data-model** implementation of multi-stage human task tracking — an approval-gated, assignee-driven template/instance workflow whose state transitions are driven by user actions at the TIH API, not by a durable workflow runtime.

- Templates live in `TransactionWorkflows/Configs/` (WorkflowConfig, WorkflowStageConfig, WorkflowStageTaskConfig, CustomFieldConfig, CustomFieldLayoutConfig).
- Runtime instances live in `TransactionWorkflows/WorkingEntities/` (Workflow, WorkflowStage, WorkflowStageTask, CustomPropertyField, CustomFieldLayout, PropertyTransaction, TransactionNote, ChangeRequest).
- Status progression is implicit in assignment/completion flags; there is no `WorkflowState` enum beyond the per-entity `IsCompleted/IsRequired/IsReviewRequired` booleans, plus `ChangeRequestStatus` (Pending/Approved/Rejected) and `WorkflowConfigStatus` (Draft/Published).

Treat this as a bespoke business-workflow domain; actual process orchestration (Temporal, hosted services) lives in the consuming service (`Zoodealio.TradeInHoldings` repo), not here.

### Approval pipeline via `ChangeRequest`

The `ChangeRequest` entity supports an approval-gated mutation pattern (Pending → Approved / Rejected) for fields/tasks where `IsChangeRequestRequired = true`. This is an **in-process approval data model**, not an async orchestration — mutations post a ChangeRequest, approvers act on it, and the consumer service's business logic applies or rejects the pending change synchronously in a command handler.

### Offer lifecycle state transitions

`IBuyerOffer` carries lifecycle flags (`IsCurrent`, `IsAccepted`, `IsDeleted`, `IsCounterOffer`, `OfferEventType`, `OfferVersion`) and the `PropertyOfferStatus` history table records every status change with `CreatedUtc`. These describe an offer state machine that flows across services (Offervana_SaaS is the writer, InvestorPortal and Chat consume it), but again — the state machine itself is implemented in the consuming services. This package only defines the schema.

## Where durable workflows live in the ecosystem (pointer only)

Per `CLAUDE.md`, Temporal workflows exist in:

- **Offervana_SaaS** — uses Temporal.io for durable workflows.
- **Zoodealio.Chat** — Temporal + Chainlit + OpenAI Agents.
- **Zoodealio.MLS** — Azure Functions + Service Bus + Temporal.

Indexing those services will populate their own `workflows.md`. This file is the authoritative answer for the `zoodealio-shared` package: *no workflows of any kind live here.*
