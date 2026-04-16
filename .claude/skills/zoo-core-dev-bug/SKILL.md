---
name: zoo-core-dev-bug
description: Orchestrator for loading, investigating, and fixing an ADO Bug with root-cause tracing. Use when the user requests 'dev bug', runs '/zoo-core-dev-bug', or when dev-epic chains bug fixes.
---

# Zoo-Core Dev Bug

## Overview

Load an ADO Bug, trace data flow to identify root cause, apply a targeted surgical fix, self-review against repro + acceptance criteria, optionally file ADO Test Cases or run regression tests, update ADO. Leaner than `zoo-core-dev-story` — bugs are shorter-cycle and root-cause focused.

Act as a careful bug-fixer — root cause over symptom, surgical over sweeping, regression-aware.

## On Activation

Load config from `{project-root}/_bmad/config.yaml` (`zoo-core` section). **Preflight:** invoke `zoo-core-onboard` (auto-trigger — handles pending installs + first-time setup silently). Verify Git CLI + ADO MCP.

## Inputs

- **ADO Bug ID** (required)
- **Target repo / branch** (inferred; confirm if ambiguous)

## Outputs

Files in `{output_folder}/dev-working/{work-item-id}/`:

- `work-item.md` — bug pulled from ADO (repro steps, expected/actual, severity)
- `investigation.md` — root-cause analysis with data-flow trace
- `fix-report.md` — what changed, why, test results
- `completion-notes.md`

Plus: code on branch + ADO status updated.

## Workflow

Plan-mode task dashboard: **Investigate → Fix → Verify → Close Out**.

1. **Load bug from ADO** — parse repro steps, expected vs actual, severity, environment. Write `work-item.md`. Confirm with user.
2. **Trace data flow + root-cause investigation** — follow the request/data path through the service. Use `zoo-core-find-endpoint` to confirm involved endpoints; `zoo-core-show-schema` to confirm involved entities; `zoo-core-context-search` for cross-service paths if the bug traverses services. Identify root cause. Write `investigation.md`. Present to user — confirm the root cause is correct before fixing.
3. **Create branch + implement fix + self-review** (combined — bugs don't warrant a separate file-group plan):
   - Create branch off appropriate base
   - Apply surgical fix (only touch what's necessary to address root cause; flag tempting "while I'm here" changes as follow-up items for dev-basic)
   - Verify fix resolves the documented repro steps
   - Self-review via `zoo-core-code-review` for pattern compliance
   - **EF migrations halt** if any are generated
4. **Optional testing**:
   - Offer to create ADO Test Cases (via `zoo-core-create-tests`) capturing the fixed scenario for regression coverage in future QA cycles
   - Offer to run `zoo-core-unit-testing` for regression on the affected code
   - User chooses based on severity and risk
5. **Close out** — update ADO status, link branch/PR, write `fix-report.md` + `completion-notes.md`. Surface any patterns observed during investigation that might deserve curation (e.g., "bug was caused by a convention many services seem to misuse — consider folding into `curated/patterns.md`").

## Sidecar survival

`{output_folder}/dev-working/{work-item-id}/index.md`:

```yaml
---
work-item-id: {id}
work-item-type: bug
severity: {critical|high|medium|low}
primary-service: {service-name}
branch: {branch-name}
root-cause-identified: {true|false}
last-completed-step: {1-5}
started-at: {ISO}
---
```

## Pattern compliance + CodeRabbit

Same rules as `zoo-core-dev-story` — patterns + CodeRabbit compliance + EF migration halt apply.

## Related Skills

- Invokes: Dev agent, `zoo-core-code-review`, utility lookups, `zoo-core-create-tests` (optional), `zoo-core-unit-testing` (optional regression), `zoo-core-attom-reference` (when relevant)
- Called by: Dev agent, Lead, user direct, `zoo-core-dev-epic` (when epic contains bugs)
