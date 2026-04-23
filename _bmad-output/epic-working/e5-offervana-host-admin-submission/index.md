---
slug: e5-offervana-host-admin-submission
ado-epic-id: 7781
ado-url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7781
ado-parent-epic-id: 7776
ado-parent-epic-url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7776
work-item-type: Feature
mode: mcp
action: update-existing
started-at: 2026-04-17T00:00:00Z
completed-at: 2026-04-17T00:00:00Z
---

# E5 — Offervana Host-Admin Submission — Epic Working Sidecar

## Amendment 2026-04-22 — Pivot to Enterprise OuterApi + Offers Fetch

**Not re-enriched on ADO yet.** Architecture doc §0 (`_bmad-output/planning-artifacts/architecture-e5-offervana-host-admin-submission.md`) is the source of truth for the pivot; this note tracks what's changed since the original 2026-04-17 enrichment so future runs don't re-apply stale decisions.

**Scope delta:**
- **Submit target switched** from `POST /api/services/app/CustomerAppServiceV2/CreateHostAdminCustomer` (`[AllowAnonymous]`) to `POST /openapi/Customers?pullPropertyData=true` on a dedicated **Offervana enterprise tenant**. Auth via `apiKey` header + `OuterApiKeyFilter`. New env var `OFFERVANA_API_KEY`.
- **New capability — offers fetch.** After the seller form Server Action redirects to `/get-started/thanks`, the thanks page issues a client fetch against a server-only BFF route (`GET /api/offers?ref=<referralCode>`) that proxies `GET /openapi/OffersV2?propertyId={propertyId}` with the server-only API key. Offers surface into `/portal` "Cash offers" section (portal already exists at `src/app/portal/`).
- **No platform notifications to seller.** Suppression at two layers: (1) per-request flag on `CreateCustomerDto`, (2) enterprise tenant configured with email/SMS templates disabled. DoD now requires a live smoke-test showing zero platform-originated email/SMS post-create.
- **Offervana_SaaS companion PR removed.** No enum 13/14, no `CustomerAppServiceV2` switch arms, no `CommerceAttribution` edits. Enterprise tenancy + existing OuterApi eliminates the cross-repo dependency. `sellYourHouseFreePath` transitional flag deleted.
- **Story decomposition:** S7 (Offervana companion PR) **deleted**; **S9 (Offers BFF + `/thanks` fetch) added**. Net 8 → 8. S2 + S3 retarget to OuterApi endpoint + `CreateCustomerDto`; S1 + S4 add a `property_id` column to `offervana_idempotency` so the offers BFF can resolve it by `ReferralCode`.

**What survives unchanged from the original enrichment:**
- BFF-owned idempotency, Supabase dead-letter, Node runtime + `maxDuration=15`, `after()` post-response work, native `fetch` + manual retry, `server-only` guard, pure mapper, email-conflict as non-failure, CSRF inheritance from E3. All the non-endpoint decisions from the original 17 locked decisions still apply.

**Open items carried into story work:**
- Confirm exact suppress-notifications field name on `CreateCustomerDto` during S3 (memory catalog doesn't fully enumerate the DTO). If absent, a small Offervana_SaaS PR adding it re-introduces a scoped companion dependency.
- Decide final offers-display split between `/thanks` (count / warm cache) and `/portal` "Cash offers" section during S9.

**Not yet propagated:**
- ADO Feature 7781 description still reflects the host-admin / companion-PR approach. Needs a rev bump (4 → 5) with the §0 amendment rolled into the description. Rename consideration: "E5 — Offervana Host-Admin Submission" → "E5 — Offervana Enterprise Submission + Offers Fetch" (title no longer accurate).
- Child Stories not yet created; `/zoo-core-create-story e5` should consume the post-amendment architecture doc, not the 2026-04-17 state.

---

## What this invocation did

**Enrichment, not creation.** ADO Feature **7781** already existed (rev 3, filed 2026-04-16 at plan-project time under parent Epic **7776**) with a skeleton description (summary + DoD + payload scaffold + the Path A / Path B framing). This run replaced `System.Description` wholesale with a post-architecture body mirroring E1 (7777) / E2 (7778) / E3 (7779) / E4 (7780):

- Parent / build-order / depends / feeds / scope / companion-change header
- Summary grounded in architecture §1 (replace happy-path body only, `[AllowAnonymous]`, no schema migration, BFF-owned idempotency)
- 17 decisions locked (Server Action reuse, Node runtime + `maxDuration=15`, `after()` post-response, native `fetch` + manual retry, ValueTuple normalization, Supabase idempotency + dead-letter, email-conflict as non-failure, `?ref=unassigned` redirect on permanent failure, enum additions 13/14, transitional `sellYourHouseFreePath` flag, hard-coded `isSellerSource`/`submitterRole`/`sendPrelims`, pure mapper, `server-only` guard, PascalCase wire format, no circuit breaker, CSRF inherited from E3)
- 8 pattern anchors with Next.js 16 doc citations
- Surfaces delivered table (1 Server Action body rewrite, 1 page copy tweak, 2 Supabase tables, 1 log stream)
- Key module surface — new files under `src/lib/offervana/*` + `src/lib/supabase/*` + `supabase/migrations/*`
- Edits to existing files (5 touchpoints in actions.ts, thanks page, seller-form types, .env.example, next.config.ts)
- Companion PR section for `Offervana_SaaS` (Customer.cs enum additions, CustomerAppServiceV2.cs switch arms, landingPageTag + CommerceAttribution.Source ternaries)
- Out-of-scope list (8 items — explicit handoffs to E6/E8, plus circuit breaker + dead-letter paging)
- 10 feature-level Gherkin gates as Definition of Done (happy path, idempotency replay, transient retry behavior, email-conflict handling, service-role-key bundle audit, `server-only` enforcement, progressive enhancement, `after()` hook execution, enrichment-tolerant submit, standalone-ship fallback)
- 8-story decomposition (S1..S8) with sizing + critical sequencing + parallelism notes
- Env vars (`OFFERVANA_BASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) / packages (`@supabase/supabase-js`, `server-only`) / references / bleeding-edge stack warning

Rev bumped **3 → 4** in place. Hierarchy preserved (parent link to 7776 intact). Title preserved (`E5 — Offervana Host-Admin Submission`). Work item type preserved (`Feature`).

## Intentionally NOT in the Feature body

- Per-story acceptance criteria — those land on each child Story via `/zoo-core-create-story e5`
- Full `NewClientDto` request body JSON (§4.1 of architecture) — lives in architecture doc; duplicating in ADO would rot
- Full Supabase migration SQL (§3.1.8 of architecture) — lives in architecture doc
- Side-effect list on Offervana (§4.1 "11 side effects" from `CreateHostAdminCustomer`) — architecture §4.1 is the canonical reference; ADO body summarizes
- Deviation justification table (§5 deviations with "who accepts the risk") — summarized once in "Decisions locked"; full "why + who" table remains in architecture §5 for readers who need depth
- `Microsoft.VSTS.TCM.ReproSteps` — left at the pre-enrichment skeleton content (ReproSteps is a bug-type field; unusual on a Feature; not rewritten to avoid unintended consumers). Matches E1/E2/E3/E4 precedent.
- Architecture §2 ASCII component diagram — too wide for ADO HTML rendering; left in architecture for implementers

## Inputs consumed

- `_bmad-output/planning-artifacts/architecture-e5-offervana-host-admin-submission.md` (full — §1 summary, §2 component diagram, §3 per-service changes, §4 integration contracts, §5 pattern decisions + deviations, §6 open questions, §7 story decomposition, §8 references)
- `_bmad-output/arch-working/e5-offervana-host-admin-submission/index.md` (architect working sidecar — §services-in-scope, dependency map, survey targets, open questions)
- `_bmad-output/planning-artifacts/project-plan-sell-house-for-free.md` §4 E5 + §7 Offervana endpoints (via architecture cross-references)
- Current Feature 7781 body (preserved tone + Path A / Path B framing; carried forward into "Decisions locked" as the enum-13/14 routing + transitional fallback rules)
- ADO Feature 7780 (E4) — structural template for enriched Feature descriptions (HTML format, section order, gate phrasing, story table shape)
- `_bmad-output/epic-working/e4-property-data-enrichment/index.md` — sidecar structural template

## Decisions

- **Update in place, not new Epic/Feature.** Matches E1 (7777) / E2 (7778) / E3 (7779) / E4 (7780) precedent; umbrella hierarchy was established at `/zoo-core-plan-project` time.
- **Work item type: Feature** (umbrella Epic is 7776; E1–E8 are Features underneath). The `Epic` in this skill's name is BMad naming convention — ADO semantics are Feature-under-Epic here.
- **Title preserved** as `E5 — Offervana Host-Admin Submission`. Scope hasn't changed; title still communicates both the audience (host-admin tenant) and the action (submission).
- **AC style:** Feature-level Gherkin given/when/then, testable, anchored to runtime behavior + observable signals (DevTools Network, `next build` output, bundle grep, log stream) — not implementation detail. 10 gates chosen; per-story E2E stays at story level (E5-S8).
- **HTML formatting:** ADO stores `System.Description` as HTML; sent explicit `<p>`/`<h2>`/`<ul>`/`<ol>`/`<table>`/`<code>` markup so bullets, tables, and code spans render predictably. Arrows (`→`) and em-dashes (`—`) sent as literal Unicode (rendered correctly in E1/E2/E3/E4).
- **Decisions-locked section pattern:** flattened architecture §5 "Decisions" + "Deviations" into a single bulleted list — kept the "why" terse; full reasoning with citations and risk-owner stays in architecture doc §5.
- **Story decomposition:** adopted architecture §7's 8-story split verbatim with sizing + notes. Critical-sequencing + parallelism paragraph reproduced so PM reviewers can see the DAG without opening the architecture doc.

## Cross-service impact

- **`sell-house-for-free`** — primary. Replaces happy-path body of `src/app/get-started/actions.ts`; adds `src/lib/offervana/{client,mapper,errors,idempotency,dead-letter}.ts`; adds `src/lib/supabase/{server,schema}.ts`; adds two Supabase tables + one enum via `supabase/migrations/*`; adds 3 env vars; pins Node runtime + `maxDuration=15`. ~8 new lib files, 5 edits.
- **`Offervana_SaaS`** — companion PR, minor. Append two `CustomerLeadSource` enum values (13, 14) in `Customer.cs`; route through existing `leadType` switch in `CustomerAppServiceV2.cs` to `CashOffersLandingPage`; extend `landingPageTag` + `CommerceAttribution.Source` ternaries. **No DB migration, no new endpoint.** Parallel-shippable — E5's mapper has a `CustomerLeadSource = 11` + `sellYourHouseFreePath` fallback so either side can land first.
- **No other services touched.** No `Zoodealio.MLS` changes (E4 owns that integration), no `Zoodealio.Strapi` changes, no direct ATTOM calls, no buyer-side repos. Offervana's existing `ValidateAvmValue` fires automatically post-create and handles its own ATTOM AVM enrichment inside the platform.

## Parent hierarchy

```
Epic 7776 — Sell Your House Free (AZ) — Client-Facing Marketing & Submission Funnel
├── Feature 7777 — E1 Site Foundation & Design System          (enriched)
├── Feature 7778 — E2 Core Marketing Pages + Trust Surface     (enriched)
├── Feature 7779 — E3 Seller Submission Flow (front-end)       (enriched)
├── Feature 7780 — E4 Property Data Enrichment (ATTOM + MLS)   (enriched)
└── Feature 7781 — E5 Offervana Host-Admin Submission          ← this run
    └── (Stories S1–S8 to be filed via /zoo-core-create-story e5)
```

## Next steps

1. Review the rendered Feature at https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7781 — confirm wording matches house style and the pattern matches E1–E4.
2. Run `/zoo-core-create-story e5` to decompose the 8 stories (S1–S8) as ADO User Stories under Feature 7781.
3. E5 implementation is gated on E3 landing the Server Action stub + `SellerFormDraft` shape and on E4 landing the `EnrichmentSlot` shape. E5-S1 (Supabase scaffolding) can start in parallel with E3/E4 since it has zero Offervana coupling.
4. In parallel, continue per-Feature architecture for the next Feature on the critical path: **E6 → 7782** (PM service + confirmation page; consumes the `ReferralCode` correlation key and shares the Supabase client) via `/zoo-core-create-architecture`.
5. Coordinate Offervana companion PR (E5-S7) timing with the platform owner — can ship before, alongside, or after the Next.js work since the mapper has a fallback.

## Not done

- `Microsoft.VSTS.TCM.ReproSteps` not rewritten (see "Intentionally NOT" above).
- No child Stories created — that's `/zoo-core-create-story e5`'s job.
- No ADO comment added — description replacement is self-documenting via rev history; E1–E4 precedent did not add comments either.
- No iteration path / area path change — defaults inherited (`Offervana_SaaS`). Plan-project left iteration unset; PM may re-assign when sprint planning picks E5 up.
- Offervana companion PR (E5-S7) not filed as a cross-repo link on 7781. If the team wants a hard link from this Feature to the Offervana_SaaS PR once it's opened, a targeted `/fields/System.Description` addendum or an artifact link works.
