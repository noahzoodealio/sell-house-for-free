# Epic Map — Sell House for Free

Sidecar for `_bmad-output/planning-artifacts/project-plan-sell-house-for-free.md`. Intended for downstream consumption by `/zoo-core-create-epic` and `/zoo-core-create-architecture`.

**Umbrella ADO Epic:** [7776 — Sell House for Free (AZ)](https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7776)

Each planning "epic" below is filed as an ADO **Feature** (child of the umbrella Epic). Stories filed by `/zoo-core-create-story` should parent to these Feature IDs.

| # | Epic | Scope | Depends on | ADO Feature |
|---|------|-------|------------|-------------|
| E1 | Site Foundation & Design System | `sell-house-for-free` | — | [7777](https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7777) |
| E2 | Core Marketing Pages + Trust Surface | `sell-house-for-free` | E1 | [7778](https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7778) |
| E3 | Seller Submission Flow (front-end) | `sell-house-for-free` | E1 | [7779](https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7779) |
| E4 | Property Data Enrichment (ATTOM + MLS) | `sell-house-for-free` BFF + Offervana_SaaS (ATTOM) + `Zoodealio.MLS` | E3 | [7780](https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7780) |
| E5 | Offervana Host-Admin Submission | `sell-house-for-free` BFF + Offervana_SaaS | E4 | [7781](https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7781) |
| E6 | Project Manager Handoff & Confirmation | `sell-house-for-free` + email | E5 | [7782](https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7782) |
| E7 | AZ Compliance & Anti-Broker Disclosure | `sell-house-for-free` | E1 | [7783](https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7783) |
| E8 | Launch Readiness | `sell-house-for-free` + `Zoodealio.Infrastructure` | E2, E5, E6, E7 | [7784](https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7784) |

**Terminology note:** ADO hierarchy is Epic → Feature → Story → Task. The BMAD planning vocabulary calls each of E1..E8 an "epic," but in ADO they're filed as **Features** under the single umbrella Epic (7776). Stories parent to the Feature IDs above, not to the umbrella Epic.

## Build order

1. E1
2. E3
3. E4
4. E5
5. E2 (parallelizable with E4/E5 if a second contributor exists)
6. E7 (parallelizable with E2)
7. E6
8. E8

## Critical path

E1 → E3 → E4 → E5 → E6 → E8

## Cross-service touchpoints (consume only — no schema changes)

- **Offervana_SaaS** — host-admin lead/property creation; ATTOM proxy for valuation + facts. ATTOM credentials live in `Offervana.Web.Host/appsettings.json` and stay there.
- **Zoodealio.MLS** — address → active listing + agent/brokerage + photos + days-on-market.
- **Zoodealio.Infrastructure** — production hosting + DNS (decision in E8).
