# Maintainer-Mode Curation

**Scope:** Shipped files at `{project-root}/src/modules/zoo-core/zoo-core-setup/assets/memory-scaffolding/`. Changes here propagate to every consumer install on reinstall.

Three curation passes, run in order unless a specific scope was requested. Each pass produces a proposal that gets collected into one consolidated approval gate.

---

## Pass 1 — Fold `recent-changes.md` into `curated/patterns.md`

**Goal:** Promote durable, cross-service patterns out of the chronological `recent-changes.md` log into the reference-by-topic `patterns.md`, so agents reading `patterns.md` see authoritative current-state without having to piece it together from recent-changes entries.

### What qualifies as "durable"

- A pattern observed in multiple services (not just one diff in one service)
- A deprecated pattern explicitly replaced by a new one (both the old and new deserve a line in patterns.md: "formerly X, now Y")
- A convention the user has approved in a past curation pass but that's been superseded
- A library / framework shift that affects how agents should reason about the ecosystem

### What does NOT qualify

- Service-specific feature additions (those belong in the service's own `services/{name}/patterns.md`)
- One-off refactors with no broader convention change
- Bug fixes (even important ones — unless they reveal a convention)

### The process

1. Read `{project-root}/src/modules/zoo-core/zoo-core-setup/assets/memory-scaffolding/curated/recent-changes.md` — every entry since the last curation pass
2. Read `{project-root}/src/modules/zoo-core/zoo-core-setup/assets/memory-scaffolding/curated/patterns.md` — current authoritative patterns
3. Identify durable candidates — for each, draft a patterns.md edit (new section, amended section, deprecation note)
4. Write candidate edits to the sidecar at `{output_folder}/curate-working/{timestamp}/patterns-proposal.md` showing before/after
5. Mark the `recent-changes.md` entries that were folded (they'll be archived after approval)

### Ambiguity handling

If a candidate feels borderline-durable, surface it to the user with a "promote or skip?" question rather than silently promoting. patterns.md being wrong is worse than patterns.md missing something — missing gets picked up next pass.

---

## Pass 2 — Trim `index.md`

**Goal:** Keep `index.md` under its line budget (~200 lines) so every agent activation doesn't pay a large context tax.

### The process

1. Read `{project-root}/src/modules/zoo-core/zoo-core-setup/assets/memory-scaffolding/index.md` — current state
2. If under budget: note "index.md within budget, no trim needed" and move on
3. If over budget:
   - Identify verbose sections (e.g., per-service summaries bloated past one line, stale discussion prose, duplicated content now canonical in `patterns.md`)
   - Propose a trimmed version — preserve every service listing and staleness pointer, tighten prose
   - Write before/after to sidecar at `index-proposal.md`
   - **Never drop a service** — services are the core orientation content; always listed even if briefly

### Line budget

The 200-line target is soft. If the proposed trim can get under 150 lines without losing agent-useful content, better. If 200 is genuinely the minimum viable size given the ecosystem is growing, note that and propose splitting (e.g., move per-service summaries to a separate `services-index.md` referenced from index.md).

---

## Pass 3 — Expire stale service entries in `staleness.md`

**Goal:** Flag services whose index has aged beyond a threshold so agents reading `staleness.md` see a visible warning rather than silently trusting old data.

### The process

1. Read `{project-root}/src/modules/zoo-core/zoo-core-setup/assets/memory-scaffolding/staleness.md`
2. For each service entry, compute days since `last-indexed`
3. Classify:
   - **Fresh** (< 30 days) — no change
   - **Aging** (30–90 days) — add a `status: aging` marker
   - **Stale** (> 90 days) — add a `status: stale` marker + surface a banner in `index.md` (covered by pass 2 if the staleness pass runs before index trim; otherwise defer banner to next index pass)
4. Write updated staleness to sidecar at `staleness-proposal.md`

### What NOT to do

- Never remove a service entry from `staleness.md` — removal would confuse agents that look up a known service and find nothing
- Never bump a service's `last-indexed` without actually running `zoo-core-diff-update` or `zoo-core-full-index` — the staleness timestamp must always reflect the real indexed state

---

## Consolidated proposal + approval gate

After all three passes, present the consolidated proposal to the user:

- What's changing in `patterns.md` (N entries folded, M edits)
- What's changing in `index.md` (trim from X lines to Y lines, N edits)
- What's changing in `staleness.md` (N services re-classified)
- Which `recent-changes.md` entries are about to be archived

Show diffs or summaries (user's choice). Offer:

- Approve all
- Approve some (per-pass toggle)
- Revise wording in a specific proposal
- Defer — keep sidecar intact, resume later

## Apply

On approval:

1. Write updated `patterns.md` to authoritative source
2. Write updated `index.md`
3. Write updated `staleness.md`
4. Archive folded `recent-changes.md` entries — move them to an "Archive (folded into patterns.md on {date})" section at the bottom of `recent-changes.md`. Preserve entries untouched by this curation.
5. Record the curation run in sidecar with: timestamp, user, passes run, counts of changes applied

## Handoff

- Tell the user which files were written
- Remind: commit shared memory changes + reinstall zoo-core to consumers
- If there were recent-changes entries that didn't qualify for folding but are old, propose a separate "prune recent-changes-archive" run at a future date
