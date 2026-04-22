---
slug: e4-s11-s12-s13
mode: bulk
parent-epic-id: 7780
stories-planned:
  - E4-S11 — ATTOM client + two-source merge (M, deps: none)
  - E4-S12 — Plain-English MLS status display + active-status gating (S, deps: none)
  - E4-S13 — Agent-involvement question (M, deps: S12)
stories-created:
  - { id: 7882, url: "https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7882", title: "E4-S11 — ATTOM property-data client + MLS/ATTOM two-source merge" }
  - { id: 7883, url: "https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7883", title: "E4-S12 — Plain-English MLS listing-status display + active-status gating" }
  - { id: 7884, url: "https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7884", title: "E4-S13 — Do you currently have an agent on this sale? question, gated to active MLS statuses" }
mode-ado: mcp
started-at: 2026-04-22
last-completed-step: 5
---

# E4 follow-up stories — ATTOM wiring + MLS status conversation

Closes the gap between what E4 shipped (MLS-only pre-fill with basic listed-notice) and what the funnel needs next:

1. **S11** — wire ATTOM as a gap-fill source now that the key is in `.env.local`
2. **S12** — extend listing-status display to plain English, narrowed to active MLS statuses only (Active / ActiveUnderContract / ComingSoon / Pending)
3. **S13** — add the "do you have an agent on this sale?" question, gated to the same status set

## Product clarifications (from user, 2026-04-22)

- Status copy: plain English ("currently listed", "coming soon", "listed, currently under contract")
- Gate for both status banner AND agent question: MLS record present AND status ∈ {Active, ActiveUnderContract, ComingSoon, Pending}. Closed/Expired/Withdrawn/Cancelled → no banner, no question.
- ATTOM + MLS are both used — MLS wins per-field when present, ATTOM fills undefined fields.
- ATTOM key sourced from Offervana_SaaS appsettings: `9e76951eeb6aca89bd51ea5e2885f03c`; base `https://api.gateway.attomdata.com/propertyapi/v1.0.0`.
- MLS base URL aligned with TIH: `https://zoodealio-mls-api.azurewebsites.net/`. Unauthenticated (TIH pattern).
