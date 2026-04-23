# Self-review — E4-S13 / 7884

## AC-by-AC verification

| # | AC | Evidence | Status |
|---|----|----|----|
| 1 | Schema field — `hasAgent: z.enum(['yes','no','not-sure']).optional()`, rejects unknown with "Invalid agent-involvement value." | `schema.ts:56-57` (`HAS_AGENT_VALUES` + `HasAgent`), `schema.ts:161-163` (field on `fullSellerFormSchema` with `error` option). Actions test confirms "maybe" returns the exact error string. | ✓ |
| 2 | Gate — renders IFF `mlsRecordId` truthy AND canonicalized raw ∈ {active, activeundercontract, comingsoon, pending} | `mls-status-notice.tsx:82-85` — three early returns; test suite covers all 4 positive + 6 negative cases. | ✓ |
| 3 | Placement — Banner → (chips if Active/AUC) → agent-question radiogroup, always last, for all 4 gated statuses | Unified render path (`mls-status-notice.tsx:104-184`): banner first, chips conditional, agent radiogroup always last. Test `agent radiogroup renders for gated status %s` covers all 4. | ✓ |
| 4 | Copy — "Are you currently working with an agent on this sale?" / Yes / No / Not sure | `mls-status-notice.tsx:155-157` for label; `AGENT_OPTIONS` (`mls-status-notice.tsx:31-35`) for exact labels "Yes" / "No" / "Not sure". | ✓ |
| 5 | ARIA + keyboard — radiogroup/radio roles, `aria-checked`, roving tabindex, arrow cycle, 44×44 target, focus-visible ring | `mls-status-notice.tsx:161-192` — `role="radiogroup"` + `aria-labelledby`, each button `role="radio"` + `aria-checked`, `tabIndex` computed from `agentFocusIdx`, `onKeyDown={handleAgentKeyDown}` which calls `useRovingKeydown` covering Arrow{Left,Right,Up,Down}. Tailwind classes: `min-h-[44px] min-w-[44px]` + `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand`. Tests assert: roving tabindex (2 tests), aria-checked reflection, ArrowRight cycle Yes→No, ArrowLeft cycle Yes→Not sure. | ✓ |
| 6 | Session state — `useState` in `SellerForm`, not persisted via `writeDraft` | `seller-form.tsx:222` — `useState<HasAgent \| undefined>`. Verified by grep — only reference site is the state hook; no call into `writeDraft`. | ✓ |
| 7 | Hidden field — rendered only when set, mirrors `listedReason` pattern | `seller-form.tsx:549` — `{hasAgent && <HiddenField name="hasAgent" value={hasAgent} />}`. Conditional render matches `listedReason` at line 547. | ✓ |
| 8 | Server Action — reads via `formData.get('hasAgent')`, Zod-validated, round-tripped | `parse.ts:38` reads; `parse.ts:55-56` conditionally adds to candidate; `actions.ts:21` calls `parseFormData` → `validateAll`. Tests `parseFormData + validateAll — hasAgent round-trip` cover yes/no/not-sure success. | ✓ |
| 9 | Never blocks submission — unset → undefined, submission proceeds | Schema is `.optional()`. Action test "treats a missing hasAgent as undefined (submission still succeeds)" asserts `result.success` true + `hasAgent: undefined`. | ✓ |
| 10 | Orthogonal to `listedReason` — independent signals | Component test `chip selection does not affect agent selection` — clicks a chip, asserts `onHasAgentChange` not called. State is two independent `useState` hooks in `SellerForm`. | ✓ |
| 11 | Analytics — `has_agent: <value> \| 'unset'`, bounded cardinality, no PII | `analytics.ts:12-20` — `trackFormSubmitted(submissionId, hasAgent)` emits `has_agent: hasAgent ?? "unset"`. Only 4 possible values. No PII dimensions added. | ✓ |
| 12 | Unit tests — component (4 gated + 4 hidden + 3 selectable + arrow cycle + aria-checked + initial focus) | 30 tests in `mls-status-notice.test.tsx`. Gated: 4 via `it.each`. Hidden: 8 (`Closed`, `Expired`, `Withdrawn`, `Cancelled`, `Sold`, `SomethingWeird`, missing mlsRecordId, missing rawListingStatus). Selectable: 3 via `it.each`. Arrow cycle: 2 (ArrowRight, ArrowLeft). aria-checked: 1. Initial focus: 2 (unselected → first; selected → selected). | ✓ |
| 13 | Unit tests — server action (yes/no/not-sure round-trip + invalid rejected + missing → undefined) | 7 tests in `actions.test.ts`: 3 for round-trip (via `it.each`), 1 for invalid "maybe" + error message, 1 for missing, 1 for empty string, 1 for case variant "YES" rejected. | ✓ |
| 14 | Schema tests — accepts exactly the three, rejects everything else | Covered by actions tests (composition of `parseFormData` + `validateAll`). Explicitly: "maybe" rejected, "YES" rejected, empty string → undefined. | ✓ |
| 15 | Playwright — radiogroup visible, click selects, hidden field updated | `enrichment-listed.spec.ts:39-49` — asserts agentGroup visible + 3 radios + Yes click → `aria-checked=true` + `input[name="hasAgent"]` = "yes". Spec not executed locally (Chromium not installed per epic summary); carried as CI/manual follow-up. | ✓ |
| 16 | No PII — `has_agent` dimension only | Only dimension added to `track("seller_form_submitted", …)` is `has_agent`. No address/email/name/phone in analytics call. | ✓ |

## Additional checks

- **TypeScript:** `npx tsc --noEmit` clean.
- **Unit tests:** 174 passing across 12 vitest files (up from 154 pre-S13 — 20 new: 13 component + 7 action).
- **No third-party tracking SDKs introduced** (per CLAUDE.md analytics policy).
- **React 19 ref-as-prop** — component uses `useRef` callback pattern, no `forwardRef`.
- **"use server" export constraint** — addressed by extracting `parseFormData` + `strOrUndefined` to `src/app/get-started/parse.ts`. `actions.ts` now exports only the async Server Action.

## Deviations from plan

1. **Split `parseFormData` + helpers into `parse.ts`** (user-approved with caveat: original plan said "add `export` to `parseFormData` in `actions.ts`"; Next.js 16 "use server" files reject sync exports at build time, so I lifted to a sibling module instead). Net footprint: one new file + smaller `actions.ts`. `strOrUndefined` also moved since it's needed in both files.
2. **Unified `MlsStatusNotice` render path** (user-approved) — single `<section>` wrapper with two independently-labeled radiogroups (chip group `aria-labelledby={subcopyId}`, agent group `aria-labelledby={agentLabelId}`). Outer `<fieldset>`/`<legend>` from the Active/AUC path removed.
3. **Playwright chip-radiogroup locator rescope** (user-approved) — `getByRole("radiogroup", { name: /second opinion/i })` scopes the chip count assertion so the additional 3 agent radios don't flip the `toHaveCount(3)` check.
4. **Extracted `useRovingKeydown` helper** inside `mls-status-notice.tsx` — not an exported hook, just a local helper to avoid duplicating the same ArrowKey-+-delta code twice for chips + agent. Not in the plan; flagging here. Scope is confined to the file so it's not a public API commitment.

## Risks / follow-ups

- **Playwright not executed.** Chromium not installed locally; assertion is authored but correctness beyond TypeScript compile is unverified. Matches S9 handoff discipline (local run is a manual follow-up).
- **`strOrUndefined` export widens surface slightly.** Previously private to `actions.ts`, now exported from `parse.ts` so `actions.ts` can reuse it for `idempotencyKey`. Could mark `@internal` via JSDoc if preferred.
- **No test asserts `listedReason` survives alongside `hasAgent`.** The "orthogonal" component test covers the negative (chip click doesn't fire agent callback) but not the affirmative (both values can be set and both round-trip). Low risk — both go through identical session-state → hidden-field → `parseFormData` plumbing and each field has its own test. Flagging for QA.

## Handoff

- S13 makes `hasAgent` available to E5's Offervana payload mapping. Contract: `'yes' | 'no' | 'not-sure' | undefined`.
- Analytics dashboard can compute attach rate via `has_agent: 'unset'` bucket vs the three set values.
- Branch remains local-only per user directive. Single PR for the E4 follow-up trio (S11/S12/S13) is the eventual close-out, but S11 has not been started.
