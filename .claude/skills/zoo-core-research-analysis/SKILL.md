---
name: zoo-core-research-analysis
description: Explores a problem space with cross-ecosystem evidence backing requirements discovery. Use when the user requests 'research analysis', runs '/zoo-core-research-analysis', or when plan-project needs upstream research.
---

# Zoo-Core Research & Analysis

## Overview

Produces a research document that maps a problem space using Zoodealio ecosystem context. The Analyst agent's primary workflow — Architect and PM read the output to design and decompose. Continuation-aware: an interrupted run picks up from the sidecar.

Act as a senior requirements analyst — thorough, evidence-based, trade-off oriented. Every claim grounded in a service source file or a curated pattern.

## On Activation

Load config from `{project-root}/_bmad/config.yaml` (`zoo-core` section). **Preflight:** invoke `zoo-core-onboard` (auto-trigger — handles pending installs + first-time setup silently).

## Inputs

- **Topic / problem statement** — what to research
- **Scope hints** (optional) — suspected services, domains, deadlines
- **Upstream research** (optional) — prior research doc to extend rather than start fresh

## Outputs

- `{planning_artifacts}/research-{topic-slug}.md` — the final research document
- `{output_folder}/research-working/{topic-slug}/` — sidecar with per-step working files

## Workflow

Five steps. Each writes to the sidecar before presenting for user review. Append-only building — each step adds a section, preserving prior sections so resume-after-compaction works from the sidecar alone.

1. **Capture problem statement & scope** — clarify with the user, identify in-scope services from the shared memory service list.
2. **Survey ecosystem for existing patterns** — use `zoo-core-context-search`, `zoo-core-find-endpoint`, `zoo-core-show-schema` to find what already exists that's relevant. Cite every finding.
3. **Gather & validate requirements** — translate discovered patterns + user intent into concrete requirements with cross-service impacts called out.
4. **Analyze cross-service dependencies** — for each requirement, note which services are affected, what data flows cross service boundaries, what auth is required.
5. **Assemble final research document** — produce `{planning_artifacts}/research-{topic-slug}.md` with:
   - Problem statement
   - Ecosystem findings (with citations)
   - Requirements
   - Cross-service impact map
   - Recommended next steps (typically architecture or plan-project)

## Sidecar

`{output_folder}/research-working/{topic-slug}/index.md` tracks:

```yaml
---
topic: {slug}
services-in-scope: [...]
started-at: {ISO}
last-completed-step: {1-5}
---
```

Each step writes its draft section to a step file (e.g., `02-ecosystem-survey.md`) so resume re-reads the sidecar and continues.

## Related Skills

- Feeds: `zoo-core-plan-project`, `zoo-core-create-architecture`
- Uses: `zoo-core-context-search`, `zoo-core-find-endpoint`, `zoo-core-show-schema`
- Owned by: Analyst agent
