---
name: zoo-core-pr-triage
description: Orchestrator for loading PR comments (CodeRabbit + human), assessing each against code, implementing approved changes, and posting responses. Use when the user requests 'pr triage' or runs '/zoo-core-pr-triage'.
---

# Zoo-Core PR Triage

## Overview

Load an ADO PR (or GitHub PR via `gh`), fetch all review comments (CodeRabbit and human), assess each comment against the actual code, present grouped findings for user approval, implement approved changes, post per-thread responses back to the PR. Does **not** commit — the developer reviews and commits.

Handles large PRs with batching and compaction. Distinguishes CodeRabbit style/pattern comments from human semantic comments.

Act as a careful PR reviewer assistant — verdict per comment grounded in the code, never mass-approve, developer controls commit.

## On Activation

Load config from `{project-root}/_bmad/config.yaml` (`zoo-core` section). **Preflight:** invoke `zoo-core-onboard` (auto-trigger — handles pending installs + first-time setup silently). Verify ADO MCP. Verify GitHub CLI (`gh`) if the PR has a GitHub origin.

## Inputs

- **PR ID or URL** — ADO PR ID or full GitHub PR URL (required)
- **Scope** (optional) — all comments (default) or a subset (e.g., unresolved-only)

## Outputs

Files in `{output_folder}/triage-working/pr-{pr-id}/`:

- `pr-comments.md` — all fetched comments with thread structure
- `triage-assessment.md` — verdicts per comment
- `implementation-log.md` — changes applied

Plus: files modified in the working tree (**uncommitted**) + ADO PR comment responses posted.

## Workflow

Plan-mode task dashboard: **Load Comments → Triage → User Review → Implement → Respond**.

1. **Fetch PR + comments** — via ADO MCP (or `gh` for GitHub-origin PRs). Validate current branch matches the PR branch (warn if not). Write `pr-comments.md` preserving thread structure (parent + replies). If > 30 comments, chunk into batches by file for step 2.
2. **Assess each comment against code** — for each comment:
   - Read the cited file + line range
   - Classify: **style/pattern** (CodeRabbit-flavor) vs **semantic** (human-flavor — architecture, behavior, test coverage)
   - Produce a **verdict**: `apply-as-suggested` / `apply-with-modification` / `reject-with-rationale` / `needs-user-input`
   - Capture the proposed code change (for apply verdicts) or rationale (for reject/needs-input)
   Write `triage-assessment.md` grouped by file, comments-in-file sorted by line.
3. **User review** — present triage grouped by file. For each group:
   - Show the comments + verdicts
   - User approves / rejects / revises per verdict
   - Batching: large PRs may need multiple review rounds (compaction between batches)
4. **Implement approved changes** — edit files per the approved plan. **Do NOT commit** — leave changes in the working tree. Update `implementation-log.md` per file as changes are applied.
5. **Post responses to PR threads** — per comment, post an ADO comment reply (or `gh` reply) with:
   - "Applied" + brief summary of the change (for apply verdicts)
   - "Will address in follow-up" + rationale (for deferred)
   - "Disagree — [rationale]" (for reject verdicts; confirm with user before posting these)

## Commit boundary

**No commits in this workflow.** The developer reviews the uncommitted changes + posted responses, then commits when ready. Workflow ends with uncommitted working-tree state + a summary telling the developer what was done and what to commit.

## Sidecar survival

`{output_folder}/triage-working/pr-{pr-id}/index.md`:

```yaml
---
pr-id: {id}
pr-origin: {ado|github}
pr-url: {url}
branch: {branch-name}
comment-count: {N}
batch-count: {N}    # if > 30 comments
verdicts-total: {N}
applied-count: {N}
rejected-count: {N}
last-completed-step: {1-5}
last-batch-completed: {index}
started-at: {ISO}
---
```

Compaction survives — re-read the sidecar + relevant batch file and continue.

## Related Skills

- Invokes: Dev agent (for code edits), utility lookups (for context on code that needs edits)
- Called by: Lead, user direct
- Typical follow-up: developer commits + pushes updates to the PR
