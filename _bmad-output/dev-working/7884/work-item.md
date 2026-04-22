# Work item — E4-S13 / 7884

**ADO:** https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7884
**Title:** E4-S13 — "Do you currently have an agent on this sale?" question: hasAgent field + radiogroup in MlsStatusNotice + Server Action capture, gated to active MLS statuses
**Parent:** Feature 7780 (E4 — Property Data Enrichment)
**State at start:** New
**Depends on:** S12 / 7883 (✓ closed at commit `c327285`, Ready For Testing)
**Size:** M

## Summary

Add an optional agent-involvement question to `MlsStatusNotice`, gated to active MLS statuses (Active / ActiveUnderContract / ComingSoon / Pending). Three options: Yes / No / Not sure. Captured via Server Action, round-tripped into submission payload, tracked with bounded `has_agent` dimension.

## ACs (verbatim count: 16)

1. Schema field — `hasAgent: z.enum(['yes','no','not-sure']).optional()` on `fullSellerFormSchema`; unknown → rejected with "Invalid agent-involvement value."
2. Gate — renders IFF `slot.mlsRecordId` truthy AND canonicalized `rawListingStatus` ∈ {active, activeundercontract, comingsoon, pending}.
3. Placement — Banner → (chips if Active/AUC) → agent-question radiogroup. Always last block. Renders for all 4 gated statuses including ComingSoon + Pending.
4. Copy — "Are you currently working with an agent on this sale?" — Yes / No / Not sure.
5. ARIA — `role='radiogroup'` + `role='radio'` + `aria-checked`; roving tabindex; Arrow cycles; 44×44 target; focus-visible ring.
6. Session state — `useState` in `SellerForm`, NOT persisted via `writeDraft`.
7. Hidden field — `<input type='hidden' name='hasAgent'>` only rendered when value is set (matches `listedReason` pattern at `seller-form.tsx:546`).
8. Server Action — `formData.get('hasAgent')`, Zod-validated, round-tripped into submission payload.
9. Never blocks submission — unset → `hasAgent: undefined`, submission proceeds.
10. Orthogonal to `listedReason` — independent signals.
11. Analytics — `track('seller_form_submitted', { submissionId, has_agent: <value> | 'unset' })`. Bounded 4 values.
12. Unit tests — component: render for all 4 gated + hidden for 4+ non-gated + 3 radios selectable + arrow cycle + aria-checked + initial focus.
13. Unit tests — server action: Yes/No/Not sure round-trip + invalid rejected + missing → undefined.
14. Schema tests — accepts 3 values; rejects everything else.
15. Playwright — extend `enrichment-listed.spec.ts` on `__LISTED__`: radiogroup visible + click → hidden field = selected value.
16. No PII to analytics or logs.

## Files touched (per ADO)

- `src/lib/seller-form/schema.ts` — hasAgent field + HAS_AGENT_VALUES constant
- `src/lib/seller-form/types.ts` — HasAgent exported type
- `src/lib/seller-form/analytics.ts` — form_submitted dimension
- `src/components/get-started/mls-status-notice.tsx` — add agent radiogroup block
- `src/components/get-started/seller-form.tsx` — state + hidden field + prop forwarding
- `src/components/get-started/steps/address-step.tsx` — prop pass-through
- `src/components/get-started/steps/property-step.tsx` — prop pass-through
- `src/app/get-started/actions.ts` — FormData read + validate + include in payload
- `src/components/get-started/__tests__/mls-status-notice.test.tsx` — agent-toggle cases
- `src/app/get-started/__tests__/actions.test.ts` — **NEW file** (no existing action tests)
- `e2e/enrichment-listed.spec.ts` — agent-question assertion (note: ADO says `e2e/listed.spec.ts`; actual filename is `enrichment-listed.spec.ts`)

## Out of scope

- Offervana-side routing change (E5).
- Conditional flow branch based on hasAgent.
- Making field required.
- Asking outside active-status gate.
- `rawListingStatus` analytics dimension.
