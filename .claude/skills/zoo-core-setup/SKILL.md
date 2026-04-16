---
name: "zoo-core-setup"
description: Sets up Zoo-Core: Zoodealio Ecosystem Intelligence Platform module in a project. Use when the user requests to 'install zoo-core module', 'configure Zoo-Core: Zoodealio Ecosystem Intelligence Platform', or 'setup Zoo-Core: Zoodealio Ecosystem Intelligence Platform'.
---

# Module Setup

## Overview

Installs and configures a BMad module into a project. Module identity (name, code, version) comes from `assets/module.yaml`. Collects user preferences and writes them to three files:

- **`{project-root}/_bmad/config.yaml`** — shared project config: core settings at root (e.g. `output_folder`, `document_output_language`) plus a section per module with metadata and module-specific values. User-only keys (`user_name`, `communication_language`) are **never** written here.
- **`{project-root}/_bmad/config.user.yaml`** — personal settings intended to be gitignored: `user_name`, `communication_language`, and any module variable marked `user_setting: true` in `assets/module.yaml`. These values live exclusively here.
- **`{project-root}/_bmad/module-help.csv`** — registers module capabilities for the help system.

Both config scripts use an anti-zombie pattern — existing entries for this module are removed before writing fresh ones, so stale values never persist.

`{project-root}` is a **literal token** in config values — never substitute it with an actual path. It signals to the consuming LLM that the value is relative to the project root, not the skill root.

## On Activation

1. Read `assets/module.yaml` for module metadata and variable definitions (the `code` field is the module identifier)
2. Check if `{project-root}/_bmad/config.yaml` exists — if a section matching the module's code is already present, inform the user this is an update
3. Check for zoo-core's own legacy per-module configuration at `{project-root}/_bmad/zoo-core/config.yaml`. If it exists:
   - If `{project-root}/_bmad/config.yaml` does **not** yet have a section for this module: this is a **fresh install**. Inform the user that installer config was detected and values will be consolidated into the new format.
   - If `{project-root}/_bmad/config.yaml` **already** has a section for this module: this is a **legacy migration**. Inform the user that legacy per-module config was found alongside existing config, and legacy values will be used as fallback defaults.
   - In both cases, zoo-core's legacy staging will be cleaned up after setup. `{project-root}/_bmad/core/` and any other module's directory are never touched.

If the user provides arguments (e.g. `accept all defaults`, `--headless`, or inline values like `user name is BMad, I speak Swahili`), map any provided values to config keys, use defaults for the rest, and skip interactive prompting. Still display the full confirmation summary at the end.

## Probe External Dependencies

Before collecting config, probe for the external tools zoo-core skills depend on. Report findings and adjust defaults for MCP-related config variables accordingly.

| Dependency | Probe | Effect if missing |
|---|---|---|
| Azure DevOps MCP server | Attempt a lightweight MCP call; success means present | Flip `enable_ado_mcp` default to `false`; show install guidance |
| Figma MCP server | Attempt a lightweight MCP call | Flip `enable_figma_mcp` default to `false`; show install guidance |
| GitHub CLI (`gh`) | `gh --version` | Report presence; note `zoo-core-pr-triage` will prompt for manual GH actions when unavailable |
| Git | `git --version` | **Hard requirement** — halt setup with a clear message if absent |
| Python 3 | `python3 --version` (or `python --version`) | **Hard requirement** — the merge scripts need it; halt if absent |

Present the probe summary to the user before prompting for config. Missing Git or Python halts. Missing MCP or CLI adjusts defaults and shows guidance; the user can still override adjusted defaults during config collection.

## Collect Configuration

Ask the user for values. Show defaults in brackets. Present all values together so the user can respond once with only the values they want to change (e.g. "change language to Swahili, rest are fine"). Never tell the user to "press enter" or "leave blank" — in a chat interface they must type something to respond.

**Default priority** (highest wins): existing new config values > legacy config values > `assets/module.yaml` defaults. When legacy configs exist, read them and use matching values as defaults instead of `module.yaml` defaults. Only keys that match the current schema are carried forward — changed or removed keys are ignored.

**Core config** (only if no core keys exist yet): `user_name` (default: BMad), `communication_language` and `document_output_language` (default: English — ask as a single language question, both keys get the same answer), `output_folder` (default: `{project-root}/_bmad-output`). Of these, `user_name` and `communication_language` are written exclusively to `config.user.yaml`. The rest go to `config.yaml` at root and are shared across all modules.

**Module config**: Read each variable in `assets/module.yaml` that has a `prompt` field. Ask using that prompt with its default value (or legacy value if available).

## Write Files

Write a temp JSON file with the collected answers structured as `{"core": {...}, "module": {...}}` (omit `core` if it already exists). Then run both scripts — they can run in parallel since they write to different files:

```bash
python3 scripts/merge-config.py --config-path "{project-root}/_bmad/config.yaml" --user-config-path "{project-root}/_bmad/config.user.yaml" --module-yaml ./assets/module.yaml --answers {temp-file} --legacy-dir "{project-root}/_bmad"
python3 scripts/merge-help-csv.py --target "{project-root}/_bmad/module-help.csv" --source ./assets/module-help.csv --legacy-dir "{project-root}/_bmad" --module-code zoo-core
```

Both scripts output JSON to stdout with results. If either exits non-zero, surface the error and stop. The scripts automatically read legacy config values as fallback defaults, then delete the legacy files after a successful merge. Check `legacy_configs_deleted` and `legacy_csvs_deleted` in the output to confirm cleanup.

Run `scripts/merge-config.py --help` or `scripts/merge-help-csv.py --help` for full usage.

## Create Output Directories

After writing config, create any output directories that were configured. For filesystem operations only (such as creating directories), resolve the `{project-root}` token to the actual project root and create each path-type value from `config.yaml` that does not yet exist — this includes `output_folder` and any module variable whose value starts with `{project-root}/`. The paths stored in the config files must continue to use the literal `{project-root}` token; only the directories on disk should use the resolved paths. Use `mkdir -p` or equivalent to create the full path.

Also create the zoo-core `directories` list from `assets/module.yaml` — these are the shared memory layout + personal agent memory shells + planning/implementation output folders.

## Install Shared Memory Scaffolding

Populate `{project-root}/_bmad/memory/zoo-core/` with the shipped shared-memory baseline that propagates with every zoo-core install. Source paths (check in order; copy from the first one found):

1. `assets/memory-scaffolding/` (bundled into this setup skill's assets — primary)
2. `{project-root}/.claude/skills/zoo-core/data/memory/` (if installed into the skills tree)

Files / directories to copy into `{project-root}/_bmad/memory/zoo-core/`:

- `index.md` — orientation pointer file
- `staleness.md` — service-index freshness tracking
- `repo-paths.yaml` — repo directory schema + validation markers (committed template)
- `repo-paths.local.example.yaml` — template for the developer's local paths
- `curated/patterns.md` — Zoo-Core baseline architectural patterns
- `curated/recent-changes.md` — distilled cross-service change log
- `services/` — all per-service knowledge files (recursive copy)

**Never overwrite local state.** If any of these already exist in the consumer (re-install scenario), confirm with the user before overwriting each shipped file. **Never touch** `repo-paths.local.yaml`, `curated/user-preferences.md`, `daily/*.md`, or personal agent memory (`zoo-core-agent-{pm,dev,qa}/`) — those are consumer-local state that must survive re-install.

## Register Slash Commands

Copy the shipped slash-command files into the consumer's `.claude/commands/` and `.cursor/commands/` directories so the user can invoke zoo-core skills in both tools.

Source paths (check in order):

1. `assets/commands/claude/` and `assets/commands/cursor/` (bundled — primary)
2. `{project-root}/.claude/skills/zoo-core/commands/claude/` and `{project-root}/.claude/skills/zoo-core/commands/cursor/`

Copy:

- From `commands/claude/*.md` → `{project-root}/.claude/commands/*.md`
- From `commands/cursor/*.md` → `{project-root}/.cursor/commands/*.md`
- From `commands/COMMANDS.md` → `{project-root}/_bmad/zoo-core-commands.md` (human-readable index of every zoo-core slash command, grouped by category — overwrite any existing copy so updates propagate)

Create the target directories if they don't exist.

**Name collision handling.** If a target file with the same name exists in the command directories and is NOT zoo-core-owned (grep the file content for a `zoo-core` identifier — every shipped command references zoo-core skills), halt and surface the conflict. Do not silently overwrite non-zoo-core files. Zoo-core-owned files are safe to overwrite — this is how module updates propagate.

## Stage Docs + CLAUDE.md

Copy the shipped documentation and root-CLAUDE template into `_bmad/` so `zoo-core-onboard` can publish them to the project root later. These are module-owned staging files; onboard handles collision-aware publication to the consumer's working tree.

Source paths (check in order):

1. `assets/docs/` and `assets/CLAUDE.md` (bundled — primary)
2. `{project-root}/.claude/skills/zoo-core/data/docs/` and `{project-root}/.claude/skills/zoo-core/data/CLAUDE.md`

Copy:

- From `assets/docs/` → `{project-root}/_bmad/docs/zoo-core/` (recursive; preserves `backend/`, `clean-code/`, `design-patterns/` structure)
- From `assets/CLAUDE.md` → `{project-root}/_bmad/zoo-core-CLAUDE.md`

These are **shipped** files — always overwrite on re-install so module updates propagate. The files published to project root by onboard are separate and collision-protected there.

## Cleanup Legacy Directories

After both merge scripts complete successfully, remove **zoo-core's own** legacy installer staging at `{project-root}/_bmad/zoo-core/`. Its skills are already installed at `{project-root}/.claude/skills/`, so the staging directory is no longer needed. Never touch `{project-root}/_bmad/core/`, `_config/`, `_memory/`, or any other module's directory — those belong to BMad core or other modules.

```bash
python3 scripts/cleanup-legacy.py --bmad-dir "{project-root}/_bmad" --module-code zoo-core --skills-dir "{project-root}/.claude/skills"
```

The script verifies that every skill in the zoo-core legacy directory exists at `.claude/skills/` before removing anything. If the script exits non-zero, surface the error and stop. A missing zoo-core legacy directory (already cleaned by a prior run) is not an error — the script is idempotent.

Check `directories_removed` and `files_removed_count` in the JSON output for the confirmation step. Run `scripts/cleanup-legacy.py --help` for full usage.

## Confirm

Use the script JSON output to display what was written — config values set (written to `config.yaml` at root for core, module section for module values), user settings written to `config.user.yaml` (`user_keys` in result), help entries added, fresh install vs update. If legacy files were deleted, mention the migration. If the zoo-core legacy directory was removed, report the file count (e.g. "Cleaned up N installer package files from zoo-core/ — skills are installed at .claude/skills/"). Summarize what was done by the zoo-core-specific extensions: external-dep probe results, shared memory baseline installed (file count), slash commands registered (count), docs + CLAUDE.md staged under `_bmad/` (publishing to project root happens during onboard). Then display the `module_greeting` from `assets/module.yaml` to the user.

## Chain into Onboard

After the confirmation summary is displayed, automatically invoke the `zoo-core-onboard` skill to finish workspace-specific bootstrap — resolve repo paths via `workspace_path` (if set during setup) or prompt, validate paths against `validation_markers`, and write the `.onboard-complete` marker. Onboard is idempotent; re-running is safe if the user already completed it.

This chaining gives the consumer dev a fully operational workspace at the end of a single install flow. If onboard needs input the setup skill didn't collect (e.g., individual repo paths), onboard handles the prompting. Surface any onboard output inline; the user stays in one conversation from install through workspace-ready.

## Outcome

Once the user's `user_name` and `communication_language` are known (from collected input, arguments, or existing config), use them consistently for the remainder of the session: address the user by their configured name and communicate in their configured `communication_language`.
