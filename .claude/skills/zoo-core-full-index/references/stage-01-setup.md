# Stage 01 — Setup

**Goal:** Resolve the service repo path, validate it's the real thing, create the sidecar, capture the commit SHA being indexed.

## Resolve repo path

Read `{project-root}/_bmad/memory/zoo-core/repo-paths.local.yaml`:

- If `repo_paths[service-name]` is set → use it (explicit override)
- Else if `workspace_path` is set → resolve as `{workspace_path}/{repo_directories[service-name]}/` using `repo_directories` from `{project-root}/_bmad/memory/zoo-core/repo-paths.yaml`
- Else → prompt the user for a path, save to `repo-paths.local.yaml`

## Validate

Confirm the resolved path exists and contains the `validation_markers[service-name]` file (from `repo-paths.yaml`). If validation fails, re-prompt — don't index a wrong repo.

## Capture the commit SHA

Run `git rev-parse HEAD` in the resolved repo path. Record the SHA — this is the index's pinned version. `zoo-core-diff-update` will use this SHA as the starting point for incremental updates later.

Also capture: current branch (`git rev-parse --abbrev-ref HEAD`), any dirty working tree (`git status --porcelain`). Warn the user if the working tree is dirty — the index would capture uncommitted state, which isn't reproducible.

## Create sidecar

Create `{output_folder}/full-index-working/{service-name}/` and write `index.md` with:

```yaml
---
service-name: {service-name}
repo-path: {resolved path}
commit-sha: {captured SHA}
branch: {captured branch}
dirty: {true|false}
started-at: {ISO timestamp}
last-completed-stage: setup
---
```

## Next

Stage 01 done. Move to `references/stage-02-crawl-apis.md` after user confirmation.
