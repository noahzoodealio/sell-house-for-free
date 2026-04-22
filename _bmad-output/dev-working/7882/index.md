---
work-item-id: 7882
work-item-type: story
parent-epic: 7780
repo: sell-house-for-free
branch: feature/e4-property-enrichment-7780
file-groups:
  - 1 types-schema
  - 2 attom-client
  - 3 normalize-merge
  - 4 service-orchestration
  - 5 route-env
last-completed-step: 7
last-completed-file-group: 5
started-at: 2026-04-22
---

# E4-S11 (7882) — ATTOM client + MLS/ATTOM two-source merge

Back-end only. Mirrors `mls-client.ts` for the new ATTOM client; rewrites `runEnrichment` to parallel-call MLS search + ATTOM profile via `Promise.allSettled` and merge with MLS-wins-per-field policy. Adds `ok-partial` envelope status when exactly one source returned usable data.

- Parent epic: 7780 (branch `feature/e4-property-enrichment-7780`) — shared epic branch per [epic-autopilot memory](../../../.claude/projects/C--Users-Noah-sell-house-for-free/memory/feedback_epic_single_branch.md).
- Scope: `src/lib/enrichment/*`, `src/app/api/enrich/route.ts`, `src/lib/seller-form/schema.ts`, `.env.example`.
