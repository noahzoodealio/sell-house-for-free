---
artifact: api-catalog
service: zoodealio-infrastructure
commit-sha: fe5b090b5f7cbeeedeb92501724d875ba5923539
generated-at: 2026-04-15T00:00:00Z
endpoint-count: 0
module-count: 4
environment-count: 3
---

# API Catalog — zoodealio-infrastructure

## Not applicable — no HTTP surface

This repo is **Terraform IaC**. It has no controllers, Functions, minimal-API endpoints, Strapi content-types, or Angular services. No HTTP/gRPC surface exists.

The public **"interface" of a Terraform repo** is the set of module inputs (variables) and outputs consumed by callers (environments or other modules). That equivalent is documented below.

## Module interfaces — 4 reusable modules

Each is a consumable Terraform module under `modules/`. Root-level composition happens under `environments/{dev,uat,prod}/main.tf`.

### `modules/resource-group`

Thin wrapper over `azurerm_resource_group`.

**Source files:** `modules/resource-group/main.tf`, `variables.tf`

**Inputs:**

| Name | Type | Required | Default | Notes |
|---|---|---|---|---|
| `resource_group_name` | string | ✅ | — | RG name |
| `location` | string | no | `"West US"` | Azure region |
| `subscription_id` | string | ✅ | — | Azure subscription (description text incorrectly says "…the Azure Container Registry") |

**Outputs:** none declared. Callers cannot reference the created RG's `id` or `name` from this module; they must re-use the input string `var.resource_group_name`.

**Resource:** `azurerm_resource_group.resource-group`

---

### `modules/acr`

Creates an Azure Container Registry with admin auth enabled.

**Source files:** `modules/acr/maint.tf` ⚠️ (filename typo — should be `main.tf`; Terraform loads all `*.tf` so it still works), `modules/acr/variables.tf`, `modules/acr/outputs.tf`

**Inputs:**

| Name | Type | Required | Default | Notes |
|---|---|---|---|---|
| `environment` | string | ✅ | — | Used to prefix ACR name (hyphens stripped) |
| `resource_group_name` | string | ✅ | — | |
| `location` | string | no | `"West US"` | |
| `sku` | string | ✅ | — | ACR SKU; all environments currently pass `"Basic"` |
| `subscription_id` | string | ✅ | — | |

**Outputs:**

| Name | Value | Notes |
|---|---|---|
| `acr-name` | `azurerm_container_registry.acr.name` | ⚠️ uses hyphen — inconsistent with other snake_case outputs |
| `acr_id` | `.id` | |
| `acr_login_server` | `.login_server` | |
| `acr_admin_username` | `.admin_username` | |
| `acr_admin_password` | `.admin_password` | 🚨 **not marked `sensitive = true`** — plaintext in plan/apply/state output |

**Resource:** `azurerm_container_registry.acr`
- `name` = `"${replace(var.environment, "-", "")}zoodealioacr"` — e.g. env `dev` → `devzoodealioacr` (matches the registry referenced in `CLAUDE.md`)
- `admin_enabled = true`

**Anomaly:** module re-declares its own `azurerm` provider block (`provider "azurerm" {}`) inside the module. Terraform community convention is that modules inherit the root provider; declaring inside a module is not illegal but is generally discouraged and will produce `Warning: Provider configuration not present` if it's removed from the root. All four modules do this.

---

### `modules/container-app`

Creates an Azure Container App **Environment** + a single **Container App** (the Temporal workflow runtime). Also instantiates the `log-analytics-workspace` sub-module.

**Source files:** `modules/container-app/main.tf`, `variables.tf`

**Inputs:**

| Name | Type | Required | Default | Notes |
|---|---|---|---|---|
| `environment` | string | ✅ | — | Env prefix for naming |
| `env_name_suffix` | string | no | `"zoodealio-cae"` | Suffix for the Container App Environment |
| `container_app_name_suffix` | string | no | `"zoodealio-ca"` | Suffix for the Container App itself |
| `resource_group_name` | string | ✅ | — | |
| `location` | string | no | `"West US"` | Not currently applied (commented out, see main.tf:25) |
| `container_image` | string | ✅ | — | Full image ref incl. login server |
| `container_name` | string | ✅ | — | Container name inside the app |
| `log_analytics_workspace_name_suffix` | string | no | `"zoodealio-log"` | |
| `log_analytics_workspace_retention_in_days` | number | no | `30` | |
| `acr_id` | string | ✅ | — | |
| `acr_admin_username` | string | ✅ | — | |
| `acr_admin_password` | string | ✅ | — | ⚠️ not marked `sensitive` on the variable |
| `acr_login_server` | string | ✅ | — | |
| `subscription_id` | string | ✅ | — | |

**Outputs:** none declared. The container app URL/FQDN and revision identity are not exposed to callers.

**Resources:**

| Resource | Notes |
|---|---|
| `module.log-analytics-workspace` | Sub-module invocation (nested); see next section |
| `azurerm_container_app_environment.container-app-env` | Name: `"${var.environment}-${var.env_name_suffix}"` |
| `azurerm_container_app.container-app` | Name: `"${var.environment}-${var.container_app_name_suffix}"`; `revision_mode = "Single"`; ACR pull via `registry` block using `acr-password` secret; single container, cpu `0.25`, memory `0.5Gi`, min 1 / max 3 replicas |

**Commented-out inputs (dead code):** `log_analytics_workspace_sku` (variables.tf:45-48), and `location` pass-through on the container app resource (main.tf:25).

---

### `modules/log-analytics-workspace`

Creates a Log Analytics Workspace. Typically called via the `container-app` module, not directly.

**Source files:** `modules/log-analytics-workspace/main.tf`, `variables.tf`

**Inputs:**

| Name | Type | Required | Default | Notes |
|---|---|---|---|---|
| `name` | string | ✅ | — | |
| `resource_group_name` | string | ✅ | — | |
| `location` | string | no | `"West US"` | |
| `retention_in_days` | number | no | `30` | |
| `subscription_id` | string | ✅ | — | |

**Outputs:** none declared. The workspace ID/key is not surfaced — the container-app env resource in the current code does not wire diagnostics into it (no `log_analytics_workspace_id` attribute is set on `azurerm_container_app_environment`).

**Resource:** `azurerm_log_analytics_workspace.log-analytics-workspace`

Commented-out code: the `sku` input (variables.tf:17-20) and the resource attribute (main.tf:10).

---

## Environment compositions — 3 environments

Each environment is a root Terraform stack that calls the three top-level modules (`resource_group`, `acr`, `container-app`). All three environments have **identical** `main.tf` and `variables.tf` — they differ only in `{env}.tfvars`.

**Source files (per env):** `environments/{dev,uat,prod}/main.tf`, `variables.tf`, `{env}.tfvars`

**Stack inputs (per-env tfvars):**

| Variable | dev | uat | prod |
|---|---|---|---|
| `environment_name` | `"dev"` | `"uat"` | `"prod"` |
| `resource_group_name` | `"dev-zoodealio-ca-rg"` | `"uat-zoodealio-ca-rg"` | `"prod-zoodealio-ca-rg"` |
| `location` | `"West US"` | `"West US"` | `"West US"` |
| `subscription_id` | `"aa9f7d55-a9fb-40b6-81ec-a54ad110a6b0"` | same | same |

**Module wiring (identical across envs):**
- `resource_group` ← base RG for env
- `acr` ← SKU hardcoded to `"Basic"` (including prod)
- `container-app` ← deploys a single container: name `zoodealiotemporal`, image `${acr_login_server}/zoodealiotemporal:latest`

**Stack outputs:**
- `environments/dev/outputs.tf` — **empty file (1 line)**. uat and prod have no `outputs.tf`. Stacks expose nothing.

---

## Cross-service / cross-repo dependencies

The "API" this repo exposes to other repos is the *deployed infrastructure*. Downstream consumers:

- **All .NET services** (`Offervana_SaaS`, `Zoodealio.TradeInHoldings`, `investor-portal`, `Zoodealio.MLS`) → push images to the ACR provisioned here (`{env}zoodealioacr.azurecr.io`) and expect a Container Apps runtime.
- **Current deployment surface is narrower than expected.** Stage-02 evidence shows only a single container app being deployed per environment — the `zoodealiotemporal` runtime. There is **no** Terraform module or resource here that provisions container apps for the 4 .NET services, `Zoodealio.Chat`, or `Zoodealio.Strapi`. Either those are deployed by a different pipeline, or the `:latest` Temporal image is the only workload currently under IaC management. Worth flagging to the user — `CLAUDE.md` describes this repo as "IaC — ACR, Container Apps, Log Analytics" which implies more.

## Summary

- **0 HTTP endpoints** (Terraform IaC repo — no surface).
- **4 modules**, **3 environment stacks**, **1 deployed workload** (`zoodealiotemporal` container app).
- **Anomalies worth surfacing in patterns/architecture:**
  1. `acr_admin_password` output not marked `sensitive` 🚨
  2. Filename typo `modules/acr/maint.tf` (should be `main.tf`)
  3. Dead/commented code in 2 modules (SKU for log analytics, `location` for container app)
  4. Inconsistent output naming: `acr-name` (hyphen) vs. `acr_id` (snake) in same `outputs.tf`
  5. All four modules declare their own `provider "azurerm"` block — non-standard for child modules
  6. Subscription ID hardcoded as a default in root `variables.tf` (all three envs)
  7. dev/uat/prod stacks are byte-identical aside from tfvars — reasonable but inflexible (e.g., prod still uses ACR SKU `Basic`)
  8. No stack outputs on any environment (empty `dev/outputs.tf`, missing on uat/prod)
  9. Container-app env is created but Log Analytics workspace is **not wired** to it (no `log_analytics_workspace_id` attribute set) — diagnostics appear orphaned
