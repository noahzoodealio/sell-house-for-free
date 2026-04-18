# Architecture — E3 Seller Submission Flow (front-end)

- **Feature slug:** `e3-seller-submission-flow`
- **Repo:** `sell-house-for-free` (Next.js 16.2.3, React 19.2.4, Tailwind v4)
- **Upstream:** `_bmad-output/planning-artifacts/project-plan-sell-house-for-free.md` §4 E3
- **Depends on:** E1 (Site Foundation) — consumes `(marketing)`/`get-started` placeholder route, primitives (`Button`, `Field`, `Input`, `Select`, `Checkbox`, `Textarea`, `FormStep`, `Container`), `SITE`, `ROUTES`, `buildMetadata`, tokens
- **Feeds:** E4 (address-entered hook, enrichment merge slot), E5 (canonical `SellerFormDraft` payload → `NewClientDto` mapping), E6 (on-page confirmation), E7 (consent copy constants)
- **Author:** Noah (Architect) · 2026-04-17
- **Status:** draft — ready for PM decomposition

---

## 1. Summary

E3 delivers the multi-step seller submission flow at `/get-started`: **Address → Property facts → Condition & Timeline → Contact & Consent**. It defines the **canonical `SellerFormDraft` payload** that E4 enriches and E5 maps to Offervana's `NewClientDto`, installs an **idempotency-keyed Server Action** as the submit boundary, and wires **first-party-only abandonment analytics** with no third-party PII pixels.

E3 makes no live cross-service calls — submission ends in a stub Server Action that logs the validated payload and redirects to `/get-started/thanks`. The `AddressField` seam and `enrichment` slot on `SellerFormDraft` are the extension points E4 plugs into.

**Affected services:** `sell-house-for-free` only.

**Pattern adherence snapshot**

| Area | Choice | Pattern source |
|---|---|---|
| Form submission | React 19 Server Actions + `useActionState` | Next.js 16 `02-guides/forms.md` |
| Pending UI | `useFormStatus` inside the submit button | Next.js 16 `02-guides/forms.md` §Pending states |
| Step routing | Single route `/get-started`, step derived from `?step=<slug>` search param | Next.js 16 `02-guides/preserving-ui-state.md` §Dialog (derive transient state from URL) |
| Search-param access | `useSearchParams` in a Client Component wrapped in `<Suspense>` | Next.js 16 `03-api-reference/04-functions/use-search-params.md` §Prerendering |
| Validation | Zod: per-step sub-schemas (client gate) + full schema (server re-validation) | Next.js 16 `02-guides/forms.md` §Form validation |
| Draft persistence | `localStorage` with versioned key, PII-free | Plan §4 E3 requirement + no-third-party-PII posture |
| Attribution capture | `instrumentation-client.ts` harvester + Client hook on mount | Next.js 16 `03-api-reference/03-file-conventions/instrumentation-client.md` |
| Custom analytics | `@vercel/analytics` `track()` — first-party, no PII payload | `@vercel/analytics` (already in deps from E1) |
| Metadata | `metadata.robots = { index: false, follow: false }` on `/get-started` and children | Funnel route should not be indexed |
| Primitives | Reuse E1 handrolled primitives; no Radix/RHF in MVP | E1 arch §6 handrolled discipline |

**Pages & routes delivered**

| Route | Type | Purpose |
|---|---|---|
| `/get-started` | Server Component shell + Client orchestrator | Four-step form; `?step=<slug>` drives which step renders |
| `/get-started/thanks` | Server Component | Post-submit confirmation stub (E6 fills real PM assignment) |
| `/api/submit` | Route Handler (optional, dev-only echo) | Stub endpoint used by analytics/error fallback beacons; **not** the primary submit path — the Server Action is |

---

## 2. Component diagram

```
       URL:  /get-started?pillar=cash-offers&city=phoenix&step=address
                             │
                             ▼
       ┌────────────────────────────────────────────────┐
       │  src/app/get-started/layout.tsx    (Server)   │
       │    • funnel shell (minimal chrome, progress    │
       │      rail slot, no primary nav)                │
       │    • metadata.robots noindex                   │
       └────────────────────┬───────────────────────────┘
                            │ children
                            ▼
       ┌────────────────────────────────────────────────┐
       │  src/app/get-started/page.tsx      (Server)   │
       │    • reads searchParams → initialHints         │
       │      (pillar, city, step)                      │
       │    • renders <Suspense fallback={<Skeleton/>}> │
       │        <SellerForm initialHints={…}            │
       │                    initialStep={…} />          │
       │      </Suspense>                               │
       └────────────────────┬───────────────────────────┘
                            │
                            ▼
       ┌────────────────────────────────────────────────┐
       │  components/get-started/seller-form.tsx        │
       │    'use client'                                │
       │    • useSearchParams()  ── step driver         │
       │    • useSellerFormDraft() ── localStorage      │
       │    • useAttribution()    ── harvest utm/gclid  │
       │    • useIdempotencyKey() ── crypto.randomUUID  │
       │    • useActionState(submitSellerForm, …)       │
       │                                                │
       │   renders: <Progress/> + one of               │
       │     <AddressStep/> <PropertyStep/>             │
       │     <ConditionStep/> <ContactStep/>            │
       │   + <StepNav back/next/submit>                 │
       └──┬────────┬──────────────┬────────────────┬────┘
          │        │              │                │
          ▼        ▼              ▼                ▼
       Address  Property       Condition        Contact
       Step     Step           Step             Step
          │                                       │
          │                                       ├─ <ConsentBlock/>
          │                                       │   └ consent/tcpa.ts + terms.ts
          │                                       │
          ▼                                       ▼
       <AddressField>            Server Action: actions.ts
         (E4 swaps to combobox)   submitSellerForm(prev, formData)
                                    • zod full-schema safeParse
                                    • stub log (E5 replaces body)
                                    • redirect('/get-started/thanks')

       Shared module: src/lib/seller-form/
         ├── types.ts          SellerFormDraft, EnrichmentSlot
         ├── schema.ts         Zod: fullSchema + perStepSchemas
         ├── draft.ts          localStorage load/save (PII-stripped)
         ├── attribution.ts    UTM/gclid/referrer capture
         ├── analytics.ts      track() wrappers for step_entered/completed/abandoned
         └── idempotency.ts    UUID gen + session persistence

       Root config:
         ├── src/instrumentation-client.ts  (first-party entry harvester)
         └── src/app/api/submit/route.ts    (dev-only echo; not primary)
```

---

## 3. Per-service changes

Everything lives inside `sell-house-for-free`.

### 3.1 Routes & funnel shell

| File | Action | Notes |
|---|---|---|
| `src/app/get-started/layout.tsx` | Create | Minimal shell: brand mark (top-left), "Questions? Call (…) " contact sliver (right), no primary marketing nav. Fills the entire viewport on mobile; constrained width on desktop. `<Container>` variant `form` (`max-w-[var(--container-form)]`). |
| `src/app/get-started/page.tsx` | Replace E1-S5 placeholder | Server Component. Reads `searchParams` (Next.js 16: `searchParams: Promise<…>`, must `await`). Computes `initialHints = { pillar?, city? }` and `initialStep` (default `'address'` if absent or unknown). Passes to `<SellerForm/>` wrapped in `<Suspense>`. Exports `metadata` with `robots: { index: false, follow: false }` via `buildMetadata({…, noindex: true })` (E1's `buildMetadata` gets a `noindex` option added in E3-S1 as the smallest possible change). |
| `src/app/get-started/thanks/page.tsx` | Create | Server Component. Displays a headline ("Thanks — your Project Manager will reach out within X hours"), the submission reference from the redirect hash / searchParam, and next-step copy. **Stub in E3; E6 fills real PM assignment + SendGrid trigger.** Accepts `?ref=<submissionId>` or similar for display. |
| `src/app/get-started/loading.tsx` | Create | Skeleton — address field stub + disabled next button. Covers Suspense boundary during initial hydration. |
| `src/app/get-started/error.tsx` | Create | `"use client"`. Displays "Something went wrong — your draft is saved" + a "Retry" button that refreshes the page; draft hydrates back from `localStorage`. |
| `src/app/get-started/actions.ts` | Create | `"use server"`. Exports `submitSellerForm(prevState: SubmitState, formData: FormData): Promise<SubmitState>`. Validates via full Zod schema; on success, **stub-logs** the `SellerFormDraft` JSON + idempotency key to stdout and calls `redirect(`/get-started/thanks?ref=${submissionId}`)`. On validation error returns `{ ok: false, errors: flatten() }`. **E5 replaces the happy-path body.** |
| `src/app/api/submit/route.ts` | Create (dev-only) | Echo `POST` handler. Used only by the analytics beacon fallback for `form_abandoned` events and any stray non-Server-Action post. Strips PII before log. Not on the primary submit path. |

### 3.2 `src/components/get-started/` (new)

| File | Shape | Notes |
|---|---|---|
| `seller-form.tsx` | `<SellerForm initialHints initialStep />` — Client orchestrator | Owns: step derivation from `useSearchParams()`, draft hydration, attribution capture, idempotency key, `useActionState` wiring, step-change focus move. Renders progress + current step + nav. |
| `progress.tsx` | `<Progress current total labels />` | Uses E1 `FormStep` primitive. ARIA `progressbar` + visually-hidden step labels. |
| `step-nav.tsx` | `<StepNav onBack onNext canAdvance submitting />` | Back + Next as `Button` variants. On final step shows "Submit" (`type="submit"`) whose pending state derives from `useFormStatus`. |
| `steps/address-step.tsx` | AZ address fields | `street1` (required), `street2` (optional), `city` (required, text), `state` (fixed-disabled `"AZ"`), `zip` (required, 5-digit, AZ-range check 85001–86556). Uses `<AddressField/>` for `street1`. |
| `steps/property-step.tsx` | `bedrooms`, `bathrooms`, `squareFootage`, `yearBuilt`, `lotSize` | All numeric, all optional in MVP (plan: "pre-fill known facts so the seller types less" — E4 fills these; E3 collects if seller is typing ahead of enrichment). Guard rails: `inputMode="numeric"`, min/max on `yearBuilt` (1850–current year). |
| `steps/condition-step.tsx` | `currentCondition` (radio: `move-in` / `needs-work` / `major-reno`), `timeline` (select: `0-3mo` / `3-6mo` / `6-12mo` / `exploring`), `motivation` (textarea, optional, 500 char cap) | |
| `steps/contact-step.tsx` | `firstName`, `lastName`, `email` (`type=email`), `phone` (`type=tel`, US format) + `<ConsentBlock/>` | This is the only step where PII is entered. On blur of phone, lightweight US-format hint; server validation is authoritative. |
| `address-field.tsx` | `<AddressField value onChange onAddressComplete />` — **the E4 seam** | MVP: styled `<input>` that normalizes whitespace + emits `onAddressComplete(addr)` when street+city+state+zip all non-empty. E4 replaces implementation with an accessible Combobox backed by SmartyStreets/MLS without changing the props. |
| `consent-block.tsx` | Renders TCPA checkbox + terms checkbox + privacy checkbox (or combined), each with the exact copy from `@/content/consent/*.ts`, stamps `acceptedAt: new Date().toISOString()` when checked. | Copy is authored in E7; E3 just renders. |

### 3.3 `src/lib/seller-form/` (new)

| File | Purpose |
|---|---|
| `types.ts` | `SellerFormDraft` (canonical), `EnrichmentSlot` (E4 contract), `SubmitState` (Server Action reducer state), per-step field typings. |
| `schema.ts` | Zod: `fullSellerFormSchema`, `addressStepSchema`, `propertyStepSchema`, `conditionStepSchema`, `contactStepSchema`. Exports `validateStep(step, data)` and `validateAll(data)` helpers. Contains the AZ zip-range regex `/^8[5-6]\d{3}$/` and a belt-and-suspenders `state === 'AZ'` refinement. |
| `draft.ts` | `readDraft()`, `writeDraft(partial)`, `clearDraft()`, all guarded for SSR (`typeof window`). Strips PII on write (`contact`, `consent.*AcceptedAt`). Storage key: `shf:draft:v1`. |
| `attribution.ts` | `captureAttribution()` — reads `document.referrer`, `window.location`, parses UTM/gclid/gbraid/wbraid/gad_source/gad_campaign_id from `URLSearchParams`. Persists to `sessionStorage` under `shf:attr:v1` so it survives intra-funnel nav. Pulled by the form on mount; included in the submit payload. |
| `analytics.ts` | Thin wrappers over `@vercel/analytics` `track()` — `trackStepEntered(step)`, `trackStepCompleted(step)`, `trackFormSubmitted(submissionId)`, `trackFormAbandoned(step)`. **No PII ever in event properties** (only step names, durations, booleans). |
| `idempotency.ts` | `useIdempotencyKey()` — returns a stable UUID; generates with `crypto.randomUUID()` on first call; persists to `sessionStorage` under `shf:idk:v1`; survives reloads and retries within the session. Cleared by `clearDraft()` on successful submit. |

### 3.4 `src/content/consent/` (new)

| File | Shape | Notes |
|---|---|---|
| `tcpa.ts` | `export const TCPA_CONSENT = { version: '2026-04-17', text: '…' }` | **Authored by E7.** E3 ships with a legal-placeholder text clearly marked `REPLACE_IN_E7`, so the form is functional but copy is not legally-binding until E7 lands. |
| `terms.ts` | `export const TERMS_CONSENT = { version: '…', text: '…' }` | Same posture. |
| `privacy.ts` | `export const PRIVACY_ACK = { version: '…', text: '…' }` | Same posture. |

### 3.5 `src/instrumentation-client.ts` (new)

Minimal: captures `entry_timestamp` and `entry_page` on first load (before React hydrates) and stores in `sessionStorage` under `shf:entry:v1`. `captureAttribution()` reads from here if it exists. This ensures attribution survives SPA-internal navigation between marketing pages and the funnel.

Also exports `onRouterTransitionStart(url, type)` to `track('nav_transition', { to: url, type })` — first-party only, useful for funnel-wide flow analysis. Reference: `instrumentation-client.md` §Router navigation tracking.

### 3.6 Environment variables (new)

None. E3 is FE-only; Offervana / Supabase / SendGrid credentials are introduced by downstream epics.

### 3.7 Packages added

| Package | Purpose | Where |
|---|---|---|
| `zod` (runtime dep) | Form validation, client + server | `src/lib/seller-form/schema.ts` |

No other deps. `react-hook-form` is **not** added (see §5 deviation). `@vercel/analytics` is already in E1's deps.

### 3.8 Edits to existing files

| File | Edit |
|---|---|
| `src/lib/seo.ts` | Add `noindex?: boolean` option to `buildMetadata()`; when true emits `robots: { index: false, follow: false, googleBot: { index: false, follow: false } }`. One-line addition. |
| `src/lib/routes.ts` | Add `/get-started` (excluded from sitemap: `changeFrequency: undefined, priority: undefined, excludeFromSitemap: true`) so the route registry stays complete; sitemap filters it out. |

### 3.9 Assets (deliverable alongside code)

Minor — the funnel is content-light:

| Path | Asset |
|---|---|
| `public/images/get-started/hero-sm.jpg` (optional) | Narrow header image for address step; design-optional. |

---

## 4. Integration contracts

E3 has **no external service contracts** — the only contracts are with adjacent epics inside this repo.

### 4.1 E3 ← E1 (consumer)

| Use | E1 export | E3 consumption |
|---|---|---|
| Primitives | `Button`, `Field`, `Input`, `Label`, `Fieldset`, `Checkbox`, `Radio`, `Select`, `Textarea`, `FormStep`, `Container`, `Card` | Composed into steps and shell |
| SEO | `buildMetadata({ noindex: true })` | `page.tsx`, `thanks/page.tsx` |
| Site config | `SITE.name`, `SITE.url`, `SITE.broker` | Shell footer, confirmation page |
| Route registry | `ROUTES` | Append `/get-started` + `/get-started/thanks` with `excludeFromSitemap: true` |
| Type ramp | E1 arch §4 utility pattern | Step headings + body |
| Tokens | Brand tokens via `@theme` | Buttons, borders, focus ring |

### 4.2 E3 ← E2 (deep-link query params — optional)

Per E2 arch §4.2, marketing CTAs may emit `?pillar=listing|cash-offers|cash-plus-repairs|renovation-only` or `?city=<slug>`. E3 contract:

- Read at `page.tsx` server-side from `searchParams`.
- Pass through as `initialHints` prop to `<SellerForm/>`.
- Stored as `SellerFormDraft.pillarHint` and `SellerFormDraft.cityHint`.
- **Never break on garbage** — unknown values are coerced to `undefined` via a small allowlist at the page boundary.
- Missing params yield a working form with no pre-selection.

### 4.3 E3 → E4 (enrichment hook)

**Contract the E3 code exposes to E4:**

```ts
// src/lib/seller-form/types.ts
export type EnrichmentSlot = {
  status: 'idle' | 'loading' | 'ok' | 'error' | 'timeout'
  attomId?: string
  mlsRecordId?: string
  listingStatus?: 'not-listed' | 'currently-listed' | 'previously-listed'
  details?: {
    bedrooms?: number
    bathrooms?: number
    squareFootage?: number
    yearBuilt?: number
    lotSize?: number
  }
  photos?: Array<{ url: string; caption?: string }>
  fetchedAt?: string // ISO
}

export type SellerFormDraft = {
  submissionId: string
  schemaVersion: 1
  address: { /* … */ }
  property: { /* … */ }
  condition: { /* … */ }
  contact: { /* … */ }
  consent: { /* … */ }
  pillarHint?: string
  cityHint?: string
  attribution: { /* … */ }
  currentListingStatus?: string
  enrichment?: EnrichmentSlot  // ← E4 writes this
}
```

**Trigger signal:** `<AddressField>` fires `onAddressComplete(address)` once the street+city+state+zip are present and individually valid. E4 will wire a hook (`useAddressEnrichment(address)`) that:
- Debounces for 400ms
- Calls the BFF route `src/app/api/enrich/route.ts` (created by E4)
- Writes the `EnrichmentSlot` onto the form draft via a reducer action (or a dedicated `setEnrichment(slot)` exposed by `useSellerFormDraft`)
- Surfaces loading / ok / error states inline on the property step (E4's UI work; E3 leaves the slot shape ready)

**Graceful degradation:** the form must submit with `enrichment?.status === 'error' | 'timeout' | 'idle'` without blocking. E3 schema treats `enrichment` as fully optional.

### 4.4 E3 → E5 (canonical payload)

**E5 replaces the happy-path body of `submitSellerForm` in `actions.ts`.** The signature, the Zod validation, and the `SellerFormDraft` type all stay stable. E5 adds:
1. Mapping `SellerFormDraft` → `NewClientDto` (`SignUpData` / `PropData` / `SurveyData` JSON / `CustomerLeadSource` / attribution block).
2. Offervana HTTP call with idempotency header (`X-Idempotency-Key: <submissionId>`).
3. Retry with exponential backoff.
4. Structured logging + dead-letter on permanent failure.
5. Return of Offervana's `ReferralCode` through the redirect (`?ref=${referralCode}`), which `/get-started/thanks` displays.

**E3's job is to make E5 trivial** — the payload shape is the contract. If E5 needs additional fields (e.g. `CustomerLeadSource` enum value for renovation-only), E3 adds them as nullable fields on `SellerFormDraft` + collects via existing UI (the `pillarHint` already discriminates). No schema changes required in E5.

### 4.5 E3 → E6 (confirmation handoff)

On successful submit, E3 redirects to `/get-started/thanks?ref=<submissionId>`. E6 replaces the confirmation page:
- Server Component reads `ref` from `searchParams`.
- Looks up assigned PM in Supabase (E6 owns).
- Renders "Your Project Manager is …" + contact-window copy.

**E3 contract:** `/get-started/thanks` exists, accepts `?ref=`, and displays a static placeholder until E6 fills in.

### 4.6 E3 → E7 (consent copy)

`src/content/consent/{tcpa,terms,privacy}.ts` constants: **E3 ships placeholders; E7 replaces the `text` field with production legal copy.** E3 renders the current `text` verbatim and stamps `acceptedAt` when checked. Every consent checkbox records the `version` string from the constant, so downstream systems can prove which text the user consented to.

---

## 5. Pattern decisions + deviations

### Decisions (with citations)

1. **Server Actions for submit** — Next.js 16 `02-guides/forms.md` is explicit: "React Server Actions are Server Functions that execute on the server. They can be called in Server and Client Components to handle form submissions." The Server Action is wired via `<form action={formAction}>` inside a Client Component using `useActionState`.
2. **`useActionState` + Zod for validation** — Follows `forms.md` §Validation errors example verbatim. Client-side `safeParse` gates step advance; server-side `safeParse` is authoritative on submit.
3. **`useFormStatus` for submit button pending** — `forms.md` §Pending states. The submit button lives in a child component so it sees the nearest `<form>` pending status.
4. **`useSearchParams` inside `<Suspense>`** — `use-search-params.md` §Prerendering: "We recommend wrapping the Client Component that uses `useSearchParams` in a `<Suspense/>` boundary." The page is a Server Component; the form is the Client boundary inside Suspense.
5. **Step state derived from URL (`?step=<slug>`)** — `preserving-ui-state.md` §Dialog: "derive the dialog state from something outside the preserved component state like a search param." Same principle: deep-linkable, back-button-friendly, analytics-observable. Intermediate back/next uses `router.replace('?step=…', { scroll: false })` to avoid history pollution inside the funnel.
6. **Native HTML validation as defense-in-depth** — `required`, `type="email"`, `type="tel"`, `inputMode="numeric"`, `pattern` — cited in `forms.md` §Form validation.
7. **Zod for the canonical schema** — `forms.md` example uses it by name. Single source of truth for client-side step gate + server-side re-validation + TS inference of `SellerFormDraft`.
8. **`crypto.randomUUID()` for idempotency key** — Widely available in all evergreen browsers; avoids shipping a UUID dep. Persisted to `sessionStorage` so a retry after a transient error reuses the same key; E5 will forward it as the Offervana idempotency header.
9. **`@vercel/analytics` `track()` for custom events** — First-party, same-origin, no PII payload. Plan §3 non-functional: "no third-party marketing pixels, no lead-resale integrations, no analytics that ship PII to ad networks." Vercel Analytics via `<Analytics />` is already approved in E1.
10. **`instrumentation-client.ts` for early entry-page + referrer capture** — `instrumentation-client.md`: "runs before your application becomes interactive." Ensures UTM/gclid attribution isn't lost between initial paint and React hydration.
11. **`robots: { index: false, follow: false }` on `/get-started/*`** — Funnel routes should never appear in search results. Pattern from Next.js 16 `generate-metadata.md` robots block.
12. **Native primitives + E1 handrolled set** — No Radix, no shadcn/ui. Matches E1 arch §6; every primitive E3 needs already exists from E1-S6..S8.
13. **Route handler `/api/submit/route.ts` as dev-only echo, not primary** — `route.md` §HTTP Methods. Kept for the beacon fallback only; the Server Action is the authoritative path.

### Deviations (with justification)

| Deviation | From | Why | Who accepts the risk |
|---|---|---|---|
| No React Hook Form | Common React form-library default | Every step has ≤8 fields, no dynamic arrays, no complex refs. `useActionState` + Zod + native events is simpler, smaller, and Server-Actions-native. RHF's value shines on complex forms; this form is four short steps. | Noah — revisit if post-launch we add dynamic repeaters (e.g. multiple properties). |
| No address autocomplete / combobox in E3 MVP | Plan §4 E3 says "AZ-only address autocomplete" | Autocomplete is only valuable once backed by a real data source (SmartyStreets or MLS). That data source lights up in E4. E3 provisions the `<AddressField>` seam (same props) and lands a plain input + AZ zip/state guards. Zero architectural rework when E4 swaps the implementation. | Noah — documented as the single known follow-up on the address step. |
| Step state in URL `?step=` rather than in-memory only | Simpler implementations keep step in `useState` | Analytics needs step-as-event without an invasive tap on every `setStep`. Browser back/forward needs to map to step back/forward without explicit handlers. Deep-linking for recoverable errors (`/get-started/error?step=contact`) works for free. Cost: one `useSearchParams` + `<Suspense>` boundary. | Noah — small, well-documented tradeoff. |
| Draft persistence strips PII | Simpler impl persists every field | `localStorage` is first-party but still user-device state that can leak (shared computer, inspector copy, extension access). Persisting `contact` + consent acceptance materially worsens exposure with minimal UX benefit — contact is one screen; re-entering it is fine. | Noah — aligns with the "trust posture is a first-class product surface" stance in plan §1. |
| Server Action is the primary submit path, not `/api/submit` | Some teams route everything through route handlers | `forms.md` guidance is Server Actions for mutations. Route handler is dev-echo only. Centralizes validation + logging + redirect in one file (`actions.ts`) that E5 replaces body-only. | Noah. |
| `src/content/consent/*.ts` placeholders that block "production" until E7 lands | Could delay building E3 until consent copy exists | Consent copy is author-owned by E7 (plan §E7 "TCPA wording gets first-class attention"). Blocking E3 on E7 serializes two parallel tracks for no structural reason. Placeholder constants with an `ACCEPT_BEFORE_PRODUCTION` flag let the form be fully functional in dev/preview while forcing a pre-launch check. | Noah — E8's launch gate includes verifying all consent constants have `isPlaceholder: false`. |
| Custom abandonment tracking via `visibilitychange` + `pagehide` beacon rather than a full session-replay tool | Industry-default uses Hotjar/FullStory/Clarity | All three ship DOM + input replays containing PII to third-party servers. Plan §3: "no analytics that ship PII to ad networks." Hand-rolled step-level events are sufficient for funnel diagnosis; replay is not worth the privacy cost. | Noah — plan §3 non-functional. |
| No CAPTCHA in E3 MVP | Many public forms add reCAPTCHA/Turnstile | reCAPTCHA ships data to Google. Turnstile (Cloudflare) is cleaner but still third-party network to external origin. MVP relies on server-side Zod validation + future E8 rate-limit at the CDN. If spam becomes a problem, Turnstile is the default follow-up. | Noah — explicit security deferral; flag for E8 review before launch. |

---

## 6. Open questions

None blocking. Items to resolve downstream:

- **Combobox library for E4** — Headless UI, Downshift, or Radix Combobox. Decide in E4 architecture when the SmartyStreets/MLS behavior is concrete.
- **Consent copy ownership** — plan Q10 lands TCPA in E7. Confirm E7 PM accepts the shared-constant pattern (`@/content/consent/*.ts`) vs preferring a different authoring location (e.g., MDX).
- **Abandonment threshold** — "user left step X after ≥ Y seconds without advancing" — the Y for each step is product-tunable. MVP uses 30s; adjust after first week of data.
- **Pillar-hint → path-A/path-B nudge** — when `?pillar=renovation-only` is present, should E3 pre-select an option on the condition step, or leave neutral? Product call. MVP: leave neutral; just flag in `SellerFormDraft.pillarHint` so E5 can set `CustomerLeadSource` and the PM sees intent.
- **Enrichment caching on the client** — E4 decides TTL. E3 leaves `enrichment.fetchedAt` on the slot so E4 can implement staleness checks.
- **Session-vs-local for draft** — current call is `localStorage` (survives browser restart). If analytics show a meaningful abandonment-recovery rate, confirm. If returning sessions confuse users, move to `sessionStorage` + a shorter TTL.

---

## 7. Handoff notes for PM (suggested story boundaries)

Proposed decomposition into ADO User Stories under the E3 Feature. Most stories land in parallel after S1-S2; the step stories share the orchestrator from S3.

| # | Story | Size | Notes |
|---|---|---|---|
| E3-S1 | **Funnel shell + routing + metadata** — `get-started/layout.tsx`, `get-started/page.tsx` (Server Component + Suspense + initialHints), `get-started/loading.tsx`, `get-started/error.tsx`, `get-started/thanks/page.tsx` stub, add `noindex` option to `buildMetadata` in `lib/seo.ts`, append routes to `lib/routes.ts` with `excludeFromSitemap: true` | S | Unblocks every other story. Single route, no interactivity yet. |
| E3-S2 | **Seller-form core: types + Zod schemas + draft/attribution/idempotency/analytics helpers** — `src/lib/seller-form/{types,schema,draft,attribution,analytics,idempotency}.ts`, `instrumentation-client.ts` | M | The canonical payload shape lands here. Add `zod` dep. No UI. 100% testable in isolation. |
| E3-S3 | **`<SellerForm>` orchestrator** — `components/get-started/seller-form.tsx`, `progress.tsx`, `step-nav.tsx` + URL-driven step state + `useActionState` wiring + `useFormStatus` submit button + focus management on step change | M | Wraps S4-S7 step components; renders a placeholder per step until they land. |
| E3-S4 | **Address step + `<AddressField>` seam** — `steps/address-step.tsx`, `components/get-started/address-field.tsx`, AZ zip-range + state-guard validation in `schema.ts` | M | Includes the E4-seam interface (`onAddressComplete`). No SmartyStreets / MLS yet. |
| E3-S5 | **Property facts step** — `steps/property-step.tsx` | S | Five numeric fields. |
| E3-S6 | **Condition & timeline step** — `steps/condition-step.tsx` | S | Radio + select + optional textarea. |
| E3-S7 | **Contact + consent step** — `steps/contact-step.tsx`, `components/get-started/consent-block.tsx`, `src/content/consent/{tcpa,terms,privacy}.ts` placeholder constants with `isPlaceholder: true` flag | M | The only step with PII. Consent copy placeholders explicitly flagged; E7 replaces. |
| E3-S8 | **Server Action + stub submit + confirmation redirect** — `get-started/actions.ts` with full Zod validation, stub success log, `redirect('/get-started/thanks?ref=…')`; confirmation page renders the `ref` | S | Defines the signature E5 preserves. `src/app/api/submit/route.ts` dev-echo handler lands here too. |
| E3-S9 | **Analytics events** — wire `trackStepEntered` / `trackStepCompleted` / `trackFormSubmitted` / `trackFormAbandoned` via `@vercel/analytics` `track()`; `visibilitychange` + `pagehide` beacon for abandonment using `navigator.sendBeacon` to `/api/submit` with `{ type: 'abandonment' }` payload | S | First-party only; verify in DevTools that no external origin fires. |
| E3-S10 | **A11y + keyboard + focus hardening + responsive QA** — focus moves to step heading on step change, `aria-live` for step changes + validation errors, tab order audit, 44×44 touch targets on all controls, full Axe run on each step, iOS/Android keyboard QA (numeric keypads, autocomplete hints `autocomplete="postal-code"` etc.) | S | Runs after S3-S8 are shape-complete. Produces a short `docs/e3-a11y-audit.md` per plan §3 NF. |
| E3-S11 | **Draft-recovery UX + error boundary polish** — on mount with a persisted draft, show a small "Welcome back — resume your submission?" dismissible banner; on `error.tsx` show the saved-draft reassurance; full-flow retry after a transient Server Action error reuses the idempotency key | XS | Polish story; cleans up the abandonment-to-recovery loop the draft system already enables. |

**Critical sequencing:** S1 unblocks everything. S2 unblocks S3-S8. S3 unblocks S4-S7 (they can land in parallel once the orchestrator is up). S8 closes the happy-path spine. S9-S11 are polish and can land in parallel after S8.

**Parallelism:** S4, S5, S6, S7 can be four contributors at once. S9 + S10 + S11 can overlap.

**Acceptance criteria cadence** — every E3 story must include:

- `next build` passes; `/get-started` is **not** prerendered (it's a dynamic entry) but `/get-started/thanks` is prerenderable
- Lighthouse LCP < 2.5s on 4G throttle for `/get-started` first step (plan §3 NF)
- Axe run on the touched step/component reports zero violations
- No third-party network requests fire on any step (DevTools Network — only `va.vercel-scripts.com` in prod allowed; self-origin otherwise)
- Zod schemas have unit tests covering happy + validation-error paths
- `useActionState`-based submit works with JS disabled as a progressive-enhancement sanity check on the final step (confirms we're on the Server-Actions happy path and not accidentally client-JS-only)

**Not in E3 scope** (for PM planning clarity): real address autocomplete (E4), real ATTOM/MLS enrichment (E4), real Offervana submission (E5 replaces `actions.ts` body), PM assignment / real thanks page (E6), production consent copy (E7), rate-limit / CAPTCHA / security headers (E8).

---

## 8. References

- Project plan: `_bmad-output/planning-artifacts/project-plan-sell-house-for-free.md` §4 E3
- E1 architecture: `_bmad-output/planning-artifacts/architecture-e1-site-foundation.md`
- E2 architecture (for deep-link contract): `_bmad-output/planning-artifacts/architecture-e2-marketing-pages-trust-surface.md` §4.2
- Next.js 16 Forms / Server Actions: `node_modules/next/dist/docs/01-app/02-guides/forms.md`
- Next.js 16 Preserving UI State (URL-derived state pattern): `node_modules/next/dist/docs/01-app/02-guides/preserving-ui-state.md`
- Next.js 16 `useSearchParams`: `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/use-search-params.md`
- Next.js 16 `<Form>` component: `node_modules/next/dist/docs/01-app/03-api-reference/02-components/form.md`
- Next.js 16 Route Handlers: `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md`
- Next.js 16 `instrumentation-client`: `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/instrumentation-client.md`
- Next.js 16 Analytics: `node_modules/next/dist/docs/01-app/02-guides/analytics.md`
- React 19 `useActionState`: https://react.dev/reference/react/useActionState
- React 19 `useFormStatus`: https://react.dev/reference/react-dom/hooks/useFormStatus
- Zod: https://zod.dev
- Behavioral reference (Offervana Angular): `commerce-site/homeowner-flow/HomeownerFlowComponent` — specifically SmartyStreets `verifySmartyPropAddress` (address normalization) and `getPropertyDetailsByAddress` (pre-fill call) subtleties. **E3 reproduces the address-normalization intent; the pre-fill call is E4.**
