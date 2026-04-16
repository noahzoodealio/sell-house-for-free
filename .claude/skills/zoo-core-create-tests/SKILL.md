---
name: zoo-core-create-tests
description: Designs QA-executable ADO Test Case work items linked to stories/epics/bugs. Use when the user requests 'create tests' for human QA, runs '/zoo-core-create-tests', or when a dev orchestrator needs test-case coverage.
---

# Zoo-Core Create Tests

## Overview

Creates ADO Test Case work items for the human QA team — scripted, step-by-step scenarios with expected outcomes, linked to the parent Story / Epic / Bug. This is the **human QA** path; for automated unit tests see `zoo-core-unit-testing`.

Act as a disciplined QA planner — AC-driven coverage first, then edge cases, human-executable steps (not developer-code).

## On Activation

Load config from `{project-root}/_bmad/config.yaml` (`zoo-core` section). **Preflight:** invoke `zoo-core-onboard` (auto-trigger — handles pending installs + first-time setup silently). Verify ADO MCP; if unavailable, offer draft-only mode.

## Inputs

- **Parent work item** — ADO Story / Epic / Bug ID that these test cases will link to
- **Acceptance criteria** (parsed from the work item; also accepted as direct input if passed from a parent orchestrator)
- **Additional coverage asks** (optional) — e.g., "include cross-service integration scenarios," "cover mobile viewport"

## Outputs

- ADO Test Case work items (one per scenario), linked to the parent
- `{output_folder}/test-working/{slug}/` — sidecar with draft content + linkage records

## Workflow

Three steps.

1. **Load parent + parse ACs** — via ADO MCP or from the orchestrator handoff. Extract each acceptance criterion; flag ambiguous ACs for user clarification before generating tests.
2. **Design test scenarios** — one scenario per AC minimum; add edge-case scenarios (negative paths, boundary conditions, error states, cross-service failure modes). Per scenario:
   - Title
   - Preconditions (environment, data setup)
   - Steps (numbered, human-executable, no dev code)
   - Expected result per step (where relevant)
   - Final expected outcome
   - Test data references (if specific entities or endpoints are under test, cite them)
3. **Create Test Cases in ADO** — file each via MCP, link to parent, capture IDs + URLs. On draft-only mode, write draft test cases to sidecar for manual pasting.

## Scenario design principles

- **AC coverage first** — every AC has at least one corresponding Test Case
- **Human-executable steps** — QA team members execute by hand (or in Test Plans); steps must be clear to a non-developer
- **Cross-service integration explicit** — if the story involves cross-service calls, include a scenario that specifically exercises the cross-boundary path
- **Edge cases listed separately** — don't bury them in the happy-path scenario; separate Test Case per distinct scenario

## Personal memory integration

QA reads `{project-root}/_bmad/memory/zoo-core-agent-qa/test-patterns.md` for approved test-case templates. Reuse proven phrasing / structure when applicable. Append notable patterns back after successful user approval.

## Sidecar

`{output_folder}/test-working/{slug}/index.md`:

```yaml
---
slug: {parent-work-item-id}
parent-work-item: {id + type}
test-cases-planned: [...]
test-cases-created: [{id, url, title}]
mode: {mcp|draft-only}
started-at: {ISO}
last-completed-step: {1-3}
---
```

## Sub-skill handoff

When invoked by an orchestrator (e.g., `zoo-core-dev-story` handing off to create-tests), accept the parent's context directly rather than re-fetching from ADO. The orchestrator passes: parent work item, ACs, and any implementation specifics the QA should be aware of.

## Related Skills

- Called by: `zoo-core-dev-story`, `zoo-core-dev-bug`, `zoo-core-dev-epic`, QA agent, user direct
- Complement: `zoo-core-unit-testing` (automated; this workflow covers human QA)
- Owned by: QA agent
