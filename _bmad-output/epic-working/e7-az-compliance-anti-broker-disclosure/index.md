---
slug: e7-az-compliance-anti-broker-disclosure
ado-epic-id: 7783
ado-url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7783
ado-parent-epic-id: 7776
ado-parent-epic-url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7776
work-item-type: Feature
mode: mcp
action: update-existing
started-at: 2026-04-18T02:09:00Z
completed-at: 2026-04-18T02:13:00Z
---

# E7 — AZ Compliance & Anti-Broker Disclosure — Epic Working Sidecar

## What this invocation did

**Enrichment, not creation.** ADO Feature **7783** already existed (rev 3, filed 2026-04-16 at plan-project time under parent Epic **7776**) with a planning-time skeleton (scope summary + DoD bullets). This run replaced `System.Description` with a post-architecture body that mirrors the shape of E1 (7777), E2 (7778), and E3 (7779):

- Parent / build-order / depends / feeds / scope header
- Summary grounded in architecture §1 (six legal pages, consent version registry, JK Realty attribution, claim-behavior symmetry as organizing invariant)
- Decisions locked (15 items) — MDX for prose pages, TS constants for consent copy (resolves E3 §3.4 open question), append-only version registry, indexable legal pages, env-configurable broker license, footer-from-ROUTES, no cookie banner, no class-action waiver, AZ-only scope, dedicated `/tcpa-consent` archive, fold-vs-separate privacy recommendation, handrolled ethos
- Pattern anchors (9 items with upstream-arch citations — E1 `buildMetadata` / `ROUTES` / `SITE` / footer; E2 MDX pipeline / `schema.ts` / `anti-broker/claims.ts`; E3 `content/consent/*` placeholders)
- Pages / routes delivered table (6 routes with format + JSON-LD + purpose)
- Key module surface (new or extended) — 11 file-level deltas (6 MDX pages, layout, 3 consent constants + new versions.ts + barrel, site.ts, routes.ts, footer.tsx, legal SVG asset, cookie-policy.md, .env.example)
- Out-of-scope list (7 items — explicit handoffs to E8 and clarifications vs E3/E5)
- Feature-level Gherkin gates (12 given/when/then) — route 200s, metadata emission, footer correctness, claim-vs-policy alignment, version-registry invariants, consent payload correctness, axe clean, cookie-free flow, no third-party PII hosts, production-env license gate, sitemap presence
- Proposed story decomposition (12 stories) — S1 config prereq, S2 footer, S3 registry shell, S4 consent copy (legal-review gated), S5-S10 the six page shipments, S11 cookie-policy doc, S12 layout chrome polish
- Acceptance-criteria cadence (axe per page, visual-regression screenshot, legal-review sign-off checkbox on S4/S6/S7, claim↔policy diff in S6)
- Env vars (1 — `NEXT_PUBLIC_BROKER_LICENSE`) / packages added (none) / open questions (6 — all non-blocking for arch, tracked for copy/ship gates) / references / notes

Rev bumped **3 → 4** in place. Hierarchy preserved (parent link to 7776 intact). Title preserved (`E7 — AZ Compliance & Anti-Broker Disclosure`). Work item type preserved (`Feature`).

## Intentionally NOT in the Feature body

- Per-story acceptance criteria — those land on each child Story via `/zoo-core-create-story e7`
- Full legal-copy drafts (TCPA text, ToS text, privacy policy text) — copy is authored inside S4/S6/S7 implementation PRs with legal-review sign-off; Feature body captures the structural invariants (version bump + append to `versions.ts`, claim↔policy alignment, etc.) not the prose itself
- Full pattern-decision table with deviations + justifications — lives in architecture doc §6 (kept out to avoid double-maintenance)
- `Microsoft.VSTS.TCM.ReproSteps` — left at rev-3 skeleton content (ReproSteps is a bug-type field; unusual on a Feature; E2/E3 precedent did not rewrite it). If ADO reports read ReproSteps instead of Description, re-run targeted at that field.

## Inputs consumed

- `_bmad-output/planning-artifacts/architecture-e7-az-compliance-anti-broker-disclosure.md` (full — §1 summary, §2 component diagram, §3 per-service changes, §4 content authoring guidelines, §5 integration contracts, §6 pattern decisions + deviations, §7 open questions, §8 suggested story boundaries, §9 references)
- `_bmad-output/arch-working/e7-az-compliance-anti-broker-disclosure/index.md` (architect working sidecar — 5 steps complete)
- `_bmad-output/planning-artifacts/project-plan-sell-house-for-free.md` §4 E7, §3 non-functionals, §7 Q2/Q10/Q12 (via architecture cross-references)
- Current Feature 7783 body (preserved tone, shape references)
- ADO Feature 7779 (E3) — structural pattern for enriched Feature descriptions (HTML format, section order, gate phrasing). E3 pattern chosen over E2 because E7 resolves E3's §3.4 open question directly, so mirroring E3's shape keeps the cross-epic thread legible.

## Decisions

- **Update in place, not new Epic/Feature.** Matches E1 (7777), E2 (7778), E3 (7779) precedent; umbrella hierarchy was established at `/zoo-core-plan-project` time.
- **Work item type: Feature** (per E1/E2/E3 precedent on this project). The `Epic` in this skill's name is the BMad-naming convention — ADO semantics are Feature-under-Epic.
- **AC style:** Feature-level Gherkin given/when/then, testable, anchored to runtime behavior and observable signals (axe, DevTools network, `document.cookie`, metadata emission, ADO rendering) — not implementation detail. Content correctness itself is gated by legal-review sign-off in per-story ACs, not asserted in Feature gates.
- **HTML formatting:** ADO stores `System.Description` as HTML; sent explicit `<p>`/`<h2>`/`<ul>`/`<ol>`/`<table>`/`<code>` markup so bullets + code spans + tables render predictably. Arrows (`→`, `↔`), em-dashes (`—`), and section signs (`§`) sent as literal Unicode (rendered fine in E1/E2/E3).
- **Decisions-locked section pattern:** flattened from architecture §6 "Decisions" + "Deviations" into a single bulleted list — kept the "why" terse; full reasoning remains in architecture doc §6 for readers who need the depth.
- **12-story decomposition preserved from architecture §8.** One story per legal page (6) + S1 config + S2 footer + S3 registry + S4 consent copy + S11 cookie-policy doc + S12 layout chrome. Architecture already validated sequencing + sizing; PM preserves both.
- **Cross-epic touch called out explicitly in S1** (back-fill `group: 'marketing'` on E2 routes). Surfacing the coordination point in the Feature body so Story authoring + code-review catch it.

## Cross-service impact

**None.** E7 is entirely in-repo (`sell-house-for-free`). No Offervana_SaaS, no Zoodealio.MLS, no Zoodealio.Strapi changes. E5 consumes E7's consent version strings as free-form JSON inside Offervana `NewClientDto.SurveyData` (already a flexible string field) — no Offervana schema change; E5 owns that translation. E6 consumes E7's stable legal URLs (`/privacy`, `/terms`) by absolute URL in email templates — no behavior coupling. E8 audits E7's outputs (claim↔policy alignment, cookie-free flow, license gate, version registry) — again, no code coupling, just observable-signal verification.

## Parent hierarchy

```
Epic 7776 — Sell Your House Free (AZ) — Client-Facing Marketing & Submission Funnel
├── Feature 7777 — E1 Site Foundation & Design System          (enriched)
├── Feature 7778 — E2 Core Marketing Pages + Trust Surface     (enriched)
├── Feature 7779 — E3 Seller Submission Flow (front-end)       (enriched)
├── Feature 7780 — E4 Property Data Enrichment                 (pending)
├── Feature 7781 — E5 Offervana Submission Integration         (pending)
├── Feature 7782 — E6 PM Service & Confirmation                (pending)
├── Feature 7783 — E7 AZ Compliance & Anti-Broker Disclosure   ← this run
│   └── (Stories S1–S12 to be filed via /zoo-core-create-story e7)
└── Feature 7784 — E8 Launch Readiness                         (pending)
```

## Next steps

1. Review rendered Feature at https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7783 — confirm wording matches house style and the pattern matches E1/E2/E3.
2. Run `/zoo-core-create-story e7` to decompose the 12 stories (S1–S12) as ADO User Stories under Feature 7783.
3. E7 implementation is gated on E1 (`(legal)` layout + `SITE`/`ROUTES`/`buildMetadata`), E2 (MDX pipeline + `schema.ts` + `anti-broker/claims.ts`), and E3 (consent-constant placeholders). E7 work can start as soon as those dependencies' relevant stories land; S1/S3 unblock the rest.
4. Legal-review gate: arrange AZ-licensed consumer-protection attorney review before S4/S6/S7 merge. The Feature body tracks this as an open question; the per-story ACs will encode the sign-off checkbox.
5. Continue per-Feature architecture for the next Feature in critical path: **E5 → 7781** via `/zoo-core-create-architecture` (E4 arch already present per git status).

## Not done

- `Microsoft.VSTS.TCM.ReproSteps` not rewritten (see "Intentionally NOT" above).
- No child Stories created — that's `/zoo-core-create-story`'s job.
- No ADO comment added — description replacement is self-documenting via rev history; E1/E2/E3 precedent did not add comments either.
- No PM memory write to `_bmad/memory/zoo-core-agent-pm/ado-history.md` — the directory does not exist yet; PM agent can initialize it on first confirmed phrasing-pattern success. This run did not introduce surprising phrasing that warrants a new memory entry; shape mirrors E3 1:1.
