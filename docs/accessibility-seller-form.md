# Seller submission form — accessibility audit (E3-S10)

Covers the `/get-started` funnel: shell → 4 steps → thanks. Audit is against WCAG 2.2 AA + the ACs from ADO 7820.

## What E3 builds in

| Concern | Implementation | Location |
|---|---|---|
| Heading focus on step change | `useRef` + `headingRef.current?.focus()` on transition; each step renders `<h2 ref={headingRef} tabIndex={-1}>` | `seller-form.tsx` step-change effect; every `steps/*-step.tsx` |
| `aria-live` step announce | Single `<div role="status" aria-live="polite">` above the step renders step-name string | `seller-form.tsx` |
| `aria-live` error announce | Same region updates to "We couldn't submit your form — please correct…" on server-side fail | `seller-form.tsx` |
| Error summary | `role="alert"` banner above the active step on `state.ok === false` | `seller-form.tsx` |
| Per-field errors | E1 `<Field errorText>` auto-wires `aria-describedby` + `aria-invalid` on the control | all step components |
| Progress bar | `role="progressbar"` + `aria-valuemin/max/now` + `sr-only` step label + title | `progress.tsx` |
| Radio grouping | `<fieldset>` + `<legend>` via E1 `<Fieldset>`; `role="radiogroup"` on the list | `condition-step.tsx` |
| Select placeholder | First option `value="" disabled`; native `<select>` (better mobile UX than a Combobox) | `condition-step.tsx` |
| Consent checkboxes | Each has `<label htmlFor>` wrapping full legal text; click-anywhere toggles; `aria-invalid` on error | `consent-block.tsx` |
| `autocomplete` tokens | `street-address`, `address-line2`, `address-level1/2`, `postal-code`, `given-name`, `family-name`, `email`, `tel` | `address-step.tsx`, `contact-step.tsx` |
| Mobile keypads | ZIP `inputMode="numeric"`; phone `inputMode="tel"`; property fields `inputMode="numeric"` (bathrooms `decimal`) | step components |
| Focus indicators | E1 primitives share `focus-visible:outline-2 outline-offset-2 outline-brand`; error state flips to `outline-error` via `aria-invalid` attr selector | `ui/input.tsx`, `ui/select.tsx`, `ui/textarea.tsx`, `ui/checkbox.tsx`, `ui/radio.tsx`, `ui/button.tsx` |
| Touch targets | Inputs/selects `h-12 md:h-[52px]` (48–52px ≥ 44px AA); buttons `h-12 md:h-[52px]`; checkboxes/radios 20px with 44×44 effective area via the wrapping `<label>` card | E1 primitives |
| Skip steps keyboard-only | Native `<button>` Back/Next/Submit wired via click handlers; Enter on final step triggers submit | `step-nav.tsx` |
| Disabled-state styling | `disabled:opacity-50` + `aria-disabled` mirror on buttons — the "muted, not neon-disabled" pattern | `ui/button.tsx` |
| No layout shift on error | `<Field>` reserves the error slot only when populated; grid rows use `auto` | `ui/field.tsx` |

## Browser-verification TODOs (human QA gates)

Cannot be verified in a non-interactive agent session — these remain for real-browser QA against a preview URL:

1. **Axe scan on `/get-started` + each step** — expected zero violations; any warning categories should be listed here with an ADR.
2. **VoiceOver (macOS) + NVDA (Windows) traversal** — confirm each step announces heading first on advance, then fields.
3. **Keyboard-only full-flow test** — fill all 4 steps using Tab / arrow keys / Space / Enter only. Submit. Land on `/get-started/thanks`.
4. **iOS Safari + Android Chrome** — telephone keypad on phone field; numeric keypad on zip; `pagehide` abandonment beacon fires.
5. **Zoom 200% desktop** — layout doesn't clip; no horizontal scroll; touch targets still ≥ 44 px.
6. **Reduced motion** — no animations to audit in E3; progress bar's `transition-[width]` is sub-threshold.
7. **High-contrast mode** — error text remains legible; focus indicators don't vanish.
8. **Lighthouse (mobile, 4G throttle)** — LCP < 2.5 s target per AC.

## Known intentional deviations

- **Contact fields do not rehydrate from `localStorage`** — per S2 PII-strip rule. User must re-enter first name / last name / email / phone after closing the tab and returning. Documented in S7 commit; keep this page updated if that decision changes.
- **Consent timestamps not persisted** — same reason. User re-consents on resume.
- **No `autoComplete="off"`** — hostile to users + browsers ignore it. Correct WHATWG tokens throughout (see above).
