---
artifact: architecture
service: zoodealio-infrastructure
commit-sha: fe5b090b5f7cbeeedeb92501724d875ba5923539
generated-at: 2026-04-15T00:00:00Z
---

# Architecture — zoodealio-infrastructure

## At a glance

- **Type:** Terraform root repo (Azure IaC). No runtime code, no tests, no CI pipeline in-tree.
- **Provider:** `hashicorp/azurerm` **v3.111.0** (pinned in `.terraform.lock.hcl`) — one provider, no others.
- **Layers:** 2 — **environments** (per-env roots) + **modules** (reusable resource wrappers).
- **Modules:** 4 reusable (`resource-group`, `acr`, `container-app`, `log-analytics-workspace`).
- **Environments:** 3 (`dev`, `uat`, `prod`) — all identical except tfvars.
- **Provisioned per env:** 5 Azure resources. **No Temporal workflows, hosted services, or jobs** (N/A — no runtime).
- **Terraform state:** backend is **not configured** — state is local on the operator's machine (see Anomalies).
- **Single deployed workload:** `zoodealiotemporal` container app (`:latest` tag).

## Repo layout

```
Zoodealio.Infrastructure/
├── provider.tf               # root azurerm provider
├── variables.tf              # root-level: subscription_id (hardcoded default)
├── README.md                 # 18-line getting-started (terraform init/plan/apply)
├── .terraform.lock.hcl       # azurerm 3.111.0 pin
├── .gitignore                # state files, .terraform/, override.tf patterns
├── environments/
│   ├── dev/
│   │   ├── main.tf           # calls resource_group + acr + container-app modules
│   │   ├── variables.tf      # rg_name, location, environment_name, subscription_id
│   │   ├── outputs.tf        # EMPTY (1 line)
│   │   └── dev.tfvars        # location=West US, env=dev, rg=dev-zoodealio-ca-rg
│   ├── uat/                  # identical main.tf; uat.tfvars differs; no outputs.tf
│   └── prod/                 # identical main.tf; prod.tfvars differs; no outputs.tf
└── modules/
    ├── resource-group/       # thin azurerm_resource_group wrapper
    │   ├── main.tf
    │   └── variables.tf
    ├── acr/                  # azurerm_container_registry (admin_enabled=true)
    │   ├── maint.tf          # ⚠️ filename typo (should be main.tf; still loaded)
    │   ├── variables.tf
    │   └── outputs.tf        # 5 outputs, incl. admin_password NOT sensitive
    ├── container-app/        # CAE + CA + nested log-analytics-workspace sub-module
    │   ├── main.tf
    │   └── variables.tf
    └── log-analytics-workspace/
        ├── main.tf           # sku commented out
        └── variables.tf      # sku variable commented out
```

**Note on solution concept:** unlike the .NET/Angular Zoodealio services, there is no layered `Api / Application / Domain / Infrastructure` pattern — the "layering" is Terraform's conventional two-layer split (composition roots in `environments/`, primitives in `modules/`).

## Layer responsibilities

### `modules/` — reusable resource wrappers

Each module represents one Azure primitive (or a small bundle, in `container-app`'s case). Conventions observed:

- Every module declares its own `provider "azurerm"` block with `subscription_id = var.subscription_id`. This is non-idiomatic — community guidance is to declare providers only at the root and let modules inherit. The effect here: if a caller ever omits `subscription_id`, module instantiation fails even if the root provider has the right sub set.
- Only `acr` defines `outputs.tf`. The other three modules export nothing, so callers cannot reference any of their attributes from the root.
- Locations default to `"West US"`. SKU defaults are **not** set; callers must pass them.

### `environments/{dev,uat,prod}/` — composition roots

Each env calls the three top-level modules (`resource_group`, `acr`, `container-app`; `log-analytics-workspace` is called transitively inside `container-app`). The three `main.tf` files are byte-identical; env differentiation is purely through tfvars:

| | dev | uat | prod |
|---|---|---|---|
| `environment_name` | `dev` | `uat` | `prod` |
| `resource_group_name` | `dev-zoodealio-ca-rg` | `uat-zoodealio-ca-rg` | `prod-zoodealio-ca-rg` |
| `location` | `West US` | `West US` | `West US` |
| `subscription_id` | `aa9f7d55-…-a6b0` | same | same |
| ACR SKU | `"Basic"` | `"Basic"` | `"Basic"` |

No `locals`, no `for_each` loops, no dynamic blocks, no `count`. Everything is single-instance per env.

## Data flow

There is no runtime data flow (no app runs here). The *operational* flow is:

```
operator
  └─► cd environments/{env}
        └─► terraform init                     (backend = local; see anomaly)
              └─► terraform plan -var-file="{env}.tfvars"
                    └─► terraform apply -var-file="{env}.tfvars"
                          └─► azurerm provider  ───►  Azure subscription aa9f7d55-…
                                                         ├── RG: {env}-zoodealio-ca-rg
                                                         │     ├── ACR: {env}zoodealioacr
                                                         │     ├── Log Analytics: {env}-zoodealio-log  (unconsumed)
                                                         │     ├── Container App Env: {env}-zoodealio-cae
                                                         │     └── Container App: {env}-zoodealio-ca
                                                         │           (pulls zoodealiotemporal:latest)
```

## Integration points

### External services consumed (by Terraform, not by deployed apps)

- **Azure Resource Manager** — only integration. No external APIs, no SendGrid/ATTOM/OpenAI/etc (those are app-layer concerns).
- **Azure Container Registry** (`{env}zoodealioacr`) — created by this repo; consumed by all other Zoodealio repos as the image push target.

### Internal (Zoodealio) services consumed

None at Terraform time.

### Internal services that consume *this*

All Zoodealio .NET services (+ Chat) push images into the ACR provisioned here. That said, **only one of them** is currently being deployed via this repo (`zoodealiotemporal`). Deployment of `Offervana_SaaS`, `Zoodealio.TradeInHoldings`, `investor-portal`, `Zoodealio.MLS`, `Zoodealio.Chat`, `Zoodealio.Strapi` is either:

- handled by a pipeline outside this repo (likely Azure DevOps release pipelines), **or**
- unimplemented / partial.

CLAUDE.md characterizes this repo as *"IaC — ACR, Container Apps, Log Analytics"* (implying Container Apps plural). Evidence here supports only one. Flag for stakeholder confirmation.

### Shared packages / DTOs

N/A — no .NET or Angular code.

## Durable workflows / background processing

N/A. No Temporal, no `IHostedService`, no Hangfire/Quartz/ABP background jobs. (Ironically the single workload provisioned by this repo is the Temporal runtime host itself — but Temporal lives in the app layer, not here.)

## Authentication + authorization

### Terraform execution auth

- The `azurerm` provider is bound to `subscription_id = var.subscription_id` (default: `aa9f7d55-a9fb-40b6-81ec-a54ad110a6b0`).
- No `client_id` / `client_secret` / `tenant_id` / `use_oidc` / `use_cli` options are set anywhere, so Terraform falls back to its default credential chain: `az login` (CLI), managed identity, or `ARM_*` env vars. This is acceptable for local workflows but would need explicit SP / OIDC config for a CI pipeline.

### Provisioned-resource auth

- **ACR admin user**: `admin_enabled = true` — registry exposes a username/password. The Container App uses this admin credential in its `registry` block rather than a managed identity / RBAC role assignment. This is operationally simple but leaks secrets into Terraform state and plan output (see patterns).

## Config surface

- **`environments/{env}/{env}.tfvars`** — per-env location, RG name, environment_name, subscription_id
- **`variables.tf`** (root) — `subscription_id` with hardcoded default
- **`.terraform.lock.hcl`** — azurerm 3.111.0 pin
- **No `backend` block anywhere** — Terraform state persists locally as `terraform.tfstate` next to the env `main.tf`. `.gitignore` excludes state files, meaning state is *completely ephemeral* unless the operator manually moves it somewhere durable. This is a severe operational gap for prod (see patterns + summary).
- **No `.env`, no `appsettings`, no MCP configuration** — none of those apply.

## Deployment / CI

- **No in-tree CI/CD.** There is no `azure-pipelines.yml`, `.github/workflows/`, or similar. The README's "Build and Test" section is empty.
- README documents a manual `terraform init / plan / apply` workflow — this appears to be the actual operational procedure.

## Summary

- **Structure:** standard Terraform two-layer (`modules/` + `environments/`), 4 modules, 3 envs.
- **No backing pipeline, no remote state, no telemetry wire-up.** Operator-driven from a workstation.
- **Single workload provisioned** (Temporal container) despite a broader stated scope.
- **Integration surface is Azure-only** at Terraform time; downstream coupling to other Zoodealio repos is purely via the ACR hostname convention.
- **Key risks to carry into patterns (stage 05):** local-only state, admin credentials in state, single-subscription hardcoded default, orphaned Log Analytics, stale `:latest` image reference.
