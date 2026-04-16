---
name: zoo-core-create-architecture
description: Designs an ecosystem-aware technical solution with pattern references from real Zoodealio services. Use when the user requests 'create architecture', runs '/zoo-core-create-architecture', or when plan-project needs an architecture doc.
---

# Zoo-Core Create Architecture

## Overview

Produces a technical architecture document for a feature, grounded in Zoodealio's established patterns and citing real service examples. The Architect agent's primary workflow — PM reads the output to decompose into work items, Dev reads it during implementation.

Act as a senior technical architect — structural, precise, pattern-aware. Every integration point explicitly designed with concrete contracts, auth, and data flow. Pattern deviations justified inline.

## On Activation

Load config from `{project-root}/_bmad/config.yaml` (`zoo-core` section). **Preflight:** invoke `zoo-core-onboard` (auto-trigger — handles pending installs + first-time setup silently).

## Inputs

- **Feature description / scope** — what's being designed
- **Upstream research doc** (optional) — typically from `zoo-core-research-analysis`
- **Target services** (optional) — which services will be affected

## Outputs

- `{planning_artifacts}/architecture-{feature-slug}.md` — final architecture document
- `{output_folder}/arch-working/{feature-slug}/` — sidecar

## Workflow

Five steps. Append-only building; sidecar survives compaction.

1. **Load & scope requirements** — from upstream research doc or direct user input. Identify in-scope services; note which are authoritative (writes) vs read-only consumers.
2. **Survey existing patterns, schemas, APIs** — use `zoo-core-find-endpoint`, `zoo-core-show-schema`, `zoo-core-context-search` to pull relevant prior art. Cite every reference.
3. **Design the solution** — component layout, data flow, pattern decisions. For each pattern chosen, cite the curated/patterns.md entry or the service-specific example that justifies it. For each deviation, justify explicitly — what's different, why, what accepts the risk.
4. **Define cross-service integration contracts** — for every service boundary: endpoint(s) called, request/response shapes (cross-reference schemas + api-catalog), auth pattern, error handling, retry/backoff.
5. **Assemble final architecture document** — structure:
   - Summary (feature, affected services, pattern adherence snapshot)
   - Component diagram (ASCII or Mermaid)
   - Per-service changes
   - Integration contracts
   - Pattern decisions + deviations with rationale
   - Open questions (if any)
   - Handoff notes for PM (story boundaries suggested)

## Sidecar

`{output_folder}/arch-working/{feature-slug}/index.md`:

```yaml
---
feature: {slug}
services-in-scope: [...]
upstream-research: {path or null}
started-at: {ISO}
last-completed-step: {1-5}
---
```

## Related Skills

- Receives: `zoo-core-research-analysis` output
- Feeds: `zoo-core-create-story`, `zoo-core-create-epic`
- Uses: `zoo-core-find-endpoint`, `zoo-core-show-schema`, `zoo-core-context-search`, `zoo-core-attom-reference` (when ATTOM is involved)
- Owned by: Architect agent
