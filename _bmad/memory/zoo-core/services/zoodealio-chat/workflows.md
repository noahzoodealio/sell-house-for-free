---
artifact: workflows
service: zoodealio-chat
commit-sha: 8aa135f2b2cba743d335905ae794181bb658bb22
generated-at: 2026-04-16T00:00:00Z
temporal-workflow-count: 5
temporal-workflow-registered: 2
temporal-activity-count: 29
hosted-service-count: 0
scheduled-job-count: 0
azure-function-count: 0
---

# Zoodealio.Chat — Durable Workflows

## At a glance

- **Temporal workflows declared: 5** (2 registered with the worker, 3 dormant)
- **Temporal activities declared: 31** (29 registered; 2 declared but unregistered)
- **Hosted services / `IHostedService`: none** (.NET concept; not applicable)
- **Scheduled jobs / cron / Hangfire / Quartz: none**
- **Azure Functions triggers: none** (not an Azure Functions app)
- **Service Bus / Event Grid topics: none** (no event consumers or producers)
- **Task queues: 1 live** (`zoodealio-agent-task-queue`) and 1 dead-referenced (`zoodealio-task-queue`, referenced only by dormant `tools_client.py`)

This service's entire "async/background" surface is Temporal. There is no timer-based or event-based processing outside of what Temporal orchestrates.

---

## Temporal workflows

### 1. `ZoodealioAgentWorkflow` — **registered, live**

- **File:** `temporal_agent_integration.py:68`
- **Workflow ID pattern:** `zoodealio-agent-{hash(user_input)}` (⚠ `hash()` is not stable across processes — flag at finalize)
- **Task queue:** `zoodealio-agent-task-queue`
- **Trigger:** `run_pure_temporal_agent()` in the Chainlit web process when `AGENT_MODE=temporal`
- **Purpose:** run a full OpenAI agent turn (with tool use) as a single durable workflow
- **Input:**
  - `user_input: str`
  - `ctx: ZoodealioContext | Dict[str, Any]` (Temporal may serialize as dict; the workflow rehydrates via `ZoodealioContext(**ctx)` — see `temporal_agent_integration.py:94`)
  - `system_instructions: Optional[str]`
  - `model: Optional[str]` (default `"gpt-5-nano"`)
  - `vector_store_id: Optional[str]` (for OpenAI FileSearchTool)
  - `ui_name: Optional[str]` (Agent display name, default `"Zoodealio Chat"`)
- **Output:** `str` — final agent response
- **Activities called (registered as agent tools at runtime):**
  - `set_agent_context` (always, timeout 10s, retry 5×)
  - **If `property_id + bearer_token + api_url` present:** `get_property_info`, `get_property_value`, `get_cash_offers`, `get_home_equity`, `get_property_history`, `get_long_term_rental_potential`, `get_rent_vs_sell_analysis`, `get_property_survey`, `get_short_term_rental_potential` (each 30s timeout, retry 5×)
  - **If also `zipcode` present:** `get_market_trends`, `compare_market_trends` (30s timeout, retry 5×)
  - **If `customer_user_id` present:** `get_customer_properties`, `get_assigned_agent_info`, `analyze_portfolio_equity` (30s / 30s / 60s timeouts, retry 5×)
  - Plus OpenAI LLM-turn activities (managed by `OpenAIAgentsPlugin` — 90s start-to-close, 10m schedule-to-close, retry 5×)
- **Signal/Query handlers:** none
- **Child workflows:** none
- **Side effects:** outbound HTTP to Offervana BLAST via each activity; outbound HTTPS to OpenAI via OpenAIAgentsPlugin; no DB writes
- **Notable behavior:**
  - Tool set is **context-gated** — missing `property_id` removes property tools, missing `zipcode` removes market tools, etc.
  - On failure of `set_agent_context`: returns a friendly apology string rather than raising (so the caller gets a usable response).

### 2. `ToolRunnerWorkflow` — **registered, live**

- **File:** `temporal_workflows/tool_runner_workflow.py:125`
- **Workflow ID pattern:** `chat-{session_id}/tool-{counter:03d}-{tool_name}` — where `session_id` is the Chainlit thread id and `counter` auto-increments per session. Search by the `chat-{session_id}` prefix in the Temporal UI to retrieve all tool calls for a given chat session.
- **Task queue:** `zoodealio-agent-task-queue`
- **Trigger:** `HybridStreamingAgent.tool_executor.execute_tool()` — one workflow per tool call made by OpenAI in hybrid mode
- **Purpose:** execute a single agent tool reliably (retries, durable history, observable in Temporal UI)
- **Input:** `Dict[str, Any]` shaped like `ToolExecutionInput`:
  - `tool_name: str` (must match `TOOL_REGISTRY` key)
  - `arguments: Dict[str, Any]` (LLM-provided)
  - `context: Dict[str, Any]` (`bearer_token`, `api_url`, `property_id`, `customer_user_id`, `zipcode`)
- **Output:** `Dict[str, Any]` shaped like `ToolExecutionResult` (`{success, result, error}`)
- **Activities called:**
  - `set_agent_context` (always, 10s timeout, retry 3×)
  - One of the 15 wrapper activities from `TOOL_REGISTRY`, selected by `tool_name`:
    - Property tools: `get_property_info`, `get_property_value`, `get_cash_offers`, `get_home_equity`, `get_property_history`, `get_long_term_rental_potential`, `get_rent_vs_sell_analysis`, `get_property_survey`, `get_short_term_rental_potential`
    - Market tools: `get_market_trends`, `compare_market_trends`
    - Customer tools: `get_customer_properties`, `get_assigned_agent_info`, `analyze_portfolio_equity`
  - (60s timeout, retry 3×)
- **Signal/Query handlers:** none
- **Child workflows:** none
- **Notable:** `TOOL_REGISTRY` is the single source-of-truth for which tools this workflow can dispatch. Unknown `tool_name` raises `ValueError`, failing the workflow (hybrid agent catches + surfaces as `"Error: ..."` string to the LLM).

### 3. `PropertyAnalysisWorkflow` — **dormant (declared, not registered)**

- **File:** `temporal_workflows/tools_workflows.py:56`
- **Intended workflow ID pattern:** `property-analysis-{property_id}-{loop_time}` (see `tools_client.py:80`)
- **Intended task queue:** `zoodealio-task-queue` (**NB:** different from live queue — dead reference)
- **Intended trigger:** `tools_client.analyze_property_via_temporal()` — not called anywhere except the dead `agents_integration_backup.py`
- **Status:** not registered in `temporal_tools_worker.py`. No live caller. Safe to delete.
- **Would have run:** an `agents.Agent("Property Analysis Agent", ...)` with 11 property tools and a hardcoded `gpt-4o-mini` model

### 4. `CustomerAnalysisWorkflow` — **dormant (declared, not registered)**

- **File:** `temporal_workflows/tools_workflows.py:148`
- **Intended workflow ID pattern:** `customer-analysis-{customer_user_id}-{loop_time}`
- **Intended task queue:** `zoodealio-task-queue` (dead)
- **Status:** same as above — declared, unregistered, only referenced from dead code

### 5. `SimplePropertyWorkflow` — **dormant (declared, not registered)**

- **File:** `temporal_workflows/tools_workflows.py:234`
- **Intended workflow ID pattern:** `simple-property-{property_id}-{loop_time}`
- **Intended task queue:** `zoodealio-task-queue` (dead)
- **Status:** same as above

---

## Temporal activities

### Registered activities — 29 total

All registered via `temporal_tools_worker.py:run_temporal_worker` on queue `zoodealio-agent-task-queue`.

**Wrapper layer (agent-facing — `temporal_workflows/agent_tools.py`) — 16 activities:**

| Activity | Params (agent-supplied) | Delegates to | Retry semantics |
|---|---|---|---|
| `set_agent_context` | `ctx: dict` | (sets module-level `_workflow_context`) | non-retryable on schema violation |
| `get_property_info` | `property_id` | `property_tools.get_property_info` → BLAST `Property/GetById` | ValueError → non-retryable; else retryable |
| `get_property_value` | `property_id` | `property_tools.get_blast_avm_value` → BLAST `BlastBoard/GetRealValue` | same |
| `get_cash_offers` | `property_id` | `property_tools.get_blast_cash_offers` → BLAST `IBuyerOffer/Get` | same |
| `get_home_equity` | `property_id` | `property_tools.get_blast_home_equity` → BLAST `BlastBoard/GetHomeEquity` | same |
| `get_property_history` | `property_id` | `property_tools.get_blast_historical_value` → BLAST `BlastBoard/GetHistoricalValue` | same |
| `get_long_term_rental_potential` | `property_id` | `property_tools.get_blast_long_term_rental_avm` → BLAST `GetLongTermRentalAVM` | same |
| `get_rent_vs_sell_analysis` | `property_id` | `property_tools.get_blast_rent_vs_sell` → BLAST `GetRentVsSellBreakdown` | same |
| `get_property_survey` | `property_id` | `property_tools.get_blast_survey` → BLAST `BlastBoard/GetSurvey` (⚠ divergent from the non-Temporal path's `GetBlastSurvey`) | same |
| `get_short_term_rental_potential` | `property_id, bedrooms, bathrooms, guests` | `property_tools.get_blast_short_term_rental_avm` → BLAST `GetShortTermRentalAVM` | same |
| `get_market_trends` | `property_id, zipcode` | `property_tools.get_blast_sales_trend_by_zipcode` (year_range hardcoded to 1) → BLAST POST `GetSalesTrend` | same |
| `compare_market_trends` | `property_id, zipcode` | `property_tools.get_blast_sales_trend_by_multiple_zipcodes` (year_range hardcoded to 1) → BLAST POST `GetSalesTrend` | same |
| `get_customer_properties` | `customer_user_id` | `customer_tools.get_all_properties_for_client` → BLAST `GetAllPropertiesForClient?CustomerUserId=` | same |
| `get_assigned_agent_info` | `customer_user_id` | `customer_tools.get_agent_info` → BLAST `GetAgent?userid=` (⚠ lowercase; non-Temporal path uses `customerUserId`) | same |
| `analyze_portfolio_equity` | `customer_user_id, max_properties=5` | `customer_tools.get_blast_home_equity_for_multiple_properties` → BLAST `GetAllPropertiesForClient` (**NB:** current impl returns only the properties list; per-property equity fan-out is not yet implemented — see `customer_tools.py:111` TODO comment) | same |
| `list_properties_for_rental_comparison` | `customer_user_id, limit=3` | `customer_tools.list_rental_properties` → BLAST `GetAllPropertiesForClient` + address-flattening | same |

**Implementation layer (lower-level BLAST callers) — 13 registered activities:**

| Activity | File | BLAST endpoint |
|---|---|---|
| `get_blast_cash_offers` | `property_tools.py:56` | `IBuyerOffer/Get` |
| `get_blast_avm_value` | `property_tools.py:96` | `BlastBoard/GetRealValue` |
| `get_blast_home_equity` | `property_tools.py:131` | `BlastBoard/GetHomeEquity` |
| `get_blast_historical_value` | `property_tools.py:151` | `BlastBoard/GetHistoricalValue` |
| `get_blast_sales_trend_by_zipcode` | `property_tools.py:171` | `BlastBoard/GetSalesTrend` (POST) |
| `get_blast_sales_trend_by_multiple_zipcodes` | `property_tools.py:191` | `BlastBoard/GetSalesTrend` (POST) |
| `get_blast_long_term_rental_avm` | `property_tools.py:223` | `BlastBoard/GetLongTermRentalAVM` |
| `get_blast_short_term_rental_avm` | `property_tools.py:243` | `BlastBoard/GetShortTermRentalAVM` |
| `get_blast_rent_vs_sell` | `property_tools.py:268` | `BlastBoard/GetRentVsSellBreakdown` |
| `get_blast_survey` | `property_tools.py:288` | `BlastBoard/GetSurvey` |
| `get_all_properties_for_client` | `customer_tools.py:15` | `Property/GetAllPropertiesForClient` |
| `get_agent_info` | `customer_tools.py:50` | `Customer/GetAgent` |
| `get_blast_home_equity_for_multiple_properties` | `customer_tools.py:86` | `Property/GetAllPropertiesForClient` (partial impl — see note above) |
| `list_rental_properties` | `customer_tools.py:131` | `Property/GetAllPropertiesForClient` + client-side composition |

(14 impl activities actually; `get_property_info` is both a wrapper name and an impl name — the wrapper calls the impl under the same name via `from .property_tools import get_property_info as _get_property_info`.)

Also registered: `get_property_info` (the impl from `property_tools.py:15`) — imported only via wrapper chain, but explicitly registered in the worker's `activities=[...]` list.

### Unregistered activities — 2

- No implementation activities are truly unregistered. Every `@activity.defn` in `property_tools.py` and `customer_tools.py` appears in `temporal_tools_worker.py`'s `activities=[...]`.

### Observability on activities

Every activity logs: (a) entry ("`Temporal activity: {name} for {id}`"), (b) exit ("`{name} activity completed for {id}`"). No payload logging. Errors get raised as `ApplicationError` with the original error wrapped; the workflow's retry policy then applies. The top-level `on_message` handler in `app.py` receives these as general exceptions, maps to the friendly string.

---

## Hosted services / background services

**None.** This is not a .NET app; the Chainlit web container runs only the Chainlit process, and the Temporal worker container runs only the `run_temporal_worker()` loop. No `IHostedService`-equivalent (no APScheduler, no `asyncio.create_task` of a long-running loop, etc.).

---

## Scheduled jobs

**None.** No cron, no Hangfire/Quartz/Celery/APScheduler. The only "scheduled" behavior is Temporal's own retry schedules within workflows. If a timer-based job is needed in the future, Temporal Schedules (on the existing task queue) would be the natural fit given the existing infrastructure.

`.gitignore` mentions `celerybeat-schedule` — a defensive gitignore entry; Celery is not installed and not used.

---

## Azure Functions triggers

**None.** Service runs on Azure Container Apps, not Functions. No `function.json`, no `HttpTrigger`/`TimerTrigger`/`ServiceBusTrigger`.

---

## Event consumers / producers

**None.** No Service Bus, no Event Grid, no Kafka. The only outbound messaging is HTTPS to BLAST, OpenAI, and Temporal Cloud.

---

## Dead orchestration surface (cleanup candidates)

| Artifact | Location | Status |
|---|---|---|
| `PropertyAnalysisWorkflow` | `temporal_workflows/tools_workflows.py` | Declared, unregistered, only ref is dead code |
| `CustomerAnalysisWorkflow` | same file | same |
| `SimplePropertyWorkflow` | same file | same |
| `PropertyAnalysisRequest` / `CustomerAnalysisRequest` dataclasses | same file | Used only by dormant workflows |
| `tools_client.py` — `get_temporal_client`, `get_property_info_via_temporal`, `analyze_property_via_temporal`, `analyze_customer_via_temporal` | `temporal_workflows/tools_client.py` | Not imported anywhere in active code; hardcodes `localhost:7233`; references dead `zoodealio-task-queue` |
| Task queue name `zoodealio-task-queue` | dead | Live queue is `zoodealio-agent-task-queue` |
| `agents_integration_backup.py` | root | Dead (historical copy; old `.via_temporal` code path) |
| Task queue env example `zoodealio-zee-task-queue` | `env.example.txt` | Drift — live default is `zoodealio-agent-task-queue` |
| Protocol inconsistency in `_log_generation` / `_log_tool_span` docstring claims vs current code | `app.py` | Minor — not workflow-critical |

None of this executes; all of it increases cognitive load on the next developer. Worth proposing a single PR to purge.

---

## Ambiguities / Flags for finalize

1. **`analyze_portfolio_equity` is partially implemented.** The wrapper/impl fetches the properties list and returns it; no per-property equity fan-out happens despite the docstring. The LLM will see a properties list and try to reason about equity across it without data. Prioritize fixing.
2. **`hash(user_input)` workflow ID** for `ZoodealioAgentWorkflow` is unstable across Python processes. Use a content-derived or UUID ID instead.
3. **Workflow ID dedup:** The tool-runner workflow uses a counter that resets when `TemporalToolExecutor` is re-instantiated per new chat. If a user reconnects to the same thread_id, the counter restarts from 1 — names may collide with older workflow IDs (Temporal will reject duplicate IDs with a different run configuration). Low risk but worth noting.
4. **`_workflow_context` global in `agent_tools.py`** is shared across activity invocations within a worker process. Temporal activities from different workflow executions could theoretically race on this global. For single-concurrency workers this is fine; for any `max_concurrent_activities > 1` configuration it is not. Check the worker concurrency settings.
5. **Dormant workflows on a ghost task queue** (`zoodealio-task-queue`). Either delete or register + point to the live queue.
6. **`list_properties_for_rental_comparison` is registered but never called** — no `TOOL_REGISTRY` entry, no `activity_as_tool` binding in `ZoodealioAgentWorkflow`. Agent cannot reach it today. Either wire it up or remove.
