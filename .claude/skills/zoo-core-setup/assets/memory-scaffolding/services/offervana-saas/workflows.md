---
artifact: workflows
service: offervana-saas
commit-sha: 61581dc184777cb7293ae594294d917556a35ca4
generated-at: 2026-04-16
---

# Offervana_SaaS — Workflows

## Overview

**Workflow Engine(s):** Temporal.io (primary — 40+ workflows), Azure Functions (webhook ingest), Quartz (registered but all jobs commented out), Hangfire (referenced but inactive)

## Temporal Architecture

- **Client:** Configured in Web.Host + Temporal worker via `ConfigureTemporalClient()` — connects to Temporal Cloud with mTLS
- **Worker:** Standalone `Zoodealio.Temporal` project, Docker container on Azure Container Apps
- **Task Queue:** Single `default-task-queue` for all workflows
- **Schedule Management:** `TemporalHostedService` creates/ensures all CRON schedules on worker startup (idempotent)

## Temporal Workflows

### Scheduled Workflows (11 — CRON-triggered)

#### BlastWorkflow

**File:** `Zoodealio.Temporal/Workflows/BlastWorkflow/BlastWorkflow.cs`
**Purpose:** Email blast execution — batches of 24, rate-limited SendGrid sending
**Trigger:** CRON schedule (`blast-schedule`)
**Activities:** `BlastActivities`

| Activity | Purpose | Retry |
|----------|---------|-------|
| GetBlastEmailCount | Count pending emails | 1 attempt, 5min timeout |
| SendBlastBatch | Send batch of 24 emails | 1 attempt, 1hr timeout |

#### Flow

```
GetBlastEmailCount → while (remaining > 0) → SendBlastBatch(24) → loop
```

#### LogsImportWorkflow

**File:** `Zoodealio.Temporal/Workflows/LogsImportWorkflow/LogsImportWorkflow.cs`
**Purpose:** Import Amplitude events + Langfuse AI sessions to SQL
**Trigger:** CRON schedule (`logs-import-schedule`)
**Activities:** `LogsImportActivities`

| Activity | Purpose | Retry |
|----------|---------|-------|
| ImportAmplitudeLogs | Download ZIP, parse JSON, insert to SQL | 1 attempt, 59min |
| GetLangfuseKeys | Get Langfuse API keys per tenant | 1 attempt, 59min |
| ImportLangfuseSessionsToCosmos | Sync Langfuse → Cosmos DB | 1 attempt, 59min |
| ImportLangfuseSessionsToSql | Import Cosmos → SQL (notifications + scoring) | 1 attempt, 59min |

#### SendGridWebhooksWorkflow

**File:** `Zoodealio.Temporal/Workflows/TemplatesCleanupWorkflow/SendGridWebhooksWorkflow.cs`
**Purpose:** Process buffered SendGrid webhook events from blob storage
**Trigger:** CRON schedule (`webhooks-processor-schedule`)
**Activities:** `EmailActivities`
**Timeout:** 60min

#### IndexerRunWorkflow

**Purpose:** Run Azure Search customer indexer
**Trigger:** CRON schedule (`indexer-schedule`)
**Activities:** `SearchActivities`

#### Other Scheduled Workflows

| Workflow | Schedule | Purpose | Timeout |
|----------|----------|---------|---------|
| RevalidateUserEmailsWorkflow | CRON | ZeroBounce email validation | 100s |
| UpdatePropertyCoordinatesWorkflow | CRON | Geocode missing property coords | 100s |
| WeeklyAgentEmailWorkflow | CRON | Weekly agent summary emails | 100s |
| DeleteInsertedIdentitiesWorkflow | CRON | Cleanup failed CSV import identities | 15min |
| DeleteFailedInsertCustomersWorkflow | CRON | Cleanup failed customer inserts | 100s |
| BtcRateSyncWorkflow | CRON | Sync BTC rate from CoinGecko | 2min/10min |
| FreemiumLimitCheckWorkflow | CRON | Reset freemium agent property limits | 5min |

### On-Demand Workflows (triggered by application code)

#### GoHighLevel CRM Sync (11 workflows)

| Workflow | Activities | Purpose |
|----------|-----------|---------|
| GhlContactUpsertWorkflow | GhlActivities | Sync customer to GHL (3 attempts, backoff) |
| BulkGhlContactUpsertWorkflow | GhlActivities | Bulk upsert contacts |
| GhlOffersContactUpsertWorkflow | GhlOffersActivities | Upsert offers contact |
| BulkGhlOffersContactUpsertWorkflow | GhlOffersActivities | Bulk upsert offers contacts |
| SellerScoreTagSyncWorkflow | GhlActivities | Sync seller score tags |
| GhlOffersStatusTagSyncWorkflow | GhlOffersActivities | Sync offer status tags |
| GhlOffersSellerSourceRefreshWorkflow | GhlOffersActivities | Refresh seller source |
| AgentAssignmentSyncToGhlWorkflow | GhlActivities | Sync agent assignments |
| AgentUnassignmentSyncToGhlWorkflow | GhlActivities | Sync agent unassignment |
| GhlOffersAgentAssignmentWorkflow | GhlOffersActivities | Offers agent assignment |

#### Lead Management (3 workflows)

| Workflow | Activities | Purpose |
|----------|-----------|---------|
| AssignLeadsWorkflow | AssignLeadsActivity | Assign leads to agent |
| AssignLeadsByZipCodesWorkflow | AssignLeadsActivity | Auto-assign by zip |
| UnAssignLeadsWorkflow | UnAssignLeadsActivity | Unassign leads |

#### Bulk Operations (4 workflows)

| Workflow | Activities | Purpose |
|----------|-----------|---------|
| AddClientsToHomeReportWorkflow | BulkActivities | Bulk add to HR blast |
| RemoveClientsFromHomeReportWorkflow | BulkActivities | Bulk remove from HR |
| ClientListExportWorkflow | ClientListExportActivities | Export client CSV |
| GroupsAssignWorkflow | GroupsAssignActivity | Assign groups to properties |

#### Onboarding (new 2026-04-06)

| Workflow | Activities | Purpose |
|----------|-----------|---------|
| RecalculateOffersWorkflow | RecalculateOffersActivities | Recalculate offers during onboarding/AVM flows (shared across layers) |
| ValidateAvmValueWorkflow | ValidateAvmValueActivities | Validate AVM for new/updated properties (part of AVM recalculation re-architecture, PR 8730) |

These live in `Offervana.Application.Shared/Onboarding/Services/Temporal/` so both the API host and the Temporal worker can reference the contracts.

#### Notifications

| Workflow | Activities | Purpose | Retry |
|----------|-----------|---------|-------|
| NotificationBatchWorkflow | NotificationBatchActivities | Batch notifications (10-min window), send email/SMS | 3 attempts |

#### Data Migration & Infrastructure (6 workflows)

| Workflow | Activities | Purpose |
|----------|-----------|---------|
| UserDataMigrationWorkflow | DataMigrationActivities | Agent-to-agent data migration |
| LangfuseMigrationWorkflow | LangfuseMigrationActivities | Backfill Langfuse to Cosmos (3 attempts) |
| MigrateHistoryLogsWorkflow | MigrateActivities | History log migration |
| MigrateCustomerScoresWorkflow | MigrateActivities | Recalculate customer scores |
| AzureManagementUpScaleWorkflow | AzureManagementActivities | Scale up SQL + App Service |
| AzureManagementDownScaleWorkflow | AzureManagementActivities | Scale down SQL + App Service |
| UpdateRealValuesWorkflow | UpdateRealValuesActivities | Refresh property RealValue computations |

#### One-Time Migrations (3 workflows)

| Workflow | Activities | Purpose |
|----------|-----------|---------|
| TemplatesCleanupWorkflow | EmailActivities | Migrate email template refs |
| MigrateStatsWorkflow (opened + delivered) | EmailActivities | Email opened/delivered stats migration |
| BinaryObjectBlobMigrationWorkflow | BinaryObjectBlobMigrationActivities | Binary → blob migration |

### Activity Classes (20+ registered)

| Activity Class | Scope | Key Operations |
|----------------|-------|----------------|
| BlastActivities | Scoped | Email count, batch send (rate-limited) |
| LogsImportActivities | Scoped | Amplitude ZIP import, Langfuse→Cosmos→SQL |
| ExecutorActivities | Scoped | HTTP calls to Web.Host APIs (coordinator) |
| EmailActivities | Scoped | Template migration, webhook blob processing |
| SearchActivities | Scoped | Azure Search indexer run/reset |
| GhlActivities | Scoped | GoHighLevel CRM contact sync |
| GhlOffersActivities | Scoped | GoHighLevel offers contact sync |
| BulkActivities | Scoped | Bulk Home Report client operations |
| MigrateActivities | Scoped | History/score migrations |
| DataMigrationActivities | Scoped | Agent data migration |
| AzureManagementActivities | Scoped | Azure SQL/App Service tier scaling (ARM) |
| FreemiumLimitActivities | Scoped | Freemium limit window resets |
| LangfuseMigrationActivities | Scoped | Langfuse API → Cosmos migration |
| BtcRateSyncActivities | Scoped | CoinGecko BTC rate sync |
| AssignLeadsActivity | Scoped | Lead assignment |
| UnAssignLeadsActivity | Scoped | Lead unassignment |
| ClientListExportActivities | Scoped | Client list CSV export |
| NotificationBatchActivities | Scoped | Notification queue → email/SMS |
| UpdateRealValuesActivities | Scoped | Property valuation updates |
| GroupsAssignActivity | Scoped | Group assignment |
| BinaryObjectBlobMigrationActivities | Scoped | Binary → blob migration |
| RecalculateOffersActivities | Scoped | Recalculate offers for a property (shared onboarding) |
| ValidateAvmValueActivities | Scoped | AVM validation (shared onboarding) |

### Common Retry Patterns

| Pattern | Workflows | Config |
|---------|-----------|--------|
| No retry (1 attempt) | Most scheduled workflows | `MaximumAttempts = 1` |
| Backoff retry (3 attempts) | GHL sync, Langfuse migration, notifications | Initial: 1-10s, Max: 30s-2min, Backoff: 2x |

## Azure Functions

| Function | Trigger | Auth | Purpose |
|----------|---------|------|---------|
| SendgridWebhookFunction (FunctionApp) | HTTP POST | Function Key | Buffer SendGrid webhooks → Blob Storage |
| SendgridWebhookFunction (Functions) | HTTP POST | Anonymous | Legacy duplicate of above |

## Event Flows

```
SendGrid Events → Azure Function → Blob → Temporal (SendGridWebhooksWorkflow) → SQL
Amplitude Events → Temporal (LogsImportWorkflow) → ZIP download → JSON → SQL
Langfuse Sessions → Temporal (LogsImportWorkflow) → API → Cosmos → SQL
CRM Sync → AppService → Temporal (Ghl*Workflow) → GoHighLevel API
Email Blasts → Temporal (BlastWorkflow) → SendGrid (rate-limited batches of 24)
Infrastructure → Temporal (AzureManagement*Workflow) → Azure ARM (SQL/App Service scaling)
Lead Assignment → AppService → Temporal (AssignLeads*Workflow) → SQL
Notifications → AppService → SQL queue → Temporal (NotificationBatchWorkflow) → Email/SMS
Onboarding / AVM → OnboardingAppService → Temporal (ValidateAvmValueWorkflow → RecalculateOffersWorkflow) → IBuyerOffers
```
