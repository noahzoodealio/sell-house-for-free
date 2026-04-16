---
name: zoo-core-dev-basic
description: Lightweight dev orchestrator for quick changes without ADO ceremony. Use when the user requests 'dev basic', runs '/zoo-core-dev-basic', or when Lead delegates lightweight coding work.
---

# Zoo-Core Dev Basic

## Overview

Lightweight structured dev flow for quick changes that don't warrant full ADO story ceremony — feedback adjustments, post-epic tweaks, dev-testing fixes, ad-hoc coding tasks. Scope-adaptive: trivial changes skip sidecar and most ceremony; moderate/substantial changes get the full structure. Pattern compliance is non-negotiable regardless of scope.

The simplest orchestrator, and the common delegation target when `zoo-core-agent-lead` realizes conversational work has grown past inline.

Act as a pragmatic full-stack developer — right-sized ceremony, always pattern-compliant, always flag EF migrations for user application.

## On Activation

Load config from `{project-root}/_bmad/config.yaml` (`zoo-core` section). **Preflight:** invoke `zoo-core-onboard` (auto-trigger — handles pending installs + first-time setup silently). Verify Git CLI.

## Inputs

- **Task description** — what to do (required)
- **ADO ticket ID** (optional — for context only; not required)
- **Scope assessment** — ask the user: trivial / moderate / substantial

## Outputs

- Modified files in the consumer's source tree
- Optional sidecar at `{output_folder}/dev-working/basic-{slug}/` (moderate/substantial only — trivial skips)
- Optional ADO status update (if a ticket ID was provided)
- Implementation summary

## Workflow

Six steps, scope-scaled.

1. **Capture task & assess scope** — confirm scope with user (trivial / moderate / substantial). Trivial: skip ahead to step 4 with minimal plan. Moderate/substantial: continue.
2. **Gather context inline** — for moderate/substantial: pull relevant schema/endpoint/pattern context via utility lookups. Trivial: skip.
3. **Brief plan** — concise implementation plan scaled to scope. Trivial: one or two lines. Moderate/substantial: explicit file-level plan. Present for user approval.
4. **Implement** — hand off to Dev agent (via subagent or direct invocation). Follow Zoodealio conventions for the target service exactly. **Halt on EF migrations** — present to user for application confirmation before continuing.
5. **Optional testing** — trivial: skip. Moderate: offer to run unit tests for the affected code (`zoo-core-unit-testing`). Substantial: recommend unit tests + potentially regression passes.
6. **Wrap up** — implementation summary (files changed, pattern decisions, any deviations surfaced + approved). If an ADO ticket was provided, offer to update its status. Surface any follow-up items that emerged (e.g., "this touched a stale pattern in `patterns.md` worth re-curating").

## Scope rules

- **Trivial** — No sidecar, no plan review, no tests. Still pattern-compliant. Appropriate for: 1-line fixes, typo corrections, quick copy changes, single-file config tweaks.
- **Moderate** — Brief sidecar, plan review, tests offered. Appropriate for: small feature additions (single controller + handler), bug fixes with clear repro, targeted refactors.
- **Substantial** — Full sidecar, plan review, tests recommended. Approaches `zoo-core-dev-story` weight but without ADO Story parent.

If at any point the work feels substantially bigger than the user's scope assessment, surface the escalation — offer to pause + invoke `zoo-core-dev-story` with an ADO Story instead.

## Sidecar (moderate/substantial only)

`{output_folder}/dev-working/basic-{slug}/index.md`:

```yaml
---
slug: {basic-slug}
scope: {moderate|substantial}
task: {brief description}
ado-ticket: {optional id}
files-touched: [...]
started-at: {ISO}
---
```

## Related Skills

- Invokes: Dev agent, `zoo-core-unit-testing` (optional), utility lookups
- Common caller: Lead agent (when conversational work grows past inline)
- Distinct from: `zoo-core-dev-story` (no ADO Story required), `zoo-core-dev-bug` (no formal bug file)
