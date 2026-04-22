---
artifact: patterns
service: zoodealio-chat
commit-sha: 8aa135f2b2cba743d335905ae794181bb658bb22
generated-at: 2026-04-16T00:00:00Z
---

# Zoodealio.Chat — Patterns

## Stack baseline

| Layer | Technology | Version |
|---|---|---|
| Language | Python | 3.13 (Docker base `python:3.13-slim`) |
| Chat framework | Chainlit | 2.9.2 |
| HTTP client | `aiohttp` | 3.11.11 |
| LLM SDK | `openai` | ≥ 2.8.0 |
| Agent framework | OpenAI Agents SDK (`agents`) | via `temporalio[openai-agents]` |
| Durable workflows | `temporalio` | ≥ 1.18.1, < 2 |
| Observability | `langfuse` 2.36.2; `logfire` 4.7.0; `opentelemetry-*` 1.36.0; `azure-monitor-opentelemetry` 1.6.0 |
| Config | `python-dotenv` 1.0.1 — `.env` loaded with `load_dotenv(override=True)` |
| Build / deploy | Docker (2 images) + Azure Container Apps + Azure DevOps Pipelines |
| Dependency manifest | `requirements.txt` (pinned); `myreqs.txt` is a secondary list — **flag: redundant** |

No `pyproject.toml`, no `poetry`/`uv`, no `setup.py`, no test framework installed — **no unit tests present** in the repo.

**Zoodealio-baseline deviations in this service:**

- **No .NET, no layered project pattern.** This is the only non-.NET production service in the ecosystem (other than Strapi). Do not expect `Api`/`Application`/`Domain`/`Infrastructure`.
- **No DbContext, no EF Core, no MediatR, no AutoMapper.** Service is stateless; persistence happens only through Temporal's own history.
- **No JWT/Bearer issuance or validation in-service.** Tokens flow through from an upstream embedder.
- **Angular/PrimeNG do not apply** — Chainlit ships its own React frontend; `custom_elements.py` defines widget prop-shapes for React components registered by `name`.

---

## Core conventions

### Async-everywhere

Every handler, activity, workflow, HTTP call, and helper is `async def`. Synchronous wrappers are conspicuous — e.g., `app.py:sync_status_update` lives inside an `async def` purely to satisfy a sync lambda contract. When adding a new tool/helper, default to `async`.

### Single shared `aiohttp.ClientSession`

`functions/http_helpers.py` holds a module-level `_shared_session: aiohttp.ClientSession | None` guarded by an `asyncio.Lock`. Lifecycle:

- `init_http_session()` — idempotent; creates if missing or closed
- `get_http_session()` — convenience get-or-init
- `close_http_session()` — on `on_stop`

All BLAST HTTP traffic **must** go through `fetch_data(url, params, headers)` or `post_data(url, data, headers, params=None)` — both ride this shared session. Do not create one-off `aiohttp.ClientSession()` instances.

### Bearer token header

`get_headers(token)` returns:

```python
{"Content-Type": "application/json", "Accept": "application/json", "Authorization": token}
```

The token is passed **as-is** — callers must already include the `"Bearer "` prefix (that's what `HybridContext.bearer_token` / `ZoodealioContext.bearer_token` produce). Do not re-prefix.

### Response normalization (business-language translation)

Every BLAST response flows through `functions/response_modifiers.clean_response`. It:

- Rewrites BLAST response keys before handing them to the agent:
  - `holdbackAmount` → `reserveAmount`
  - `holdbackPercentage` / `holdbackPercantage` / `holdbackPercent` → `reservePercentage`
  - `serviceFeeAmount` → `programFeeAmount`
  - `serviceFeePercentage` / `serviceFeePercantage` / `programFeePercantage` → `programFeePercentage`
  - (corrects misspellings of "Percantage" → "Percentage" as part of the same sweep)
- Strips `result.photo` to keep tokens down

**Why this matters:** the agent and downstream prompts/widgets see "reserve" / "programFee" terminology, *never* "holdback" / "serviceFee". This is a deliberate consumer-facing rename — keep new renames of BLAST terminology here, not in per-tool code.

### PII-safe observability

Langfuse spans for tool execution **never log payloads**:

```python
# app.py:_log_tool_span
langfuse_context.update_current_observation(
    input=tool_name,            # name only
    output=status,              # "success" | "error" | "no_result"
    metadata={"tool_name": tool_name},
)
```

The comment at `app.py:208` is the authoritative record of this decision — tool payloads can contain "property details, customer data, agent contacts." Follow this shape for any new tool-execution tracing.

Langfuse traces are tagged with:

- `user_id = f"{customer_user_id}_{property_id}"` (derived identifier, not the raw token)
- `session_id = cl.context.session.thread_id` (Chainlit thread id)

### Status-step UX

Every `on_message` creates a Chainlit `cl.Step(name="Status", type="run")` before agent work, and ends+removes it in `finally`. Status updates pushed via a callback (`on_status_update`) are accumulated in `cl.user_session["status_lines"]`. Follow the same shape for new long-running handlers so clients can show a spinner.

### Graceful exception-class routing

In `app.py::on_message`, four `except` arms produce specific friendly strings:

- `TimeoutError` → ⏱ "taking longer than expected"
- `ConnectionError` → 🔌 "trouble connecting to our services"
- `ValueError` → ⚠ "issue with the request format"
- `Exception` → ❌ "Something unexpected happened"

Do **not** catch and swallow — re-raise from deeper layers (the Temporal wrappers raise `ApplicationError`; `functions/http_helpers.py` raises `FetchDataException`). The friendly routing only happens at the Chainlit boundary.

### History cap

User/assistant turns are appended to `cl.user_session["history"]` and trimmed to `MAX_HISTORY_MESSAGES` (default 12, env-overridable). Any new history-consuming feature must honor this cap — the hybrid agent re-sends it verbatim to OpenAI on each turn.

---

## Temporal conventions

### `activity_as_tool` + wrapper activities

Two layers of activities:

1. **Wrapper activities** (`temporal_workflows/agent_tools.py`) — signatures exposed to the LLM agent. Parameters are **only** what the LLM should control (`property_id`, `zipcode`, etc.); auth/config flows through a module-level global `_workflow_context` populated by a `set_agent_context` activity at workflow start.
2. **Implementation activities** (`temporal_workflows/property_tools.py`, `customer_tools.py`) — full BLAST call signature with `token`, `base_url`. Wrappers call these directly (not via `execute_activity`).

Agent tools are declared via:

```python
temporal_agents.workflow.activity_as_tool(
    get_property_value,
    start_to_close_timeout=timedelta(seconds=30),
    retry_policy=ACTIVITY_RETRY_POLICY,
)
```

When adding a new agent-callable BLAST call, add: (a) the low-level impl in `property_tools.py` or `customer_tools.py`, (b) a wrapper in `agent_tools.py` that calls it and translates errors into `ApplicationError`, (c) registration in `temporal_tools_worker.py`'s `activities=[...]` list, and (d) a `TOOL_REGISTRY` entry in `tool_runner_workflow.py` with `required_args`.

### Error classification

Wrapper activities catch `ValueError` → `ApplicationError(..., non_retryable=True)` (permanent); everything else → `ApplicationError(..., non_retryable=False)` (retryable). This classification drives the retry policy above (`ACTIVITY_RETRY_POLICY`: 5 attempts). Follow the same split in new wrappers.

### Retry policy defaults

| Location | Attempts | Interval | Max | Backoff |
|---|---|---|---|---|
| Workflow-level (both paths) | 5 | 1s | 10s | 2.0 |
| Tool-runner workflow | 3 | 1s | 10s | 2.0 |
| OpenAI Agents plugin | 5 | 1s | 30s | 2.0 |

### Workflow ID conventions

- **Hybrid (per-tool):** `chat-{session_id}/tool-{counter:03d}-{tool_name}` — the `chat-{session_id}` prefix is deliberate; search by it in the Temporal UI to find all tool calls for a chat session. **New hybrid workflows must use this prefix** to stay filterable.
- **Pure Temporal (per-conversation):** `zoodealio-agent-{hash(user_input)}` — **known flaw** (`hash()` unstable across processes); do not copy this pattern for new workflows.

### Task queue

Single task queue: `zoodealio-agent-task-queue`. Worker is one process per container; Chainlit web starts Temporal workflows on this queue from multiple paths.

### mTLS setup

Three identical copies exist (documented in Stage 04 flags). Until they're unified, any change to mTLS loading must be mirrored in all three:

1. `temporal_tools_worker.py:create_temporal_client`
2. `temporal_agent_integration.py:run_pure_temporal_agent`
3. `hybrid_streaming_agent.py:TemporalToolExecutor._get_client`

Cert loading order is the same in each: env var content (literal `\n` → real newline) → file path → unsecured. `TEMPORAL_NAMESPACE` defaults to `default` for local; Temporal Cloud requires an explicit `{namespace}.{account_id}` value.

---

## BLAST client patterns

### Two parallel call stacks

- `functions/function_implementations.py` — direct `aiohttp` via `fetch_data`/`post_data`. Used by the legacy/non-Temporal code path in `agents_integration.py` and `agents_integration_backup.py`.
- `temporal_workflows/property_tools.py` + `customer_tools.py` — same shape, wrapped as `@activity.defn`. Used by the hybrid (via `ToolRunnerWorkflow`) and pure-Temporal paths.

**New BLAST integrations should be added to both** until the duplication is resolved. Alternatively, prefer the Temporal path — the non-Temporal path is only alive for the dormant `agents_integration.py` handlers.

### Known drift between the two stacks (FIX BEFORE RELYING)

| Endpoint | `function_implementations.py` | `temporal_workflows/*.py` |
|---|---|---|
| `GetAgent` (param name) | `customerUserId` | `userid` (lowercase) |
| `GetAllPropertiesForClient` (param name) | `customerId` (numeric, resolved) | `CustomerUserId` (user id, not resolved) |
| Survey endpoint | `GetBlastSurvey` | `GetSurvey` |

These divergences mean the agent gets **different data** depending on which path executed the tool. This is a live correctness bug — flag to user at Stage 07 finalize and resolve before propagating to curated memory.

### Defensive endpoint probing

`_resolve_customer_id_from_user_id` (in `functions/function_implementations.py`) walks **three candidate endpoints** in order, accepting the first non-None numeric id:

1. `GetCustomerDetailFromUserIdAsync?Id=`
2. `GetCustomerDetailFromUserId?id=`
3. `GetCustomerByUserId?userId=`

This tolerates cross-environment route drift in Offervana_SaaS. If BLAST renames any of these, add the new route to the candidates list, don't replace. The result is cached only for the duration of the single async call that needs it.

---

## OpenAI patterns

### Dual tool-definition sources (DRIFT)

There are **two** places that declare tool schemas to the LLM:

1. `function-definitions/*.json` — static JSON files, one per tool. Historical origin (OpenAI Platform storage). **Loaded by nothing in the current tree.** Effectively documentation.
2. `hybrid_streaming_agent.get_openai_tools(ctx)` — inline Python dict declarations, used by the hybrid path. Tool names here are **sanitized** (`get_property_value` not `get_blast_avm_value`); parameters are declared but all marked `required: []` (LLM fills from context).

The Temporal path doesn't declare tools manually at all — `activity_as_tool()` introspects the wrapper activity signatures in `agent_tools.py`.

**Guidance:** when adding a tool, update (a) `agent_tools.py` (wrapper signature), (b) `hybrid_streaming_agent.get_openai_tools` (inline schema), (c) `tool_runner_workflow.py` `TOOL_REGISTRY` (required_args). Leave `function-definitions/*.json` alone — treat as deprecated.

### Tool name conventions

The sanitized names (`get_property_value`, `get_cash_offers`, `get_home_equity`, etc.) are the **agent-facing** names. BLAST-prefixed names (`get_blast_avm_value`, etc.) are the **implementation** names. The `tool_calls_made` list in the hybrid agent uses the sanitized form; `custom_elements.py` constants use the BLAST-prefixed form in some places (legacy) — `PROPERTY_VALUE_TOOLS = {"get_property_value", "get_property_info", "get_blast_avm_value"}`. Accept both in widget-selection logic.

### Context injection into tool args

In the hybrid path, before dispatching each tool call, `ctx` values are filled in as defaults for missing args:

```python
if "property_id" not in arguments and ctx.property_id:
    arguments["property_id"] = ctx.property_id
if "customer_user_id" not in arguments and ctx.customer_user_id:
    arguments["customer_user_id"] = ctx.customer_user_id
if "zipcode" not in arguments and ctx.zipcode:
    arguments["zipcode"] = ctx.zipcode
```

Tools can therefore be declared with `required: []` and still work — the agent doesn't have to re-emit context values it already has.

### Tool iteration cap

`HybridStreamingAgent.max_tool_iterations = 10`. Beyond this: the agent yields "I've reached the maximum number of tool calls..." and stops. When designing a tool-using flow, stay well under 10 tool calls per user turn.

### Model selection

- Hybrid path: `OPENAI_MODEL` (fallback `"gpt-4o-mini"`)
- Pure-Temporal path: `OPENAI_DEFAULT_MODEL` or `OPENAI_MODEL` (fallback `"gpt-4o-mini"`); `env.example.txt` sets `OPENAI_MODEL=gpt-5-nano`; `ZoodealioAgentWorkflow` hard-defaults to `"gpt-5-nano"` if no model passed.

Note the inconsistency in fallback defaults between the two paths — hybrid falls back to `gpt-4o-mini`, Temporal workflow falls back to `gpt-5-nano`.

---

## Chainlit patterns

### Custom element selection

Only one widget per message (last-tool wins), with fallback to first-matching. Widget selection logic lives in `custom_elements.py::send_custom_elements_for_tools`:

1. Inspect `agent.tool_calls_made` (ordered list)
2. Last tool → matches `EQUITY_TOOLS` → equity widget; matches `PROPERTY_VALUE_TOOLS` → property widget
3. Fallback: any tool in the list matches an equity/property tool set
4. Data extraction: `_extract_property_data_from_results` / `_extract_equity_data_from_results` walk the BLAST result (handles `result`-wrapper, nested `homeInfo`/`address` objects, flat alternatives)
5. If extraction yields insufficient data (no address AND no value; no `current_value`) — silently skip; no widget

### System prompt loading

`config/instructions.txt` is the sole source. Loaded once at module-import in `app.py` via `_load_system_instructions()`; also loaded by `HybridStreamingAgent._load_default_instructions()` if not explicitly passed. When modifying the prompt, restart the container (no hot-reload).

### Entrypoint is `app.py`

Per `Dockerfile` and `Procfile`-deprecated entries, `chainlit run app.py` is canonical. Do not move decorators into other modules unless you are intentionally creating an alternative entrypoint — dual `@cl.on_message` declarations risk silent override.

---

## Naming conventions

- **Files:** snake_case (`hybrid_streaming_agent.py`, `temporal_tools_worker.py`)
- **Classes:** PascalCase (`HybridContext`, `ZoodealioAgentWorkflow`, `TemporalToolExecutor`)
- **Dataclasses for Temporal:** name ends in `Request` / `Result` / `Input` / `Context`
- **Activities:** snake_case; agent-facing wrappers use short human names (`get_property_value`), implementations use BLAST-prefixed names (`get_blast_avm_value`)
- **Private members:** leading underscore (`_workflow_context`, `_shared_session`, `_session_lock`, `_update_status`, `_build_messages`, `_log_generation`, `_log_tool_span`)
- **Workflows IDs:** `chat-{session_id}/tool-{NNN}-{tool}` for tools; `zoodealio-agent-*` for full-conversation
- **Task queue:** one queue, `zoodealio-agent-task-queue`

---

## Logging conventions

- `logging.basicConfig(level=log_level)` in `app.py` (env `LOG_LEVEL`, default `INFO`)
- Info: one log line per tool call at start, one at completion with compact summary (`resolved: dict(keys=[...]); bytes=N`)
- Debug hooks guarded by env toggles: `DEBUG_API`, `DEBUG_FUNCTIONS`, `DEBUG_AGENT_OUTPUT` — all default to off. When diagnosing, flip the relevant one rather than adding ad-hoc logging
- `logger = logging.getLogger(__name__)` at module scope is the norm; `logging.info(...)` at function scope is also used — both are acceptable

---

## Build / deploy / test

- **Docker base image:** `python:3.13-slim` (both images)
- **Dependency install:** `pip install --no-cache-dir -r requirements.txt` after `pip install --upgrade pip`
- **Runtime env:** `PYTHONUNBUFFERED=1`, `PYTHONPATH=/app`
- **Web port:** 8080
- **Worker:** no port, connects out to Temporal
- **CI/CD:** Azure DevOps `pipelines/Zoodealio-Chat.yml` — branch-driven (`dev`/`release`/`main` → Dev/UAT/Prod); Prod is approval-gated via an AzDO `environment: Production`
- **Image registry:** per-environment ACR (`devzoodealioacr`, `uatzoodealioacr`, `prodzoodealioacr`)
- **Tests:** none in repo. Debug helper `debug_openai.py` exists but is not a test. Any new test infrastructure would be greenfield.

---

## Deviations from the Zoodealio baseline

| Zoodealio baseline | This service's shape | Intentional? |
|---|---|---|
| .NET 8/10 layered solution (`Api`/`Application`/`Domain`/`Infrastructure`/`LegacyData`) | Python, flat module layout | ✅ Python is the right tool for the chat/agent stack |
| EF Core + DbContext + MediatR CQRS | No DB, no ORM | ✅ Service is stateless by design |
| JWT Bearer auth middleware + role/policy | Trusts upstream `user_env.token`; no auth layer | ⚠ Security-sensitive — document and monitor |
| Angular 20–21 + PrimeNG + standalone components + `inject()` | Chainlit (React) + custom elements | ✅ Chainlit owns the frontend |
| AutoMapper DTO mapping | `clean_response` key renames | ✅ Same idea, simpler form |
| Unit + integration test projects | No tests | ⚠ Tech debt |
| Azure Functions / ABP AppServices | No HTTP surface at all | ✅ Chat is a Chainlit WebSocket app |
| Single DbContext per service + read-only `OffervanaDbContext` | Pure consumer of Offervana BLAST APIs over HTTP | ✅ Right pattern for a Python worker |

Agents implementing in this service should bring **Python/async/Temporal/Chainlit idioms**, not .NET layering.
