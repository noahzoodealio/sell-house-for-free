---
artifact: patterns
service: zoodealio-infrastructure
commit-sha: fe5b090b5f7cbeeedeb92501724d875ba5923539
generated-at: 2026-04-15T00:00:00Z
---

# Patterns — zoodealio-infrastructure

## Stack baseline

| Concern | Value |
|---|---|
| Language | HCL 2 (Terraform) |
| Terraform version | Not pinned (`terraform { required_version = … }` block absent) |
| Provider | `hashicorp/azurerm` **3.111.0** (pinned in `.terraform.lock.hcl`) |
| Provider features | `features {}` block only (no `resource_provider_registrations`, no `storage_use_azuread`, etc.) |
| Backend | **None configured** — state is local per-env |
| .NET / Angular / Python / Node | N/A |
| Testing framework | None (no Terratest / `kitchen-terraform` / OPA / `tflint` / `tfsec` integration in-tree) |
| Lint / format | None enforced; no `.editorconfig`, no `tflint.hcl` |

## Conventions observed (what the code actually does)

### Naming

- **Resource Terraform addresses:** kebab-case (`azurerm_container_registry.acr`, `azurerm_container_app.container-app`). Azure provider doesn't care; Terraform style guide prefers `snake_case` for addresses, but this repo consistently uses kebab.
- **Resource `name` attribute (Azure-side):**
  - RG: `{env}-zoodealio-ca-rg`
  - ACR: `{env}zoodealioacr` (hyphens stripped — Azure ACR naming rule)
  - Log Analytics: `{env}-zoodealio-log`
  - Container App Env: `{env}-zoodealio-cae`
  - Container App: `{env}-zoodealio-ca`
  - Convention: all lowercase, hyphen-separated, env-prefixed, short suffix (`-ca`, `-cae`, `-log`, `-rg`).
- **Variable names:** snake_case consistently (`resource_group_name`, `log_analytics_workspace_retention_in_days`).
- **Module output names:** mixed — `acr-name` (hyphen) sits next to `acr_id` / `acr_login_server` (snake) in the same file. No rule is enforced.
- **Environment value:** literal strings `"dev"`, `"uat"`, `"prod"` passed through as `environment_name`.

### Module style

- **Single provider inside every module.** Each of the four modules re-declares `provider "azurerm" { features {} subscription_id = var.subscription_id }`. This is the established pattern in this repo even though it's counter to HashiCorp's current module-authoring guidance (which favors inherited provider or explicit `configuration_aliases`).
- **Thin wrappers.** Each module wraps exactly one primary Azure resource (except `container-app` which bundles CAE + CA + a call to the Log Analytics sub-module). No business logic, no `locals`, no computed names beyond the env prefix.
- **Subscription ID threaded explicitly.** Every module requires `subscription_id` as a variable, even though the root already configures the provider. This is redundant given how the provider blocks are set up, but consistent.

### Environment style

- **Three copies of the same `main.tf`.** No DRY extraction via a shared root module / workspaces / tfvars-only approach — environments are literal copy-paste.
- **Tfvars per env.** `dev.tfvars`, `uat.tfvars`, `prod.tfvars` carry only 4 values apiece.
- **No `terraform.tfvars` auto-load file.** Callers must pass `-var-file="{env}.tfvars"` explicitly (matches README).
- **`outputs.tf` present only in `dev/`, and it is empty.** uat/prod don't have the file at all.

### Secret handling

- **ACR admin credentials are surfaced as non-sensitive outputs** and plumbed through module variables as plain strings. In plan/apply logs and in state, these appear in plaintext. 🚨
- **Container App secret wiring:** the admin password is stored in a named `secret { name = "acr-password" }` on the container app — correct at the Azure side, but the input that feeds it is already in state/plan unredacted.
- **No `sensitive = true`** on any variable or output anywhere in the repo.

### Resource composition

- Composition happens at the environment layer (`environments/{env}/main.tf` calls three modules). No single "infra" root module below the env layer.
- **Nested module call:** `modules/container-app` calls `modules/log-analytics-workspace` as `source = "../log-analytics-workspace"`. This is the only nested module call in the repo.
- **No `depends_on`** declarations anywhere; ordering is implicit through references (and there is exactly one reference edge — container-app → container-app-env).

### Image references

- Container image is referenced by `:latest` tag: `"${module.acr.acr_login_server}/zoodealiotemporal:latest"`. Terraform will not detect image updates; redeployment requires tag changes or explicit `terraform taint` / revision trigger.

## Deviations from the Zoodealio / community baseline

These are worth flagging explicitly so the Dev/Architect agents don't treat this repo as a model for new IaC work:

1. **No remote backend.** State is local, per-environment folder. Collaboration on the same env would overwrite state; prod state survives only on one machine. **High-severity operational gap.**
2. **No `terraform { required_version }` block.** Different operators' Terraform CLI versions can silently produce different plans.
3. **Admin credentials unredacted in outputs/variables.** Should be `sensitive = true` at minimum; better still, switch ACR auth to AcrPull managed identity on the Container App.
4. **`admin_enabled = true` on ACR.** Widely considered a hardening red flag — managed identity is preferred.
5. **Byte-identical `main.tf` per environment.** Usual pattern is to either (a) share a single root module and call it from env folders with different tfvars, or (b) use Terraform workspaces. This repo duplicates.
6. **Provider blocks inside child modules.** Non-idiomatic; callers lose control over provider configuration aliases.
7. **Filename typo** `modules/acr/maint.tf`. Works, but invisible footgun if someone later writes a separate `main.tf`.
8. **Orphaned Log Analytics Workspace.** Created but not wired to the Container App Environment (`log_analytics_workspace_id` not set). Cost without benefit.
9. **Log Analytics SKU commented out in two places** — the variable and the resource attribute. Resource silently uses the provider default (`PerGB2018`).
10. **Subscription ID hardcoded as a default** in root `variables.tf`. An operator running `terraform plan` without a var override will always target the dev subscription, including from the prod folder. Safer to remove the default and require explicit pass-in.
11. **Prod and dev have identical SKU choices** (`"Basic"` ACR, 30-day log retention). Prod likely warrants higher-SKU ACR (Premium — needed for geo-replication and private endpoints) and longer retention.
12. **Dead/commented code** (log-analytics sku, container-app location) hasn't been cleaned up — inconsistent with a mature repo.
13. **No `tflint`, `tfsec`, `checkov`, or `terraform fmt` enforcement.** None is wired into CI (there is no CI).

## What is *not* here (and would be expected in a mature IaC repo)

- Remote state backend (`azurerm` / `storage_account` backend)
- State locking
- Service Principal / OIDC federation config for CI
- Per-env CI/CD pipeline (Azure DevOps or GitHub Actions)
- `tflint` / `tfsec` / `checkov` preflight
- Module versioning / release tags
- Key Vault integration for admin secrets
- Diagnostic settings wired from resources → Log Analytics
- Resource tagging (no `tags = {}` blocks anywhere)
- Terraform `required_version` pin

Absence of these should be reported as a gap, not inferred as intentional.

## Summary

- **Stack:** Terraform + azurerm 3.111.0. No other tools, no CI, no tests, no linting.
- **Conventions are minimal but consistent:** kebab-case Azure names, snake_case variables, env-prefix everywhere, tfvars per env.
- **13 deviations from baseline** catalogued above — most notable are local state, unredacted admin credentials, and byte-identical env folders.
- Treat this repo as an **early-stage IaC sketch**, not a pattern source for new Zoodealio modules.
