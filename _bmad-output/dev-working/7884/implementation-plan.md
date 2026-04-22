# Implementation plan — E4-S13 / 7884

## Approach

Six file-groups, each self-contained (compiles + tests green before the next). No EF migrations (Next.js BFF + client only).

Key structural decision (post-research): **unify `MlsStatusNotice` render paths into a single `<section>` wrapper** with optional chips block and optional agent-question block. Each radiogroup self-labeled (`aria-labelledby` or `aria-label`) — dropping the outer `<fieldset>`/`<legend>` from the current Active/AUC path because individually-labeled radiogroups don't need a wrapping fieldset and it avoids screen-reader ambiguity when two radiogroups live inside one fieldset.

## File-group 1 — Schema + types (foundation)

**Files**
- `src/lib/seller-form/schema.ts` — add `HAS_AGENT_VALUES = ['yes','no','not-sure'] as const` + `HasAgent` type export; extend `fullSellerFormSchema` with `hasAgent: z.enum(HAS_AGENT_VALUES, { error: 'Invalid agent-involvement value.' }).optional()`.
- `src/lib/seller-form/types.ts` — add `export type { HasAgent } from "./schema"` (or define via `z.infer` if we prefer alignment with the rest of the types file — going with direct `export type` re-export to mirror existing style).

**Verify** `npx tsc --noEmit` clean.

**Schema tests** — no dedicated schema test file exists today. Schema behavior will be exercised indirectly by:
- Component tests (FG2) — values rendered.
- Server action tests (FG4) — Zod round-trip + invalid rejection (AC #14 covered here).

## File-group 2 — `MlsStatusNotice` agent-question block + tests

**Files**
- `src/components/get-started/mls-status-notice.tsx` — refactor render:
  - Single `<section>` wrapper always (`className=wrapperClass`).
  - Banner `<h3 id={bannerId}>` always.
  - If `showChips`: `<p>` subcopy + `<div role="radiogroup" aria-labelledby={subcopyId}>` chips. Subcopy gets its own `id`.
  - Always (gate-passed implicit from earlier `return null`): agent block — `<p id={agentLabelId}>Are you currently working with an agent on this sale?</p>` + `<div role="radiogroup" aria-labelledby={agentLabelId}>` with three `<button role="radio" aria-checked=...>` for Yes / No / Not sure. Reuse roving-tabindex + ArrowKey pattern (independent `agentRefs` + `handleAgentKeyDown`).
  - New props: `hasAgent: HasAgent | undefined`, `onHasAgentChange: (v: HasAgent) => void`.
- `src/components/get-started/__tests__/mls-status-notice.test.tsx` — extend:
  - Agent radiogroup renders for Active / ActiveUnderContract / ComingSoon / Pending (4 it.each cases).
  - Agent radiogroup hidden for Closed / Expired / no-mlsRecordId / no-rawListingStatus.
  - Clicking each of Yes / No / Not sure fires `onHasAgentChange` with correct value (3 cases).
  - `aria-checked` reflects `hasAgent` prop.
  - Roving tabindex — only one agent radio tabbable at a time; first when unselected.
  - Arrow keys cycle (ArrowRight on Yes → focus lands on No).
  - Tests for chips unchanged (still pass).

**Update existing radiogroup query in component tests.** Existing test uses `getAllByRole("radio")` expecting 3 — now 6 when chips + agent both render. Update to scope by nearest labelled parent or by accessible name patterns (e.g., `screen.getByRole("radiogroup", { name: /agent/i })`).

**Verify** `npx vitest run src/components/get-started/__tests__/mls-status-notice.test.tsx` green.

## File-group 3 — Form state + prop wiring + hidden field

**Files**
- `src/components/get-started/seller-form.tsx`:
  - Import `HasAgent` from `./mls-status-notice` (re-exported) or from `@/lib/seller-form/types`.
  - New state: `const [hasAgent, setHasAgent] = useState<HasAgent | undefined>(undefined);`
  - Thread through `StepDispatch` props (add `hasAgent`, `onHasAgentChange`).
  - Hidden field (mirror `listedReason` pattern at line 546):
    ```tsx
    {hasAgent && <HiddenField name="hasAgent" value={hasAgent} />}
    ```
- `src/components/get-started/steps/address-step.tsx` — add `hasAgent` + `onHasAgentChange` props; pass to `<MlsStatusNotice>`.
- `src/components/get-started/steps/property-step.tsx` — same.

**Verify** `npx tsc --noEmit` clean; `npx vitest run` still green (no regressions in existing tests).

## File-group 4 — Server Action + action tests

**Files**
- `src/app/get-started/actions.ts` (lines 51-67) — mirror `currentListingStatus`:
  ```ts
  const hasAgent = strOrUndefined(formData.get("hasAgent"));
  // ...
  if (hasAgent) candidate.hasAgent = hasAgent;
  ```
  The schema `.enum().optional()` rejects invalid strings via `validateAll()` — no extra handling.
- `src/app/get-started/__tests__/actions.test.ts` — **NEW file**. Covers AC #13:
  1. FormData with `hasAgent=yes` + all required fields → `validateAll()` returns success with `hasAgent: "yes"`.
  2. Same with `no`.
  3. Same with `not-sure`.
  4. FormData with `hasAgent=maybe` (invalid) → `validateAll()` returns failure with error on `hasAgent` path.
  5. FormData without `hasAgent` → success with `hasAgent: undefined`.

  **Strategy:** test `parseFormData` + `validateAll` composition directly by building a minimal valid FormData fixture. Avoid testing `submitSellerForm` itself because it calls `redirect()` (throws) on success — we'd need to stub `next/navigation`. Instead, extract `parseFormData` to module-level (it's already a free function in the file — may need an `export` added) or test via a dev-mode path that logs. Preferred: **add `export` to `parseFormData`** so it's directly testable; the function is pure and already at module scope. That's the minimum-footprint unblock.

**Verify** `npx vitest run src/app/get-started/__tests__/actions.test.ts` green.

## File-group 5 — Analytics dimension

**Files**
- `src/lib/seller-form/analytics.ts` — change `trackFormSubmitted(submissionId)` to `trackFormSubmitted(submissionId: string, hasAgent: HasAgent | undefined)`; emit `has_agent: hasAgent ?? "unset"`.
- `src/components/get-started/seller-form.tsx` — update call site at line 351 to `trackFormSubmitted(formState.submissionId, hasAgent)`. Add `hasAgent` to the effect's dep array.

**Verify** `npx vitest run` full suite green (nothing mocks `track` brittly — only usage is in seller-form analytics; existing tests don't assert on it).

## File-group 6 — Playwright spec extension

**Files**
- `e2e/enrichment-listed.spec.ts`:
  - Rescope chip query: change `const chips = page.getByRole("radio")` + `toHaveCount(3)` to a chip-specific locator (e.g., `page.getByRole("radio", { name: /second opinion|ready to switch|just exploring/i })` → `toHaveCount(3)`) OR scope by parent radiogroup with an accessible name.
  - Add agent-question assertions after existing chip interaction:
    - `const agentGroup = page.getByRole("radiogroup", { name: /agent/i });`
    - `await expect(agentGroup).toBeVisible();`
    - `await page.getByRole("radio", { name: /^yes$/i }).click();`
    - `await expect(page.locator('input[name="hasAgent"]')).toHaveValue("yes");`
  - Place before `clickNext(page)` for the address step.

**Not executed locally** (Chromium not installed per epic summary-report.md). Spec is written for correctness; real run is a CI/manual follow-up.

## Compaction gates

Between each file-group: re-read sidecar `index.md` + this plan. `last-completed-file-group` is the recovery anchor.

## EF migrations

None. Next.js BFF + client only.

## Risks flagged for plan review

1. **`parseFormData` export** — FG4 adds `export` to an internal function to make it testable. Alternative: test `submitSellerForm` with a mocked `next/navigation.redirect`. The export is smaller-footprint and more honest (no test-only stubbing). Flagging for user awareness because the ADO "files touched" list doesn't mention this.

2. **Rescoping Playwright chip query** — FG6 changes an existing assertion. It's still covered (still asserts 3 chips render), just via a more specific locator. Flagging because this is a subtle change to an existing spec.

3. **Component render path unification** — FG2 drops the outer `<fieldset>`/`<legend>` from the Active/AUC path in favor of `<section>` + individually-labeled radiogroups. Net a11y is better (two independent radiogroups, each with their own label) but it's a refactor beyond what the ADO strictly requires. Alternative: keep the fieldset wrapper and nest both radiogroups inside it. Happy to take either direction — flagging the decision explicitly.

## Out of scope

- `useRovingTabindex` hook extraction (ADO tech-note says nice-to-have, not required).
- Conditional flow branch based on `hasAgent` value.
- `rawListingStatus` analytics dimension.
- Offervana-side mapping (E5).
