# Stage 07 — Finalize

**Goal:** Hand the five drafted artifacts to the user for a final holistic review, then — on approval — write them to the authoritative source and update metadata files that propagate to consumer installs on re-install.

## Holistic review

Present all five sidecar artifacts together with:

- **Counts snapshot** — endpoints, entities, Temporal workflows, layers, notable deviations
- **Gap check** — anything that feels surprisingly absent (e.g., "no auth scheme captured — is this service truly anonymous?")
- **Cross-artifact consistency** — endpoints mention DBContexts that do/don't appear in schemas; workflows reference entities that do/don't appear

Offer the user:

- **Approve all** — proceed to write
- **Revise specific artifact** — jump back to that stage's sidecar; re-run from there
- **Defer** — leave sidecar intact; finalize can be resumed later

## Write to authoritative source

On approval, copy the five sidecar artifacts to:

- `{project-root}/src/modules/zoo-core/zoo-core-setup/assets/memory-scaffolding/services/{service-name}/api-catalog.md`
- `{project-root}/src/modules/zoo-core/zoo-core-setup/assets/memory-scaffolding/services/{service-name}/schemas.md`
- `{project-root}/src/modules/zoo-core/zoo-core-setup/assets/memory-scaffolding/services/{service-name}/architecture.md`
- `{project-root}/src/modules/zoo-core/zoo-core-setup/assets/memory-scaffolding/services/{service-name}/patterns.md`
- `{project-root}/src/modules/zoo-core/zoo-core-setup/assets/memory-scaffolding/services/{service-name}/workflows.md`

If the target directory doesn't exist, create it. If the files already exist (re-index scenario), **overwrite** — full-index is authoritative and intentionally replaces prior state. The commit-sha in each artifact's frontmatter carries the indexed version forward.

## Update `staleness.md`

Append (or replace if entry already exists) an entry at `{project-root}/src/modules/zoo-core/zoo-core-setup/assets/memory-scaffolding/staleness.md`:

```yaml
{service-name}:
  last-indexed: {ISO timestamp}
  commit-sha: {captured SHA}
  indexed-by: zoo-core-full-index
  branch: {captured branch}
```

Preserve entries for other services. Sort alphabetically by service name.

## Update `index.md`

Ensure `{project-root}/src/modules/zoo-core/zoo-core-setup/assets/memory-scaffolding/index.md` lists this service under its services section (with a one-line summary derived from the architecture artifact's at-a-glance summary). If the service is already listed, update the summary to match the freshly-indexed reality.

Keep `index.md` under its line budget (~200 lines). If the update would blow the budget, recommend running `zoo-core-curate-memory` immediately after.

## Clean up sidecar

Ask the user: keep the sidecar for reference, or delete it? Default: keep for 7 days, then prune. The user can delete `{output_folder}/full-index-working/{service-name}/` at any time without affecting the authoritative source.

## Handoff

- Tell the user which 5 files were written and where.
- Recommend `zoo-core-curate-memory` (maintainer mode) to fold any newly-discovered durable patterns into `curated/patterns.md`.
- Remind the user to commit the shared memory changes to this repo and **reinstall zoo-core to consumers** to propagate the updates.

## Sidecar index — final state

```yaml
---
service-name: {service-name}
repo-path: {resolved path}
commit-sha: {SHA}
branch: {branch}
started-at: {ISO}
finalized-at: {ISO}
last-completed-stage: finalize
---
```
