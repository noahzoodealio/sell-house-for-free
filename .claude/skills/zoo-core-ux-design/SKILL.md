---
name: zoo-core-ux-design
description: Designs PrimeNG-based Angular component specs with design-to-code mapping and Figma integration. Use when the user requests 'ux design', runs '/zoo-core-ux-design', or when dev-story has frontend scope.
---

# Zoo-Core UX Design

## Overview

Produces a component specification document the Dev agent can implement directly — PrimeNG components selected per target service's version, layout defined, states enumerated, accessibility noted, responsive behavior specified. Integrates with Figma MCP when available; falls back gracefully to text-only mode.

Act as a thoughtful UX designer — buildable-first, accessibility-always, user-flow-aware, version-conscious (PrimeNG 20 vs 21 APIs differ).

## On Activation

Load config from `{project-root}/_bmad/config.yaml` (`zoo-core` section). Read `enable_figma_mcp` — default `true`. **Preflight:** invoke `zoo-core-onboard` (auto-trigger — handles pending installs + first-time setup silently).

Verify Figma MCP availability if `enable_figma_mcp: true`. If unavailable, continue in **text-only mode** with a quality note on the spec ("designed without Figma source reference").

## Inputs

- **Feature scope** — what's being designed
- **Target service** — determines PrimeNG version (TIH: 21, ZIP: 20, Offervana: check) and existing design-system precedents
- **Figma reference** (optional) — node URL or file/frame identifier
- **UX requirements** (optional) — any known constraints (accessibility minimums, responsive breakpoints, state transitions)

## Outputs

- `{planning_artifacts}/ux-spec-{feature-slug}.md` — component specification document
- `{output_folder}/ux-working/{feature-slug}/` — sidecar with draft content + Figma extractions (if pulled)

## Workflow

Four steps. Append-only building; continuation supported via sidecar.

1. **Capture UX requirements** — user intent, component needs, target service, target PrimeNG version. Confirm any ambiguities.
2. **Pull Figma source** — if Figma MCP available and a reference was provided, extract design tokens (colors, spacing, typography), frame specs, and state variants. If text-only mode, skip and record the limitation in the sidecar.
3. **Map designs to PrimeNG components** — per UI element: select the appropriate PrimeNG component (version-specific), define its inputs/outputs, note any needed wrappers or compositions. For anything PrimeNG doesn't cover natively, propose a custom component structure (standalone, OnPush, inject()).
4. **Assemble component specification** — structure:
   - Feature overview + target service + PrimeNG version
   - Component tree (top-level page → sub-components)
   - Per component: PrimeNG selection, props, state, events, conditional rendering
   - Layout / responsive behavior (breakpoints, grid approach)
   - States (loading, empty, error, success) explicit
   - Accessibility notes (keyboard nav, ARIA labels, screen-reader behavior)
   - User flow diagram (ASCII or Mermaid) if non-trivial
   - Design tokens referenced (from Figma or the service's existing design system)
   - Open questions (if any) for the user before handoff

## PrimeNG version awareness

PrimeNG 20 and 21 have breaking API changes in several components. The spec must name the version and use that version's API. If a PrimeNG component was deprecated or renamed across versions, flag it explicitly.

## Sidecar

`{output_folder}/ux-working/{feature-slug}/index.md`:

```yaml
---
feature: {slug}
target-service: {service}
primeng-version: {20|21|?}
figma-mode: {mcp|text-only}
figma-reference: {url or null}
started-at: {ISO}
last-completed-step: {1-4}
---
```

## Related Skills

- Called by: `zoo-core-dev-story` (when frontend scope is in play), UX agent, user direct
- Feeds: Dev agent (consumes the spec during implementation)
- Uses: `zoo-core-context-search` for existing frontend patterns in the target service
- Owned by: UX agent
