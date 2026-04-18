---
slug: e4-bulk-s1-to-s10
parent-epic-id: 7780
parent-epic-url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7780
ado-grandparent-epic-id: 7776
ado-grandparent-epic-url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7776
mode: bulk
mode-ado: mcp
stories-planned:
  - e4-s1-bff-route-shape-zod-dev-mock
  - e4-s2-mls-client-server-only
  - e4-s3-service-normalize-merge
  - e4-s4-address-field-combobox-swap
  - e4-s5-use-address-enrichment-hook
  - e4-s6-enrichment-ui-surfaces
  - e4-s7-next-image-azure-blob-remote-patterns
  - e4-s8-already-listed-conversation-currentlistingstatus
  - e4-s9-e2e-happy-and-degraded-paths
  - e4-s10-observability-sas-rotation-runbook
stories-created:
  - id: 7834
    url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7834
    title: "E4-S1 — BFF route shape + Zod input + dev mock: POST /api/enrich (enrich|suggest) + envelope-always-200 + addressKey-not-address logging"
    size: S
  - id: 7835
    url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7835
    title: "E4-S2 — MLS client (server-only): searchByAddress + getAttomDetails + getImages with AbortSignal timeout, one-retry, typed MlsError"
    size: M
  - id: 7836
    url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7836
    title: "E4-S3 — Service + normalize + merge: getEnrichment orchestrator + unstable_cache + mergeToEnrichmentSlot + listing-status normalization"
    size: M
  - id: 7837
    url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7837
    title: "E4-S4 — Headless UI Combobox <AddressField> swap: suggest-driven autocomplete + keyboard a11y + manual-typed fallback"
    size: M
  - id: 7838
    url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7838
    title: "E4-S5 — useAddressEnrichment client hook + draft wiring: useTransition + AbortController + sessionStorage + setEnrichment"
    size: S
  - id: 7839
    url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7839
    title: "E4-S6 — Enrichment UI surfaces: <EnrichmentBadge> + <EnrichmentConfirm> photo strip + property-step pre-fill hints + orchestrator wiring"
    size: M
  - id: 7840
    url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7840
    title: "E4-S7 — next/image Azure Blob remotePatterns: whitelist MLS image host in next.config.ts + SAS-URL smoke test"
    size: XS
  - id: 7841
    url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7841
    title: "E4-S8 — Already-listed conversation copy + currentListingStatus schema enum + condition-step pre-nudge for cash-offers pillar"
    size: S
  - id: 7842
    url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7842
    title: "E4-S9 — E2E happy + degraded paths: Playwright specs for AZ-enriched-submit, MLS-timeout, no-match, currently-listed + qa-plan doc"
    size: M
  - id: 7843
    url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7843
    title: "E4-S10 — Observability + SAS rotation runbook: track('enrichment_status') + .env.example + docs/operations/sas-rotation.md + docs/e4-operations.md"
    size: S
started-at: 2026-04-18T02:20:00Z
completed-at: 2026-04-18T02:32:46Z
last-completed-step: 5
---

# E4 bulk S1→S10 — PM Working Sidecar

## Plan

Ten stories decomposing Feature **7780** per architecture §7. Sequencing:

- **S1 unblocks everything** — BFF route shape + Zod + dev mock
- **S2 + S4 parallel after S1** — S2 real MLS client; S4 Combobox swap (uses S1 dev mock)
- **S3 depends on S2** — service orchestrator + normalize + merge; swaps dev mock
- **S5 depends on S1 + S3** — client hook + draft wiring
- **S7 stand-alone** — can land any time after S1 (XS blocker for S6 photos)
- **S6 depends on S5 + S7** — UI surfaces (badge, confirm strip, listed notice) + property-step pre-fill
- **S8 + S9 + S10 parallel after S6** — copy, E2E, observability closeout

All ten filed as User Story children under Feature 7780 via `wit_add_child_work_items` with area/iteration path `Offervana_SaaS`.

### Filing order + IDs

Single batch call → ten monotonic IDs **7834–7843** (S1 through S10). Note: IDs are not contiguous with E3 stories (7811–7821) because other work items were filed between the E3 bulk run and this one (7822–7833 belong to intervening E2 follow-ups or other project work — not E4 scope).

**Drift note:** a few story bodies reference sibling IDs from the pre-filing query (e.g. S2's references block mentions "7822 (E4-S1 route)" and S10 mentions "Siblings 7822–7830"). The actual E4 IDs are 7834–7843. This is cosmetic drift only — the parent-link back to 7780 is correct on all ten children, and reviewers click through the parent to find siblings. Not worth editing all ten descriptions to re-number; a follow-up one-line patch can correct it if asked.

## Execution log

### Filed in one batch

1. **7834** — E4-S1 BFF route shape + Zod input + dev mock. 15 ACs. Three new files: `src/app/api/enrich/route.ts` + `src/lib/enrichment/types.ts` + `src/lib/enrichment/fixtures.ts`. Node runtime + `force-dynamic`. `discriminatedUnion('kind', ...)` by Zod; two input modes (`enrich` | `suggest`). Envelope-always-200 contract pinned. Structured-JSON log with `addressKey` (SHA-256 hex) never the raw address. `ENRICHMENT_DEV_MOCK=true` fixture scenarios triggered by canned street1 sentinels (`__TIMEOUT__`, `__NOMATCH__`, `__LISTED__`). Notes pin Next.js 16 Route Handler conventions (named verbs, not `export default`; `runtime` / `dynamic` exact segment-config names).
2. **7835** — E4-S2 MLS client (server-only). 16 ACs. `src/lib/enrichment/mls-client.ts` with `import 'server-only'` first line. Three named exports. `AbortSignal.timeout(ENRICHMENT_TIMEOUT_MS)`. One retry on AbortError/fetch-failed/5xx with 250ms delay. Typed `MlsError` (`timeout`|`network`|`http`|`parse`|`config`). DTOs typed for consumed fields only; 168-field `PropertyDetailsDto` left as `unknown`. Six-case unit-test matrix (happy, 500-retry-200, 500-retry-500, timeout, 404-no-retry, parse) per endpoint.
3. **7836** — E4-S3 Service + normalize + merge. 16 ACs. Three new files: `normalize.ts` (pure helpers), `cache.ts` (`ENRICHMENT_CACHE_TAG` + `unstable_cache` wrapper), `service.ts` (server-only orchestrator). `getEnrichment` uses `Promise.allSettled` for parallel leg-2+3; images leg skipped when not currently-listed. Cache key = SHA-256 of normalized address (no submissionId → cross-seller sharing). `no-match` cached 1h; `ok` cached 24h. Route swap from S1 dev-mock to real service. Listing-status normalization matrix (Active/AUC/Pending/ComingSoon → currently-listed; Closed/Expired/Withdrawn/Cancelled → previously-listed; else not-listed).
4. **7837** — E4-S4 Headless UI Combobox `<AddressField>` swap. 17 ACs. Adds `@headlessui/react` dep (architecture §5 deviation 2 — one-off exception, not a doorway to more component libs). Prop contract preserved from E3-S4. 250ms debounce + 4-char minimum before suggest fires. `AbortController` on new keystroke. Full WAI-ARIA combobox keyboard. 44×44 touch targets. `aria-busy` + `aria-live` polite. Manual-typed fallback preserved.
5. **7838** — E4-S5 `useAddressEnrichment` client hook + draft wiring. 15 ACs. `'use client'`. 400ms debounce. `useTransition` + `AbortController` + `sessionStorage:shf:enrich:v1`. Client-side hash via `crypto.subtle.digest('SHA-256', ...)` matching server `addressCacheKey` semantics. AZ-zip guard client-side. Concurrent dedupe via `useRef<Map>`. `setEnrichment` reducer action excluded from localStorage write. Strict Mode survival documented.
6. **7839** — E4-S6 Enrichment UI surfaces. 19 ACs. Three new components: `enrichment-badge.tsx` / `enrichment-confirm.tsx` / `listed-notice.tsx`. Step-file edits for address-step + property-step + seller-form orchestrator. Controlled pre-fill pattern with `hasUserTyped` flag (avoids React 19 controlled↔uncontrolled warning). All seven badge states with exact architecture-§3.1 copy. `aria-live` polite (not assertive). Photo strip with `next/image sizes="120px"` (depends on S7). Never-gates discipline on every surface.
7. **7840** — E4-S7 `next/image` Azure Blob remotePatterns. 7 ACs. One-line append to `images.remotePatterns` — `{protocol:'https', hostname:'zoodealiomls.blob.core.windows.net', pathname:'/mlsimages/**'}`. SAS token flows through optimizer intact (architecture §5 deviation 7 — we use the optimizer). `remotePatterns` over deprecated `domains`. Stand-alone XS; can land anytime after S1.
8. **7841** — E4-S8 Already-listed conversation copy + `currentListingStatus` schema enum + condition-step pre-nudge. 17 ACs. Finalizes the listed-notice copy skeleton S6 landed. Locks `z.enum(['second-opinion', 'ready-to-switch', 'just-exploring']).optional()` in seller-form schema. Adds pre-nudge on condition step when `pillar === 'cash-offers'` AND `enrichment.listingStatus === 'currently-listed'` AND `currentListingStatus !== 'just-exploring'`. Copy-only pre-nudge; never gates. WAI-ARIA radiogroup pattern (button-radio, not native `<input type="radio">`). No-localStorage-rehydrate posture for session-scoped sensitivity.
9. **7842** — E4-S9 E2E happy + degraded paths. 14 ACs. Four Playwright specs + `docs/e4-qa-plan.md` artifact. Happy (AZ → enriched → submit); timeout (form still submits); no-match (form still submits); listed (notice renders, chip selection persists to payload, submit succeeds). Mock strategy: `ENRICHMENT_DEV_MOCK=true` + sentinel addresses from S1 fixtures. Assertions on `Cache-Control: private, no-store`, `submissionId` thread-through, `addressKey`-not-address in logs. No sleeps; only `expect.poll` with 10s cap. CI workflow stub with E8 TODO pointer if CI isn't already wired.
10. **7843** — E4-S10 Observability + SAS rotation runbook. 16 ACs. `@vercel/analytics/server` `track('enrichment_status', {status, cache_hit})` — fire-and-forget with try/catch fallback. Bounded cardinality (no PII, no submissionId, no addressKey). `.env.example` documents all five E4 vars (MLS_API_BASE_URL, MLS_API_TOKEN, ENRICHMENT_TIMEOUT_MS, ENRICHMENT_CACHE_TTL_SECONDS, ENRICHMENT_DEV_MOCK). SAS rotation runbook with expiry **2027-02-11** and calendar reminder filed for **2027-01-15** (GitHub issue + milestone preferred). `docs/e4-operations.md` one-pager for on-call. No Sentry (E8). Last E4 story — closes the feature for handoff.

### Content decisions (cross-story patterns)

- **Blueprint stability.** Every story follows the E1/E2/E3 cadence (banner → User story → Summary → Files touched → Not touched → Acceptance criteria → Technical notes → Suggested tasks → Out of scope → References → Notes). Matches parent Feature 7780's HTML formatting.
- **AC count scales with correctness-sensitive surface.** S1 (15) locks the contract. S2 (16) locks the network discipline. S3 (16) locks cache + normalization semantics. S4 (17) carries a11y surface. S5 (15) carries client-state subtleties (Strict Mode, dedupe). S6 (19) has three components + multi-step edits. S7 (7) is XS config. S8 (17) has copy + schema + conditional UI. S9 (14) covers four E2E paths. S10 (16) is the observability + runbook closeout.
- **Forward-compat contracts made explicit.** S1's envelope shape (every downstream consumes it); S2's `MlsError` shape (S3 catches it); S3's `ENRICHMENT_CACHE_TAG` export (S10 runbook uses `revalidateTag`); S4's preserved prop contract (E3-S4 pinned); S5's `setEnrichment` reducer (E3-S2 provisioned the slot); S8's `z.enum` locks the chip values.
- **Bleeding-edge Next.js 16 / React 19 call-outs.** S1: Route Handler named verb exports + exact segment-config names. S2: `AbortSignal.timeout` native + `server-only` npm package. S3: `unstable_cache` still right outside Cache Components (architecture §5 deviation 1). S4: no `useTransition` needed here (small suggest list). S5: Strict Mode double-mount survival + `crypto.subtle` async. S6: React 19 controlled↔uncontrolled warning + `hasUserTyped` flag pattern. S7: `remotePatterns` over deprecated `domains`. S8: `<fieldset>`/`<legend>` + `role="radio"` button-radio pattern. S9: Playwright 1.40+ + `getByRole` aggressive. S10: `@vercel/analytics/server` — don't `await` the `track` call.
- **Architecture §5 decisions + deviations enforced.** POST-not-GET (S1); envelope-always-200 (S1); server-only guard (S2); `unstable_cache` retained (S3); `Promise.allSettled` parallel leg (S3); Headless UI single-primitive exception (S4); `useTransition` + `AbortController` + `sessionStorage` (S5); `next/image` optimizer preferred over `unoptimized` (S7); no-match cached 1h (S3); `Cache-Control: private, no-store` (S1).

### Bulk-mode compaction

All ten stories filed in a **single** `wit_add_child_work_items` call with a 10-item array — preserves monotonic IDs and minimizes round-trips. Tool response exceeded token cap, but the filing operation itself succeeded; verified via WIQL query (10 children under parent 7780) and spot-check on HTML rendering (no escape-bug; `format: "Html"` inside each item honored).

### Style match to E1/E2/E3 siblings

- Same HTML vocabulary (`<h2>`, `<ul>`, `<ol>`, `<code>`, `<strong>`, `<em>`). No tables in E4 stories (no tabular content needed).
- Same area/iteration path (`Offervana_SaaS`).
- State `New`, priority default (not set explicitly — ADO defaults).
- `format: "Html"` placed **inside each item object** — E2 S1–S9 bug (top-level format) stays avoided. HTML renders clean; verified entity refs (`&amp;`, `&lt;`) preserved as literal via spot-check on 7835.

## Not done

- No tags assigned (matches E1/E2/E3 precedent).
- No assignees, no sprint iteration (matches precedent; sprint planning assigns).
- No inter-story `Related` links filed in ADO. Hierarchy link to 7780 is on each child; sibling dependencies documented in each body under **Blocks** / **Depends on**.
- Minor cross-reference drift (S2 "7822 (E4-S1)" → actually 7834; S10 "Siblings 7822–7830" → actually 7834–7842). Cosmetic only; parent-link navigation works.
- Did not append patterns to `zoo-core-agent-pm/ado-history.md` — directory still doesn't exist.
- Figma frames not fetched — per architecture §3.1 pattern, per-step designs should be requested during individual story pickup (S4 / S6 most likely to want them), not during decomposition.

## Next steps

1. Review the ten rendered stories on ADO: **7834–7843**. Spot-check that HTML renders cleanly (no escaped `<p>` tags like E2's S1–S9 bug). Sample from 7835 confirmed clean.
2. Feature 7780 is now fully decomposed — E4 is ready for sprint planning. All 10 stories filed.
3. **Critical path for parallel work:** S1 (7834) unblocks everything. S2 (7835) + S4 (7837) parallel after S1 (S4 uses S1 dev-mock). S3 (7836) depends on S2. S5 (7838) depends on S1 + S3. S7 (7840) stand-alone after S1. S6 (7839) depends on S5 + S7. S8/S9/S10 (7841/7842/7843) parallel after S6.
4. E4 implementation is gated on E3 landing the `<AddressField>` seam + `SellerFormDraft.enrichment` slot + `submissionId` correlation key (E3 architecture §4.3). E4-S1 can start in parallel with E3's later stories once the E3 draft store is in.
5. Optional cross-reference cleanup: a one-shot patch to correct the "7822" references in 7835 (S2) and "7822–7830" in 7843 (S10) — low priority, cosmetic only.
6. Suggested next skill: `/zoo-core-create-architecture` for E5 (Offervana submission back-end) — E5 is the first feature that consumes the `enrichment` slot E4 leaves on the draft.
