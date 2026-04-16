---
name: zoo-core-create-epic
description: Creates an ecosystem-aware ADO Epic with cross-service impact and acceptance criteria. Use when the user requests 'create epic', runs '/zoo-core-create-epic', or when plan-project needs an Epic filed.
---

# Zoo-Core Create Epic

## Overview

Drafts and files an Azure DevOps Epic work item with Zoodealio-specific context — affected services, cross-service impacts, acceptance criteria grounded in real patterns. The PM agent's workflow; invoked by `zoo-core-plan-project` and by user directly.

Act as a disciplined product manager — crisp acceptance criteria, zero ambiguity, ecosystem impacts explicit.

## On Activation

Load config from `{project-root}/_bmad/config.yaml` (`zoo-core` section). Read `ado_organization`, `ado_project`, `enable_ado_mcp` — these are typically hardset (`tf-offervana` / `Offervana_SaaS` / `true`).

**Preflight:** invoke `zoo-core-onboard` (auto-trigger — handles pending installs + first-time setup silently). Verify ADO MCP is available per `enable_ado_mcp`. If disabled or unreachable, offer **draft-only mode** — produces the Epic content on disk without filing to ADO, user can paste later.

## Inputs

- **Feature description** or upstream architecture document
- **AC scope** — user's level of detail preference (high-level vs story-level)
- **Target iteration / area path** (optional) — defaults to the active iteration

## Outputs

- ADO Epic work item (via MCP)
- `{output_folder}/epic-working/{epic-slug}/` — sidecar with draft content + ADO response

## Workflow

Four steps.

1. **Define epic scope & affected services** — identify which Zoodealio services are affected; confirm with user if ambiguous.
2. **Research affected services** — use `zoo-core-find-endpoint`, `zoo-core-show-schema`, `zoo-core-context-search` to pull relevant context into the Epic description.
3. **Draft ADO Epic** — structured with:
   - Title (concise, action-oriented)
   - Description — problem, proposed approach, affected services
   - Acceptance criteria (Gherkin-style or given/when/then, testable)
   - Cross-service dependencies
   - Links to upstream research/architecture docs
   - Tags / area path / iteration
4. **Push to ADO via MCP** — create the Epic, capture the resulting work item ID + URL. On draft-only mode, write the draft to `{output_folder}/epic-working/{epic-slug}/draft.md` with a note telling the user how to paste.

## Personal memory integration

PM agent reads `{project-root}/_bmad/memory/zoo-core-agent-pm/ado-history.md` before drafting. If there's an approved phrasing pattern for the relevant Epic owner or feature area, prefer that phrasing. On successful file (user doesn't push back on wording), optionally append a note back to ado-history.

## Sidecar

`{output_folder}/epic-working/{epic-slug}/index.md`:

```yaml
---
slug: {epic-slug}
ado-epic-id: {assigned on creation, null while drafting}
ado-url: {populated after creation}
mode: {mcp|draft-only}
started-at: {ISO}
---
```

## Related Skills

- Called by: `zoo-core-plan-project`, PM agent, user direct
- Pairs with: `zoo-core-create-story` (Stories created under this Epic)
- Uses: `zoo-core-find-endpoint`, `zoo-core-show-schema`, `zoo-core-context-search`
- Owned by: PM agent
