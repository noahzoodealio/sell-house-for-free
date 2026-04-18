---
slug: e3-seller-submission-flow
ado-epic-id: 7779
ado-url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7779
ado-parent-epic-id: 7776
ado-parent-epic-url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7776
work-item-type: Feature
mode: mcp
action: update-existing
started-at: 2026-04-18T01:40:00Z
completed-at: 2026-04-18T01:44:00Z
---

# E3 — Seller Submission Flow (front-end) — Epic Working Sidecar

## What this invocation did

**Enrichment, not creation.** ADO Feature **7779** already existed (rev 2, filed 2026-04-16 at plan-project time under parent Epic **7776**) with a skeleton description (scope summary + 5-bullet DoD). This run replaced the description with a post-architecture body that mirrors the shape of E1 (7777) and E2 (7778):

- Parent / build-order / depends / feeds / scope header
- Summary grounded in architecture §1–§2 (four-step flow, canonical `SellerFormDraft`, Server Action boundary, first-party-only analytics)
- Decisions locked (11 items) — Server Actions, URL-driven step state, Zod schemas, PII-stripped `localStorage` draft, `crypto.randomUUID` idempotency, instrumentation-client attribution, `@vercel/analytics` first-party events, no CAPTCHA/RHF/autocomplete in MVP, `noindex` metadata
- Pattern anchors (8 items with Next.js 16 / React 19 doc citations)
- Pages / routes delivered table (5 routes)
- Key module surface (new) — `lib/seller-form/*`, `content/consent/*`, `instrumentation-client.ts`, `app/get-started/*`, `components/get-started/*`
- Out-of-scope list (7 items — explicit handoffs to E4/E5/E6/E7/E8)
- 11 feature-level Gherkin gates as Definition of Done (progressive-enhancement, deep-link hints, validation authority, draft rehydration, idempotency-key reuse, noindex, Lighthouse/Axe, analytics PII-freedom, prerender correctness)
- 11-story decomposition with sizing + parallelism notes (S1 unblocks all; S3 unblocks the four parallel step stories; S9–S11 overlap)
- Env vars (none) / packages added (`zod`) / references / bleeding-edge Next 16 warning

Rev bumped **2 → 3** in place. Hierarchy preserved (parent link to 7776 intact). Title preserved (`E3 — Seller Submission Flow (front-end)`). Work item type preserved (`Feature`).

## Intentionally NOT in the Feature body

- Per-story acceptance criteria — those land on each child Story via `/zoo-core-create-story e3`
- Full Zod schema / TS type bodies — live in architecture doc §3–§4 and will be materialized during S2 implementation
- Pattern decision citations table with reasoning — lives in architecture doc §5 (kept out to avoid double-maintenance)
- `Microsoft.VSTS.TCM.ReproSteps` — left at rev-2 skeleton content (ReproSteps is a bug-type field; unusual on a Feature; not rewritten to avoid unintended consumers). If ADO reports read ReproSteps instead of Description, re-run targeted at that field.

## Inputs consumed

- `_bmad-output/planning-artifacts/architecture-e3-seller-submission-flow.md` (full — §1 summary, §2 component diagram, §3 per-service changes, §4 integration contracts, §5 pattern decisions + deviations, §7 story decomposition, §8 references)
- `_bmad-output/arch-working/e3-seller-submission-flow/index.md` (architect working sidecar)
- `_bmad-output/planning-artifacts/project-plan-sell-house-for-free.md` §4 E3 (via architecture cross-references)
- Current Feature 7779 body (preserved tone, shape references)
- ADO Feature 7778 (E2) — structural pattern for enriched Feature descriptions (HTML format, section order, gate phrasing)

## Decisions

- **Update in place, not new Epic/Feature.** Matches E1 (7777) and E2 (7778) precedent; umbrella hierarchy was established at `/zoo-core-plan-project` time.
- **Work item type: Feature** (per user: "making this as a feature on ADO via MCP under the parent epic"). The `Epic` in this skill's name is the BMad-naming convention — ADO semantics are Feature-under-Epic.
- **AC style:** Feature-level Gherkin given/when/then, testable, anchored to runtime behavior and observable signals (Lighthouse, Axe, DevTools network, ADO rendering) — not implementation detail.
- **HTML formatting:** ADO stores `System.Description` as HTML; sent explicit `<p>`/`<h2>`/`<ul>`/`<ol>`/`<table>`/`<code>` markup so bullets + code spans + tables render predictably. Arrows (`→`) and em-dashes (`—`) sent as literal Unicode (rendered fine in E1/E2).
- **Decisions-locked section pattern:** flattened from architecture §5 "Decisions" + "Deviations" into a single bulleted list — kept the "why" terse; full reasoning remains in architecture doc §5 for readers who need the depth.

## Cross-service impact

**None.** E3 is entirely in-repo (`sell-house-for-free`). No Offervana_SaaS, no Zoodealio.MLS, no Zoodealio.Strapi changes. The canonical `SellerFormDraft` payload shape is designed *for* E5 to map to Offervana's `NewClientDto`, but E5 owns that translation — E3 ships no live cross-service call.

## Parent hierarchy

```
Epic 7776 — Sell Your House Free (AZ) — Client-Facing Marketing & Submission Funnel
├── Feature 7777 — E1 Site Foundation & Design System          (enriched)
├── Feature 7778 — E2 Core Marketing Pages + Trust Surface     (enriched)
└── Feature 7779 — E3 Seller Submission Flow (front-end)       ← this run
    └── (Stories S1–S11 to be filed via /zoo-core-create-story e3)
```

## Next steps

1. Review rendered Feature at https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7779 — confirm wording matches house style and the pattern matches E1/E2.
2. Run `/zoo-core-create-story e3` to decompose the 11 stories (S1–S11) as ADO User Stories under Feature 7779.
3. E3 implementation is gated on E1 stories landing first (E1-S5 at minimum supplies the `/get-started` placeholder route E3-S1 replaces). E3 work can start in parallel with E2's later stories once E1 core is in.
4. In parallel, continue per-Feature architecture for the next Feature in critical path: **E4 → 7780** via `/zoo-core-create-architecture`.

## Not done

- `Microsoft.VSTS.TCM.ReproSteps` not rewritten (see "Intentionally NOT" above).
- No child Stories created — that's `/zoo-core-create-story`'s job.
- No ADO comment added — description replacement is self-documenting via rev history; E1/E2 precedent didn't add comments either.
