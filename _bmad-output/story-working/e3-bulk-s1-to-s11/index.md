---
slug: e3-bulk-s1-to-s11
parent-epic-id: 7779
parent-epic-url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7779
ado-grandparent-epic-id: 7776
ado-grandparent-epic-url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7776
mode: bulk
mode-ado: mcp
stories-planned:
  - e3-s1-funnel-shell-routing-metadata
  - e3-s2-seller-form-core-lib
  - e3-s3-sellerform-orchestrator
  - e3-s4-address-step-and-seam
  - e3-s5-property-step
  - e3-s6-condition-step
  - e3-s7-contact-consent-step
  - e3-s8-server-action-and-thanks
  - e3-s9-analytics-events
  - e3-s10-a11y-hardening
  - e3-s11-draft-recovery-polish
stories-created:
  - id: 7811
    url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7811
    title: "E3-S1 — Funnel shell + routing: get-started layout/page/loading/error/thanks + buildMetadata noindex + routes append"
    size: S
  - id: 7812
    url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7812
    title: "E3-S2 — Seller-form core: types + Zod schemas + draft/attribution/idempotency/analytics + instrumentation-client"
    size: M
  - id: 7813
    url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7813
    title: "E3-S3 — <SellerForm> orchestrator: URL-driven step state + useActionState + useFormStatus + focus move"
    size: M
  - id: 7814
    url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7814
    title: "E3-S4 — Address step + <AddressField> E4 seam: AZ-only guards, onAddressComplete hook"
    size: M
  - id: 7815
    url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7815
    title: "E3-S5 — Property facts step: bedrooms/bathrooms/sqft/yearBuilt/lotSize (all optional, E4 enrichment pre-fills)"
    size: S
  - id: 7816
    url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7816
    title: "E3-S6 — Condition & timeline step: currentCondition radio + timeline select + optional motivation textarea"
    size: S
  - id: 7817
    url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7817
    title: "E3-S7 — Contact + consent step: contact fields + <ConsentBlock> + placeholder consent constants (E7 replaces)"
    size: M
  - id: 7818
    url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7818
    title: "E3-S8 — submitSellerForm Server Action + confirmation redirect + /api/submit dev-echo"
    size: S
  - id: 7819
    url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7819
    title: "E3-S9 — Analytics wiring: step_entered/completed/submitted + visibilitychange/pagehide abandonment beacon"
    size: S
  - id: 7820
    url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7820
    title: "E3-S10 — A11y + keyboard + focus hardening + responsive QA + audit memo"
    size: S
  - id: 7821
    url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7821
    title: "E3-S11 — Draft-recovery UX + error boundary polish + idempotent-retry closeout"
    size: XS
started-at: 2026-04-17T00:00:00Z
completed-at: 2026-04-18T02:05:00Z
last-completed-step: 5
---

# E3 bulk S1→S11 — PM Working Sidecar

## Plan

Eleven stories decomposing Feature **7779** per architecture §7. Sequencing:

- **S1 unblocks everything** — funnel shell + routing
- **S2 unblocks S3–S8** — canonical payload shape + libs
- **S3 unblocks S4–S7** — orchestrator wraps the four step components
- **S4, S5, S6, S7 run in parallel** — four contributors once S3 lands
- **S8 closes happy-path spine** — Server Action + stub submit + confirmation redirect
- **S9, S10, S11 parallel polish** — analytics, a11y, draft-recovery

All eleven filed as User Story children under Feature 7779 via `wit_add_child_work_items` with area/iteration path `Offervana_SaaS`, matching siblings 7785–7807 (E1 + E2 stories). Monotonic IDs 7811–7821.

### Filing order

S1 (7811) → S2 (7812) → S3 (7813) → S4 (7814) → S5 (7815) → S6 (7816) → S7 (7817) → S8 (7818) → S9 (7819) → S10 (7820) → S11 (7821). Monotonic numeric sequence preserves at-a-glance readability in ADO.

## Execution log

### Filed in order

1. **7811** — E3-S1 Funnel shell + routing. 16 ACs. `get-started/layout.tsx` + `page.tsx` (replaces E1-S5 placeholder) + `loading.tsx` + `error.tsx` (`"use client"`) + `thanks/page.tsx` + one-line edits to `lib/seo.ts` (add `noindex` option) and `lib/routes.ts` (append two `excludeFromSitemap: true` entries). Async `searchParams` + allowlist coercion + Suspense-wrap for S3's `useSearchParams`. Notes pin Next.js 16 async-searchParams + error.tsx `"use client"` constraints.
2. **7812** — E3-S2 Seller-form core library. 20 ACs. Seven new files: `src/lib/seller-form/{types,schema,draft,attribution,analytics,idempotency}.ts` + `src/instrumentation-client.ts`. Adds `zod` dep. Canonical `SellerFormDraft` + `EnrichmentSlot` (E4 contract) + `SubmitState`. Zod `z.infer`'d types (single source of truth). AZ zip regex `/^8[5-6]\d{3}$/`. `localStorage` for draft (PII-stripped), `sessionStorage` for attribution/idempotency/entry. `crypto.randomUUID`. Unit tests called out for 100% schema branch coverage.
3. **7813** — E3-S3 `<SellerForm>` orchestrator. 20 ACs. Client Component replaces S1 placeholder. URL-driven step state via `useSearchParams` (in Suspense per S1). `router.replace({ scroll: false })` for step advance. `useActionState` + `useFormStatus` (child-component pattern explicitly called out). Focus-move-to-heading on step change. Hidden inputs for non-step data (submissionId/idempotencyKey/attribution). Exhaustive switch dispatch with `never` default. `aria-live` region. Placeholder step exports so S4–S7 can parallelize.
4. **7814** — E3-S4 Address step + `<AddressField>` seam. 18 ACs. Five fields (street1/street2/city/state-disabled-AZ/zip). `<AddressField>` is the **E4 integration seam** with pinned prop signature. AZ zip range validation + state literal. Correct `autoComplete` tokens (`street-address`/`address-level1-2`/`postal-code`). `onAddressComplete` fires once on newly-complete state. Notes pin contract-stability with E4.
5. **7815** — E3-S5 Property facts step. 16 ACs. Five numeric fields, **all optional** (E4 enriches). Bathrooms `step=0.5` half-baths. `yearBuilt` range 1850–currentYear. Number-input spinner hidden via CSS. Copy discipline: doesn't overpromise E4's auto-fill.
6. **7816** — E3-S6 Condition & timeline step. 14 ACs. Fieldset+legend radio group (3 options: move-in/needs-work/major-reno). Native `<select>` for timeline (4 options). Optional 500-char motivation textarea with live counter. Pillar-hint explicitly NOT pre-selected (architecture §6 open question resolved in MVP).
7. **7817** — E3-S7 Contact + consent step. 19 ACs. Four PII fields + `<ConsentBlock>` with three separate checkboxes (TCPA/Terms/Privacy). Placeholder consent constants with `isPlaceholder: true` **launch gate** for E8. `version` + `acceptedAt` timestamp recorded per consent. Phone format-on-blur (not masked input). Contact + consent NEVER rehydrate from localStorage draft (PII/consent-proof posture). Consent text inline (not modal).
8. **7818** — E3-S8 Server Action + thanks + `/api/submit`. 18 ACs. `"use server"`. Contract-stable signature E5 preserves. FormData parser with safe JSON.parse. `validateAll` server-side authority. `redirect()` throws signal (no try/catch). Idempotency key == submissionId in MVP. `/api/submit` dev-echo for S9 beacons. Production log-redaction TODO flagged for E8.
9. **7819** — E3-S9 Analytics wiring. 15 ACs. No new files — wires S2 helpers into S3 orchestrator. `trackStepEntered` on mount + step change. `trackStepCompleted` before advance. `trackFormSubmitted` once via `state.ok === true` + useRef guard. Abandonment via `visibilitychange` + `pagehide` + `navigator.sendBeacon` (not fetch) to `/api/submit`. `submittedRef` guard prevents abandoned-after-submit pollution. No PII, no third-party origins — belt-and-suspenders.
10. **7820** — E3-S10 A11y + keyboard + focus hardening + audit memo. 17 ACs. Cross-cutting audit of all prior stories. Focus-to-heading + focus-to-first-invalid. aria-live coverage for step changes + errors + submit. Touch targets ≥ 44x44 (WCAG 2.2 2.5.8). Mobile keyboard variants. Axe + Lighthouse thresholds. `prefers-reduced-motion`. JS-disabled sanity check. Deliverable: `docs/e3-a11y-audit.md` for E8 launch gate.
11. **7821** — E3-S11 Draft-recovery polish. 16 ACs. XS closeout. Resume banner (`<ResumeBanner>`, `role="status"` not `role="alert"`). `error.tsx` copy polish + Go-home link. Idempotency-key reuse on retry (sessionStorage-backed). sessionStorage-scoped banner dismiss. Banner is calm/brand-subtle; no `prefers-reduced-motion` violation.

### Content decisions (cross-story patterns)

- **Blueprint stability.** Every story follows the same section cadence as E1/E2 siblings (banner → User story → Summary → Files touched → Acceptance criteria → Technical notes → Suggested tasks → Out of scope → References → Notes). Matches parent Feature 7779's HTML formatting.
- **AC count scales with correctness-sensitive surface, not story size.** S1 (16), S2 (20), S3 (20), S4 (18), S5 (16), S6 (14), S7 (19), S8 (18), S9 (15), S10 (17), S11 (16). S2 + S3 + S4 + S7 + S8 earn more ACs because they define downstream contracts or carry PII/consent responsibilities.
- **Forward-compat contracts made explicit in technical notes.** S2's `SellerFormDraft` shape (E5 consumes), S4's `<AddressField>` prop signature (E4 swaps implementation), S7's consent-constant shape + `isPlaceholder` flag (E7 replaces text, E8 launch gate), S8's Server Action signature (E5 replaces body only). Every one has explicit "don't break this later" language.
- **Bleeding-edge Next.js 16 call-outs.** Every Notes tail pins the single most-likely training-data regression for that story: S1 async `searchParams` + `error.tsx "use client"`; S2 `instrumentation-client.ts` file location + `onRouterTransitionStart` export name; S3 `useFormStatus` child-component pattern + `router.replace` (not `push`); S4 `<AddressField>` E4 contract stability; S5 all-optional discipline; S6 `<fieldset>`/`<legend>` semantics; S7 `isPlaceholder` launch-gate + three-checkbox regulatory pattern; S8 `redirect()` throws-signal + `"use server"` position; S9 `sendBeacon` (not fetch) + React Strict Mode guards; S10 Strict Mode focus-effect + iOS VoiceOver aria-live quirks; S11 `role="status"` not `role="alert"` + sessionStorage idempotency.
- **Architecture §5 deviations enforced.** No React Hook Form (S2/S3). No address autocomplete in MVP (S4 seam). URL-driven step state via `router.replace` (S3). Draft persistence strips PII (S2/S7). Server Action primary, route handler dev-echo (S8). Consent placeholders with `isPlaceholder` gate (S7). Custom first-party abandonment tracking, no replay (S9). No CAPTCHA in MVP (S7).

### Bulk-mode compaction

Each story drafted individually and filed via `wit_add_child_work_items` immediately (one item per call; monotonic IDs). Per-story deep context discarded between drafts. Feature 7779 body + architecture §7 decomposition table re-referenced by memory rather than re-fetched.

### Style match to E1 + E2 siblings

- Same HTML vocabulary (`<h2>`, `<ul>`, `<ol>`, `<code>`, `<strong>`, `<em>`). No tables in E3 stories (no tabular content needed; E2's S8/S10 had pillar/city tables, E3 doesn't).
- Same area/iteration path (`Offervana_SaaS` / `Offervana_SaaS`).
- State `New`, priority `2`.
- `Microsoft.VSTS.TCM.ReproSteps` auto-populated by ADO with the same HTML — matches E1/E2 siblings.

### Format bug avoided (E2 lessons applied)

All eleven stories filed with `format: "Html"` placed **inside each item object** (not top-level). The E2 bug (S1–S9 of E2 filed with top-level `format`, stored as markdown-escaped HTML) was avoided from story 1. Confirmed via API response: every story shows `"multilineFieldsFormat":{"System.Description":"html","Microsoft.VSTS.TCM.ReproSteps":"html"}`. Code samples like `<code>&lt;SellerForm&gt;</code>` preserve literal entity refs correctly.

## Not done

- No tags assigned (matches E1/E2 precedent).
- No assignees, no sprint iteration (matches E1/E2; sprint planning will assign).
- Did not append patterns to `zoo-core-agent-pm/ado-history.md` — directory still doesn't exist.
- No inter-story `Related` links filed in ADO. Hierarchy (Parent) link is on each story pointing at 7779; sibling dependencies documented in each story body under `Depends on` / `Blocks`.
- Figma frames not fetched — per architecture working sidecar §"Not done", per-step designs should be requested during individual story pickup (S3/S4/S7 most likely to want them), not during decomposition.

## Next steps

1. Review the eleven rendered stories on ADO: 7811–7821. Spot-check that HTML renders cleanly (no escaped `<p>` tags like E2's S1–S9 bug).
2. Feature 7779 is now fully decomposed — E3 is ready for sprint planning. All 11 stories filed.
3. **Critical path for parallel work:** S1 unblocks everything. S2 unblocks S3–S8. S3 unblocks S4–S7 (4 parallel contributors). S8 closes happy-path. S9–S11 parallel polish. E3 implementation is gated on E1 stories landing first (E1-S5 at minimum — supplies the `/get-started` placeholder S1 replaces). E3 work can start in parallel with E2's later stories once E1 core is in.
4. E4 architecture pickup next: the `<AddressField>` seam + `EnrichmentSlot` contract are defined; E4 is the first Feature that genuinely depends on E3's client-side contracts being stable.
5. Suggested next skill: `/zoo-core-create-architecture` for E4 (address enrichment / ATTOM+MLS wiring) and/or E5 (Offervana submission back-end).
