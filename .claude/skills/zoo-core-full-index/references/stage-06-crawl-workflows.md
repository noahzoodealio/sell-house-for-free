# Stage 06 — Crawl Workflows

**Goal:** Produce `workflows.md` in the sidecar — every Temporal workflow, hosted service, and scheduled job this service runs. These are the durable / background / time-based behaviors that agents need to know about when reasoning about data flow or debugging async issues.

## What to capture

### Temporal workflows (primary focus for services that use Temporal.io)

For every workflow class:

- **Workflow name** — class name + the workflow ID pattern used at start
- **Purpose** — one-line description of what this workflow accomplishes
- **Trigger** — who starts it (API endpoint, hosted service, manual admin tool, another workflow)
- **Input shape** — the workflow's input type; cross-reference schemas if it's a known DTO
- **Activities called** — list each activity, what it does, which external service or DB it touches
- **Signal/Query handlers** — if the workflow has any, list each with its input shape
- **Child workflows** — if this workflow spawns child workflows, name them
- **Retries + timeouts** — activity retry policies + workflow timeouts (if non-default)
- **Side effects** — emails sent, DB writes, external API calls (high-level; details live in Activities)

### Hosted services (IHostedService / BackgroundService implementations)

For each:

- **Service name**
- **What it does** — one-line purpose
- **Schedule** — on-startup? periodic? event-driven?
- **Dependencies** — which internal services/repos it uses
- **Notable side effects**

### Scheduled jobs (Hangfire, Quartz, ABP background jobs, custom schedulers)

For each:

- **Job name**
- **Schedule** (cron expression or description)
- **What it does**
- **Configuration** — is the schedule configurable? where?

### Azure Functions triggers (Zoodealio.MLS especially)

If the service uses Azure Functions for non-HTTP triggers:

- **Function name**
- **Trigger type** — TimerTrigger / ServiceBusTrigger / BlobTrigger / QueueTrigger
- **Trigger config** — cron expression for timer, queue/topic name for messaging
- **Purpose**

### Event consumers / producers

- **Service Bus topics/queues** published to or consumed from (name + direction)
- **Event handlers** — if using MediatR notifications or ABP events, list the notification types and their handlers

## Organization

Section per category (Temporal / Hosted Services / Scheduled Jobs / Azure Functions / Events). Each section lists items with consistent structure. Include a top-level summary (e.g., "38 Temporal workflows, 4 hosted services, 6 scheduled jobs, 2 Service Bus subscriptions").

If the service has **none** of a category, explicitly state so (e.g., "No Temporal workflows — this service does not use Temporal.io"). This prevents agents from assuming absence means "not checked."

## Frontmatter

```yaml
---
artifact: workflows
service: {service-name}
commit-sha: {from sidecar index}
generated-at: {ISO timestamp}
temporal-workflow-count: {N}
hosted-service-count: {N}
scheduled-job-count: {N}
---
```

## Review gate

Summarize: counts per category, notable workflows (longest-running, highest-fanout), anything that looks orphaned (declared but not wired to a trigger). Get user approval, update sidecar, advance.

## Next

`references/stage-07-finalize.md`
