# Completion notes — E4-S13 / 7884

**Branch:** `feature/e4-property-enrichment-7780` (shared E4 branch, no push per user directive)
**Commit:** _filled in at commit time_
**Tests:** 174 passing across 12 vitest files (20 new for S13: 13 component + 7 action). 30 total in `mls-status-notice.test.tsx`, 7 in `actions.test.ts` (new file).
**TypeScript:** `npx tsc --noEmit` clean.

## Scope delivered

- Schema: `HAS_AGENT_VALUES` + `HasAgent` type; `hasAgent: z.enum(...).optional()` on `fullSellerFormSchema` with "Invalid agent-involvement value." error.
- `MlsStatusNotice`: unified render path (`<section>` with two independently-labeled radiogroups). Agent-question block renders for all 4 gated statuses (Active / ActiveUnderContract / ComingSoon / Pending); chips stay Active/AUC-only. Roving-tabindex extracted to a local `useRovingKeydown` helper shared by chips + agent.
- Form plumbing: session-scoped `useState<HasAgent>` in `SellerForm`; hidden `<input name="hasAgent">` conditionally rendered; prop pass-through through `StepDispatch` → `AddressStep` + `PropertyStep`.
- Server Action: `parseFormData` + `strOrUndefined` lifted to `src/app/get-started/parse.ts` (needed because "use server" files reject sync exports at build time). `actions.ts` imports from `parse.ts`; `hasAgent` read + conditionally added to candidate; Zod validates.
- Analytics: `trackFormSubmitted(submissionId, hasAgent)` emits `has_agent: <value> | "unset"`. Bounded cardinality (4 values). No PII.
- Playwright: `enrichment-listed.spec.ts` extended with agent-question assertion; existing chip count assertion rescoped to the chip-specific radiogroup so it doesn't collide with the new agent radios.

## Deviations from plan (full detail in review-report.md)

1. `parseFormData` + `strOrUndefined` moved to sibling `parse.ts` (Next.js "use server" sync-export restriction).
2. Unified two-path render into a single `<section>` wrapper with two labeled radiogroups; dropped outer `<fieldset>`/`<legend>`.
3. Playwright chip locator rescoped.
4. Self-initiated: `useRovingKeydown` local helper to avoid duplicating the ArrowKey handler.

## Handoff to S11 / downstream

- `hasAgent` is in the validated submission payload — E5's Offervana mapping decision, not this story.
- Analytics dashboard can compute attach rate via the `has_agent: 'unset'` bucket.
- ATTOM wiring (S11 / 7882) remains untouched. S13 does not depend on it.
- User observation during S13 testing: "step 2 doesn't pre-fill bedrooms/bathrooms/sqft/year/lot" — expected current-state. Pre-fill comes from `enrichmentSlot.details`, which today is MLS-only. S11 will fill gap via ATTOM per-field merge.

## Not in scope / follow-ups

- `rawListingStatus` as an analytics dimension (cardinality).
- Required-field version of the question (product call: optional).
- Conditional flow branches based on `hasAgent` value.
- Offervana-side mapping (E5).
- Playwright re-run (Chromium not installed locally; CI/manual follow-up).

## Branch state at close-out

Branch retained locally, not pushed (user directive). S11 will stack next on the same branch when started.
