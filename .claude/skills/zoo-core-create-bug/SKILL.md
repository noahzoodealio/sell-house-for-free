---
name: zoo-core-create-bug
description: Documents a bug with data-flow tracing and reproduction steps referencing real APIs. Use when the user requests 'create bug', runs '/zoo-core-create-bug', or when investigating a reported issue.
---

# Zoo-Core Create Bug

## Overview

Drafts and files an ADO Bug work item with targeted ecosystem context — primary service identified, lightweight dependency tracing, reproduction steps grounded in real endpoints and entities. Intentionally lighter-weight than Epic/Story creation: bugs are short-cycle and don't warrant full ecosystem research.

Act as a disciplined bug filer — concrete repro, precise severity, focused context (not exhaustive).

## On Activation

Load config from `{project-root}/_bmad/config.yaml` (`zoo-core` section). **Preflight:** invoke `zoo-core-onboard` (auto-trigger — handles pending installs + first-time setup silently). Verify ADO MCP; if unavailable, offer draft-only mode.

## Inputs

- **Bug report** — reproduction steps, expected vs actual behavior
- **Severity** — critical / high / medium / low (ask if unstated)
- **Primary affected service** (ask if unclear) — narrows context fetching
- **Environment** (optional) — dev/uat/prod; affects severity reasoning

## Outputs

- ADO Bug work item
- `{output_folder}/bug-working/{bug-slug}/` — sidecar

## Workflow

Four steps. Lightweight — no continuation mode (bugs are short-cycle).

1. **Gather bug details** — repro steps, expected/actual, severity, environment. Confirm with user before proceeding.
2. **Lightweight data-flow trace** — identify the primary service + immediate dependencies only (not full ecosystem). Use `zoo-core-find-endpoint` to confirm the endpoint(s) involved, `zoo-core-show-schema` to confirm the entity shape involved. Do NOT pull general patterns or architecture docs — stay narrow.
3. **Draft ADO Bug** collaboratively — structure:
   - Title — concise, symptom-focused
   - Repro steps — exact, reproducible
   - Expected behavior
   - Actual behavior
   - Severity + environment
   - Affected service(s) + relevant endpoints/entities (cited)
   - Suspected root-cause area (if known, tentative — Dev owns the actual investigation)
   - Related work items (epics/stories/prior bugs)
4. **Push to ADO via MCP** — file; capture work item ID + URL. On draft-only mode, write to `{output_folder}/bug-working/{bug-slug}/draft.md`.

## Personal memory integration

PM reads `zoo-core-agent-pm/ado-history.md` for any approved bug-filing conventions (phrasing, tag usage). Append back if the user approves a notable phrasing.

## Sidecar

`{output_folder}/bug-working/{bug-slug}/index.md`:

```yaml
---
slug: {bug-slug}
ado-bug-id: {populated after creation}
ado-url: {populated after creation}
severity: {critical|high|medium|low}
primary-service: {service-name}
mode: {mcp|draft-only}
created-at: {ISO}
---
```

## Scope discipline

Bug creation is lightweight by design. If the investigation reveals cross-cutting issues affecting many services, offer to escalate to `zoo-core-create-epic` or `zoo-core-plan-project` — don't silently expand scope.

## Related Skills

- Called by: PM agent, Lead, user direct
- Feeds: `zoo-core-dev-bug` (Dev agent consumes this)
- Uses: `zoo-core-find-endpoint`, `zoo-core-show-schema` (narrow context only)
- Owned by: PM agent
