# Stage 01 — Scope the Diff

**Goal:** Determine the service to update, read the prior commit SHA, compute what changed in the reference repo since then, and categorize changed files by which artifacts they affect.

## Select service

If no service was passed in, read `{project-root}/src/modules/zoo-core/zoo-core-setup/assets/memory-scaffolding/staleness.md`. Offer services sorted oldest-indexed-first. Accept:

- A specific service key (e.g., `offervana-saas`)
- `all` — iterate every service sequentially (confirm before proceeding; this is a long run)

If the user picks a service with **no prior entry in staleness.md**, redirect: this service has no prior index — run `zoo-core-full-index` instead.

## Resolve repo path + read prior SHA

Resolve the service's repo path via `{project-root}/_bmad/memory/zoo-core/repo-paths.local.yaml` (same resolution as full-index). Validate with `validation_markers`.

Read the prior SHA from the service's entry in `staleness.md`. Capture the **new** SHA by running `git rev-parse HEAD` in the target repo.

If the prior SHA is missing from git history (force-push, squash-merge, branch deleted), halt and ask the user:

- Treat this as a full re-index instead (hand off to `zoo-core-full-index`), **or**
- Compute diff against the nearest common ancestor (`git merge-base` with current HEAD), **or**
- Abort.

## Compute diffs

Run `git log --name-status {prior-sha}..HEAD` + `git diff --stat {prior-sha}..HEAD` in the target repo. Capture:

- **Changed files** — path + change type (A/M/D/R)
- **Commit count + summary** — brief log of commits in the range
- **Dirty working tree** — `git status --porcelain` output; warn if non-empty

If there are **no diffs**, inform the user and halt. Do not bump staleness unless the user explicitly wants the timestamp refreshed.

If the working tree is dirty, offer: proceed against HEAD-as-is (uncommitted changes captured), stash-and-proceed, or abort.

## Categorize changed files by affected artifact

For each changed file, determine which of the 5 artifacts it could affect. A single file can affect multiple artifacts (e.g., a controller change can affect both `api-catalog.md` and `architecture.md` if it also changed the project layout).

Heuristics (services vary — use these as starting points, confirm with a quick look at each file if unsure):

| File pattern | Likely affected artifacts |
|---|---|
| `**/Controllers/*.cs`, endpoint registrations, AppServices, HttpTrigger functions | api-catalog, architecture |
| `**/Entities/*.cs`, `**/Models/*.cs`, DbContext classes, migrations | schemas |
| `**/*.csproj`, `Program.cs`, `Startup.cs`, solution file, `package.json`, project layout changes | architecture, patterns |
| `**/Workflows/*.cs`, `**/Activities/*.cs`, hosted services, scheduled jobs | workflows |
| `**/appsettings*.json`, Terraform, Dockerfiles, CI pipelines | architecture (config surface section) |
| Angular components, services, effects, routing | api-catalog (frontend consumers), patterns |
| `package.json`, `.csproj` package version bumps | patterns |
| README, docs | usually no artifact update — but useful context for recent-changes |

Write the categorization to the sidecar's `scope.md`:

```yaml
---
service: {service-name}
prior-sha: {prior SHA}
new-sha: {new SHA}
commit-count: {N}
changed-file-count: {N}
dirty: {true|false}
generated-at: {ISO timestamp}
---
```

Then a `changed-files:` list with path, change type, and the artifact(s) it affects. Then an `affected-artifacts:` summary listing which of the 5 artifacts need updating.

## Create/refresh sidecar index

Write `{output_folder}/diff-update-working/{service-name}/index.md`:

```yaml
---
service-name: {service-name}
repo-path: {resolved path}
prior-sha: {prior SHA}
new-sha: {new SHA}
affected-artifacts: [api-catalog, schemas, ...]
started-at: {ISO timestamp}
last-completed-stage: scope
---
```

## Review gate

Summarize for the user: N commits, M changed files, which K of the 5 artifacts need amendments. Call out any surprises (many commits but only one artifact affected, or vice versa). Get approval to proceed to amendments.

## Next

`references/stage-02-amend.md`
