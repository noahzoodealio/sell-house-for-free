---
name: zoo-core-create-story
description: Decomposes an Epic into dev-ready ADO User Stories with ACs referencing real schemas and APIs. Use when the user requests 'create story', runs '/zoo-core-create-story', or when plan-project needs stories filed.
---

# Zoo-Core Create Story

## Overview

Creates ADO User Stories from an Epic or standalone feature scope. Supports two modes:

- **Single** — one story, focused attention, full detail
- **Bulk** — decompose an Epic into multiple stories with TODO tracking and per-story compaction

Each story's acceptance criteria reference real Zoodealio schemas, endpoints, and patterns (not generic placeholders), so the Dev agent can implement without follow-up clarification.

Act as a disciplined product manager — testable ACs, ecosystem grounding, zero ambiguity.

## On Activation

Load config from `{project-root}/_bmad/config.yaml` (`zoo-core` section). **Preflight:** invoke `zoo-core-onboard` (auto-trigger — handles pending installs + first-time setup silently). Verify ADO MCP (`enable_ado_mcp`); if unavailable, offer draft-only mode.

## Inputs

- **Mode** — single or bulk (ask if not specified)
- **Parent Epic ID** (for Epic-scoped stories) OR **feature scope** (for standalone)
- **Upstream architecture doc** (optional) — typically from `zoo-core-create-architecture`

## Outputs

- ADO User Story work items (one per story created)
- `{output_folder}/story-working/{slug}/` — sidecar

## Workflow

Five steps.

1. **Intake** — Epic or standalone scope; confirm mode with user.
2. **Research affected services** — pull relevant schemas, endpoints, patterns into story context via utility workflows.
3. **Plan stories** — for bulk mode: draft a story list with TODOs + dependencies + suggested order; for single: skip to step 4 directly.
4. **Draft story** — per story:
   - Title (user-story format: "As X, I want Y so that Z")
   - Description — problem + proposed approach + affected services
   - Acceptance criteria — concrete, testable, referencing real entities/endpoints
   - Technical notes — pattern decisions, integration contracts, cross-service touchpoints
   - Tasks (if the team uses sub-tasks)
   - Tags / area / iteration / parent Epic link
5. **Push to ADO** — file via MCP; capture work item ID + URL. On bulk mode, loop step 4-5 per story with compaction between stories to keep context manageable. On draft-only mode, write drafts to `{output_folder}/story-working/{slug}/stories/*.md`.

## Bulk-mode compaction

Between stories, compact context:

- Preserve the Epic summary + architecture doc reference + story list TODOs
- Discard per-story research details once the story is filed
- Re-gather targeted context for each story as it's drafted

## Personal memory integration

PM reads `zoo-core-agent-pm/ado-history.md` for approved phrasing patterns. After successful ADO filing with user approval, optionally append notable patterns back.

## Sidecar

`{output_folder}/story-working/{slug}/index.md`:

```yaml
---
slug: {story or epic-slug}
mode: {single|bulk}
parent-epic-id: {or null}
stories-planned: [...]   # bulk mode
stories-created: [{id, url, title}]  # filled as stories are created
mode-ado: {mcp|draft-only}
started-at: {ISO}
last-completed-step: {1-5}
---
```

## Related Skills

- Called by: `zoo-core-plan-project`, PM agent, user direct
- Feeds: `zoo-core-dev-story` (Dev agent consumes these)
- Uses: utility workflows + optional `zoo-core-attom-reference`
- Owned by: PM agent
