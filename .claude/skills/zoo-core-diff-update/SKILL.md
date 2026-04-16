---
name: zoo-core-diff-update
description: Incrementally updates the 5 service knowledge files from git diffs since the last-indexed SHA. Use when the user requests to 'diff update' a service, runs '/zoo-core-diff-update', or as part of the maintainer sync cycle.
---

# Zoo-Core Diff Update

## Overview

Maintainer-cycle counterpart to `zoo-core-full-index`. Given a service with an existing index, computes what changed in the reference repo since the last-indexed commit SHA, surgically amends only the sections of the 5 knowledge files affected by those changes, appends a distilled "what changed and why it matters to agents" entry to `curated/recent-changes.md`, and bumps `staleness.md` with the new SHA.

Preserves unchanged content. No artifact is rewritten wholesale.

Act as a careful editor — make the minimum change that captures the diff correctly, and surface anything surprising for the user to confirm.

## Activation Guard — Maintainer Mode Only

Writes to the authoritative shared memory source at `{project-root}/src/modules/zoo-core/zoo-core-setup/assets/memory-scaffolding/`, which lives only in the zoo-core source repo. If invoked in a consumer workspace, halt with:

> This workflow only runs in the zoo-core source repo. It updates authoritative shared memory that propagates to consumer installs via re-install. Run it here, commit, then reinstall zoo-core to consumers.

Detect by checking both `{project-root}/src/modules/zoo-core/zoo-core-setup/assets/memory-scaffolding/` and `{project-root}/src/modules/zoo-core/module.yaml` exist.

## On Activation

Load config from `{project-root}/_bmad/config.yaml` (`zoo-core` section). If missing, note that `zoo-core-setup` can configure; continue with defaults.

**Preflight:** invoke `zoo-core-onboard` (auto-trigger — handles pending installs + first-time setup silently), then resume.

## Inputs

- **Service name** (optional) — if not provided, read `{project-root}/src/modules/zoo-core/zoo-core-setup/assets/memory-scaffolding/staleness.md` and offer services sorted oldest-indexed-first. Also accept "all" to iterate every service.
- **Resume** — if a sidecar exists for this service, offer to resume from the last completed stage.

## Outputs

**Authoritative source (written at finalize after user approval):**

- Amended `{project-root}/src/modules/zoo-core/zoo-core-setup/assets/memory-scaffolding/services/{service-name}/*.md` — only the sections actually affected by diffs; unchanged sections preserved byte-for-byte
- Appended entry in `{project-root}/src/modules/zoo-core/zoo-core-setup/assets/memory-scaffolding/curated/recent-changes.md`
- Updated `{project-root}/src/modules/zoo-core/zoo-core-setup/assets/memory-scaffolding/staleness.md` — new SHA + timestamp for this service
- Updated `{project-root}/src/modules/zoo-core/zoo-core-setup/assets/memory-scaffolding/index.md` — only if the summary changed meaningfully

**Sidecar:** `{output_folder}/diff-update-working/{service-name}/`

## Workflow

Three sequential stages. Each stage writes to the sidecar and updates `last-completed-stage` before moving on.

1. `references/stage-01-scope.md` — resolve repo path, read prior SHA from staleness.md, compute git diff, categorize changed files by which artifacts they affect
2. `references/stage-02-amend.md` — surgically update only the affected sections of each affected artifact
3. `references/stage-03-finalize.md` — draft `recent-changes.md` entry, present everything for review, write to authoritative source + update staleness.md

**Sidecar survival contract.** Sidecar `index.md` tracks `service-name`, `prior-sha`, `new-sha`, `changed-files`, `affected-artifacts`, `last-completed-stage`. Any stage can recover state from the sidecar.

## Special cases

- **No prior index for the service** — diff-update is the wrong tool; redirect user to `zoo-core-full-index`.
- **Prior SHA no longer in git history** (force-push, squash) — offer to treat as a fresh full index OR compute diff against whatever common ancestor exists. Prefer to flag for user decision rather than silently guess.
- **No diffs since prior SHA** — inform the user, do nothing, do not bump staleness unless user explicitly wants the timestamp refreshed.
- **Dirty working tree in target repo** — warn; offer to proceed against HEAD-as-is, stash-and-proceed, or abort.

## Next Steps

After finalize, recommend `zoo-core-curate-memory` (maintainer mode) when `curated/recent-changes.md` has accumulated enough entries to warrant folding into `patterns.md`. Remind the user to commit + reinstall to consumers.

## Related Skills

- `zoo-core-full-index` — use instead if the service has no prior index
- `zoo-core-curate-memory` — natural follow-up when recent-changes is full
- `zoo-core-onboard` — prerequisite; must have resolved repo paths
