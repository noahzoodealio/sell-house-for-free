#!/usr/bin/env python3
"""One-shot generator for zoo-core slash-command files (Claude + Cursor).

Produces 30 files per tool, one per user-facing zoo-core skill, plus a single
human-readable reference (`COMMANDS.md`) grouped by category. Subprocess
skills (zoo-core-attom-reference) are intentionally excluded — they're not
user-facing.

Run once during module packaging. After generation, the `claude/` and
`cursor/` directories contain the shipped command files that zoo-core-setup
copies into the consumer's .claude/commands/ and .cursor/commands/, and
`COMMANDS.md` is copied to {project-root}/_bmad/zoo-core-commands.md.

Slash-command filenames match the skill names exactly — one `zoo-core-*`
namespace everywhere, no short aliases.
"""

from __future__ import annotations
from pathlib import Path

# (skill name — used as both cmd filename and activation target, short description)
Group = tuple[str, list[tuple[str, str]]]

GROUPS: list[Group] = [
    ("Agents", [
        ("zoo-core-agent-lead",      "Activate the Zoo-Core Lead agent — conversational hub with transparent delegation"),
        ("zoo-core-agent-analyst",   "Activate the Zoo-Core Analyst — requirements research and problem-space discovery"),
        ("zoo-core-agent-architect", "Activate the Zoo-Core Architect — ecosystem-aware technical design"),
        ("zoo-core-agent-pm",        "Activate the Zoo-Core PM — ADO epics, stories, bugs"),
        ("zoo-core-agent-dev",       "Activate the Zoo-Core Dev — full-stack implementation to Zoodealio patterns"),
        ("zoo-core-agent-qa",        "Activate the Zoo-Core QA — ADO test cases + automated unit tests"),
        ("zoo-core-agent-ux",        "Activate the Zoo-Core UX — PrimeNG specs with Figma integration"),
    ]),
    ("Orchestrator workflows", [
        ("zoo-core-dev-epic",     "Autopilot implementation of an ADO Epic"),
        ("zoo-core-dev-story",    "Implement an ADO Story end-to-end"),
        ("zoo-core-dev-bug",      "Fix an ADO Bug with root-cause tracing"),
        ("zoo-core-dev-basic",    "Lightweight dev flow without ADO ceremony"),
        ("zoo-core-plan-project", "Scope a project into an epic map and ADO Feature"),
        ("zoo-core-pr-triage",    "Triage PR review comments and apply approved changes"),
    ]),
    ("Single-step operational", [
        ("zoo-core-research-analysis",   "Ecosystem-aware problem-space research"),
        ("zoo-core-create-architecture", "Design a technical solution grounded in Zoodealio patterns"),
        ("zoo-core-create-epic",         "File an ADO Epic with cross-service impact"),
        ("zoo-core-create-story",        "Decompose scope into ADO User Stories"),
        ("zoo-core-create-bug",          "File an ADO Bug with data-flow tracing"),
        ("zoo-core-code-review",         "Pattern and cross-service integration compliance review"),
        ("zoo-core-create-tests",        "Generate ADO Test Cases for human QA"),
        ("zoo-core-unit-testing",        "Generate automated unit tests with 3-iteration fix loop"),
        ("zoo-core-ux-design",           "Produce a PrimeNG component specification"),
    ]),
    ("Generators (maintainer only)", [
        ("zoo-core-full-index",  "First-time crawl of a reference repo"),
        ("zoo-core-diff-update", "Incremental knowledge-base update from git diffs"),
    ]),
    ("Utilities", [
        ("zoo-core-context-search", "Query the Zoo-Core knowledge base with citations"),
        ("zoo-core-show-schema",    "Look up an entity schema across services"),
        ("zoo-core-find-endpoint",  "Search API endpoints across services"),
    ]),
    ("Bootstrap + hygiene", [
        ("zoo-core-onboard",       "Bootstrap the zoo-core workspace — resolve repo paths + scaffold local memory"),
        ("zoo-core-curate-memory", "Zoo-core shared memory hygiene (dual-mode maintainer/consumer)"),
    ]),
]

COMMANDS: list[tuple[str, str]] = [cmd for _, cmds in GROUPS for cmd in cmds]

CLAUDE_TEMPLATE = """---
description: '{desc}'
disable-model-invocation: true
---

Activate the `{skill}` skill. Follow its SKILL.md at `{{project-root}}/.claude/skills/{skill}/SKILL.md` — including the preflight check (which may invoke `zoo-core-onboard` first if required files are missing).
"""

CURSOR_TEMPLATE = """---
description: '{desc}'
---

Activate the `{skill}` skill. Follow its SKILL.md at `{{project-root}}/.claude/skills/{skill}/SKILL.md` — including the preflight check (which may invoke `zoo-core-onboard` first if required files are missing).
"""


REFERENCE_HEADER = """# Zoo-Core Slash Commands

Human-readable index of every zoo-core slash command shipped by the module.
Commands are available in both Claude Code (`.claude/commands/`) and Cursor
(`.cursor/commands/`). Each command activates the matching skill at
`.claude/skills/<name>/SKILL.md`.

Total: {count} commands.
"""


def render_reference() -> str:
    lines = [REFERENCE_HEADER.format(count=len(COMMANDS))]
    for group_name, cmds in GROUPS:
        lines.append(f"## {group_name} ({len(cmds)})\n")
        for skill, desc in cmds:
            lines.append(f"- **`/{skill}`** — {desc}")
        lines.append("")
    return "\n".join(lines)


def main() -> int:
    here = Path(__file__).resolve().parent
    claude_dir = here / "claude"
    cursor_dir = here / "cursor"
    claude_dir.mkdir(parents=True, exist_ok=True)
    cursor_dir.mkdir(parents=True, exist_ok=True)

    written = 0
    for skill, desc in COMMANDS:
        claude_body = CLAUDE_TEMPLATE.format(desc=desc, skill=skill)
        cursor_body = CURSOR_TEMPLATE.format(desc=desc, skill=skill)
        (claude_dir / f"{skill}.md").write_text(claude_body, encoding="utf-8")
        (cursor_dir / f"{skill}.md").write_text(cursor_body, encoding="utf-8")
        written += 2

    (here / "COMMANDS.md").write_text(render_reference(), encoding="utf-8")

    print(f"Wrote {written} command files: {len(COMMANDS)} claude + {len(COMMANDS)} cursor, plus COMMANDS.md")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
