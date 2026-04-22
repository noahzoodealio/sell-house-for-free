---
artifact: workflows
service: zoodealio-infrastructure
commit-sha: fe5b090b5f7cbeeedeb92501724d875ba5923539
generated-at: 2026-04-15T00:00:00Z
temporal-workflow-count: 0
hosted-service-count: 0
scheduled-job-count: 0
---

# Workflows — zoodealio-infrastructure

## Not applicable — this is a Terraform repo

No runtime code runs in this repo. The equivalent question for IaC — "what automations or time-based processes are wired up?" — is answered below. The categories from the stage-06 spec are each addressed explicitly (rather than omitted) so agents don't mistake absence-of-mention for not-checked.

## Explicit "none" statements

| Category | Present? | Notes |
|---|---|---|
| **Temporal.io workflows** | No | No Temporal SDK, no `[Workflow]` classes, no workers. Ironically this repo *provisions* the `zoodealiotemporal` container app (the Temporal runtime host) but defines no workflows itself. |
| **Activities** | No | N/A — no Temporal. |
| **`IHostedService` / `BackgroundService`** | No | No .NET runtime. |
| **Hangfire / Quartz / ABP background jobs** | No | N/A. |
| **Azure Functions (Timer / ServiceBus / Blob / Queue triggers)** | No | This repo deploys no Azure Functions. The `zoodealiotemporal` Container App is the only workload. |
| **Service Bus topics/queues** | No | None provisioned and none consumed. There is no `azurerm_servicebus_*` resource anywhere in `modules/` or `environments/`. |
| **MediatR notifications / ABP event handlers** | No | No .NET code. |
| **Terraform-scheduled automations (`azurerm_logic_app_*`, `azurerm_automation_*`)** | No | None provisioned. |

## Implicit automation surface (for context)

The only "schedule-like" behavior this repo is *adjacent to* is:

- **ACR `:latest` image pull on Container App revision creation.** Not a schedule — it fires only when Terraform applies a change to the container app definition or when an operator manually creates a new revision. There is no drift detection, no automated re-pull.
- **Log Analytics 30-day retention** is a time-based *policy* on the workspace but is not a workflow/job.

## Operational triggers that *should* exist but don't

If this repo were a mature IaC pipeline, you'd expect to find:

- Scheduled `terraform plan` / drift-detection runs → **not present** (no CI)
- Scheduled state backup → **not present** (no remote state)
- Azure Policy assignments or Deployment Stacks → **not present**
- Budget alerts, Cost Management exports → **not present**

These are gaps, not conventions. Worth noting so downstream agents don't assume them.

## Summary

- **0 Temporal workflows, 0 hosted services, 0 scheduled jobs, 0 functions, 0 event wires.**
- **0 Terraform-provisioned automations.**
- The only time-based resource is Log Analytics retention (30 days, provider default SKU).
- The Container App pulls `:latest` — effectively a manual deploy trigger, not a schedule.
