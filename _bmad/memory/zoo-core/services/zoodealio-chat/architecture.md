---
artifact: architecture
service: zoodealio-chat
commit-sha: 8aa135f2b2cba743d335905ae794181bb658bb22
generated-at: 2026-04-15T00:00:00Z
---

# Zoodealio.Chat — Architecture

## At a glance

- **Language / framework:** Python 3.13 + [Chainlit 2.9.2](https://docs.chainlit.io) (chat UI over Starlette/Socket.IO) + OpenAI + Temporal.io
- **Processes per environment: 2** — a Chainlit web container + a Temporal worker container
- **Agent paths: 2** — `hybrid` (default: OpenAI streaming with per-tool Temporal dispatch) and `temporal` (full conversation loop inside a single Temporal workflow)
- **Temporal workflows: 5 defined, 2 registered** — `ZoodealioAgentWorkflow`, `ToolRunnerWorkflow` are registered with the worker; `PropertyAnalysisWorkflow`, `CustomerAnalysisWorkflow`, `SimplePropertyWorkflow` are declared but **not registered** (dormant)
- **Temporal activities registered: 29** (16 agent-facing wrappers + 13 lower-level implementations, see Temporal section)
- **Persistent storage: none** — stateless web; Temporal persists workflow/activity history externally
- **Consumes:** Offervana_SaaS BLAST (~13 endpoints) via Bearer token; OpenAI API; Temporal Cloud (mTLS); Langfuse; Azure App Insights / OTLP
- **Deployed to:** Azure Container Apps (2 apps × dev/uat/prod = 6 deployments) via Azure Container Registry + Azure DevOps pipeline
- **Baseline auth shape:** no Chainlit auth callbacks; trusts `user_env`-injected BLAST bearer token from upstream host

---

## Process / deployment topology

### `cashplusassistant-ca` — Chainlit web container

- **Image:** `dockerfile` (root) → `python:3.13-slim` → `chainlit run app.py --host 0.0.0.0 --port 8080`
- **Role:** serves the Chainlit UI + WebSocket; runs the `on_chat_start` / `on_message` / `on_stop` handlers; holds the `HybridStreamingAgent` (hybrid mode) or the Temporal `Client` that starts `ZoodealioAgentWorkflow` (temporal mode); owns the shared `aiohttp` session used for the non-Temporal code path
- **State:** in-memory per WebSocket connection (see Stage 03, section 3); no disk state
- **External dependencies:** OpenAI (streaming Chat Completions), Temporal Cloud (starts workflows), Offervana_SaaS BLAST (direct calls, non-Temporal path only), Langfuse, optionally Azure App Insights / OTLP collector
- **Port:** 8080 internal → public via Container Apps ingress

### `zoodealio-temporal-worker-ca` (prod: `zoodealio-tmprl-worker-ca`) — Temporal worker

- **Image:** `Dockerfile.temporal-worker` → `python:3.13-slim` → `python temporal_tools_worker.py`
- **Role:** connects to Temporal (mTLS), polls task queue `zoodealio-agent-task-queue`, executes workflows and activities; registers the `OpenAIAgentsPlugin` so the `ZoodealioAgentWorkflow` can run its LLM turns inside Temporal as activities with retry policy
- **State:** in-process `_workflow_context` global (set per workflow execution by `set_agent_context`); no disk state
- **External dependencies:** Temporal Cloud (polls task queue), OpenAI (via OpenAIAgentsPlugin + direct `aiohttp`), Offervana_SaaS BLAST
- **Secrets:** mTLS cert+key+CA — either inlined as env vars (`TEMPORAL_CLIENT_CERT`, `TEMPORAL_CLIENT_KEY`, `TEMPORAL_CA_CERT`) or file-mounted (`/mnt/temporal-certs/*` per Azure Key Vault volume mount in `Dockerfile.temporal-worker` comments)
- **No HTTP listener**

### CI/CD — `pipelines/Zoodealio-Chat.yml`

Azure DevOps pipeline triggered on `dev`, `release`, `main`:

| Branch | Stage | ACR | ResourceGroup | Web App | Worker App | CAE |
|---|---|---|---|---|---|---|
| `dev` | `Build_Dev` | `devzoodealioacr.azurecr.io` | `dev-zoodealio-ca-rg` | `dev-cashplusassistant-ca` | `dev-zoodealio-temporal-worker-ca` | `dev-zoodealio-cae` |
| `release` | `Build_UAT` | `uatzoodealioacr.azurecr.io` | `uat-zoodealio-ca-rg` | `uat-cashplusassistant-ca` | `uat-zoodealio-temporal-worker-ca` | `uat-zoodealio-cae` |
| `main` | `Build_Prod` (gated via `Production` environment approval) | `prodzoodealioacr.azurecr.io` | `prod-zoodealio-ca-rg` | `prod-cashplusassistant-ca` | `prod-zoodealio-tmprl-worker-ca` | `prod-zoodealio-cae` |

Template at `pipelines/templates/build-and-deploy.yml` (not inspected). Default vmImage `ubuntu-latest`. Prod uses `deployment: Deploy_Prod` with an approval-gated environment; dev/UAT use plain `job`.

---

## Project / module layout

There is no layered-project structure (no `Api`/`Application`/`Domain`/`Infrastructure` — this is a flat Python codebase). The modules below are what actually exists.

### Entry modules (root)

| File | Role |
|---|---|
| `app.py` | Chainlit entrypoint. OTel/App-Insights bootstrap, Chainlit lifecycle handlers, dispatch to hybrid or temporal agent path |
| `temporal_tools_worker.py` | Temporal worker entrypoint. `OpenAIAgentsPlugin` configuration, mTLS setup, workflow+activity registration |
| `hybrid_streaming_agent.py` | Hybrid agent: OpenAI streaming + per-tool `ToolRunnerWorkflow` dispatch. Houses `HybridContext`, `TemporalToolExecutor`, `HybridStreamingAgent`, and inline OpenAI tool definitions (`get_openai_tools`) |
| `agents_integration.py` | Temporal-only agent adapter. Builds a function closure that runs `run_pure_temporal_agent`. Contains **legacy duplicate** `@cl.on_chat_start` + `@cl.on_message` decorators (active only if this file is used as the entrypoint) |
| `temporal_agent_integration.py` | `ZoodealioContext` dataclass + `ZoodealioAgentWorkflow` definition + `run_pure_temporal_agent` client function (mTLS connect + `execute_workflow`) |
| `custom_elements.py` | Chainlit custom-element widget builders + tool→widget selection logic |
| `debug_openai.py` | Standalone debug helper for OpenAI key/model — not referenced by app code |
| `agents_integration_backup.py` | **Dead code** — historical copy; contains a stale `get_blast_home_equity_for_multiple_properties` implementation. Safe to delete. |

### `functions/` — non-Temporal BLAST call layer

| File | Role |
|---|---|
| `function_implementations.py` | Direct `aiohttp` callers for every BLAST endpoint (duplicates the logic in `temporal_workflows/property_tools.py` + `customer_tools.py`) |
| `http_helpers.py` | Shared `aiohttp.ClientSession` lifecycle (init/get/close), `fetch_data` (GET), `post_data` (POST), `get_headers(token)` (Bearer). All BLAST HTTP traffic flows through these two functions |
| `response_modifiers.py` | `clean_response()` — response sanitization (not inspected in detail; called by http_helpers after JSON parse) |
| `custom_exceptions.py` | `FetchDataException` — single custom exception type for all HTTP failures |

### `temporal_workflows/` — Temporal activities + workflows

| File | Role |
|---|---|
| `property_tools.py` | 11 `@activity.defn` async activities wrapping BLAST property endpoints (`get_property_info`, `get_blast_*`) |
| `customer_tools.py` | 4 `@activity.defn` activities: `get_all_properties_for_client`, `get_agent_info`, `get_blast_home_equity_for_multiple_properties`, `list_rental_properties` |
| `agent_tools.py` | 16 agent-facing wrapper activities — simplified signatures (just `property_id` or `customer_user_id`), auth resolved from `_workflow_context` global, `ApplicationError` classification (retryable vs non-retryable) |
| `tool_runner_workflow.py` | `ToolRunnerWorkflow` — the per-tool workflow used by the hybrid path; tool-name → activity dispatch via `TOOL_REGISTRY` |
| `tools_workflows.py` | 3 dormant workflows (`PropertyAnalysisWorkflow`, `CustomerAnalysisWorkflow`, `SimplePropertyWorkflow`) — **not registered** in `temporal_tools_worker.py` |
| `tools_client.py` | Not inspected (likely client-side helpers) |
| `__init__.py` | Empty package init |

### Other directories

| Path | Role |
|---|---|
| `config/instructions.txt` | System-prompt content loaded by `app.py:_load_system_instructions()` |
| `function-definitions/*.json` | 13 OpenAI tool schemas (historical, BLAST-prefixed names). Loaded by... **nothing in the current tree** — see Stage 05 drift note |
| `function-definitions/*.txt` | Text snippets referenced in/by the system prompt (offer type explainer guides) |
| `scripts/vector_store.py` | OpenAI file-search vector store management utility (CLI — used to populate `VECTOR_STORE_ID`) |
| `scripts/docker_build.sh`, `docker_run.sh` | Local dev Docker helpers |
| `pipelines/Zoodealio-Chat.yml` + `templates/build-and-deploy.yml` | Azure DevOps CI/CD |
| `documentation/*.md` | 8 in-repo MD docs (mTLS setup, custom elements backend, hybrid streaming arch, Azure config); authoritative dev references |

---

## Agent execution paths (data flow)

Two paths co-exist in the same web process, selected at message time via the `AGENT_MODE` env var (default `hybrid`).

### Hybrid mode (default) — `AGENT_MODE=hybrid`

```
Browser (Chainlit UI)
  │ WebSocket
  ▼
app.py::on_message
  │
  ▼
HybridStreamingAgent.run_streaming()            [hybrid_streaming_agent.py]
  │
  ├─► AsyncOpenAI.chat.completions.create(stream=True, tools=get_openai_tools(ctx))
  │       (tokens stream back to Chainlit UI in real time)
  │
  │   on each tool_call emitted by the model:
  │     │
  │     ▼
  │   TemporalToolExecutor.execute_tool(tool_name, args, ctx.to_temporal_context())
  │     │
  │     ▼
  │   Temporal client.execute_workflow(
  │       ToolRunnerWorkflow.run,
  │       id=f"chat-{session_id}/tool-{counter:03d}-{tool_name}",
  │       task_queue="zoodealio-agent-task-queue"
  │   )
  │     │ (dispatch)
  │     ▼
  │   ┌─ Temporal worker process ────────────────────────────────┐
  │   │ ToolRunnerWorkflow.run(input)                            │
  │   │   │                                                      │
  │   │   ├─► set_agent_context(ctx)      ← sets _workflow_context
  │   │   │                                                      │
  │   │   └─► <tool_name>_activity(arg...)                       │
  │   │        │                                                 │
  │   │        └─► _get_blast_xxx(...)    [property/customer_tools.py]
  │   │              │                                           │
  │   │              └─► aiohttp.GET/POST BLAST endpoint         │
  │   │                                                          │
  │   └──────────────────────────────────────────────────────────┘
  │     │ ActivityResult
  │     ▼
  │   Result string returned to OpenAI, which continues streaming
  │
  ▼
final_message.update()   + Chainlit.send_custom_elements_for_tools(agent, final_message)
```

- **Workflow ID shape:** `chat-{session_id}/tool-{counter:03d}-{tool_name}` — session_id is the Chainlit thread id (`cl.context.session.thread_id`). This lets Temporal UI be searched by `chat-{thread_id}` to find every tool call for a given chat session.
- **Tool iteration cap:** `HybridStreamingAgent.max_tool_iterations = 10`
- **Status callbacks:** `on_status_update` appends status lines to `cl.user_session["status_lines"]`, surfaced in the Chainlit `cl.Step(name="Status", type="run")` of each turn.
- **Custom element:** after the stream completes, `send_custom_elements_for_tools` inspects `agent.tool_calls_made` + `agent.tool_results` and sends a single trailing `cl.Message(elements=[widget])` with either `propertyValue` or `equityCalculator`.

### Pure Temporal mode — `AGENT_MODE=temporal`

```
Browser → app.py::on_message
  │
  ▼
agents_integration.build_agent() → closure → run_pure_temporal_agent()
  │
  ▼
Temporal client.execute_workflow(
    ZoodealioAgentWorkflow.run,
    args=[user_input, ctx, system_instructions, model, vector_store_id, ui_name],
    id=f"zoodealio-agent-{hash(user_input)}",
    task_queue="zoodealio-agent-task-queue"
)
  │
  ▼
┌─ Temporal worker ──────────────────────────────────────────────┐
│ ZoodealioAgentWorkflow.run()                                    │
│   │                                                             │
│   ├─► set_agent_context(context_dict)  ← activity with retry    │
│   │                                                             │
│   ├── Build tools list (per-turn availability based on ctx):    │
│   │     property tools if property_id & token & api_url         │
│   │     market tools if zipcode (subset of property tools)      │
│   │     customer tools if customer_user_id                      │
│   │     + FileSearchTool(vector_store_ids=[VECTOR_STORE_ID])   │
│   │                                                             │
│   ├── agents.Agent(instructions, model="gpt-5-nano",            │
│   │                 tools=[activity_as_tool(...)...])           │
│   │                                                             │
│   └─► Runner.run(agent, input=user_input)                       │
│         └─► OpenAIAgentsPlugin runs LLM turns as activities     │
│             (retry, timeout from ModelActivityParameters)        │
│         └─► tool calls → wrapper activities → BLAST             │
│                                                                 │
│   → final_output: str                                           │
└─────────────────────────────────────────────────────────────────┘
  │
  ▼
app.py streams the final_output to the UI in simulated chunks (sentence-boundary split, 20ms between chunks)
```

- **Workflow ID:** `f"zoodealio-agent-{hash(user_input)}"` — **flag:** Python `hash()` is not stable across interpreter restarts. IDs therefore aren't deduplicated across deploys. For a new idempotency-sensitive use this would be wrong; here it only matters if two users send the same message — new workflow id per process incarnation.
- **Note:** the `agents_integration.py` path lacks the tool-call tracking (`tool_calls_made`, `tool_results`) that the hybrid path uses for custom elements, so custom elements won't render in pure-Temporal mode. Flag as behavioral divergence.

---

## Temporal layer

### Registered (at `temporal_tools_worker.py:run_temporal_worker`)

- **Task queue:** `zoodealio-agent-task-queue` (env `TEMPORAL_TASK_QUEUE`; `env.example.txt` shows `zoodealio-zee-task-queue` — **drift**, example likely stale)
- **Namespace:** `TEMPORAL_NAMESPACE` env (no default sensible value — `default` is only used locally)
- **Plugin:** `OpenAIAgentsPlugin` with `ModelActivityParameters`:
  - `start_to_close_timeout=90s`, `schedule_to_close_timeout=10m`
  - Retry: `5 attempts, initial=1s, max=30s, backoff=2.0`

#### Workflows

| Workflow | File | Trigger |
|---|---|---|
| `ZoodealioAgentWorkflow` | `temporal_agent_integration.py:68` | Client `run_pure_temporal_agent` (AGENT_MODE=temporal) |
| `ToolRunnerWorkflow` | `temporal_workflows/tool_runner_workflow.py:125` | Per-tool dispatch from `HybridStreamingAgent.tool_executor` |

#### Activities (29 total)

**Agent-facing wrapper activities (`temporal_workflows/agent_tools.py` — 16):**
`set_agent_context`, `get_property_info`, `get_property_value`, `get_cash_offers`, `get_home_equity`, `get_property_history`, `get_long_term_rental_potential`, `get_rent_vs_sell_analysis`, `get_property_survey`, `get_short_term_rental_potential`, `get_market_trends`, `compare_market_trends`, `get_customer_properties`, `get_assigned_agent_info`, `analyze_portfolio_equity`, `list_properties_for_rental_comparison`.

**Implementation activities (13):**
From `temporal_workflows/property_tools.py`: `get_blast_cash_offers`, `get_blast_avm_value`, `get_blast_home_equity`, `get_blast_historical_value`, `get_blast_sales_trend_by_zipcode`, `get_blast_sales_trend_by_multiple_zipcodes`, `get_blast_long_term_rental_avm`, `get_blast_short_term_rental_avm`, `get_blast_rent_vs_sell`, `get_blast_survey`.
From `temporal_workflows/customer_tools.py`: `get_all_properties_for_client`, `get_agent_info`, `get_blast_home_equity_for_multiple_properties`, `list_rental_properties`.

Wrappers → implementations via a per-workflow `_workflow_context` **module-level global** populated by `set_agent_context`. See Stage 05 patterns — this global-state-per-worker is a notable pattern (and risk) worth capturing.

### Declared but **not registered** (dormant)

`PropertyAnalysisWorkflow`, `CustomerAnalysisWorkflow`, `SimplePropertyWorkflow` (all in `temporal_workflows/tools_workflows.py`). They are imported in that file but never appear in the `workflows=[…]` list in `temporal_tools_worker.py`. They're safe to ignore at runtime but read as live architecture — likely a cleanup opportunity.

### Retry policies

- Activity-level (in `ZoodealioAgentWorkflow`): `5 attempts, 1s→10s, backoff 2.0`; timeouts 30s (most) / 60s (portfolio tool) / 10s (set_agent_context)
- Tool-runner workflow: `3 attempts, 1s→10s, backoff 2.0`; 60s activity timeout
- OpenAI plugin: `5 attempts, 1s→30s, backoff 2.0`

### mTLS to Temporal Cloud

Configured in **three** places (`temporal_agent_integration.py:run_pure_temporal_agent`, `hybrid_streaming_agent.py:TemporalToolExecutor._get_client`, `temporal_tools_worker.py:create_temporal_client`) — each copy implements the same fallback: env-var content first, then file paths, then unsecured. **Flag:** three near-identical copies of ~60 lines of mTLS setup — prime candidate for a shared helper. See Stage 05.

---

## External integrations

| System | Usage | Wiring |
|---|---|---|
| **OpenAI API** | Chat Completions + Agents SDK | `openai>=2.8.0` SDK; `agents` SDK via `temporalio[openai-agents]`; `OPENAI_API_KEY` env; model via `OPENAI_MODEL` / `OPENAI_DEFAULT_MODEL` (observed: `gpt-5-nano`, `gpt-4o-mini`) |
| **OpenAI Vector Store (file search)** | `FileSearchTool` attached to the Temporal-path agent if `VECTOR_STORE_ID` is set. Populated by `scripts/vector_store.py` |
| **Temporal Cloud** | Durable workflow/activity execution | `temporalio>=1.18.1,<2`; mTLS as above; task queue `zoodealio-agent-task-queue` |
| **Offervana_SaaS BLAST API** | Property/customer data fetch | `aiohttp` direct calls from `functions/function_implementations.py` and `temporal_workflows/*_tools.py`. `token` is a Bearer from upstream embedder. Base URL `BLAST_API_BASE_URL` / `api_base_url` per-session |
| **Langfuse** | LLM observability | `langfuse==2.36.2` + `@observe()` decorators. User+session IDs tagged; tool executions logged with tool-name + success/error only (no payloads — explicit PII decision). Secrets: `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY`, `LANGFUSE_HOST` |
| **OpenTelemetry + Azure App Insights** | Tracing | Priority: App Insights (`APPLICATIONINSIGHTS_CONNECTION_STRING`) > `ENABLE_TRACING=true` > OTLP endpoint port-probe at `localhost:4318`. `logfire.instrument_openai_agents()` wires OpenAI Agents SDK traces |
| **Anthropic SDK** (`anthropic==0.64.0` in `requirements.txt`) | **Unused in application code** | No imports — likely accidental / residual. Flag for cleanup |
| **MCP (`mcp==1.13.0`)** | **Unused in application code** | No imports. Flag for cleanup |
| **Hugging Face Hub** (`huggingface-hub==0.34.4`) | Transitive dependency of the Agents SDK tokenizer | Not directly imported |

---

## Authentication / authorization

- **No server-side auth.** No `@cl.oauth_callback` / `@cl.password_auth_callback` / `@cl.header_auth_callback` registered.
- **Token is passed in from the host page** via Chainlit's `user_env` dict at `on_chat_start`. The token is a BLAST (Offervana_SaaS) Bearer token; the service stores it in `cl.user_session` and forwards it as-is on outgoing BLAST requests.
- **Authorization decisions happen upstream** — the BLAST token's claims gate which property/customer the agent can analyze. Zoodealio.Chat itself performs no authorization checks.
- **Implication for security review:** any attacker who can manipulate `user_env` (e.g., XSS on the embedding page, MITM before the WebSocket upgrade, or a misconfigured CORS policy on the embedder) can inject a different BLAST token and impersonate another user for as long as the chat session lives. Worth flagging in Stage 07.

---

## Config surface (env vars)

Grouped by area (full list in `env.example.txt`):

- **OpenAI:** `OPENAI_API_KEY`, `OPENAI_MODEL`, `OPENAI_DEFAULT_MODEL`, `VECTOR_STORE_ID`, `RETRIEVAL_DEBUG`
- **Agent routing:** `AGENT_MODE` (`hybrid` | `temporal`), `UI_NAME`, `MAX_HISTORY_MESSAGES`, `SYSTEM_INSTRUCTIONS`
- **Logging / debug:** `LOG_LEVEL`, `DEBUG_API`, `DEBUG_FUNCTIONS`, `DEBUG_AGENT_OUTPUT`
- **Telemetry:** `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY`, `LANGFUSE_HOST`, `LANGFUSE_DEBUG`, `APPLICATIONINSIGHTS_CONNECTION_STRING`, `ENABLE_TRACING`, `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT`
- **Temporal:** `USE_TEMPORAL` (note: read nowhere in current code — **flag as dead config**), `TEMPORAL_SERVER_URL`, `TEMPORAL_NAMESPACE`, `TEMPORAL_TASK_QUEUE`, `TEMPORAL_CLIENT_CERT` / `TEMPORAL_CLIENT_KEY` / `TEMPORAL_CA_CERT` (inline), `TEMPORAL_CLIENT_CERT_PATH` / `TEMPORAL_CLIENT_KEY_PATH` / `TEMPORAL_CA_CERT_PATH` (files)
- **Vector store management** (for `scripts/vector_store.py`): `ENVIRONMENT`, `PRODUCT_NAME`, `DOC_TYPE`, `DOC_VERSION`
- **Per-session (set by upstream embedder via `user_env`, NOT env var):** `property_id`, `customer_user_id`, `token`, `zipcode`, `api_base_url`
- **BLAST (fallback when not in `user_env`):** `BLAST_API_TOKEN` / `API_TOKEN`, `BLAST_API_BASE_URL` / `API_BASE_URL` — read in `agents_integration.build_context_from_metadata` only

---

## Surprises / architectural flags

1. **Two parallel agent orchestration stacks** (`hybrid` + `temporal`) with overlapping but non-identical capabilities. Custom elements only render in `hybrid`. A future PR should pick one and retire the other — duplication is hot.
2. **Two parallel BLAST client stacks** — `functions/function_implementations.py` and `temporal_workflows/property_tools.py`+`customer_tools.py`. The `GetBlastSurvey` vs `GetSurvey` drift caught in Stage 02 lives in this duplication.
3. **Three parallel mTLS setup blocks** (3× ~60 LOC). Prime refactoring target.
4. **`_workflow_context` global-state pattern** in `agent_tools.py` — set by `set_agent_context` activity, read by every downstream activity. This works within a single worker process but is fragile under concurrent workflows: activities from different workflows can race if the same worker serves them. May be intentional (single-context-per-worker-slot) but deserves investigation.
5. **Dormant workflows** (`PropertyAnalysisWorkflow`, `CustomerAnalysisWorkflow`, `SimplePropertyWorkflow`) — declared, never registered. Either register them or delete.
6. **Dead dependencies** — `anthropic`, `mcp` in `requirements.txt` with zero imports.
7. **Dead config** — `USE_TEMPORAL` in `env.example.txt` is read nowhere in code; `AGENT_MODE` is the actual switch.
8. **Stale deployment artifacts** — `web.config` (IIS FastCGI, Python 3.4 path) and `Procfile` (`gunicorn ... stream:main` — `stream` module does not exist). Neither is used by the Container Apps deploy; safe to delete.
9. **No auth in-service** — documented above. Trust model is "upstream embedder is secure."
10. **`hash(user_input)` workflow ID** — not stable / not idempotent; only a nuisance today but would bite under any dedup-based design.
