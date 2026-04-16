---
name: zoo-core-unit-testing
description: Writes, runs, and validates automated unit tests with framework-adaptive best practices and up to 3 fix iterations. Use when the user requests 'unit testing', runs '/zoo-core-unit-testing', or when a dev orchestrator needs automated test coverage.
---

# Zoo-Core Unit Testing

## Overview

Generates automated unit test code that lives in the repo alongside the implementation. Framework-adaptive: detects the stack in use (xUnit / NUnit for .NET, Vitest or similar modern runner for non-Angular frontends, pytest for Python) and produces tests matching that stack's conventions. Runs the tests, iterates on failures up to 3 rounds, and reports coverage.

**Angular is a special case** — see the Angular rule in Workflow step 1. This skill does not test Angular code unless strict prerequisites are already met, and it will never install runners or upgrade Angular to satisfy them.

Distinct from `zoo-core-create-tests` — that one creates ADO Test Case items for human QA; this one writes code that CI runs.

Act as a senior test engineer — test the behavior, not the implementation; cover ACs explicitly; mock at the boundary, not internally.

## On Activation

Load config from `{project-root}/_bmad/config.yaml` (`zoo-core` section). **Preflight:** invoke `zoo-core-onboard` (auto-trigger — handles pending installs + first-time setup silently). Verify Git CLI available.

## Inputs

- **Implementation context** — file list, branch, or repo path indicating what's under test
- **AC reference** (optional) — parent ADO Story / Bug for context on what behavior the tests must verify
- **Framework override** (optional) — if the target repo has multiple test frameworks, specify which to use

## Outputs

- Test code committed into the target repo's test project(s)
- `{output_folder}/test-working/{slug}/` — sidecar with planning notes + execution results
- Coverage summary (structured; candidate for inclusion in PR description)

## Workflow

Four steps.

1. **Assess scope & detect framework** — scan the target repo for test project patterns. Per-service defaults:
   - Offervana_SaaS (.NET 8 + ABP Zero): xUnit (or the team's convention — read existing tests to confirm). Angular FE skipped (see Angular rule).
   - TIH (.NET 10 + Angular 21 + PrimeNG 21): xUnit backend. FE tests **only if** the repo already has Vitest (or another modern runner) configured — otherwise FE skipped.
   - ZIP (.NET 10 + Angular 20 + PrimeNG 20): xUnit backend. FE skipped (Angular < 21).
   - MLS (.NET 8 Azure Functions): xUnit
   - Chat (Python / Chainlit): pytest
   - Strapi (Node/TS): Vitest if already configured, otherwise Jest. Non-Angular frontends may introduce Vitest when no runner exists.
   Recommend a testing approach if the scope is ambiguous.

   **Angular unit-testing rule (hard gate):**
   - Skip Angular FE unit tests unless **both** conditions hold: Angular major version ≥ 21 **and** the repo already has Vitest (or another modern, Vitest-class runner) configured. Legacy Karma / default `ng test` does **not** qualify.
   - **Never** install Vitest, migrate off Karma, or change the Angular version to satisfy this rule. If prerequisites are missing, report the gap in the sidecar + final summary and halt Angular FE work — continue with backend tests as normal.
   - Non-Angular frontends (Strapi, future Node/TS UIs) **may** introduce Vitest when no runner is configured.
2. **Plan test files** — identify testable units (methods, services, commands, handlers, components). Propose a test-file layout: one test file per unit under test, named per framework convention (e.g., `FooService.cs` → `FooServiceTests.cs`). Present plan for user approval before writing.
3. **Write + execute + iterate** — up to **3 iteration rounds**:
   - Write tests
   - Execute (`dotnet test`, `vitest`, `jest`, `pytest` as appropriate — no `ng test` / Karma runs)
   - Analyze failures — are they real bugs, incorrect tests, or setup issues?
   - Fix + re-run
   If tests still fail after 3 rounds, halt and surface to the user with a findings report (implementation bug vs test flaw assessment).
4. **Present results** — coverage summary, number of tests written, round-count to green, any remaining issues flagged to the user for decision.

## Testing principles

- **Behavior, not implementation** — tests should break when the behavior changes, not when the implementation changes internally
- **AC traceability** — if a parent Story is passed, each AC should have an identifiable test; flag ACs that seem untestable and surface to user
- **Mock at boundaries** — mock external services (HTTP clients, DbContexts, MCP connections); don't mock internal components
- **Naming** — descriptive test method names; convention per framework (e.g., `MethodName_Scenario_ExpectedResult` for xUnit; `it('should ...')` for Jest)

## Personal memory integration

QA reads `{project-root}/_bmad/memory/zoo-core-agent-qa/test-patterns.md` for approved test structures. Reuse approved patterns (setup/teardown, mocking conventions, data builders) rather than reinventing. Append new approved patterns back.

## Sidecar

`{output_folder}/test-working/{slug}/index.md`:

```yaml
---
slug: {test-slug}
target-service: {service}
framework: {xunit|nunit|vitest|jest|pytest}
angular-fe-skipped: {true|false}  # set true with reason if Angular gate failed
angular-fe-skip-reason: {angular-below-21|no-modern-runner|n/a}
units-under-test: [...]
tests-written: {count}
round-count: {1-3}
final-result: {all-green|remaining-failures|halted}
started-at: {ISO}
---
```

## Sub-skill handoff

When invoked by a dev orchestrator (e.g., `zoo-core-dev-story` handing off for test coverage), accept the implementation context directly. The orchestrator passes: files changed, branch, parent Story, relevant AC context.

## Related Skills

- Called by: `zoo-core-dev-story`, `zoo-core-dev-epic`, `zoo-core-dev-bug` (regression), QA agent, user direct
- Complement: `zoo-core-create-tests` (human QA test cases)
- Owned by: QA agent
