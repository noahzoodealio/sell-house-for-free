---
slug: e1-site-foundation
ado-epic-id: 7777
ado-url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7777
ado-work-item-type: Feature
ado-parent-id: 7776
ado-parent-url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7776
mode: mcp
action: update-existing
started-at: 2026-04-16T23:10:00Z
completed-at: 2026-04-16T23:10:05Z
---

# E1 — Site Foundation & Design System — PM Working Sidecar

## Action taken

Updated existing ADO Feature 7777 (revision 1 → 2) in place rather than creating a new work item. The umbrella hierarchy (Epic 7776 → Feature 7777..7784) was filed by `/zoo-core-plan-project`; the current skill enriched 7777's description with architecture-derived content while preserving the hierarchy.

## Scope of the update

Replaced the skeleton description (scope + generic DoD bullets) with:
- Parent / build-order / scope banner
- Summary grounded in the architecture doc
- Pattern anchors (6 items — App Router, Tailwind v4, next/font, file-based metadata, semantic tokens, handrolled primitives)
- Explicit out-of-scope list (6 items — defers CSP/Sentry/api routes/Supabase/content/dark mode)
- 6 feature-level Gherkin gates as Definition of Done
- Proposed 11-story decomposition (one line each, no per-story ACs — those land when `/zoo-core-create-story` runs)
- Environment variables (`NEXT_PUBLIC_SITE_URL`, `SITE_ENV`)
- References (architecture doc, plan doc, Figma node)
- Bleeding-edge stack warning (per `AGENTS.md`)

Intentionally **NOT** in the Feature body:
- Per-story acceptance criteria (will live on each child Story)
- Full design-token CSS block (lives in architecture doc)
- Pattern decision table with citations (lives in architecture doc)

## Inputs consumed

- `_bmad-output/planning-artifacts/project-plan-sell-house-for-free.md` §4 E1
- `_bmad-output/planning-artifacts/architecture-e1-site-foundation.md` (full)
- `_bmad-output/arch-working/e1-site-foundation/index.md`
- Current Feature 7777 body (preserved tone)

## Decisions

- **User-confirmed via AskUserQuestion:** update in place (not a new Epic), feature-level ACs only.
- **AC style:** Gherkin given/when/then, testable, anchored to runtime behavior not implementation detail.
- **HTML formatting:** ADO stores the field as HTML; sent explicit `<h2>`/`<ul>`/`<code>` markup so bullets + code spans render predictably.

## Next steps

1. Review rendered Feature at https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7777
2. Decompose to 11 Stories via `/zoo-core-create-story` (one per story in the proposed list)
3. In parallel, architecture for the next Feature in critical path (E3 → 7779) via `/zoo-core-create-architecture`

## Not done

- `Microsoft.VSTS.TCM.ReproSteps` (populated with the skeleton) was not rewritten. ReproSteps is a bug-type field and is unusual on a Feature; left as-is. If ADO reports are reading ReproSteps instead of Description, re-run with that field targeted.
- No children (Stories) created here — that's `/zoo-core-create-story`'s job.
