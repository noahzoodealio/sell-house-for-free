# Zoodealio Project Docs Workspace

This is a **multi-repo reference workspace** — not a single application. It contains clones of all Zoodealio platform repositories plus BMAD AI tooling. The purpose is to:

1. Keep all projects synced and browsable in one place
2. Provide cross-project context to BMAD agents and Claude sessions
3. Scaffold new microservices that are already aware of the full ecosystem

**Do not modify code in sub-project directories and push directly** — these are reference copies. Changes should be made in the original repos. This workspace is for reading, planning, and generating.

---

## Repository Map

All repos live under Azure DevOps org `tf-offervana`, project `Offervana_SaaS`:

| Directory | Repo | Stack | Role |
|-----------|------|-------|------|
| `Offervana_SaaS/` | Offervana_SaaS | .NET 8 (ABP Zero), Angular, SQL Server, Temporal, Redis | Core SaaS platform — system of record for OffervanaDb |
| `Zoodealio.TradeInHoldings/` | Zoodealio.TradeInHoldings | .NET 10, Angular 21, PrimeNG 21, MediatR, EF Core | TIH internal ops platform (greenfield) |
| `investor-portal/` | investor-portal | .NET 10, Angular 20, PrimeNG 20, EF Core | ZIP — investor/funder portal |
| `Zoodealio.MLS/` | Zoodealio.MLS | .NET 8, Azure Functions, MediatR, Azure AI Search, Service Bus | MLS data service (comps, listings) |
| `Zoodealio.Chat/` | Zoodealio.Chat | Python, Chainlit, OpenAI Agents, Temporal | AI chat assistant for homeowners/agents |
| `Zoodealio.Shared/` | Zoodealio.Shared | .NET 8, NuGet package | Shared DTOs (offer types, iBuyer interfaces) |
| `Zoodealio.Strapi/` | Zoodealio.Strapi | Strapi 5, Node.js, TypeScript | CMS for marketing content |
| `Zoodealio.Infrastructure/` | Zoodealio.Infrastructure | Terraform, Azure | IaC — ACR, Container Apps, Log Analytics |
| `_bmad/` | (local) | BMAD framework | AI agent definitions, workflows, templates |

---

## Dependency Graph

```
                    ┌──────────────────┐
                    │   OffervanaDb     │  (SQL Server - single source of truth)
                    │  Offervana_SaaS   │  (only writer)
                    └──────┬───────────┘
                           │ read-only
              ┌────────────┼────────────┐
              ▼            ▼            ▼
    ┌─────────────┐ ┌───────────┐ ┌──────────┐
    │ TradeIn     │ │ investor- │ │ Zoodealio│
    │ Holdings    │ │ portal    │ │ .MLS     │
    │ (LegacyData)│ │(LegacyData│ │          │
    └──────┬──────┘ └─────┬─────┘ └──────────┘
           │              │
           │  bidirectional API
           └──────────────┘
              TIH ↔ ZIP

    Zoodealio.Chat ──REST──▶ Offervana_SaaS APIs
    Zoodealio.Shared ──NuGet──▶ Offervana.Core
    Zoodealio.Strapi ──content API──▶ Marketing frontend
    Zoodealio.Infrastructure ──Terraform──▶ Azure resources
```

---

## Shared Architecture Patterns

When creating new services or reviewing existing ones, these are the established conventions:

### Backend (.NET)

- **Two-database pattern**: Every service that needs Offervana data has its own DB context + a read-only `OffervanaDbContext` via a `LegacyData` project
- **New DB → DI Services**: `public class MyService(MyDbContext context, IMapper mapper) : IMyService`
- **Legacy DB → MediatR CQRS**: `public record GetDataQuery(int Id) : IRequest<Dto>`
- **Layered project structure**: `Api / Application / Domain / Infrastructure / LegacyData / Integrations`
- **AutoMapper** for DTO mapping
- **JWT Bearer auth** on all APIs
- **Azure Blob Storage** for file handling
- **SendGrid** for email via `Integrations/` project
- **Temporal.io** for durable workflows (present in Offervana, Chat, MLS)

### Frontend (Angular)

- **Standalone components only** — no NgModules
- **inject()** function for DI, not constructor injection
- **OnPush** change detection on all components
- **PrimeNG** for UI components
- Private members prefixed with `_`
- Feature-based module structure under `src/app/modules/`

### Infrastructure

- **Docker** — multi-stage builds, Azure Container Apps deployment
- **Azure Container Registry** — `devzoodealioacr.azurecr.io`
- **Terraform** — modular, per-environment tfvars (`dev/`, `uat/`, `prod/`)

---

## Offer Type Domain Model

These offer types flow across the entire platform. They are defined in `Zoodealio.Shared`, created in `Offervana_SaaS`, displayed in `TradeInHoldings` and `investor-portal`, and explained by `Zoodealio.Chat`:

| Offer Type | DTO | Description |
|------------|-----|-------------|
| Cash | `CashOfferTypeDto` | Simple cash purchase |
| Cash+ | `CashOfferPlusTypeDto` | Two-payout: immediate cash + holdback paid at resale |
| Cash+ with Repairs | `FixListTypeDto` | Cash+ with repair escrow, handled by Hola Home Constructions |
| Sell Leaseback | `SellLeasebackTypeDto` | Seller stays in home post-sale |
| List on Market | `ListOnMarketTypeDto` | Traditional listing option |
| Cash Buyer | `CashBuyerTypeDto` | Direct cash buyer variant |

---

## BMAD Framework (`_bmad/`)

### Structure

- `_bmad/bmm/` — **BMAD Method**: agents, workflows, and templates for the full dev lifecycle
- `_bmad/bmb/` — **BMAD Builder**: meta-workflows for building new agents, modules, and workflows
- `_bmad/_memory/` — Persistent agent memory (documentation standards, etc.)

### Agents (`_bmad/bmm/agents/`)

| Agent | File | Role |
|-------|------|------|
| Analyst | `analyst.md` | Requirements analysis, research, documentation |
| Architect | `architect.md` | Architecture design, technical decisions |
| Dev | `dev.md` | Story implementation, coding |
| PM | `pm.md` | PRD creation, epic/story management |
| SM | `sm.md` | Sprint planning, status, retrospectives |
| QA | `qa.md` | Test automation |
| Tech Writer | `tech-writer/tech-writer.md` | Documentation, diagrams, standards |
| UX Designer | `ux-designer.md` | UX design critique and creation |
| Quick-Flow Solo Dev | `quick-flow-solo-dev.md` | Rapid one-off tasks without full planning |

### Key Workflows (in phase order)

| Phase | Workflow | Code | Command |
|-------|----------|------|---------|
| 1-Analysis | Brainstorm Project | BP | `bmad-brainstorming` |
| 1-Analysis | Create Brief | CB | `bmad-bmm-create-product-brief` |
| 1-Analysis | Research (Market/Domain/Tech) | MR/DR/TR | `bmad-bmm-*-research` |
| 2-Planning | Create PRD | CP | `bmad-bmm-create-prd` |
| 2-Planning | Create UX | CU | `bmad-bmm-create-ux-design` |
| 3-Solutioning | Create Architecture | CA | `bmad-bmm-create-architecture` |
| 3-Solutioning | Create Epics & Stories | CE | `bmad-bmm-create-epics-and-stories` |
| 3-Solutioning | Check Implementation Readiness | IR | `bmad-bmm-check-implementation-readiness` |
| 4-Implementation | Sprint Planning | SP | `bmad-bmm-sprint-planning` |
| 4-Implementation | Create Story → Dev Story → Code Review | CS/DS/CR | `bmad-bmm-create-story` / `dev-story` / `code-review` |
| Anytime | Document Project | DP | `bmad-bmm-document-project` |
| Anytime | Generate Project Context | GPC | `bmad-bmm-generate-project-context` |
| Anytime | Quick Spec / Quick Dev | QS/QD | `bmad-bmm-quick-spec` / `quick-dev` |
| Anytime | Correct Course | CC | `bmad-bmm-correct-course` |

### Zoodealio-Specific Commands (in `Offervana_SaaS/.claude/commands/`)

- `bmad-zoo-dev-story` / `bmad-zoo-dev-bug` — Zoo-contextualized dev workflows
- `bmad-zoo-create-story` / `bmad-zoo-create-epic` / `bmad-zoo-create-bug` — Zoo ticket creation
- `bmad-zoo-review` — Zoo code review
- `bmad-agent-zoo-dev` / `zoo-pm` / `zoo-reviewer` — Zoo-specific agent personas

---

## How to Use This Workspace

### Sync all repos
```bash
for dir in Offervana_SaaS Zoodealio.TradeInHoldings investor-portal Zoodealio.MLS Zoodealio.Chat Zoodealio.Shared Zoodealio.Strapi Zoodealio.Infrastructure; do
  echo "=== Pulling $dir ===" && git -C "$dir" pull --ff-only
done
```

### Feed context to a BMAD session
When starting a BMAD workflow in a specific project repo, point it here for ecosystem context:
- Read this CLAUDE.md for the full map
- Read `Zoodealio.TradeInHoldings/ARCHITECTURE_OVERVIEW.md` + `BACKEND_GUIDELINES.md` + `FRONTEND_GUIDELINES.md` as the pattern reference (best-documented project)
- Read `Zoodealio.Shared/` DTOs to understand the domain model
- Read `Zoodealio.TradeInHoldings/_bmad-output/planning-artifacts/prd.md` as an example of a complete BMAD-generated PRD

### Scaffold a new microservice
1. Use `bmad-bmm-create-prd` with context from this workspace to write the PRD
2. Use `bmad-bmm-create-architecture` — reference the shared patterns above
3. Copy the TIH project structure as the template (6-project .NET solution + Angular SPA)
4. Add Terraform module in `Zoodealio.Infrastructure/modules/` for the new service
5. Add BMAD commands from `Offervana_SaaS/.claude/commands/` adapted for the new service

### Reference documentation quality bar
`Zoodealio.TradeInHoldings` is the gold standard for project documentation. New projects should aim for the same level:
- `ARCHITECTURE_OVERVIEW.md` — high-level structure and patterns
- `BACKEND_GUIDELINES.md` — detailed backend implementation guide with code examples
- `FRONTEND_GUIDELINES.md` — detailed frontend patterns with code examples
- `PROJECT_README.md` — quick start / setup guide
- `_bmad-output/planning-artifacts/prd.md` — complete PRD

---

## Glossary

| Term | Meaning |
|------|---------|
| AVM | Automated Valuation Model — algorithmic property price estimate |
| BLAST | Zoodealio's property data API suite (AVM, comps, rental estimates, trends) |
| Cash+ | Two-payout offer: cash now + holdback paid after resale |
| First Closing | Buyer (TIH) purchases from seller |
| Second Closing | Buyer (TIH) resells the property |
| Holdback | Portion of purchase price held until Second Closing |
| Upside | Seller's share of profit above holdback at Second Closing |
| iBuyer | Institutional buyer / investor making offers through the platform |
| TIH | Trade In Holdings — largest investor on the Zoodealio platform |
| ZIP | Zoodealio Investor Portal (`investor-portal` repo) |
| ABP / ABP Zero | ASP.NET Boilerplate framework used by Offervana_SaaS |
| Hola Home | Hola Home Constructions — TIH's repair/renovation partner |
| RealValue | Property valuation model used in TIH underwriting |
