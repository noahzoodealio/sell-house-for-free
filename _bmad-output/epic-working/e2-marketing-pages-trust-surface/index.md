---
slug: e2-marketing-pages-trust-surface
ado-epic-id: 7778
ado-url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7778
ado-parent-epic-id: 7776
ado-parent-epic-url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7776
work-item-type: Feature
mode: mcp
started-at: 2026-04-17T21:00:00Z
completed-at: 2026-04-17T21:05:00Z
---

# E2 — Core Marketing Pages + Trust Surface — Epic Working Sidecar

## What this invocation did

**Enrichment, not creation.** ADO Feature **7778** already existed (created 2026-04-16 under parent Epic **7776** "Sell Your House Free (AZ) — Client-Facing Marketing & Submission Funnel") with a rev-3 description written at planning time (3 pillar pages, Q7 CMS still open). This run replaced the description with a post-architecture body that mirrors the shape of E1's enriched Feature 7777:

- Parent / build order / depends / scope header
- Summary (4 pillar pages incl. Renovation-Only differentiator; MDX pipeline; handrolled component library; JSON-LD helpers; anti-broker claim registry)
- Decisions locked per rev 4 plan + architecture (brand, content format, content-as-data, FAQ, JSON-LD, city routing, typography opt-outs)
- Pattern anchors (MDX plugin, `mdx-components.tsx`, Server Components default, typed `LINKS`, `buildMetadata()`, sitemap auto-append)
- Pages delivered table (11 routes, primary schema.org per route)
- Out of scope (explicit)
- Feature-level gates restated as Given/When/Then
- 11-story decomposition with sizing (S1-S5 unblock S6-S10; S11 closeout)
- Env vars (none new; E2 consumes E1's)
- References + Notes

## Inputs consumed

- `_bmad-output/planning-artifacts/project-plan-sell-house-for-free.md` (rev 4)
- `_bmad-output/planning-artifacts/architecture-e2-marketing-pages-trust-surface.md`
- `_bmad-output/arch-working/e2-marketing-pages-trust-surface/index.md` (architect working sidecar)
- `_bmad-output/planning-artifacts/architecture-e1-site-foundation.md` (for inherited contracts)
- ADO Feature 7777 (E1) — structural pattern for enriched Feature descriptions

## Cross-service impact

**None.** E2 is entirely in-repo (`sell-house-for-free`). No Offervana_SaaS, no Zoodealio.MLS, no Zoodealio.Strapi changes. The PM roster placeholder content S9 ships will be replaced by E6 when the Supabase-backed roster lands; no coordination required between epics for that handoff.

## Parent hierarchy

```
Epic 7776 — Sell Your House Free (AZ) — Client-Facing Marketing & Submission Funnel
├── Feature 7777 — E1 Site Foundation & Design System
└── Feature 7778 — E2 Core Marketing Pages + Trust Surface  ← this run
    └── (Stories S1-S11 to be filed via /zoo-core-create-story)
```

## Next steps

1. Review Feature 7778 on ADO; confirm wording matches house style.
2. Run `/zoo-core-create-story e2` to decompose the 11 stories as ADO User Stories under Feature 7778.
3. E2 implementation is gated on E1 stories landing first (sequencing per project plan §6) — E2 story work can start as soon as E1-S5 (route groups + marketing layout) ships, since S1-S5 of E2 don't depend on components E1-S6+ delivers.
