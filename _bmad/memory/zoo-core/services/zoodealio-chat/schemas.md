---
artifact: schemas
service: zoodealio-chat
commit-sha: 8aa135f2b2cba743d335905ae794181bb658bb22
generated-at: 2026-04-15T00:00:00Z
entity-count: 0
dataclass-count: 6
---

# Zoodealio.Chat — Schemas

## Summary

**Zoodealio.Chat owns no persistent state.** There is no DbContext, no database connection, no ORM, no Azure Search index, no Cosmos container, and no LegacyData reference to `OffervanaDbContext`. All state is either ephemeral (in-process/in-session) or delegated to Temporal for durability of tool-execution workflows.

This stage therefore catalogues the **data contracts** that flow through the service:

1. Runtime **context dataclasses** — the per-turn authorization/routing bundle
2. **Temporal workflow request/result dataclasses** — immutable contracts between caller and workflow
3. **Chainlit session state shape** — keys set on `cl.user_session` (ephemeral, per-connection)
4. **Chainlit custom element props** — UI contracts between backend and the Chainlit React frontend
5. **BLAST response field consumption** — fields this service reads out of Offervana_SaaS responses (non-authoritative; the authoritative shape lives in `Offervana_SaaS`)
6. **OpenAI tool schema** — not duplicated here; see `function-definitions/*.json` (catalogued in Stage 05 Patterns)

Where two implementations of "the same thing" exist (non-Temporal and Temporal code paths), both are captured and divergences flagged.

---

## 1. Runtime Context Dataclasses

### `ZoodealioContext`

- **Source:** `temporal_agent_integration.py:47`
- **Purpose:** Per-turn context used by the Temporal-only agent path (`AGENT_MODE=temporal`)

| Field | Type | Nullable | Notes |
|---|---|---|---|
| `property_id` | `Optional[str]` | yes | Currently-scoped property |
| `customer_user_id` | `Optional[str]` | yes | Currently-scoped customer user (UserId, NOT numeric CustomerId — see `_resolve_customer_id_from_user_id`) |
| `token` | `Optional[str]` | yes | Raw BLAST token; may already start with `"Bearer "` |
| `api_base_url` | `Optional[str]` | yes | BLAST base URL, no trailing slash |
| `zipcode` | `Optional[str]` | yes | Market-trend tools gate on this |

- **Computed:**
  - `bearer_token` → prefixes `"Bearer "` if not already present
  - `api_url` → `{api_base_url}/api` if `api_base_url` set

### `HybridContext`

- **Source:** `hybrid_streaming_agent.py:22`
- **Purpose:** Per-turn context used by the hybrid-streaming path (`AGENT_MODE=hybrid`, default)
- **Fields:** identical to `ZoodealioContext` (same 5 fields, same types)
- **Computed:** `bearer_token`, `api_url` — identical
- **Extra:** `to_temporal_context() -> Dict[str, Any]` returning `{property_id, customer_user_id, bearer_token, api_url, zipcode}` — used when dispatching a `ToolRunnerWorkflow`

**DRIFT:** two identical dataclasses. Should be a single shared type; see Stage 05 patterns for the duplication trend.

---

## 2. Temporal Workflow Request/Result Dataclasses

### `PropertyAnalysisRequest`

- **Source:** `temporal_workflows/tools_workflows.py:39`
- **Used by:** `PropertyAnalysisWorkflow`, `SimplePropertyWorkflow`

| Field | Type | Nullable |
|---|---|---|
| `property_id` | `str` | no |
| `token` | `str` | no |
| `base_url` | `str` | no |
| `query` | `Optional[str]` | yes |

### `CustomerAnalysisRequest`

- **Source:** `temporal_workflows/tools_workflows.py:48`
- **Used by:** `CustomerAnalysisWorkflow`

| Field | Type | Nullable |
|---|---|---|
| `customer_user_id` | `str` | no |
| `token` | `str` | no |
| `base_url` | `str` | no |
| `query` | `Optional[str]` | yes |

### `ToolExecutionInput`

- **Source:** `temporal_workflows/tool_runner_workflow.py:45`
- **Used by:** `ToolRunnerWorkflow` (the hybrid path's tool-execution workflow)

| Field | Type | Nullable |
|---|---|---|
| `tool_name` | `str` | no |
| `arguments` | `Dict[str, Any]` | no (may be empty) |
| `context` | `Dict[str, Any]` | no — must contain `bearer_token`, `api_url`, plus at least one of `property_id`/`customer_user_id`, optional `zipcode` |

### `ToolExecutionResult`

- **Source:** `temporal_workflows/tool_runner_workflow.py:53`

| Field | Type | Nullable |
|---|---|---|
| `success` | `bool` | no |
| `result` | `Optional[str]` | yes |
| `error` | `Optional[str]` | yes |

**NB:** `ToolRunnerWorkflow.run()` returns a plain `Dict[str, Any]` shaped like this dataclass, not the dataclass itself. The dataclass is declared but not used as the return type — flag for patterns/quality review.

---

## 3. Chainlit Session State (`cl.user_session`)

Ephemeral per-connection state. Keys set in `app.py`:

| Key | Type | Set at | Cleared at |
|---|---|---|---|
| `env` | `dict` | by Chainlit runtime (from WebSocket connect user env) | session end |
| `property_id` | `Optional[str]` | `on_chat_start` (from `env`) | — |
| `customer_user_id` | `Optional[str]` | `on_chat_start` (from `env`) | — |
| `token` | `Optional[str]` | `on_chat_start` (from `env`) | — |
| `zipcode` | `Optional[str]` | `on_chat_start` (from `env`) | — |
| `api_base_url` | `str` | `on_chat_start` (trailing `/` stripped) | — |
| `status_step` | `cl.Step` or `None` | `on_message` (new "Status" step per turn) | `on_stop`, end of `on_message` finally |
| `status_lines` | `List[str]` | `on_message` (populated by streaming status callbacks) | `on_stop`, end of `on_message` finally |
| `current_message_id` | `Optional[str]` | never `set` outside `on_stop` clear — **read but not written** (dead key?) | `on_stop` |
| `history` | `List[{role: "user"/"assistant", content: str}]` | appended at end of `on_message` | `on_stop` |

**Flag:** `current_message_id` is only ever written to `None` in `on_stop`; it is never actually populated. Appears to be legacy. See `agents_integration_backup.py` for older usage.

**Constant:** `MAX_HISTORY_MESSAGES = int(os.getenv("MAX_HISTORY_MESSAGES", 12))` — trims `history` in place after each turn.

---

## 4. Chainlit Custom Element Props

Backend → frontend JSON contracts for inline widgets. Defined in `custom_elements.py`; rendered by React components referenced by `name`.

### `propertyValue` (`PropertyValueWidget`)

- **Source:** `custom_elements.py:23` (`create_property_value_widget`)
- **Display:** `inline`
- **Trigger:** last agent tool is in `PROPERTY_VALUE_TOOLS = {"get_property_value", "get_property_info", "get_blast_avm_value"}`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `address` | `str` | `""` | Flattened from nested `address` object — concatenates `address1`, `city`, `stateCd`, `zipCode` |
| `estimatedValue` | `number` | `0` | First present of `avmValue` / `realvalue` / `estimated_value` / `value` |
| `propertyType` | `str` | `"Single Family"` | |
| `bedrooms` | `number` | `0` | `homeInfo.bedroomsCount` or fallback to flat keys `bedrooms`/`beds`/`bedroomsCount` |
| `bathrooms` | `number` | `0` | Same fallback pattern as `bedrooms` |
| `squareFeet` | `number` | `0` | `homeInfo.squareFootage` or flat `square_feet`/`sqft`/`squareFootage` |

### `equityCalculator` (`EquityCalculatorWidget`)

- **Source:** `custom_elements.py:39` (`create_equity_calculator_widget`)
- **Display:** `inline`
- **Trigger:** last agent tool is in `EQUITY_TOOLS = {"get_home_equity", "get_blast_home_equity", "get_blast_home_equity_for_multiple_properties"}`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `currentValue` | `number` | `0` | `avmValue` or `current_value`/`estimated_value` fallback |
| `loanBalance` | `number` | `0` | `loan_balance` / `mortgage_balance` / `mortgageLienAmount`; **computed** as `currentValue - equity` if only equity is present |
| `equity` | `number` | `0` | `estimatedAvailableEquity` or `equity`; **computed** as `currentValue - loanBalance` if only loan balance is present |
| `equityPercentage` | `number` | `0` | `(equity / currentValue) * 100`, rounded to 1 decimal |

Both widgets require at minimum a non-falsy `address`/`estimated_value` (property) or `current_value` (equity) to render — otherwise the widget is silently skipped.

---

## 5. BLAST Response Fields Consumed

zoodealio-chat is a **consumer** of BLAST; it never owns these shapes. This section captures the fields it reads — so an agent updating BLAST knows what will break here. (Authoritative shapes live in `Offervana_SaaS` DTOs.)

### `GetRealValue` / `GetPropertyById` response

Read in `custom_elements.py:_extract_property_data_from_results`:

- Top-level optionally wrapped in `{ "result": { ... } }`
- `address` — either a `string` or an object with `{address1, city, stateCd, zipCode}`
- `avmValue` | `realvalue` | `estimated_value` | `value` — number
- `property_type` — string (defaults to `"Single Family"`)
- `homeInfo: { bedroomsCount, bathroomsCount, squareFootage }` — object OR flat keys: `bedrooms`/`beds`, `bathrooms`/`baths`, `square_feet`/`sqft`/`squareFootage`

### `GetHomeEquity` response

Read in `custom_elements.py:_extract_equity_data_from_results`:

- `estimatedAvailableEquity` — number (primary field)
- `avmValue` — number (primary value field)
- `equity` — number (fallback)
- `current_value` | `estimated_value` — number (fallback)
- `loan_balance` | `mortgage_balance` | `mortgageLienAmount` — number

### Customer resolution response

Read in `functions/function_implementations.py:_extract_customer_id_from_response`:

- `result.customerId` | `result.id` | `result.CustomerId` | `result.Id` — digit-string-or-int → coerced to `str`

---

## 6. OpenAI Tool Parameter Schemas

Thirteen JSON tool schemas in `function-definitions/`, one per agent tool:

| File | Tool name | Required params |
|---|---|---|
| `get_agent_info.json` | `get_agent_info` | — (customer_user_id from context) |
| `get_blast_avm_value.json` | `get_blast_avm_value` | `property_id` |
| `get_blast_cash_offers.json` | `get_blast_cash_offers` | `property_id` |
| `get_blast_historical_value.json` | `get_blast_historical_value` | `property_id` |
| `get_blast_home_equity.json` | `get_blast_home_equity` | `property_id` |
| `get_blast_home_equity_for_multiple_properties.json` | `get_blast_home_equity_for_multiple_properties` | `customer_user_id`, `max_properties?` |
| `get_blast_long_term_rental_avm.json` | `get_blast_long_term_rental_avm` | `property_id` |
| `get_blast_rent_vs_sell.json` | `get_blast_rent_vs_sell` | `property_id` |
| `get_blast_sales_trend_by_multiple_zipcodes.json` | `get_blast_sales_trend_by_multiple_zipcodes` | `property_id`, `customer_zipcodes`, `year_range` |
| `get_blast_sales_trend_by_zipcode.json` | `get_blast_sales_trend_by_zipcode` | `property_id`, `customer_zipcode`, `year_range` |
| `get_blast_short_term_rental_avm.json` | `get_blast_short_term_rental_avm` | `property_id`, `bedrooms`, `bathrooms`, `guests` |
| `get_blast_survey.json` | `get_blast_survey` | `property_id` |
| `get_property.json` | `get_property` | (general property lookup) |

There is also a parallel set of OpenAI tool schemas generated **inline** in `hybrid_streaming_agent.py:get_openai_tools()`. **DRIFT alert** — the hybrid path uses inline tool definitions that rename `get_blast_avm_value` → `get_property_value`, `get_blast_cash_offers` → `get_cash_offers`, etc., and makes every parameter optional (`required: []`) rather than required. Flagged for Stage 05 patterns.

---

## Ambiguities / Flags for finalize

1. **No DB, no entities** — this is the correct shape for this service, but worth explicit mention since every other Zoodealio service has a DbContext + LegacyData. Consumers should not assume a DB exists here.
2. **`HybridContext` and `ZoodealioContext` are identical** — should be unified.
3. **Tool name drift** between `function-definitions/*.json` (historical, BLAST-prefixed names) and `hybrid_streaming_agent.get_openai_tools()` (sanitized names). The Temporal path uses `agent_tools.py` wrappers which match the sanitized names.
4. **`current_message_id` session key is dead** — only ever cleared, never written.
5. **`ToolExecutionResult` dataclass declared but unused** as a return type in `ToolRunnerWorkflow.run()`.
