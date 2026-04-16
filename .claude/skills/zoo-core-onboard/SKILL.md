---
name: zoo-core-onboard
description: Bootstraps zoo-core workspace for first-time or re-configuration. Use when a zoo-core skill's preflight check invokes it, or when user requests to 'onboard zoo-core' or runs '/zoo-core-onboard'.
---

# Zoo-Core Onboard

## Overview

Resolves a consumer's workspace so every other zoo-core skill can run without errors. Detects whether this is the zoo-core source repo (maintainer mode) or a consumer install, prompts for repo paths, scaffolds missing local shared memory shells, optionally offers initial service indexing (maintainer mode only), and writes an `.onboard-complete` marker. Idempotent — safe to re-run for reconfiguration without clobbering local state.

Two triggers, two response styles:

- **Auto-triggered** (invoked by another skill's preflight check because required files are missing) — lean mode: prompt only for what's missing, write silently, return control to the caller.
- **User-invoked** (`/zoo-core-onboard` or explicit request) — full flow regardless of existing state, followed by a brief summary of what was done.

Act as a workspace bootstrapper — idempotent, state-preserving, mode-aware.

## On Activation

**Pending-install detection (runs first, before anything else).** If `{project-root}/_bmad/zoo-core/zoo-core-setup/` exists, a fresh `npx bmad-method install` has staged module updates that haven't been applied yet. Chain into `zoo-core-setup` immediately (auto-trigger mode — setup will merge config, refresh shipped files, delete the staging, and chain back into onboard). After setup returns, onboard continues from here with the staging already cleaned up.

If staging is absent, proceed normally — this is either a first-time install (setup hasn't run yet and preflight will fail below) or a steady-state invocation (no updates pending).

Load available config from `{project-root}/_bmad/config.yaml` and `{project-root}/_bmad/config.user.yaml` (root level and `zoo-core` section). If config is missing, let the user know `zoo-core-setup` can configure the module at any time; continue with sensible defaults (prompt at runtime for values not yet set).

Detect the trigger type: if invoked programmatically by another skill's preflight check, operate in lean auto-trigger mode. Otherwise operate in full user-invoked mode.

## Mode Detection

Detect maintainer mode vs consumer mode by checking **both** sentinels:

- `{project-root}/src/modules/zoo-core/zoo-core-setup/assets/memory-scaffolding/` directory exists, **and**
- `{project-root}/_bmad-output/reports/zoo-core-rebuild-plan.md` **or** `{project-root}/src/modules/zoo-core/module.yaml` exists.

If both present → **maintainer mode** (running in the zoo-core source repo). Otherwise → **consumer mode** (module installed in a consumer workspace).

The dual-sentinel check prevents false-positive maintainer mode in consumer repos that happen to have `src/modules/zoo-core/zoo-core-setup/assets/memory-scaffolding/` for unrelated reasons.

## File Inventory

Every zoo-core install has two categories of files. Onboard's job differs per category.

**SHIPPED** (installed by `zoo-core-setup`; never created or modified by onboard):

- `{project-root}/_bmad/memory/zoo-core/index.md`
- `{project-root}/_bmad/memory/zoo-core/repo-paths.yaml`
- `{project-root}/_bmad/memory/zoo-core/repo-paths.local.example.yaml`
- `{project-root}/_bmad/memory/zoo-core/curated/patterns.md`
- `{project-root}/_bmad/memory/zoo-core/curated/recent-changes.md`
- `{project-root}/_bmad/memory/zoo-core/staleness.md`
- `{project-root}/_bmad/docs/zoo-core/` — docs tree staged by setup, published to `{project-root}/docs/` during onboard
- `{project-root}/_bmad/zoo-core-CLAUDE.md` — CLAUDE.md template staged by setup, published to `{project-root}/CLAUDE.md` during onboard

If any shipped file is missing, halt with: **"Module install incomplete — re-run `zoo-core-setup` before continuing."** Do not attempt to recreate shipped files; they belong to the module, not to onboard.

**LOCAL** (created by onboard if missing; never overwritten on re-run):

- `{project-root}/_bmad/memory/zoo-core/repo-paths.local.yaml` — written from user's answers
- `{project-root}/_bmad/memory/zoo-core/curated/user-preferences.md` — empty shell with a minimal header
- `{project-root}/_bmad/memory/zoo-core/daily/` — empty directory (populated by agents at runtime)
- `{project-root}/_bmad/memory/zoo-core-agent-pm/` — empty personal memory directory
- `{project-root}/_bmad/memory/zoo-core-agent-dev/` — empty personal memory directory
- `{project-root}/_bmad/memory/zoo-core-agent-qa/` — empty personal memory directory
- `{project-root}/_bmad/memory/zoo-core/.onboard-complete` — marker with timestamp + detected mode

**Non-negotiable:** never overwrite an existing local file. On re-run, preserve any content the user has accumulated. Only create what is missing.

## Workflow

1. **Load config + detect mode** (per sections above).
2. **Inventory files** — check every shipped and local path; categorize as present or missing.
3. **Halt on missing shipped files** with the install-incomplete message. Do not proceed.
4. **Resolve repo paths.** Read `{project-root}/_bmad/memory/zoo-core/repo-paths.yaml` for the service list (`repo_directories`) and path validation markers (`validation_markers`). Then:
   - If `repo-paths.local.yaml` exists and trigger is **auto**: read it, validate paths, and if all resolve skip to step 6. If any fail validation, prompt only for the failing services.
   - If `repo-paths.local.yaml` exists and trigger is **user-invoked**: offer to reconfigure; if user declines, preserve the existing file and skip to step 6.
   - If `repo-paths.local.yaml` doesn't exist: prompt from scratch. Offer three paths, default first:
     - **(a) Workspace path** — single parent directory containing all Zoodealio repo clones; resolves per-service via `{workspace_path}/{repo_directories[service]}/`.
     - **(b) Individual repo paths** — enumerate services from `repo_directories`, prompt per repo.
     - **(c) Skip — I'll configure later** — write an empty `repo-paths.local.yaml` with helpful comments, but do **not** write `.onboard-complete` (so preflight will re-trigger onboard next time).
5. **Validate resolved paths.** For each service path, verify the path exists and contains the `validation_markers[service]` marker file. On failure: re-prompt for that service, or let the user skip it (skipped services are simply omitted from `repo-paths.local.yaml`, not treated as errors).
6. **Write `repo-paths.local.yaml`** with resolved values. Preserve any user comments or entries not touched by this run.
7. **Scaffold missing local shells** — create any missing files/dirs from the LOCAL list. For `user-preferences.md`, write a minimal header (e.g., `# User Preferences — Zoo-Core` with a one-line description); do not invent content.
8. **Publish docs + CLAUDE.md to project root.** Promote the setup-staged files from `_bmad/` to the consumer's working tree. This is the step where shipped content becomes visible to the user outside the `_bmad/` sandbox.
   - **Docs:** copy `{project-root}/_bmad/docs/zoo-core/` → `{project-root}/docs/` (flat merge — `backend/`, `clean-code/`, `design-patterns/` land at project-root/docs/). For each file, if the target already exists and differs from the source, prompt the user per-file: **overwrite / keep existing / show diff**. If it does not exist or content matches the staged source, copy silently (idempotent).
   - **CLAUDE.md:** target is `{project-root}/CLAUDE.md`.
     - If missing: copy `_bmad/zoo-core-CLAUDE.md` → `{project-root}/CLAUDE.md`.
     - If present and content matches the staged source: skip silently.
     - If present and differs: prompt **append-as-reference / overwrite / skip**. "Append-as-reference" adds a short trailing block to the existing file pointing at `_bmad/zoo-core-CLAUDE.md` (e.g., `> Ecosystem context: see \`_bmad/zoo-core-CLAUDE.md\` for the Zoodealio platform map.`) — never inlines the full shipped content.
   - **Auto-trigger mode:** if any collision requires a prompt, defer the publish — write a note to the onboard summary and let the user re-run onboard explicitly. Never block a preflight auto-trigger on docs publication.
   - **Re-run safety:** this step is idempotent when content matches; only differing files ever prompt.
9. **Offer initial indexing — MAINTAINER MODE ONLY.** List each reference repo that passed validation, ask which the user would like to index now via `zoo-core-full-index`, and invoke `zoo-core-full-index` per selection. In **CONSUMER MODE**, skip this step silently in auto-trigger mode; in user-invoked mode include a one-liner: "Service indexing runs in the zoo-core source repo — not available here."
10. **Write `.onboard-complete`** only if repo paths were resolved and written (i.e., skip if the user chose option (c) "configure later"). Marker contents:
    ```yaml
    mode: {maintainer|consumer}
    completed_at: {ISO 8601 timestamp}
    onboarded_by: zoo-core-onboard
    ```
11. **Handoff:**
    - **Auto-trigger:** return silently. The calling skill resumes the user's original action.
    - **User-invoked:** brief summary — what was written, what was skipped, what the user can do next.

## Design Rationale

- **Dual-sentinel mode detection.** Relying on a single path sentinel risks false positives. Requiring both the memory-scaffolding directory AND either `module.yaml` or the rebuild-plan doc scopes detection to genuine source-repo context.
- **Never recreate shipped files.** Shipped content is the module's authoritative state, distributed by `zoo-core-setup`. If it's missing, the install is broken — patching around it hides the real problem and leaves the workspace in an inconsistent state.
- **"Skip — configure later" doesn't write `.onboard-complete`.** The marker's whole purpose is to stop preflight from re-triggering onboard. If paths aren't set, we *want* preflight to re-trigger next time — so the marker is deliberately withheld.
- **Silent auto-trigger handoff.** The calling skill has its own message to deliver to the user. Onboard should not pollute that with success noise when it ran invisibly. Errors are still surfaced — silence applies only to successful completion.
- **Why docs + CLAUDE.md publish from onboard, not setup.** Setup stages these under `_bmad/` so install itself is non-invasive to the project root (where a consumer's existing `CLAUDE.md` or `docs/` might live). Onboard owns the publish step because it already runs the consumer's first interactive workspace pass — the right place to handle collision prompts. Auto-trigger mode defers collision prompts rather than blocking preflight.

## Related Skills

- `zoo-core-full-index` — optionally invoked during step 8 (maintainer mode only)
- `zoo-core-setup` — installs the shipped files onboard depends on; onboard directs users here if shipped files are missing
- Every zoo-core skill's preflight check — the primary caller
