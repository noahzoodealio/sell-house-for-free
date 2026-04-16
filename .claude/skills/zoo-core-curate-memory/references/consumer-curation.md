# Consumer-Mode Curation

**Scope:** LOCAL files at `{project-root}/_bmad/memory/zoo-core/` only. Never touches shipped files — those are the module's authoritative state, refreshed only by reinstall.

Two curation passes. Each produces a proposal that goes into one consolidated approval gate.

---

## Pass 1 — Distill `daily/*.md` into `curated/user-preferences.md`

**Goal:** Promote recurring user preferences, approved stylistic choices, and learned workflow conventions out of chronological daily logs into the persistent `user-preferences.md`, so every agent activation sees them upfront without reading daily files.

### What qualifies as a "preference" worth distilling

- A stylistic choice the user has confirmed at least twice (code formatting, naming preferences, prose conventions)
- A workflow preference the user has expressed (e.g., "always ask me before running migrations," "prefer PR comments bundled by file")
- An approved deviation from Zoodealio baseline patterns that the user wants reused (e.g., "in this service, prefer Mapster over AutoMapper")
- A recurring meta-preference about how agents should communicate (e.g., "keep summaries under 5 bullets," "don't re-explain patterns I've already seen")

### What does NOT qualify

- One-off commentary (single mentions without pattern)
- Venting or friction that didn't lead to a persistent preference
- Service-specific notes that belong in personal agent memory instead (PM's ado-history, Dev's implementation-notes, QA's test-patterns)

### The process

1. Read `{project-root}/_bmad/memory/zoo-core/daily/*.md` entries since the last curation (or all if never curated before)
2. Read `{project-root}/_bmad/memory/zoo-core/curated/user-preferences.md` — current state
3. Identify patterns qualifying as durable preferences — for each, draft an edit (new section, amended section, deprecation of a prior preference if contradicted)
4. Write candidate edits to sidecar at `{output_folder}/curate-working/{timestamp}/user-preferences-proposal.md` with before/after
5. Track which daily entries contributed to each proposed preference (helps user validate "yes, that's a real preference I've expressed")

### Never invent

`user-preferences.md` is user-authored by extraction. If a candidate preference doesn't have clear supporting evidence in the daily logs, don't propose it — wait for another data point.

---

## Pass 2 — Archive old `daily/*.md` files

**Goal:** Keep the `daily/` directory from growing unbounded. Files older than the retention threshold are moved to `daily/archive/YYYY-MM/` (or deleted if the user prefers).

### Retention policy

Default: 30 days. Configurable via `daily_retention_days` in `config.user.yaml`.

**Modifying the default.** If the user asks to change the default, write it to `config.user.yaml` under the `zoo-core` section — not to `config.yaml` (project-shared) since this is a personal preference.

### The process

1. List `{project-root}/_bmad/memory/zoo-core/daily/*.md` with file mtime
2. Identify files older than retention threshold
3. Verify each candidate has been through at least one user-preferences curation pass — otherwise any learnings in that file are at risk of being lost on archive. If a candidate hasn't been distilled, include it in Pass 1 scope automatically (self-correcting) and re-propose.
4. Propose moving candidates to `daily/archive/YYYY-MM/` (organized by month for easy navigation) — or deleting them if the user has set `daily_retention_action: delete` in config
5. Write proposal to sidecar at `archive-proposal.md`

### Standing auto-approve (optional)

The user can set `auto_approve_daily_archive: true` in `config.user.yaml` to skip the approval gate specifically for archive operations. This is the only part of curate-memory that supports standing auto-approve — distillation always requires user confirmation.

---

## Consolidated proposal + approval gate

Present:

- What's being added to `user-preferences.md` (N new preferences, M amendments)
- Which daily files are about to be archived / deleted (counts + list)
- Any daily files flagged because they haven't been distilled yet

User options:

- Approve all
- Approve some
- Revise wording on a specific preference
- Defer — keep sidecar, resume later

If auto-triggered (invoked by Lead on threshold crossing) and there are no high-confidence preferences to distill, exit silently rather than interrupt the user's flow. Archive-only pass can still run if `auto_approve_daily_archive: true`.

## Apply

On approval:

1. Write updated `user-preferences.md` to `{project-root}/_bmad/memory/zoo-core/curated/user-preferences.md`
2. Move archived daily files to `daily/archive/YYYY-MM/{filename}` (or delete if configured)
3. Record the curation run in sidecar with: timestamp, daily entries reviewed, preferences added, files archived

## Handoff

- Tell the user what was distilled and what was archived (brief summary)
- No commit/reinstall reminder — consumer-mode changes are local only
- If auto-triggered with silent exit, no output at all
