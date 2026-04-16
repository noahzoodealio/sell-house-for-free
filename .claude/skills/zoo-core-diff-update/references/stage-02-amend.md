# Stage 02 — Amend Affected Artifacts

**Goal:** Surgically update only the sections of each affected artifact that need to change. Preserve unchanged sections byte-for-byte.

## Amendment contract

For each affected artifact (from the scope stage's `affected-artifacts` list):

1. Read the current authoritative artifact at `{project-root}/src/modules/zoo-core/zoo-core-setup/assets/memory-scaffolding/services/{service-name}/{artifact}.md`
2. Identify the specific sections the diffs affect — not the whole file
3. Draft the amended sections only; leave the rest untouched
4. Write the fully-amended file (preserving unchanged sections verbatim) to the sidecar at `{output_folder}/diff-update-working/{service-name}/{artifact}.md`
5. Update the artifact's frontmatter: new `commit-sha`, new `generated-at` timestamp; do not change `artifact` or `service` fields

**Never rewrite wholesale.** If a single endpoint changed, update only that endpoint's block. If a single entity got a new column, update only that entity's section. Diff-update is incremental precisely because small surgical edits are easier for users to review than large regenerations.

## What to do per artifact

### `api-catalog.md`

For each added/removed/modified controller method or endpoint:

- **Added endpoint** — insert into the appropriate functional-area section
- **Modified endpoint** — update its block in place (method, route, auth, shapes)
- **Removed endpoint** — remove from the catalog; if it was a notable removal, prepare a line for `recent-changes.md` in stage 3
- **Renamed** — remove old, add new, note the rename in recent-changes

Update the endpoint-count in frontmatter.

### `schemas.md`

For each changed entity / migration / DbContext:

- **New entity** — insert into the appropriate DbContext section
- **Added/modified column** — update the column list in place; note relationship changes explicitly
- **Removed entity or column** — remove from the document; stage a line for recent-changes
- **New DbContext** — add a section (rare but important to capture)
- **New migration without entity changes** — still worth capturing if it added indexes/constraints; otherwise skip

Update the entity-count in frontmatter.

### `architecture.md`

For each project-layout change / new integration / removed dependency:

- **New project** — add to project layout + layer description
- **Removed project** — remove from layout; stage for recent-changes
- **New integration** (SendGrid config added, new external API, etc.) — add to integrations section
- **Auth scheme changes** — update the auth section
- **Config surface changes** — update config surface section

### `patterns.md`

For each framework bump, library change, or convention shift:

- **Package version bump** — update the stack baseline section
- **New library adopted** — add under the appropriate convention section
- **Removed library** — remove references; stage for recent-changes if it was load-bearing
- **New deviation from Zoodealio baseline** — add to deviations section

### `workflows.md`

For each added/modified/removed Temporal workflow, hosted service, scheduled job, or Azure Function:

- **New workflow/service/job** — insert into appropriate category section
- **Modified signature or activities** — update the block in place
- **Removed** — remove from document; stage for recent-changes if notable
- **Schedule or trigger change** — update the block; flag as notable

Update the counts in frontmatter.

## Edge cases

- **Ambiguous file → multiple artifacts** — err on the side of checking all candidate artifacts; it's cheaper than missing a change.
- **Diff is semantically trivial** (formatting, comment-only) — note it in the sidecar but don't amend the artifact. Include a line for recent-changes if it's noteworthy contextually (e.g., "docstring updates across controllers").
- **New convention emerging** — if the diffs show a pattern shift that deserves promotion to `curated/patterns.md` later, flag it in the sidecar for curate-memory to pick up.

## Write drafts to sidecar

For every amended artifact, write the fully-amended file (old content + surgical edits) to the sidecar. The authoritative files are not touched until stage 3's user approval.

Update sidecar `index.md` with `last-completed-stage: amend` and a summary of which artifacts were amended + a rough edit-count per artifact.

## Review gate

Present per-artifact diffs to the user (before/after, or just the edited sections with context). User can:

- Approve all amendments — proceed to finalize
- Revise a specific artifact — iterate on that one without touching the others
- Flag an amendment as wrong — discard it; re-evaluate whether the source diff really affects that artifact

## Next

`references/stage-03-finalize.md`
