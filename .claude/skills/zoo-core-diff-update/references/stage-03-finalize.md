# Stage 03 — Finalize

**Goal:** Draft the `recent-changes.md` entry, present everything for final review, write amendments to the authoritative source, and update `staleness.md`.

## Draft the recent-changes entry

Append a distilled summary to `{project-root}/src/modules/zoo-core/zoo-core-setup/assets/memory-scaffolding/curated/recent-changes.md`. This is what agents read on activation to know "what changed across Zoodealio recently" — so optimize for agent-relevance, not completeness.

Format per entry:

```markdown
## {service-name} — {new-sha-short} — {ISO date}

**Indexed range:** {prior-sha-short}..{new-sha-short} ({commit-count} commits)

**What changed (agent-relevant):**

- {concise bullet per notable change — e.g., "Added 4 endpoints under /api/offers/bulk; auth scheme now requires OffersAdmin role"}
- {bullet}

**Deprecated / removed:** {list if any, else omit section}

**Heads-up for agents:** {one or two sentences calling out anything that changes how agents should reason about this service — e.g., "OfferDto now includes CashBuyerTypeDto; previous offers using legacy shape may still exist in DB"}

**Affected artifacts:** {list}
```

Guidance:

- **Prioritize what changes agent behavior.** A 1000-line refactor that didn't change semantics gets one line; a new DTO shape propagating across services gets three bullets and a heads-up.
- **Name things by their ID / name.** "Added `POST /api/offers/bulk-accept`" not "added an endpoint."
- **Cross-reference DTOs and patterns** that live in other artifacts.

Write the draft entry to the sidecar at `recent-changes-entry.md` for review before appending.

## Holistic review gate

Present to the user:

- Per-artifact diffs (summary or full — user's choice)
- The drafted recent-changes entry
- Summary of staleness bump (prior SHA → new SHA + timestamp)

User options:

- **Approve** — proceed to write
- **Revise recent-changes wording** — iterate
- **Revise a specific artifact** — jump back to stage 02 for that artifact only
- **Defer** — leave sidecar intact; resume later

## Write to authoritative source

On approval:

1. **Copy amended artifacts** from sidecar → `{project-root}/src/modules/zoo-core/zoo-core-setup/assets/memory-scaffolding/services/{service-name}/` (overwriting the prior versions). Only the artifacts that were amended are copied; untouched artifacts stay as they were.
2. **Append the recent-changes entry** to `{project-root}/src/modules/zoo-core/zoo-core-setup/assets/memory-scaffolding/curated/recent-changes.md`. Keep entries in reverse chronological order (newest at top). Preserve existing entries.
3. **Update `staleness.md`** — replace this service's entry with the new SHA + timestamp. Preserve entries for other services. Sort alphabetically by service name.
4. **Update `index.md`** only if this diff meaningfully changes the service's one-line summary (e.g., significant API count change, new major integration). If `index.md` is near its budget (~200 lines), flag for `zoo-core-curate-memory`.

## Clean up sidecar

Ask: keep sidecar for 7 days or delete now? Default: keep. Sidecar content doesn't affect authoritative state after finalize.

## Handoff

- Tell the user which artifacts were written, how the recent-changes entry reads, and the new staleness SHA.
- If `curated/recent-changes.md` has accumulated more than ~10 entries since the last curation, recommend running `zoo-core-curate-memory` to fold durable knowledge into `patterns.md` and archive old entries.
- Remind: commit shared memory changes to this repo + reinstall zoo-core to consumers to propagate.

## Sidecar index — final state

```yaml
---
service-name: {service-name}
prior-sha: {prior SHA}
new-sha: {new SHA}
started-at: {ISO}
finalized-at: {ISO}
affected-artifacts: [...]
last-completed-stage: finalize
---
```
