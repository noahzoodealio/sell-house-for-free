---
name: zoo-core-code-review
description: Reviews implementation against Zoodealio patterns and cross-service integration correctness. Use when the user requests 'code review', runs '/zoo-core-code-review', or when dev-story/dev-epic needs inner review.
---

# Zoo-Core Code Review

## Overview

Verifies that code changes adhere to Zoodealio conventions (two-database, MediatR CQRS, layered projects, standalone Angular components + OnPush + inject(), AutoMapper, JWT, CodeRabbit standards) and that cross-service integrations use the documented contracts. Produces a structured verdict.

Inner review in `zoo-core-dev-epic`'s 3-strike rule — when dev-epic autopilots, this is what determines "pass" vs "retry."

Act as a senior code reviewer — source-level precision, cite file + line + violated pattern per finding, distinguish critical from advisory.

## On Activation

Load config from `{project-root}/_bmad/config.yaml` (`zoo-core` section). **Preflight:** invoke `zoo-core-onboard` (auto-trigger — handles pending installs + first-time setup silently).

## Inputs

- **Diff source** — one of:
  - Git range (e.g., `main..HEAD`, or a specific commit range)
  - PR URL (ADO or GitHub)
  - File list (absolute paths)
  - Orchestrator handoff context (dev-epic invoking inline)

## Outputs

- Structured review report at `{output_folder}/review-working/{slug}/review-report.md` — **candidate for HTML report** in v2 with findings grouped by severity + pattern
- Verdict: `pass` / `pass-with-issues` / `fail`
- `{output_folder}/review-working/{slug}/` — sidecar

## Workflow

Four steps.

1. **Load changes** — resolve diff source; list affected files + line ranges. Create working scope.
2. **Pattern compliance check** — for each affected file, compare against Zoodealio baseline patterns from `{project-root}/_bmad/memory/zoo-core/curated/patterns.md` + service-specific patterns from `services/{service}/patterns.md`. Flag deviations with file:line + violated pattern name.
3. **Cross-service integration check** — any call crossing service boundaries: verify the target endpoint exists (use `zoo-core-find-endpoint`), verify the request/response shape matches (use `zoo-core-show-schema`), verify the auth pattern is correct. Flag mismatches.
4. **Assemble findings** — structured report:
   - Verdict (pass / pass-with-issues / fail)
   - Findings grouped by severity (critical / high / medium / low)
   - Per finding: file:line, violated pattern, recommended fix, citation to the pattern source
   - CodeRabbit compliance summary (if known patterns tracked in `curated/patterns.md`)
   - Advisory notes (optional observations that don't block)

## Verdict rules

- **Fail** — any critical finding (broken integration contract, pattern deviation without justification, auth misuse, EF migration without confirmation halt)
- **Pass-with-issues** — high findings present but none critical
- **Pass** — no high or critical findings; medium/low advisory items OK

## Sidecar

`{output_folder}/review-working/{slug}/index.md`:

```yaml
---
slug: {review-slug}
diff-source: {type + identifier}
files-reviewed: {count}
verdict: {pass|pass-with-issues|fail}
critical-count: {N}
high-count: {N}
started-at: {ISO}
last-completed-step: {1-4}
---
```

## Continuation

Supports resume — the sidecar preserves per-file findings so a compacted run can pick up from where it stopped.

## Related Skills

- Called by: `zoo-core-dev-story`, `zoo-core-dev-epic`, `zoo-core-dev-bug`, Dev agent, user direct
- Uses: `zoo-core-find-endpoint`, `zoo-core-show-schema`, `zoo-core-context-search`
- Owned by: Dev agent
