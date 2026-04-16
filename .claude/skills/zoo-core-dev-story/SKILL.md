---
name: zoo-core-dev-story
description: Full orchestrator for implementing an ADO Story end-to-end with Zoodealio pattern compliance. Use when the user requests 'dev story', runs '/zoo-core-dev-story', or when dev-epic chains story execution.
---

# Zoo-Core Dev Story

## Overview

Pick up an ADO Story (or Bug, treated similarly) and drive it end-to-end: gather ecosystem context, plan implementation collaboratively in file-groups, build with compaction gates between groups, self-review against acceptance criteria, update ADO. The workhorse dev orchestrator — invoked directly by users, by Dev agent, and by `zoo-core-dev-epic` per story in an epic.

Act as a disciplined full-stack developer driving an ADO Story to PR-ready completion. Pattern-compliant at every step; CodeRabbit-compliant by close-out; EF migrations halt for user confirmation.

## On Activation

Load config from `{project-root}/_bmad/config.yaml` (`zoo-core` section). **Preflight:** invoke `zoo-core-onboard` (auto-trigger — handles pending installs + first-time setup silently). Verify Git CLI + ADO MCP.

## Inputs

- **ADO Story or Bug ID** (required)
- **Target repo / branch** (inferred from ADO work item + repo-paths resolution; confirm with user if ambiguous)

## Outputs

Files in `{output_folder}/dev-working/{work-item-id}/`:

- `work-item.md` — pulled from ADO
- `research.md` — ecosystem context
- `workspace-config.md` — repo + branch + resolved paths
- `implementation-plan.md` — collaborative plan with file-groups
- `review-report.md` — self-review vs ACs
- `completion-notes.md`

Plus: code on branch + ADO status updated.

## Workflow

Plan-mode task dashboard visible to user throughout: **Research → Plan → Implement → Testing → Self-Review → Close Out**.

1. **Load work item from ADO** — fetch title, description, ACs, linked parent (Epic), prior activity. Write `work-item.md`. Confirm with user before continuing.
2. **Gather ecosystem context** — use `zoo-core-context-search`, `zoo-core-find-endpoint`, `zoo-core-show-schema` to pull relevant patterns, endpoints, entities. Invoke `zoo-core-attom-reference` if the work touches ATTOM. Write `research.md`.
3. **Validate repo + create branch** — resolve target repo via `repo-paths.local.yaml`; validate with `validation_markers`; create a new branch off the appropriate base. Write `workspace-config.md`.
4. **Collaborative plan** — propose an implementation plan organized into **file-groups** (related files that change together). User reviews + approves before any code is written. Write `implementation-plan.md`.
5. **Implement file-group loop** — for each file-group:
   - Write / edit files in this group
   - Run compilation / linting per service conventions
   - Commit this file-group
   - **Compaction gate** — compact context before moving to the next group (preserve sidecar state, discard working context)
   - **EF migrations halt** — if this group generated EF migrations, pause for user application confirmation before committing
6. **Self-review** — verify every AC from `work-item.md` is satisfied; run `zoo-core-code-review` against the branch for pattern compliance. Write `review-report.md`. If review surfaces issues, loop back to step 5 for fixes.
7. **Close out** — update ADO status (Active → Resolved or per team workflow), link the branch/PR to the work item, write `completion-notes.md`. Surface follow-up items the user may want to address.

## Sidecar survival

`{output_folder}/dev-working/{work-item-id}/index.md`:

```yaml
---
work-item-id: {id}
work-item-type: {story|bug}
parent-epic: {optional id}
repo: {service-name}
branch: {branch-name}
file-groups: [...]
last-completed-step: {1-7}
last-completed-file-group: {index}
started-at: {ISO}
---
```

Any step can recover from the sidecar. Compaction between file-groups is expected — re-read the sidecar + current file-group spec from `implementation-plan.md`.

## Pattern compliance + CodeRabbit

- Every commit must align with `curated/patterns.md` + `services/{target-service}/patterns.md`.
- CodeRabbit compliance is a close-out requirement — `zoo-core-code-review` verifies.
- Deviations require explicit user approval, captured in `zoo-core-agent-dev/implementation-notes.md`.

## Related Skills

- Invokes: Dev agent, `zoo-core-code-review`, `zoo-core-context-search`, `zoo-core-find-endpoint`, `zoo-core-show-schema`, `zoo-core-attom-reference` (when ATTOM-touching)
- Typically followed by: `zoo-core-unit-testing`
- Called by: Dev agent, Lead, user direct, `zoo-core-dev-epic`
