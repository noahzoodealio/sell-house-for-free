---
name: zoo-core-plan-project
description: Orchestrator that produces a lightweight project plan with epic map and files the ADO Feature. Use when the user requests 'plan project', runs '/zoo-core-plan-project', or when scoping a new initiative.
---

# Zoo-Core Plan Project

## Overview

Take a project vision (greenfield or major feature set) and produce a lightweight requirements doc with an epic map, dependency graph, and development order, then push to ADO as a Feature work item. Intentionally lightweight — a MAP for downstream epic creation, not an exhaustive PRD.

Architecture happens per-epic after this workflow, not here. Research can feed in from upstream (`zoo-core-research-analysis`) but architecture is downstream.

Act as a disciplined project planner — concrete epic boundaries, clear dependency order, feature-scoped ADO container.

## On Activation

Load config from `{project-root}/_bmad/config.yaml` (`zoo-core` section). **Preflight:** invoke `zoo-core-onboard` (auto-trigger — handles pending installs + first-time setup silently). Verify ADO MCP.

## Inputs

- **Project vision / description** (required)
- **Mode** — greenfield (new service or major new domain) vs feature-set (new feature within existing services). Ask if unclear.
- **Upstream research doc** (optional) — typically from `zoo-core-research-analysis`

## Outputs

- `{planning_artifacts}/project-plan-{project-slug}.md` — requirements + epic map
- ADO Feature work item
- `{output_folder}/project-working/{project-slug}/epic-map.md` sidecar

## Workflow

Five steps.

1. **Intake & mode selection** — confirm vision, mode, any constraints; accept upstream research doc if provided.
2. **Requirements discovery** — Analyst-style, drawing from:
   - Upstream research (if provided)
   - Ecosystem knowledge (utility lookups)
   - User domain expertise (clarifying questions)
   Surface concrete requirements with cross-service impacts. Invoke Analyst agent as a subagent if the discovery requires deeper ecosystem survey.
3. **Epic mapping** — decompose requirements into candidate Epics:
   - Each Epic has a scope (which services, which capability)
   - Each Epic has a dependency (before which other Epics it must ship)
   - Propose a development order based on dependencies + risk
4. **Draft Feature document** — the project-plan.md file:
   - Project vision
   - Requirements summary
   - Epic map (title + scope + dependencies per Epic)
   - Dependency graph (ASCII or Mermaid)
   - Suggested development order with rationale
   - Open questions (if any)
5. **Create ADO Feature** — via MCP. Optionally create a new ADO backlog/area if this is a greenfield project. Attach references to research doc (if any) + the project-plan.md. Capture Feature ID + URL.

## Explicit scope boundaries

- **No architecture in this workflow.** Architecture happens per-epic after plan-project completes. Resist the temptation to design solutions; the map is enough.
- **No Story decomposition in this workflow.** Stories happen per-epic via `zoo-core-create-story` after architecture.
- **No implementation planning.** This is strategic, not tactical.

If the project-plan starts drifting into architecture or story-level detail during drafting, stop and redirect — that content belongs downstream.

## Sidecar

`{output_folder}/project-working/{project-slug}/index.md`:

```yaml
---
project-slug: {slug}
mode: {greenfield|feature-set}
upstream-research: {path or null}
epics-planned: [...]
ado-feature-id: {populated on creation}
ado-url: {populated on creation}
last-completed-step: {1-5}
started-at: {ISO}
---
```

## Continuation

Supports continuation — resume-after-compaction reads the sidecar and picks up at `last-completed-step`.

## Related Skills

- Receives upstream: `zoo-core-research-analysis`
- Feeds downstream: `zoo-core-create-epic`, `zoo-core-create-architecture` (per epic)
- Invokes: Analyst agent (subagent), PM agent (for ADO Feature filing), utility lookups
- Called by: PM, Lead, user direct
