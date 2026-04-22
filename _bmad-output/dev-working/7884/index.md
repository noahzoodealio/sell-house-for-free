---
work-item-id: 7884
work-item-type: user-story
tag: E4-S13
parent-epic: 7780
repo: sell-house-for-free
branch: feature/e4-property-enrichment-7780
depends-on: [7883]
file-groups:
  - 1-schema-types             # HAS_AGENT_VALUES, HasAgent, fullSellerFormSchema.hasAgent
  - 2-mls-status-notice-agent  # agent-question radiogroup block + tests
  - 3-form-state-hidden-field  # seller-form + address-step + property-step wiring
  - 4-server-action-tests      # actions.ts hasAgent read + actions.test.ts (NEW file)
  - 5-analytics-dimension      # trackFormSubmitted(submissionId, hasAgent)
  - 6-playwright-agent-assert  # enrichment-listed.spec.ts agent question assertions
last-completed-step: 7
last-completed-file-group: 6
started-at: 2026-04-22T15:50:00Z
completed-at: 2026-04-22T16:05:00Z
outcome: closed
---

# E4-S13 — "Do you have an agent on this sale?" question

**ADO:** https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7884

See `work-item.md`, `research.md`, `implementation-plan.md`.

## One-liner

Extend `MlsStatusNotice` (from S12) with an optional agent-involvement question gated to active MLS statuses; round-trip `hasAgent` through Server Action into submission payload and analytics.
