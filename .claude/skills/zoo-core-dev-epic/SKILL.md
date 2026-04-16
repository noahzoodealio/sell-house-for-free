---
name: zoo-core-dev-epic
description: Full orchestrator that autopilots through an ADO Epic by chaining dev-story + unit-testing + code-review per child story. Use when the user requests 'dev epic' or runs '/zoo-core-dev-epic'.
---

# Zoo-Core Dev Epic

## Overview

End-to-end execution of an ADO Epic. Loads the Epic + child stories, analyzes dependencies, builds an execution plan, then autopilots through each story's full dev cycle (`zoo-core-dev-story` → `zoo-core-unit-testing` → `zoo-core-code-review`) with context compaction between stories. A 3-strike rule on the outer review loop prevents infinite retries.

The most complex orchestrator. Takes hours to days to fully complete. Designed for resume after compaction via the sidecar.

Act as a disciplined dev lead — explicit execution plan, autopilot after confirmation, flag blockers early, honor the 3-strike rule.

## On Activation

Load config from `{project-root}/_bmad/config.yaml` (`zoo-core` section). **Preflight:** invoke `zoo-core-onboard` (auto-trigger — handles pending installs + first-time setup silently). Verify Git CLI + ADO MCP.

## Inputs

- **ADO Epic ID** (required)
- **Target service** (inferred from the Epic's child stories; confirm if ambiguous)

## Outputs

Files in `{output_folder}/dev-working/epic-{epic-id}/`:

- `epic-plan.md` — the execution plan (source of truth, survives compaction)
- `per-story/` — subdirectory per story with its sidecar + artifacts
- `summary-report.md` — final report after all stories complete

Plus: code committed to per-story branches + ADO Epic/Story statuses updated.

## Workflow

Five steps. Plan-mode task dashboard visible throughout: **Load → Plan → Autopilot → Compact → Summary**.

1. **Load epic + all child stories from ADO** — via MCP. Pull Epic description, Acceptance Criteria, and every child Story (or Bug) with its ACs. Write to `epic-plan.md` draft.
2. **Analyze dependencies + build execution plan** — for each story:
   - Identify which other stories it depends on (explicit ADO links, implicit data-flow dependencies)
   - Order stories topologically, breaking ties by risk (higher-risk first so blockers surface early)
   - Assign a strike-count tracker (starts at 0)
   - Present `epic-plan.md` for user confirmation. **Autopilot begins only after user approves this plan.**
3. **Autopilot loop** — for each story in order:
   - Invoke `zoo-core-dev-story` with the story ID; it runs through its own plan-mode dashboard to close-out
   - Invoke `zoo-core-unit-testing` against the branch; if tests fail after unit-testing's 3-iteration loop, increment the story's strike count + halt the outer loop to surface the failure for user decision
   - Invoke `zoo-core-code-review`; if verdict is `fail`, increment strike count + loop back to dev-story for fixes. If `pass-with-issues`, proceed but record the issues. If `pass`, close out the story.
   - **3-strike rule:** if the story's strike count reaches 3 on the outer review loop, halt and surface to user. Do not silently keep retrying.
   - Update Epic + Story ADO statuses as each completes.
4. **Compact between stories** — after each story's close-out:
   - Preserve `epic-plan.md` + per-story summaries
   - Discard per-story working context
   - Re-enter the autopilot loop with fresh context + the sidecar as orientation
5. **Summary report** — when all stories close out (or autopilot halts for user intervention), write `summary-report.md`:
   - Per-story outcome (closed / halted / needs-user)
   - Aggregate metrics (stories completed, tests added, review findings)
   - Patterns observed during the epic (candidates for curate-memory)
   - Follow-up items surfaced

## 3-strike rule details

Applied to the **outer review loop** (`zoo-core-code-review` verdict). If review fails 3 times on the same story despite Dev's fix attempts:

- Halt the autopilot
- Surface the review report + dev-story's last plan + the 3 review verdicts to the user
- User decides: retry dev-story from scratch, skip this story (defer), or close the autopilot and take over manually

The inner `zoo-core-unit-testing` loop has its own 3-iteration fix cap — separate from the outer review strike rule.

## EF migration halt

If any story generates EF migrations during dev-story, the story's flow halts for user application confirmation (inherited from dev-story's own rule). Autopilot doesn't continue until the user confirms migration application. This is **not** a strike — just a pause for safety.

## Sidecar survival

`{output_folder}/dev-working/epic-{epic-id}/epic-plan.md` is the source of truth. Additional per-story sidecars at `{output_folder}/dev-working/{story-id}/` are managed by `zoo-core-dev-story` itself. The Epic-level sidecar references per-story sidecars + tracks progress:

```yaml
---
epic-id: {id}
target-service: {service-name}
stories-planned: [{id, depends-on, strike-count, status}]
stories-completed: [{id, outcome, closed-at}]
autopilot-status: {planning|running|halted|complete}
started-at: {ISO}
---
```

## Related Skills

- Chains: `zoo-core-dev-story` + `zoo-core-unit-testing` + `zoo-core-code-review` per story; `zoo-core-dev-bug` for child Bugs
- Invokes: Dev agent, QA agent
- Called by: Lead, user direct
