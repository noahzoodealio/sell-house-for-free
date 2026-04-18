---
slug: e4-property-data-enrichment
ado-epic-id: 7780
ado-url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7780
ado-parent-epic-id: 7776
ado-parent-epic-url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7776
work-item-type: Feature
mode: mcp
action: update-existing
started-at: 2026-04-18T02:10:00Z
completed-at: 2026-04-18T02:12:08Z
---

# E4 — Property Data Enrichment (ATTOM + MLS) — Epic Working Sidecar

## What this invocation did

**Enrichment, not creation.** ADO Feature **7780** already existed (rev 2, filed 2026-04-16 at plan-project time under parent Epic **7776**) with a skeleton description (ATTOM + MLS scope summary and DoD) and a rev-3 in-body note that MLS is now the single enrichment source. This run replaced `System.Description` wholesale with a post-architecture body mirroring E1 (7777) / E2 (7778) / E3 (7779):

- Parent / build-order / depends / feeds / scope header
- Summary grounded in architecture §1 (single `POST /api/enrich` BFF, MLS-only, envelope-always-200, client combobox + hook)
- 14 decisions locked (MLS sole source, one BFF route for both enrich/suggest, HTTP 200 + envelope.status, `unstable_cache` keyed by SHA-256, `AbortSignal.timeout(4000)`, read-only, `server-only` discipline, Node + force-dynamic, 400ms client debounce, Headless UI exception, `private, no-store`, no CAPTCHA in MVP, history endpoint deferred, `unstable_cache` vs `use cache` deviation)
- 8 pattern anchors with Next.js 16 doc citations
- Surfaces delivered table (1 route, 1 hook, 4 components)
- Key module surface — new files under `src/lib/enrichment/*` and `src/components/get-started/*`
- Edits to existing files (7 touchpoints in seller-form, steps, schema, `next.config.ts`)
- Out-of-scope list (7 items — explicit handoffs to E5/E6/E7/E8, plus MLS history, bearer rollout, out-of-area blocking)
- 10 feature-level Gherkin gates as Definition of Done (pre-fill, listed notice, photo strip, degraded submit, address-never-logged, cache headers, force-dynamic + server-only enforcement, 24h cache hit, out-of-area envelope, Axe + Lighthouse)
- 10-story decomposition (S1..S10) with sizing + critical sequencing
- Env vars (`MLS_API_BASE_URL`, `MLS_API_TOKEN`, `ENRICHMENT_TIMEOUT_MS`, `ENRICHMENT_CACHE_TTL_SECONDS`, `ENRICHMENT_DEV_MOCK`) / packages (`@headlessui/react`) / SAS rotation callout / references / bleeding-edge stack warning

Rev bumped **2 → 3** in place. Hierarchy preserved (parent link to 7776 intact). Title preserved (`E4 — Property Data Enrichment (ATTOM + MLS)`) — the body explains the MLS-sole-source simplification inline rather than churning the title. Work item type preserved (`Feature`).

## Intentionally NOT in the Feature body

- Per-story acceptance criteria — those land on each child Story via `/zoo-core-create-story e4`
- Full Zod schema / DTO field tables — live in architecture doc §4 (`EnrichInput`, `EnrichmentEnvelope`) and §4.5 (MLS→slot field mapping) and will be materialized during S1/S3 implementation
- Pattern-decisions-with-citations reasoning table — lives in architecture doc §5 (kept out to avoid double-maintenance; pattern anchors in the body point to the canonical doc)
- Deviation justifications (Headless UI exception, HTTP 200 always, single-route over split, `unstable_cache` vs `use cache`) — summarized once in the "Decisions locked" block; full "why + who accepts the risk" table remains in architecture §5 deviations
- `Microsoft.VSTS.TCM.ReproSteps` — left at the rev-2 skeleton content (ReproSteps is a bug-type field; unusual on a Feature; not rewritten to avoid unintended consumers). Matches E1/E2/E3 precedent. If ADO reports read ReproSteps instead of Description, re-run targeted at that field.
- Architecture §2 ASCII component diagram — too wide for ADO HTML rendering; left in the architecture doc for implementers

## Inputs consumed

- `_bmad-output/planning-artifacts/architecture-e4-property-data-enrichment.md` (full — §1 summary, §2 component diagram, §3 per-service changes, §4 integration contracts, §5 pattern decisions + deviations, §6 open questions, §7 story decomposition, §8 references)
- `_bmad-output/arch-working/e4-property-data-enrichment/index.md` (architect working sidecar)
- `_bmad-output/planning-artifacts/project-plan-sell-house-for-free.md` §4 E4 + §7 "Known facts captured from investigations" (via architecture cross-references — MLS endpoints, SAS rotation date, de-facto anonymous auth)
- Current Feature 7780 body (preserved tone; the rev-3 in-body note that "MLS is the single enrichment source" was consistent with architecture §1 and carried forward)
- ADO Feature 7779 (E3) — structural template for enriched Feature descriptions (HTML format, section order, gate phrasing, story table shape)
- `_bmad-output/epic-working/e3-seller-submission-flow/index.md` — sidecar structural template

## Decisions

- **Update in place, not new Epic/Feature.** Matches E1 (7777) / E2 (7778) / E3 (7779) precedent; umbrella hierarchy was established at `/zoo-core-plan-project` time.
- **Work item type: Feature** (umbrella Epic is 7776; E1–E8 are Features underneath). The `Epic` in this skill's name is BMad naming convention — ADO semantics are Feature-under-Epic here.
- **Title preserved** as `E4 — Property Data Enrichment (ATTOM + MLS)`. Even though architecture re-scoped to MLS-only, the title still communicates the two data domains the seller gets (property facts + listing state) without implying two upstream services. Changing the title mid-plan risks breaking external links or ADO queries.
- **AC style:** Feature-level Gherkin given/when/then, testable, anchored to runtime behavior + observable signals (DevTools Network, `next build` output, Axe, Lighthouse, log stream) — not implementation detail. 10 gates chosen; S9's per-path E2E remains at story level.
- **HTML formatting:** ADO stores `System.Description` as HTML; sent explicit `<p>`/`<h2>`/`<ul>`/`<ol>`/`<table>`/`<code>` markup so bullets, tables, and code spans render predictably. Arrows (`→`) and em-dashes (`—`) sent as literal Unicode (rendered correctly in E1/E2/E3).
- **Decisions-locked section pattern:** flattened architecture §5 "Decisions" + "Deviations" into a single bulleted list — kept the "why" terse; full reasoning with citations and risk-owner stays in architecture doc §5 for readers who need depth.
- **Story decomposition:** adopted architecture §7's 10-story split verbatim with sizing + notes. Critical-sequencing paragraph reproduced so PM reviewers can see parallelism without opening the architecture doc.

## Cross-service impact

- **`sell-house-for-free`** — primary; adds `src/app/api/enrich/route.ts` + `src/lib/enrichment/*` + 4 new components + 7 edits. ~12 new files, 7 edits.
- **`Zoodealio.MLS`** — **read-only consume.** No platform-side changes. E4 hits three documented endpoints (`/properties/search`, `/properties/attom/{attomId}`, `/properties/{mlsRecordId}/images`) as a new caller. De-facto anonymous today (per plan §7); forward-compat Bearer header is env-driven.
- **No other services touched.** No Offervana_SaaS changes, no Zoodealio.Strapi changes, no direct ATTOM calls, no buyer-side repos. The enrichment slot is designed so E5 can forward `attomId` / `mlsRecordId` / `listingStatus` to Offervana's `NewClientDto` — but E5 owns that translation.

## Parent hierarchy

```
Epic 7776 — Sell Your House Free (AZ) — Client-Facing Marketing & Submission Funnel
├── Feature 7777 — E1 Site Foundation & Design System          (enriched)
├── Feature 7778 — E2 Core Marketing Pages + Trust Surface     (enriched)
├── Feature 7779 — E3 Seller Submission Flow (front-end)       (enriched)
└── Feature 7780 — E4 Property Data Enrichment (ATTOM + MLS)   ← this run
    └── (Stories S1–S10 to be filed via /zoo-core-create-story e4)
```

## Next steps

1. Review the rendered Feature at https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7780 — confirm wording matches house style and the pattern matches E1–E3.
2. Run `/zoo-core-create-story e4` to decompose the 10 stories (S1–S10) as ADO User Stories under Feature 7780.
3. E4 implementation is gated on E3 landing the `<AddressField>` seam + `SellerFormDraft.enrichment` slot + `submissionId` correlation key (E3 architecture §4.3). E4-S1 can start in parallel with E3's later stories once the E3 draft store is in.
4. In parallel, continue per-Feature architecture for the next Feature on the critical path: **E5 → 7781** (real Offervana submission; consumes the enrichment slot E4 leaves on the draft) via `/zoo-core-create-architecture`.
5. During E4-S10, author `docs/operations/sas-rotation.md` and file a calendar reminder for the **2027-02-11** SAS expiry so E8 launch-readiness re-tests before cutover.

## Not done

- `Microsoft.VSTS.TCM.ReproSteps` not rewritten (see "Intentionally NOT" above).
- No child Stories created — that's `/zoo-core-create-story e4`'s job.
- No ADO comment added — description replacement is self-documenting via rev history; E1/E2/E3 precedent did not add comments either.
- Title not changed to reflect MLS-only re-scope (see "Decisions"). If the team wants the title updated post-review, a second targeted run on `/fields/System.Title` is trivial.
- No iteration path / area path change — defaults inherited (`Offervana_SaaS`). Plan-project left iteration unset; PM may re-assign when sprint planning picks E4 up.
