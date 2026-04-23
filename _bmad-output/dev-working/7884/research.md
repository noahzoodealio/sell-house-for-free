# Research — E4-S13

## Pattern references found

### `listedReason` session-scoped pattern (the template to mirror)

`src/components/get-started/seller-form.tsx:218` — `const [listedReason, setListedReason] = useState<ListedReason | undefined>(undefined)`.
`src/components/get-started/seller-form.tsx:531-537` — forwarded into `StepDispatch` as `listedReason` + `onListedReasonChange`.
`src/components/get-started/seller-form.tsx:546-548` — conditional hidden field:
```tsx
{listedReason && (
  <HiddenField name="currentListingStatus" value={listedReason} />
)}
```
`HiddenField` is a local component (`seller-form.tsx:665`) — `<input type="hidden" name value readOnly />`.

### FormData parse pattern

`src/app/get-started/actions.ts:28-33` — `strOrUndefined()` helper already exists. `actions.ts:51-53` already reads `currentListingStatus` with this helper. `hasAgent` follows identical shape.

`actions.ts:62-67` — `candidate` object is extended conditionally: `if (currentListingStatus) candidate.currentListingStatus = currentListingStatus;`. Same conditional-add pattern for `hasAgent`.

### Schema pattern

`src/lib/seller-form/schema.ts:49-54` — `CURRENT_LISTING_STATUS_VALUES` + `CurrentListingStatus` type is the exact analogue for `HAS_AGENT_VALUES` + `HasAgent`.
`schema.ts:158-160` — `currentListingStatus: z.enum(CURRENT_LISTING_STATUS_VALUES).optional()` on `fullSellerFormSchema`. Identical addition for `hasAgent`.

### ARIA radiogroup + roving tabindex

`src/components/get-started/mls-status-notice.tsx:45-68` — chips section carries the full pattern: `chipRefs` via `useRef<Array<HTMLButtonElement | null>>`, `focusIdx` calc, `handleKeyDown` on ArrowLeft/Right/Up/Down, `tabIndex={isTabTarget ? 0 : -1}`. Copy-paste this shape for agent radiogroup (independent `agentRefs` + `handleAgentKeyDown`).

### Existing component shape post-S12

Two render paths:
1. No-chips (ComingSoon/Pending): `<section>` wrapper with just `<h3>`.
2. With-chips (Active/AUC): `<fieldset aria-labelledby=legend>` with `<legend>` → `<h3>` + subcopy, then `<div role=radiogroup>` with chips.

S13's agent radiogroup must render in BOTH paths. Options considered:
- **(A)** Unify into one render path: always render outer `<fieldset>` with banner as legend; chips and agent are sibling `<div role=radiogroup>` blocks inside.
- **(B)** Keep two render paths, add agent block at the end of each. Minimal-diff.

Going with (A) — unified path is cleaner and avoids duplicating the agent-question JSX. Post-S12, the visual difference between the two paths was just chip presence; merging makes the component diff smaller for S13.

### Analytics call site

`src/lib/seller-form/analytics.ts:12-14` — `trackFormSubmitted(submissionId)`. Extend signature to `(submissionId, hasAgent?: HasAgent)` and emit `has_agent: hasAgent ?? 'unset'`.
`src/components/get-started/seller-form.tsx:350-352` — call site; has `formState` + needs `hasAgent` in scope (already is — it'll be local state).

### Dev-mock fixture

`src/lib/enrichment/fixtures.ts:39-74` — `__LISTED__` branch. No change needed; Playwright assertion just needs the agent-question to render on this fixture, which it will via the new gate.

### Playwright spec

Actual file: `e2e/enrichment-listed.spec.ts` (ADO typo says `listed.spec.ts`). Already tests chips + `currentListingStatus` flow. Add assertions:
- `page.getByRole("radio", { name: /^yes$/i })` (be strict — chips also use radio role).
- After click, `page.locator('input[name="hasAgent"]')` exists and has value `"yes"`.

## Risk / watch-outs

- **Double-counting radios in Playwright.** Chips + agent both use `role="radio"`. The existing spec does `page.getByRole("radio")` and expects `toHaveCount(3)`. After S13 there will be 6 radios total on the __LISTED__ path. Existing test will FAIL unless updated. Need to scope chips query to a specific radiogroup or by accessible name.

- **ARIA legend coupling.** When we unify render paths into one `<fieldset>`, the `<legend>` will contain the banner `<h3>`. Legend accessibility varies across screen readers when nested radiogroups exist inside the fieldset. Alternative: outer `<section>` with distinct `aria-labelledby` per inner radiogroup. Will go with `<section>` + labeled radiogroups to keep each group self-contained; fieldset is unnecessary when each radiogroup is labeled.

- **`CURRENT_LISTING_STATUS_VALUES` naming vs `HAS_AGENT_VALUES`.** Slight inconsistency — one reads as a constant, the other reads like a description. Staying with `HAS_AGENT_VALUES` for consistency with the existing code style.

- **Analytics emit timing.** `trackFormSubmitted` fires in the `formState` useEffect. `hasAgent` is in-scope as local state — just needs to be passed. Watch for stale closure (ensure `hasAgent` is in the effect's deps or read through a ref — simplest: add to deps).

- **Action test file is new.** No `src/app/get-started/__tests__/` exists yet. Need to create folder + test file. Vitest config already globs `src/**/__tests__/**`.
