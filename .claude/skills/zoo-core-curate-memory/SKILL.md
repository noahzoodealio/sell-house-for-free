---
name: zoo-core-curate-memory
description: Keeps zoo-core shared memory lean and fresh via dual-mode curation. Use when the user requests to 'curate memory' or runs '/zoo-core-curate-memory', or when auto-invoked by Lead after diff-update or on daily-log threshold crossings.
---

# Zoo-Core Curate Memory

## Overview

Hygiene workflow for zoo-core shared memory. Runs in one of two modes, auto-detected by the repo it's running in:

- **Maintainer mode** (in zoo-core source repo) — curates SHIPPED files. Folds durable knowledge from `curated/recent-changes.md` into `curated/patterns.md`, trims `index.md` back under its line budget, expires stale service entries. Output is committed and propagates to consumers via reinstall.
- **Consumer mode** (in any consumer repo) — curates LOCAL files only. Distills patterns from `daily/*.md` entries into `curated/user-preferences.md`, archives old daily files beyond the retention window. Does not touch shipped files.

Every curation pass is a **proposal → user approval → apply** cycle. Curation never auto-applies changes — the user always sees what's about to change before it writes.

Act as a careful librarian — fold durable knowledge, archive stale entries, keep the index navigable, always show your work before writing.

## Mode Detection

Check both sentinels — same rule as every zoo-core skill:

- `{project-root}/src/modules/zoo-core/zoo-core-setup/assets/memory-scaffolding/` exists, **and**
- `{project-root}/src/modules/zoo-core/module.yaml` exists

If both present → **maintainer mode**. Otherwise → **consumer mode**. Load the appropriate reference file.

## On Activation

Load config from `{project-root}/_bmad/config.yaml` (`zoo-core` section) and `config.user.yaml`. If missing, note `zoo-core-setup` is available; continue with defaults.

**Preflight:** invoke `zoo-core-onboard` (auto-trigger — handles pending installs + first-time setup silently), then resume.

Detect trigger type:

- **Auto-triggered** (invoked by Lead after `zoo-core-diff-update` or on a threshold crossing) — lean mode: analyze, propose, summarize. If the user is in the middle of something, be concise; if nothing meaningful to curate, return silently.
- **User-invoked** (`/zoo-core-curate-memory` or explicit request) — full flow with explicit review gates.

## Inputs

- **Mode** (auto-detected via sentinels above)
- **Trigger type** (auto-triggered or user-invoked)
- **Scope** (optional) — which curation passes to run. If not specified, run all passes for the detected mode. Scopes:
  - Maintainer: `patterns` (fold recent-changes → patterns.md), `index` (trim index.md), `staleness` (expire stale service entries), or `all`
  - Consumer: `preferences` (distill daily → user-preferences.md), `archive` (prune old daily files), or `all`

## Outputs (mode-dependent)

**Maintainer mode — writes to `{project-root}/src/modules/zoo-core/zoo-core-setup/assets/memory-scaffolding/`:**

- `curated/patterns.md` — amended with durable patterns folded from `recent-changes.md`
- `curated/recent-changes.md` — folded entries archived with a note; preserved raw entries kept until explicit prune
- `index.md` — trimmed to stay under the ~200-line budget; stale service banners updated
- `staleness.md` — services not indexed in 90+ days get a stale-warning banner (doesn't remove the entry, just flags)

**Consumer mode — writes to `{project-root}/_bmad/memory/zoo-core/`:**

- `curated/user-preferences.md` — amended with distilled preferences from daily logs
- `daily/*.md` — files older than the retention window (default 30 days) moved to `daily/archive/YYYY-MM/` or deleted based on user choice

**Sidecar:** `{output_folder}/curate-working/{ISO-timestamp}/` — captures proposed changes pre-approval for audit trail

## Workflow

1. Detect mode (per Mode Detection section)
2. Load the appropriate reference:
   - Maintainer mode → `references/maintainer-curation.md`
   - Consumer mode → `references/consumer-curation.md`
3. Execute the reference's curation passes (subject to `scope` input)
4. Present consolidated proposal + get user approval (full mode) or silent summary (auto-triggered mode if non-trivial changes; silent exit if nothing worth proposing)
5. Apply approved changes atomically (either all approved passes write, or none)

## Safety contract

- **User-approval gate is mandatory** — never auto-write curation changes in either mode. Even in auto-triggered invocation, the user must confirm before files are modified. The exception is archiving daily files, which the user can set as a standing auto-approve policy in `config.user.yaml`.
- **Preserve raw sources** — folded `recent-changes.md` entries are archived (moved to a history section or `recent-changes-archive.md`), not deleted, so we can reconstruct reasoning later.
- **Reversibility** — sidecar keeps pre-curation snapshots of every file that was changed so a mistake can be rolled back manually.

## Next Steps

After maintainer-mode curation: remind the user to commit shared memory changes and reinstall zoo-core to consumers.

After consumer-mode curation: nothing special — local state changed, agents activating after this will see the updated `user-preferences.md`.

## Related Skills

- `zoo-core-diff-update` — typical maintainer-mode caller (auto-invokes curate when recent-changes fills up)
- `zoo-core-agent-lead` — typical consumer-mode caller (auto-invokes on daily-log threshold)
- `zoo-core-onboard` — prerequisite
