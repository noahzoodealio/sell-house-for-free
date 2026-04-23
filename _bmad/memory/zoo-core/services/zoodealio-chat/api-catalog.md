---
artifact: api-catalog
service: zoodealio-chat
commit-sha: 8aa135f2b2cba743d335905ae794181bb658bb22
generated-at: 2026-04-15T00:00:00Z
endpoint-count: 3
---

# Zoodealio.Chat — API Catalog

## Summary

Zoodealio.Chat is a **Chainlit** application, not a REST service. It exposes **no custom HTTP controllers, FastAPI routes, Azure Functions, or webhook endpoints**. All user-facing HTTP/WebSocket traffic is handled by the Chainlit framework (`chainlit run app.py`), which serves:

- The Chainlit UI and static assets
- A WebSocket channel for streaming chat messages
- Chainlit's built-in session and thread management

The service's "API surface" consists of **3 Chainlit lifecycle handlers** registered via decorators in `app.py`. Beyond these, the service consumes a large set of BLAST APIs from `Offervana_SaaS` — documented in the "Cross-Service Calls" section below for completeness, since they are the contractual dependencies required for this service to function.

Auth: **no Chainlit auth callbacks registered** (`@cl.oauth_callback`, `@cl.password_auth_callback`, `@cl.header_auth_callback` are all absent). Per-turn authorization is enforced via a `token` (Bearer) and `api_base_url` passed in the `user_env` dict at `on_chat_start`, typically injected by an upstream portal (e.g., Offervana SaaS frontend embedding Chainlit in an iframe).

---

## Chainlit Lifecycle Handlers (entrypoint: `app.py`)

### `on_chat_start` — `start_chat()`

- **Source:** `app.py:134`
- **Trigger:** New chat session established (WebSocket connect)
- **Auth:** None — `user_env` is trusted; no validation of token shape
- **Inputs (from `cl.user_session.get("env")`):**
  - `property_id` (str) — optional
  - `customer_user_id` (str) — optional
  - `token` (str) — BLAST API bearer token
  - `zipcode` (str) — optional
  - `api_base_url` (str) — base URL for BLAST; trailing `/` stripped
- **Outputs:** None (state-only; writes to `cl.user_session`)
- **Side effects:**
  - Calls `functions.http_helpers.init_http_session()` to create a shared `aiohttp` session
  - Emits Langfuse `@observe()` trace
- **Notable:** Welcome message is commented out; silent session start.

### `on_message` — `main(message: cl.Message)`

- **Source:** `app.py:240`
- **Trigger:** User submits a message via Chainlit UI
- **Auth:** None (relies on session token set in `on_chat_start`)
- **Inputs:** `cl.Message` (user text + elements)
- **Outputs:** Streamed assistant response + optional `cl.CustomElement` widget (`propertyValue` or `equityCalculator`)
- **Behavior:**
  - Branches on env var `AGENT_MODE` (default `hybrid`):
    - `hybrid` → `hybrid_streaming_agent.run_hybrid_agent_streaming()` (real OpenAI SSE streaming, Temporal tool execution)
    - `temporal` → `agents_integration.run_agent()` → full Temporal workflow (`run_pure_temporal_agent`), simulated streaming
  - Creates a `cl.Step(name="Status", type="run")` for client status updates
  - Builds context (`HybridContext`/`ZoodealioContext`) from session: `property_id`, `customer_user_id`, `token`, `api_base_url`, `zipcode`
  - Emits Langfuse `@observe()` trace; tags with `user_id` (`{customer_user_id}_{property_id}`), `session_id` (Chainlit thread_id), and `tool-execution` span per tool call (logs only tool name + success/error, never payloads — PII protection)
  - Maintains in-session history, capped at `MAX_HISTORY_MESSAGES` (default 12)
  - Catches `TimeoutError`, `ConnectionError`, `ValueError`, `Exception` → user-friendly fallback strings with emoji prefixes
- **Cross-service:** All calls downstream to Offervana_SaaS BLAST (see below) via the agent's tool runtime

### `on_stop` — `stop()`

- **Source:** `app.py:169`
- **Trigger:** User clicks stop / aborts a generation
- **Auth:** None
- **Inputs:** None
- **Outputs:** None
- **Side effects:**
  - Ends + removes active `status_step`
  - Clears `current_message_id`, `status_lines`, `history`
  - Calls `functions.http_helpers.close_http_session()`

---

## Dormant / Alternative Handlers (not active in default deployment)

`agents_integration.py` declares its own `@cl.on_chat_start` (line 224) and `@cl.on_message` (line 243). These are registered at module import time, but because `app.py` is the Chainlit entrypoint (`chainlit run app.py`, per `Procfile`/`Dockerfile`) and its own decorators are applied last, the `app.py` handlers take precedence in the default deployment.

**Implication:** dual-registration means whichever handler registers last wins — these legacy handlers only become active if someone runs `chainlit run agents_integration.py` directly. **Flag** this for the patterns/architecture stages — it is an error-prone shape and a likely source of future confusion.

---

## Cross-Service Calls (Outbound — BLAST API consumer)

All calls target Offervana_SaaS (ABP `IApplicationService` endpoints) under `{BLAST_API_BASE_URL}/services/app/...`. Auth: Bearer token via `Authorization: Bearer {token}` header, injected by `functions.http_helpers.get_headers()`.

**Two parallel implementations exist** (see Stage 04 Architecture for context on why):

- `functions/function_implementations.py` — direct `aiohttp` calls, used in legacy/non-Temporal code path
- `temporal_workflows/property_tools.py` + `temporal_workflows/customer_tools.py` — same calls wrapped as Temporal `@activity` decorators, used in hybrid + Temporal modes

Both share the same BLAST contract. Where the two diverge, it is flagged as **DRIFT** below.

### Property endpoints

| Method | Offervana Route | Query/Body | Caller |
|---|---|---|---|
| GET | `/services/app/Property/GetById` | `?id={property_id}` | `get_property_info` |
| GET | `/services/app/Property/GetAllPropertiesForClient` | `?customerId={id}` (resolved from `customer_user_id`) | `get_all_properties_for_client` |
| GET | `/services/app/IBuyerOffer/Get` | `?propertyId={id}&pullAchieved=false` | `get_blast_cash_offers` |
| GET | `/services/app/BlastBoard/GetRealValue` | `?propertyId={id}` | `get_blast_avm_value` (AVM / RealValue) |
| GET | `/services/app/BlastBoard/GetHomeEquity` | `?propertyId={id}` | `get_blast_home_equity` |
| GET | `/services/app/BlastBoard/GetHistoricalValue` | `?propertyId={id}` | `get_blast_historical_value` |
| POST | `/services/app/BlastBoard/GetSalesTrend` | `?propertyId={id}` + body `{zipCodes: string[], yearRange: int}` | `get_blast_sales_trend_by_zipcode`, `_by_multiple_zipcodes` |
| GET | `/services/app/BlastBoard/GetLongTermRentalAVM` | `?propertyId={id}` | `get_blast_long_term_rental_avm` |
| GET | `/services/app/BlastBoard/GetShortTermRentalAVM` | `?propertyId={id}&bedrooms&bathrooms&guests` | `get_blast_short_term_rental_avm` |
| GET | `/services/app/BlastBoard/GetRentVsSellBreakdown` | `?propertyId={id}` | `get_blast_rent_vs_sell` |

### Survey — **DRIFT**

| File | Route |
|---|---|
| `functions/function_implementations.py:116` | `GET /services/app/BlastBoard/GetBlastSurvey?propertyId={id}` |
| `temporal_workflows/property_tools.py:293` | `GET /services/app/BlastBoard/GetSurvey?propertyId={id}` |

Two different route names for the same tool name (`get_blast_survey`). One is wrong. Flag for Stage 07 review — needs verification against Offervana_SaaS's `BlastBoardAppService`.

### Customer / Agent endpoints

| Method | Offervana Route | Query | Caller |
|---|---|---|---|
| GET | `/services/app/customer/GetAgent` | `?customerUserId={id}` | `get_agent_info` |
| GET | `/services/app/Customer/GetCustomerDetailFromUserIdAsync` | `?Id={id}` | `_resolve_customer_id_from_user_id` (primary) |
| GET | `/services/app/Customer/GetCustomerDetailFromUserId` | `?id={id}` | fallback |
| GET | `/services/app/Customer/GetCustomerByUserId` | `?userId={id}` | fallback |

The customerId resolution walks three candidate endpoints in order until one returns a numeric id. This is a **defensive probing pattern** — tolerates cross-environment drift in Offervana_SaaS route names. Worth capturing in the patterns stage.

### Home equity (multi-property)

| Method | Offervana Route | Caller |
|---|---|---|
| (see `temporal_workflows/customer_tools.py:86`) | fan-outs `GetAllPropertiesForClient` then per-property `GetHomeEquity`, limited to `limit=5` | `get_blast_home_equity_for_multiple_properties` |

Not a single endpoint — composition of two existing endpoints. Noted here because the agent exposes it as one tool.

---

## OpenAI Tool Surface (LLM-facing, not HTTP)

Each JSON file in `function-definitions/` is an OpenAI function-calling schema the agent exposes to the LLM. Names mirror the Python functions above. These are **not HTTP endpoints** but are the agent's contract with the LLM — documented fully in the Patterns stage (Stage 05).

Tools: `get_agent_info`, `get_blast_avm_value`, `get_blast_cash_offers`, `get_blast_historical_value`, `get_blast_home_equity`, `get_blast_home_equity_for_multiple_properties`, `get_blast_long_term_rental_avm`, `get_blast_rent_vs_sell`, `get_blast_sales_trend_by_multiple_zipcodes`, `get_blast_sales_trend_by_zipcode`, `get_blast_short_term_rental_avm`, `get_blast_survey`, `get_property`.

Plus text-only helper files (`aboutzoodealio.txt`, `cashoffer.txt`, `cash+offer.txt`, `cash+withrepairs.txt`, `sellnowmovelater.txt`, `becomeacashbuyer.txt`, `offer_explainer_guide.txt`, `cashplusresponses.txt`) — content snippets loaded into system-prompt context rather than invoked as tools.

---

## Deployment notes relevant to "API access"

- `Procfile`: `web: chainlit run app.py -h --host 0.0.0.0 --port $PORT`
- `web.config`: IIS FastCGI handler (legacy; references `D:\Python34\python.exe` — stale path from an early Azure App Service deployment; flag for Infrastructure review)
- `Dockerfile` / `Dockerfile.temporal-worker`: container images for the Chainlit web and the Temporal tools worker respectively. Only the Chainlit container exposes HTTP; the worker is a long-running process with no listener.

---

## Ambiguities / Flags for finalize

1. **Survey route drift** between `functions/function_implementations.py` (`GetBlastSurvey`) and `temporal_workflows/property_tools.py` (`GetSurvey`) — needs Offervana cross-check.
2. **Duplicate Chainlit decorators** in `app.py` + `agents_integration.py` — legacy-mode registration that would conflict if both modules were used as entrypoints.
3. **Stale `web.config`** referencing `D:\Python34\python.exe` — likely abandoned.
4. **No auth callbacks registered** — security-sensitive surface area; trusts `user_env` fully. Authorization is entirely upstream.
