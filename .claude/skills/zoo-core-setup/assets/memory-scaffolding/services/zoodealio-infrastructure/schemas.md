---
artifact: schemas
service: zoodealio-infrastructure
commit-sha: fe5b090b5f7cbeeedeb92501724d875ba5923539
generated-at: 2026-04-15T00:00:00Z
entity-count: 0
resource-type-count: 5
---

# Schemas — zoodealio-infrastructure

## Not applicable — no data persistence layer

This repo is Terraform IaC. It has:
- **No DbContext, entities, or ORM mappings**
- **No `LegacyData` reference** to `OffervanaDbContext` (N/A — no code runs here)
- **No Cosmos, Azure AI Search, or Strapi content-types defined here**

The equivalent "schema" for a Terraform repo is the **Azure resource graph** it provisions: which resource types exist, their configuration attributes, and how they reference each other. That is documented below.

## Azure resource graph — per environment stack

Each environment stack (`environments/{dev,uat,prod}`) provisions the same 5 resource types. Resource configuration is identical across environments; only names/SKUs vary (all three currently use identical SKU `"Basic"` for ACR and identical region `"West US"`).

### Resource inventory per environment

| # | Azure resource type | Terraform address | Source module | Quantity |
|---|---|---|---|---|
| 1 | `azurerm_resource_group` | `module.resource_group.azurerm_resource_group.resource-group` | `modules/resource-group` | 1 |
| 2 | `azurerm_container_registry` | `module.acr.azurerm_container_registry.acr` | `modules/acr` | 1 |
| 3 | `azurerm_log_analytics_workspace` | `module.container-app.module.log-analytics-workspace.azurerm_log_analytics_workspace.log-analytics-workspace` | `modules/log-analytics-workspace` (nested inside `container-app`) | 1 |
| 4 | `azurerm_container_app_environment` | `module.container-app.azurerm_container_app_environment.container-app-env` | `modules/container-app` | 1 |
| 5 | `azurerm_container_app` | `module.container-app.azurerm_container_app.container-app` | `modules/container-app` | 1 |

**Total per env:** 5 resources. **Total across 3 envs:** 15 resources (no cross-env resources detected).

---

### Resource details

#### 1. `azurerm_resource_group.resource-group`

Source: `modules/resource-group/main.tf`

| Attribute | Value / binding |
|---|---|
| `name` | `var.resource_group_name` |
| `location` | `var.location` (default `"West US"`) |

Per-env names: `dev-zoodealio-ca-rg`, `uat-zoodealio-ca-rg`, `prod-zoodealio-ca-rg`.

**Outbound references:** none (root of dependency chain).
**Inbound references:** RG name is passed as a string to `acr` and `container-app` modules — *not* via `module.resource_group.name`, so there is **no Terraform graph edge** between the RG and downstream resources. They create in parallel and rely on naming convention.

---

#### 2. `azurerm_container_registry.acr`

Source: `modules/acr/maint.tf` (note: file is `maint.tf`, typo)

| Attribute | Value / binding |
|---|---|
| `name` | `"${replace(var.environment, "-", "")}zoodealioacr"` → `devzoodealioacr` / `uatzoodealioacr` / `prodzoodealioacr` |
| `resource_group_name` | `var.resource_group_name` (string, not module ref) |
| `location` | `var.location` |
| `sku` | `var.sku` (always `"Basic"` in all 3 envs) |
| `admin_enabled` | `true` (hardcoded) |

**Exported (module outputs):** `acr-name`, `acr_id`, `acr_login_server`, `acr_admin_username`, `acr_admin_password` (none marked `sensitive`).

---

#### 3. `azurerm_log_analytics_workspace.log-analytics-workspace`

Source: `modules/log-analytics-workspace/main.tf`

| Attribute | Value / binding |
|---|---|
| `name` | `var.name` → env passes `"${var.environment}-zoodealio-log"` |
| `resource_group_name` | `var.resource_group_name` |
| `location` | `var.location` |
| `retention_in_days` | `var.retention_in_days` (default `30`) |
| `sku` | **commented out** (main.tf:10) — Terraform falls back to the provider default `PerGB2018` |

Per-env names: `dev-zoodealio-log`, `uat-zoodealio-log`, `prod-zoodealio-log`.

**Module outputs:** none. Workspace `id` / `workspace_id` are not exported — so no downstream resource can wire diagnostics to it.

---

#### 4. `azurerm_container_app_environment.container-app-env`

Source: `modules/container-app/main.tf`

| Attribute | Value / binding |
|---|---|
| `name` | `"${var.environment}-${var.env_name_suffix}"` → `dev-zoodealio-cae` / `uat-zoodealio-cae` / `prod-zoodealio-cae` |
| `resource_group_name` | `var.resource_group_name` |
| `location` | `var.location` |
| `log_analytics_workspace_id` | **not set** — schema attribute absent |
| `infrastructure_subnet_id` | not set (runs on managed infra) |

**Gap:** the sibling `log-analytics-workspace` module is instantiated alongside this CAE in the same module, but its output (even if it existed) is never wired to `log_analytics_workspace_id`. The workspace exists but receives no telemetry.

---

#### 5. `azurerm_container_app.container-app`

Source: `modules/container-app/main.tf`

| Attribute | Value / binding |
|---|---|
| `name` | `"${var.environment}-${var.container_app_name_suffix}"` → `dev-zoodealio-ca` / `uat-zoodealio-ca` / `prod-zoodealio-ca` |
| `resource_group_name` | `var.resource_group_name` |
| `container_app_environment_id` | `azurerm_container_app_environment.container-app-env.id` — *this* is a real Terraform graph edge |
| `revision_mode` | `"Single"` |
| `secret.name` | `"acr-password"` |
| `secret.value` | `var.acr_admin_password` |
| `registry.server` | `var.acr_login_server` |
| `registry.username` | `var.acr_admin_username` |
| `registry.password_secret_name` | `"acr-password"` |
| `template.container[0].name` | `var.container_name` → `"zoodealiotemporal"` |
| `template.container[0].image` | `var.container_image` → `"${module.acr.acr_login_server}/zoodealiotemporal:latest"` |
| `template.container[0].cpu` | `"0.25"` |
| `template.container[0].memory` | `"0.5Gi"` |
| `template.min_replicas` | `1` |
| `template.max_replicas` | `3` |

**Note:** `:latest` tag means Terraform will not detect image updates — redeployment requires an out-of-band revision trigger or tag change. No `ingress` block is declared, so the app has no external endpoint unless added later via portal/CLI (drift risk).

---

## Reference graph (per env)

```
azurerm_resource_group.resource-group
    │ (name passed as string, no module ref — parallel graph branches)
    ├──▶ azurerm_container_registry.acr
    │       │
    │       │ acr_admin_password / acr_login_server / acr_admin_username (string outputs)
    │       ▼
    └──▶ module.container-app
            ├──▶ module.log-analytics-workspace
            │       └──▶ azurerm_log_analytics_workspace   (orphaned — no consumer)
            ├──▶ azurerm_container_app_environment         (does NOT reference LAW)
            │       │
            │       ▼ container_app_environment_id (real module-internal edge)
            └──▶ azurerm_container_app                     (pulls :latest from ACR via registry block)
```

Only **one** explicit Terraform dependency edge exists: `container-app → container-app-env`. All other ordering relies on Azure-side name uniqueness and eventually-consistent lookups, not on the Terraform graph.

## Cross-service contracts exposed

Other Zoodealio repos don't consume Terraform state from here. The contract surface for downstream services is the **deployed Azure resources themselves** — specifically:

- **ACR hostname**: `{env}zoodealioacr.azurerm.io` (matches `devzoodealioacr.azurecr.io` referenced in CLAUDE.md) — consumed by every service's Docker push pipeline.
- **Container App Environment**: `{env}-zoodealio-cae` — implied consumption by any other pipeline wanting to deploy additional container apps into the same env (no such pipeline is in this repo).
- **RG name convention**: `{env}-zoodealio-ca-rg` — assumed by anything that deploys extra Azure resources alongside these.

## Summary

- **0 application entities** (N/A — IaC repo).
- **5 resource types** × **3 environments** = **15 Azure resources** provisioned total.
- **1 real Terraform dependency edge** per env (container-app → container-app-env); the rest is name-string coupling.
- **1 orphaned resource**: `azurerm_log_analytics_workspace` is provisioned but has no consumer wire-up.
- **1 implicit consumer**: all other Zoodealio services depend on the ACR hostname convention.
