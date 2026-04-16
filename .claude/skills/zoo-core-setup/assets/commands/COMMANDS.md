# Zoo-Core Slash Commands

Human-readable index of every zoo-core slash command shipped by the module.
Commands are available in both Claude Code (`.claude/commands/`) and Cursor
(`.cursor/commands/`). Each command activates the matching skill at
`.claude/skills/<name>/SKILL.md`.

Total: 29 commands.

## Agents (7)

- **`/zoo-core-agent-lead`** — Activate the Zoo-Core Lead agent — conversational hub with transparent delegation
- **`/zoo-core-agent-analyst`** — Activate the Zoo-Core Analyst — requirements research and problem-space discovery
- **`/zoo-core-agent-architect`** — Activate the Zoo-Core Architect — ecosystem-aware technical design
- **`/zoo-core-agent-pm`** — Activate the Zoo-Core PM — ADO epics, stories, bugs
- **`/zoo-core-agent-dev`** — Activate the Zoo-Core Dev — full-stack implementation to Zoodealio patterns
- **`/zoo-core-agent-qa`** — Activate the Zoo-Core QA — ADO test cases + automated unit tests
- **`/zoo-core-agent-ux`** — Activate the Zoo-Core UX — PrimeNG specs with Figma integration

## Orchestrator workflows (6)

- **`/zoo-core-dev-epic`** — Autopilot implementation of an ADO Epic
- **`/zoo-core-dev-story`** — Implement an ADO Story end-to-end
- **`/zoo-core-dev-bug`** — Fix an ADO Bug with root-cause tracing
- **`/zoo-core-dev-basic`** — Lightweight dev flow without ADO ceremony
- **`/zoo-core-plan-project`** — Scope a project into an epic map and ADO Feature
- **`/zoo-core-pr-triage`** — Triage PR review comments and apply approved changes

## Single-step operational (9)

- **`/zoo-core-research-analysis`** — Ecosystem-aware problem-space research
- **`/zoo-core-create-architecture`** — Design a technical solution grounded in Zoodealio patterns
- **`/zoo-core-create-epic`** — File an ADO Epic with cross-service impact
- **`/zoo-core-create-story`** — Decompose scope into ADO User Stories
- **`/zoo-core-create-bug`** — File an ADO Bug with data-flow tracing
- **`/zoo-core-code-review`** — Pattern and cross-service integration compliance review
- **`/zoo-core-create-tests`** — Generate ADO Test Cases for human QA
- **`/zoo-core-unit-testing`** — Generate automated unit tests with 3-iteration fix loop
- **`/zoo-core-ux-design`** — Produce a PrimeNG component specification

## Generators (maintainer only) (2)

- **`/zoo-core-full-index`** — First-time crawl of a reference repo
- **`/zoo-core-diff-update`** — Incremental knowledge-base update from git diffs

## Utilities (3)

- **`/zoo-core-context-search`** — Query the Zoo-Core knowledge base with citations
- **`/zoo-core-show-schema`** — Look up an entity schema across services
- **`/zoo-core-find-endpoint`** — Search API endpoints across services

## Bootstrap + hygiene (2)

- **`/zoo-core-onboard`** — Bootstrap the zoo-core workspace — resolve repo paths + scaffold local memory
- **`/zoo-core-curate-memory`** — Zoo-core shared memory hygiene (dual-mode maintainer/consumer)
