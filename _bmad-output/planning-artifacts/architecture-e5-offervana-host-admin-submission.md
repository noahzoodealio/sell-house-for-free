# Architecture — E5 Offervana Host-Admin Submission

- **Feature slug:** `e5-offervana-host-admin-submission`
- **Repo:** `sell-house-for-free` (Next.js 16.2.3, React 19.2.4, Tailwind v4)
- **Upstream:** `_bmad-output/planning-artifacts/project-plan-sell-house-for-free.md` §4 E5
- **Depends on:** E1 (Site Foundation — `buildMetadata`, lib scaffolding), E3 (Submission Flow — preserves `submitSellerForm` signature, consumes `SellerFormDraft`), E4 (Property Data Enrichment — consumes `EnrichmentSlot`)
- **Feeds:** E6 (`ReferralCode` correlation key, shared Supabase infra), E8 (launch smoke test spine)
- **Companion change:** `Offervana_SaaS` — two `CustomerLeadSource` enum values added; **no schema migration**
- **Author:** Noah (Architect) · 2026-04-17
- **Status:** draft — ready for PM decomposition
- **Amended:** 2026-04-22 — see §0 below; sections 1–7 that describe the host-admin path are superseded where they conflict with §0.

---

## 0. Amendment (2026-04-22) — Pivot to Enterprise OuterApi + Offers Fetch

This epic no longer targets the host-admin `CreateHostAdminCustomer` endpoint. We will stand up a dedicated **Offervana enterprise tenant** and submit through the existing **OuterApi** (`openapi/*`) surface. The enterprise tenant is configured so platform-originated email/SMS is off for these customers by default.

Where this section conflicts with §1–§7 below, §0 wins. Treat §1–§7 as historical context for the auth/idempotency/dead-letter/`after()` shape — that shape survives, only the endpoint, auth, and companion-PR lines change.

### 0.1 What changes

**Submit path (end of the seller form):**
- Endpoint: `POST {OFFERVANA_BASE_URL}/openapi/Customers?pullPropertyData=true`
- Auth: `apiKey: <OFFERVANA_API_KEY>` header (resolves tenant via `OuterApiKeyFilter`) — replaces `[AllowAnonymous]`
- Request: `CreateCustomerDto` (Name, Email, Phone, Address, ImageUrls) with the OuterApi **suppress-notifications flag** set so no email / SMS goes to the seller from Offervana. Enterprise tenant is also configured with platform email/SMS templates disabled as a belt-and-suspenders default; the API flag is the authoritative gate per-submission.
- Response: `GetCustomersDto` — capture `customerId` and `propertyId` alongside our own `ReferralCode`; persist to the idempotency row.
- Mapper: `SellerFormDraft → CreateCustomerDto` (replaces the `SellerFormDraft → NewClientDto` mapper in §3.1.4). Pure function, same shape, different target DTO.

**Offers fetch (after `/get-started/thanks` loads):**
- Endpoint: `GET {OFFERVANA_BASE_URL}/openapi/OffersV2?propertyId={propertyId}&includeHistory=false`
- Trigger: on mount of the `/get-started/thanks` page, client issues a fetch against a thin server-only BFF route (e.g. `GET /api/offers?ref=<referralCode>`) that reads `propertyId` from the idempotency row and proxies the OuterApi call with the server-only `OFFERVANA_API_KEY`. The API key never reaches the browser.
- Cadence: single fetch on load per user flow spec ("after the load from end of submission flow we send get request"). Offers can be surfaced progressively in `/portal` (see `src/app/portal/` and `src/components/portal/portal-app.tsx` — the "Cash offers" nav section already exists). Any longer-horizon polling/backfill belongs on the portal, not on `/thanks`.
- Response mapping: `List<GetPropertyOfferV2Dto>` → trimmed offer DTO the client + portal consume. Zero offers is a valid, common state — `/thanks` must degrade gracefully with "we'll let you know when offers come in" copy, not a spinner lock.

### 0.2 What drops from the original plan

- **Offervana_SaaS companion PR is removed.** No `CustomerLeadSource` enum additions (13/14), no `CustomerAppServiceV2.CreateHostAdminCustomer` switch arms, no `CommerceAttribution` ternary edits. The OuterApi path already exists; enterprise tenancy means we don't need new enum values to distinguish this flow. `sellYourHouseFreePath` transitional flag is not needed.
- **Story S7** ("Offervana companion PR") is deleted from the decomposition.
- The "Path A / Path B" enum-routing framing in §1 / §5 / §7 is obsolete under enterprise OuterApi — routing is tenant-based.

### 0.3 What survives from §1–§7 unchanged

- BFF-owned idempotency keyed on `SellerFormDraft.submissionId` with the Supabase `offervana_idempotency` table (now also storing `propertyId` so the `/offers` BFF route can look it up by `ReferralCode`).
- `offervana_submission_failures` dead-letter table.
- Node runtime + `maxDuration=15` on the Server Action.
- `after()` for post-response PM handoff + audit log.
- Native `fetch` + manual retry loop + `cache: 'no-store'`.
- `server-only` guard on the Offervana client and Supabase server client modules.
- Pure mapper; email-conflict handled as a non-failure branch (treat as success with `referralCode='pending'`).

### 0.4 New / changed env vars

| Var | Scope | Purpose |
|---|---|---|
| `OFFERVANA_BASE_URL` | server | unchanged — now points at the OuterApi host |
| `OFFERVANA_API_KEY` | server | **new** — OuterApi key for the enterprise tenant; set in the outgoing `apiKey` header |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | server | unchanged |

### 0.5 Story decomposition delta

| Story | Status | Notes |
|---|---|---|
| S1 — Supabase scaffolding (idempotency + dead-letter tables) | **unchanged** | Add `property_id` column to `offervana_idempotency` so the offers BFF route can resolve it |
| S2 — Offervana client (fetch, retry, classify, timeout) | **retarget** | Point at `POST /openapi/Customers`; inject `apiKey` header; drop `[AllowAnonymous]` assumption |
| S3 — Pure mapper `SellerFormDraft → CreateCustomerDto` | **retarget** | Different DTO shape (OuterApi `CreateCustomerDto`, not `NewClientDto`); set the suppress-notifications flag |
| S4 — Idempotency lookup/store + redirect | **unchanged** | Persist `propertyId` in addition to `customerId`/`userId`/`referralCode` |
| S5 — Dead-letter recorder + `after()` wiring | **unchanged** | — |
| S6 — Server Action body rewrite + error surfaces | **unchanged** | — |
| S7 — ~~Offervana companion PR~~ | **deleted** | Enterprise OuterApi removes the need |
| S8 — E2E smoke (full form → redirect → thanks) | **extended** | Add the offers-fetch path to the E2E (see S9) |
| **S9 — Offers BFF route + `/thanks` fetch** | **new** | `GET /api/offers?ref=<referralCode>` → `OuterApi OffersV2`; client fetch on `/thanks` mount; surface offers into `/portal` "Cash offers" section (portal wire-up itself may be a separate story) |

Net story count: 8 → 8 (one deleted, one added).

### 0.6 Non-functional requirement — no platform notifications to the seller

For every submission in this flow, the seller must not receive any email or SMS originating from the Offervana platform. This is enforced at two layers:

1. **Per-request:** the `CreateCustomerDto` suppress-notifications flag is set on every POST. (The exact flag name lives in the Offervana `CreateCustomerDto` — confirm when wiring S3.)
2. **Per-tenant:** the enterprise tenant is provisioned with platform email/SMS templates disabled / unconfigured. This is tenant setup, not code.

Validation gate (added to DoD): a live smoke-test submission against the enterprise tenant produces a customer record with no platform-originated email/SMS delivered to the test inbox/phone within 15 minutes post-create.

### 0.7 Open question tracker

- **Suppress-notifications flag name on `CreateCustomerDto`:** confirm the exact field during S3. If it doesn't exist on the current DTO, a tiny Offervana_SaaS PR adding it re-introduces (scoped down) the companion-PR dependency — but `_bmad/memory/zoo-core/services/offervana-saas/api-catalog.md` does not currently enumerate every `CreateCustomerDto` field, so this is verify-don't-assume.
- **Offers display target:** `/thanks` (minimal "here are N offers so far") vs. `/portal` (full "Cash offers" section). Current direction: fetch on `/thanks` load to warm caches / surface a count, full display lives in `/portal`. Confirm during S9.

---

## 1. Summary

E5 replaces the **happy-path body** of the Server Action E3 stubbed (`src/app/get-started/actions.ts`) with the real Offervana submission. The action:

1. Re-validates `SellerFormDraft` server-side via the existing Zod schema (unchanged from E3).
2. Short-circuits on an idempotency hit — if `submissionId` has already succeeded, returns the cached `ReferralCode`.
3. Maps `SellerFormDraft` → `NewClientDto` via a pure mapper.
4. `POST`s to `https://<offervana>/api/services/app/CustomerAppServiceV2/CreateHostAdminCustomer` with exponential-backoff retry on transient failures.
5. Persists the successful `(customerId, userId, referralCode)` to the Supabase idempotency table.
6. Dead-letters permanent failures with full request/response context.
7. Schedules post-response work via `after()` — logs audit, writes the submission row E6 reads, (optionally) pre-alerts the PM-assignment channel.
8. `redirect('/get-started/thanks?ref=${referralCode}')` (or `?ref=unassigned` for the dead-letter path so UX is uniform).

E5 is **auth-free** (the Offervana endpoint is `[AllowAnonymous]`), **schema-free** on Offervana (no DB migration — only two new int values in the existing `CustomerLeadSource` enum), and **idempotent at the BFF layer** (Offervana has no idempotency primitive and "email already exists" is a user-retryable failure mode the UX must swallow gracefully).

**Affected services**

| Service | Change kind | Scope |
|---|---|---|
| `sell-house-for-free` | primary implementation | ~8 new files + replace body of `actions.ts` + 2 Supabase tables + env + Node runtime pin |
| `Offervana_SaaS` | minor enum addition | 2 lines in `Customer.cs` + 2 case arms in the `CustomerAppServiceV2.CreateHostAdminCustomer` lead-type switch + 1 line in `CommerceAttribution` source-tag switch |

**Pattern adherence snapshot**

| Area | Choice | Pattern source |
|---|---|---|
| Submit path | React 19 Server Action replaces body of E3's `submitSellerForm` | Next.js 16 `02-guides/forms.md`; E3 arch §5.1 |
| External call | Native `fetch` with `AbortSignal.timeout(...)` + manual retry loop; `cache: 'no-store'` | Next.js 16 `03-api-reference/04-functions/fetch.md` (data is non-cacheable mutation) |
| Runtime | Node runtime (`export const runtime = 'nodejs'`) on the Server Action module | Required for Supabase SDK + longer max duration |
| Max duration | `export const maxDuration = 15` on `actions.ts` | Next.js 16 `03-api-reference/03-file-conventions/02-route-segment-config/maxDuration.md` (tighter than default; leaves Vercel room before 504) |
| Post-response work | `after()` from `next/server` for PM-submissions write + audit log | Next.js 16 `03-api-reference/04-functions/after.md` |
| Idempotency | BFF-owned — `offervana_idempotency` row keyed on `SellerFormDraft.submissionId`, stores cached result | No Offervana endpoint support ⇒ owned at BFF (deviation, see §5) |
| Dead-letter | `offervana_submission_failures` table + Vercel log + (optional) Slack ping via `after()` | Plan §4 E5 requirement |
| Secrets | Vercel env vars, read server-side only; no `NEXT_PUBLIC_*` exposure | Next.js 16 `02-guides/data-security.md` |
| Data layer | Supabase (already endorsed by plan §E6 Q11a) — service-role key used only in `src/lib/supabase/server.ts` (server-only) | Plan §7 |
| Logging | Structured JSON via `console.log(JSON.stringify({...}))` — picked up by Vercel runtime logs | Vercel default; no external log vendor in MVP |
| Error surface | Server Action returns `{ ok: false, errors: ['We couldn't reach our offer system. Your draft is saved — please try again.'] }` on permanent failure; Zod errors flow through existing E3 machinery unchanged | E3 arch §3.1 `SubmitState` |
| Redirect-on-success | `redirect()` from `next/navigation` throws a control-flow exception — must be called outside `try/catch` that swallows errors | Next.js 16 `03-api-reference/04-functions/redirect.md` |

---

## 2. Component diagram

```
     ┌──────────────────────────────────────────────────────────────┐
     │ Browser: /get-started (E3 form)                             │
     │  <form action={submitSellerForm}>                            │
     │    SellerFormDraft (incl. submissionId, enrichment,         │
     │                     attribution, consent)                   │
     └───────────────┬──────────────────────────────────────────────┘
                     │ POST (multipart/form-data)
                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│ src/app/get-started/actions.ts       'use server'    runtime: node │
│  submitSellerForm(prevState, formData): Promise<SubmitState>        │
│                                                                     │
│   1. zod.safeParse(formData) ── E3 schema, unchanged               │
│        │ fail → return { ok: false, errors }      (no Offervana)   │
│        ▼                                                            │
│   2. idempotency.lookup(submissionId)                              │
│        │ hit  → redirect('/get-started/thanks?ref='+cachedRef)     │
│        ▼ miss                                                       │
│   3. mapper.toNewClientDto(draft) ── pure function                 │
│        │                                                            │
│        ▼                                                            │
│   4. offervana.createHostAdminCustomer(dto)                        │
│        ├─ fetch(OFFERVANA_BASE_URL + '/api/services/app/           │
│        │    CustomerAppServiceV2/CreateHostAdminCustomer', …)      │
│        ├─ AbortSignal.timeout(5000)                                │
│        ├─ retry: attempts 0/1/4s backoff, cap 10s wall             │
│        ├─ classify: transient | permanent | conflict (email-dup)   │
│        └─ returns { customerId, userId, referralCode } | Error     │
│        │                                                            │
│        ├─ transient → retried                                      │
│        ├─ conflict  → handleEmailConflict() → treat as success     │
│        │                 with referralCode='pending' (dead-letter   │
│        │                 for PM manual reconcile)                  │
│        └─ permanent → deadLetter.record(dto, error) → success      │
│                         with referralCode='unassigned'             │
│                                                                     │
│   5. idempotency.store(submissionId, { referralCode, ... })        │
│                                                                     │
│   6. after(async () => {                                            │
│        pmHandoff.writeSubmission(draft, referralCode)  // E6       │
│        audit.log(event: 'lead_created', ...)                        │
│      })                                                             │
│                                                                     │
│   7. redirect('/get-started/thanks?ref='+referralCode)             │
└──────────────────────┬──────────────────────────────────────────────┘
                       │
        ┌──────────────┴──────────────┐
        ▼                             ▼
 ┌─────────────────┐         ┌─────────────────────────┐
 │ Offervana_SaaS  │         │ Supabase (shared w/ E6) │
 │  [AllowAnonymous]│         │  offervana_idempotency  │
 │  POST Create    │         │  offervana_submission_  │
 │  HostAdmin      │         │    failures             │
 │  Customer       │         │  submissions (E6)       │
 │                 │         │  pm_assignments (E6)    │
 │  → User         │         └─────────────────────────┘
 │  → Customer     │
 │  → Property     │
 │  → CommerceAttr │
 │  returns        │
 │  (customerId,   │
 │   userId,       │
 │   ReferralCode) │
 └─────────────────┘

 New lib modules in sell-house-for-free:
   src/lib/offervana/
     ├── client.ts       ── fetch + retry + timeout + classify
     ├── mapper.ts       ── SellerFormDraft → NewClientDto (pure)
     ├── errors.ts       ── OffervanaError, classify(), isTransient()
     ├── idempotency.ts  ── Supabase lookup/store + 24h TTL
     └── dead-letter.ts  ── Supabase insert + structured log
   src/lib/supabase/
     ├── server.ts       ── createServerClient() with SERVICE_ROLE_KEY
     └── schema.ts       ── TS types for tables (hand-written, not codegen in MVP)
```

---

## 3. Per-service changes

### 3.1 `sell-house-for-free` (primary)

#### 3.1.1 `src/app/get-started/actions.ts` — **replace happy-path body only**

E3 delivers this file with a stub body (log + redirect). E5 replaces the success branch only; the Zod validation and error-return shape stay identical so that E3's `useActionState`-driven error rendering works unchanged.

```ts
'use server'

import { after } from 'next/server'
import { redirect } from 'next/navigation'
import { fullSellerFormSchema } from '@/lib/seller-form/schema'
import { submitToOffervana } from '@/lib/offervana/client'
import { toNewClientDto } from '@/lib/offervana/mapper'
import { lookupIdempotent, storeIdempotent } from '@/lib/offervana/idempotency'
import { recordDeadLetter } from '@/lib/offervana/dead-letter'
import { writePmSubmission } from '@/lib/pm/handoff'

export const runtime = 'nodejs'
export const maxDuration = 15 // seconds — tighter than the Vercel 60s default

export async function submitSellerForm(
  _prev: SubmitState,
  formData: FormData,
): Promise<SubmitState> {
  const parsed = fullSellerFormSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.flatten() }
  }
  const draft = parsed.data

  const cached = await lookupIdempotent(draft.submissionId)
  if (cached) {
    redirect(`/get-started/thanks?ref=${encodeURIComponent(cached.referralCode)}`)
  }

  const dto = toNewClientDto(draft)
  const result = await submitToOffervana(dto, { submissionId: draft.submissionId })

  let referralCode: string
  switch (result.kind) {
    case 'ok':
      referralCode = result.value.referralCode
      await storeIdempotent(draft.submissionId, result.value)
      break
    case 'email-conflict':
      referralCode = 'pending'
      await storeIdempotent(draft.submissionId, { ...result.stub, referralCode })
      await recordDeadLetter(draft, dto, { reason: 'email-conflict', detail: result.detail })
      break
    case 'permanent-failure':
      referralCode = 'unassigned'
      await storeIdempotent(draft.submissionId, { customerId: null, userId: null, referralCode })
      await recordDeadLetter(draft, dto, { reason: 'permanent-failure', detail: result.detail })
      break
  }

  after(async () => {
    await writePmSubmission({ draft, referralCode })
    console.log(JSON.stringify({ event: 'lead_submitted', submissionId: draft.submissionId, referralCode }))
  })

  redirect(`/get-started/thanks?ref=${encodeURIComponent(referralCode)}`)
}
```

> `redirect()` must live outside any `try` that swallows — it throws a sentinel. Classification logic stays inside `submitToOffervana` / `after` where the surrounding code handles its own errors.

#### 3.1.2 `src/lib/offervana/client.ts` (new)

- `submitToOffervana(dto, { submissionId }): Promise<SubmitResult>` where `SubmitResult` is a tagged union `{ kind: 'ok', value } | { kind: 'email-conflict', stub, detail } | { kind: 'permanent-failure', detail }`.
- Uses `fetch()` with `cache: 'no-store'`, `headers: { 'Content-Type': 'application/json', 'X-Client-Submission-Id': submissionId }` (informational — Offervana ignores it today; future-proofs us if they add idempotency).
- Wraps in `AbortSignal.timeout(5000)` (single-attempt timeout) with a retry loop capped at 3 attempts and ~10s total wall clock:
  - Attempt 1 immediate
  - Attempt 2 after 1s
  - Attempt 3 after 4s
  - Backoff includes ±250ms jitter to avoid thundering herd on Offervana cold start.
- Classifies response:
  - HTTP 2xx with the tuple response → `{ kind: 'ok' }`
  - HTTP 200 but `(customerId, userId, ReferralCode)` shape looks like the C# ValueTuple JSON shape — **actually `{ item1, item2, item3 }`** (confirmed by `angular/src/app/commerce-site/homeowner-flow/homeowner-flow.component.ts:1006–1007`, which reads `result.item2` and `result.item3`). The client normalizes to named fields.
  - HTTP 4xx with body matching `/already.*registered|duplicate.*email|email.*taken/i` → `{ kind: 'email-conflict' }`
  - HTTP 5xx, network error, `AbortError`, or 429 → transient, retried
  - Retries exhausted or HTTP 4xx that isn't email-conflict → `{ kind: 'permanent-failure' }`

Response normalization (important subtlety):

```ts
const raw = await res.json() as { item1: number; item2: number; item3: string }
return {
  customerId: raw.item1,
  userId: raw.item2,
  referralCode: raw.item3,
}
```

#### 3.1.3 `src/lib/offervana/mapper.ts` (new)

Pure function `toNewClientDto(draft: SellerFormDraft): NewClientDto`. Reproduces the behavior of `_submitHostAdminCustomer` at `Offervana_SaaS/angular/src/app/commerce-site/homeowner-flow/homeowner-flow.component.ts:969–998`, but for our data model:

- `SignUpData`: `{ firstName, lastName, email, phone }` from `draft.contact`.
- `PropData` (`AddPropInput`): `{ address1, address2, city, stateCd: 'AZ', zipCode, country: 'US', gpsCoordinates }`. `gpsCoordinates` comes from `draft.enrichment?.details?.gpsCoordinates` if present (E4 may attach lat/lng to the slot — confirm in E4 arch), else empty string. `CustomerId` is left `0` — Offervana assigns.
- `SurveyData` (JSON string — Offervana does `JsonConvert.DeserializeObject<dynamic>` and reads `bedrooms` / `bathrooms` / `squareFootage` directly; everything else is pass-through stored verbatim):

  ```json
  {
    "bedrooms": <int, clamp 1..100, default 1>,
    "bathrooms": <float, clamp 0.5..50, default 1>,
    "squareFootage": <float, >0, default 1500>,
    "yearBuilt": <int | null>,
    "lotSize": <int | null>,
    "condition": "move-in" | "needs-work" | "major-reno",
    "timeline": "0-3mo" | "3-6mo" | "6-12mo" | "exploring",
    "motivation": "<free text, 500 char cap>",
    "pillarHint": "<listing|cash-offers|cash-plus-repairs|renovation-only|undefined>",
    "currentListingStatus": "not-listed" | "currently-listed" | "previously-listed" | null,
    "attomId": "<string | null>",
    "mlsRecordId": "<string | null>",
    "sellYourHouseFreePath": "cash" | "renovation",
    "isOwner": "Homeowner",
    "consent": {
      "tcpaVersion": "<iso date>",
      "tcpaAcceptedAt": "<iso timestamp>",
      "termsVersion": "<iso date>",
      "termsAcceptedAt": "<iso timestamp>",
      "privacyVersion": "<iso date>",
      "privacyAcceptedAt": "<iso timestamp>"
    }
  }
  ```

  Clamps match the Angular reference (`homeowner-flow.component.ts:832-834`) so scoring behaves identically to other host-admin submissions.
- `CustomerLeadSource`: `13` (cash path) or `14` (renovation-only path) if the Offervana companion PR ships first; else `11` (CashOffers) fallback with `sellYourHouseFreePath` set in `SurveyData` so PMs and reporting can still disambiguate. Derivation rule: `draft.pillarHint === 'renovation-only' ? renovation : cash`.
- `SubmitterRole`: `0` (Homeowner) — our site is homeowner-only.
- `SendPrelims`: `true` — matches `homeowner-flow.component.ts:974` behavior and triggers the existing `ValidateAvmValue` + prelim email pipeline.
- `IsSellerSource`: `true` — we are a seller-facing funnel; this propagates to Offervana's `Customer.IsSellerSource` flag which is already filtered on in agent reporting.
- Attribution: flatten `draft.attribution.*` to the top-level fields on `NewClientDto` (`GppcParam, Gclid, Gbraid, Wbraid, GadSource, GadCampaignId, UtmSource, UtmMedium, UtmCampaign, UtmTerm, UtmContent, Referrer, SessionId, EntryPage, EntryTimestamp`). E3's `attribution.ts` already produces these in the right names (camelCase) and Offervana's JSON binder accepts either casing.

#### 3.1.4 `src/lib/offervana/errors.ts` (new)

Typed errors — `OffervanaTransientError`, `OffervanaPermanentError`, `OffervanaEmailConflictError`. `classifyResponse(res)` inspects status + body. No `any` escapes.

#### 3.1.5 `src/lib/offervana/idempotency.ts` (new)

- `lookupIdempotent(submissionId)` → `{ customerId, userId, referralCode } | null`. Reads from `offervana_idempotency` WHERE `submission_id = $1` AND `expires_at > now()`.
- `storeIdempotent(submissionId, result)` → upsert with `expires_at = now() + interval '24 hours'`.
- 24h TTL is enough for user retries after a transient error (e.g., transient Offervana outage, user reloads after 5 min). Beyond 24h, re-submitting with the same `submissionId` may create a duplicate — acceptable because E3 clears `shf:idk:v1` on successful submit and rotates on new session.
- Uses the server-only Supabase client (service-role key).

#### 3.1.6 `src/lib/offervana/dead-letter.ts` (new)

- `recordDeadLetter(draft, dto, meta)` inserts into `offervana_submission_failures` with:
  - `submission_id`, `draft_json` (PII — OK, this is a private ops table), `dto_json`, `reason` (enum), `detail` (text — stack / response body snippet), `created_at`.
- Also emits a one-line structured JSON log (`console.error(JSON.stringify({...}))`) so Vercel picks it up and on-call can grep.
- MVP has no paging mechanism — the table is the queue; E6 PM alert includes a "needs manual reconcile" flag when `referralCode === 'unassigned'`.

#### 3.1.7 `src/lib/supabase/server.ts` (new, shared with E6)

- Server-only module (`import 'server-only'` at the top).
- Exports `getSupabaseAdmin(): SupabaseClient` lazily using the `@supabase/supabase-js` v2 SDK.
- Reads `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` from env. Throws clear error at first use if missing (not at import time — allows the `next build` to succeed when env isn't set locally).
- Caches the client per-request via `React.cache()` so the same client is reused across the Server Action + `after()` callback without re-handshaking.

#### 3.1.8 Supabase schema additions (owned by E5; expanded by E6)

```sql
-- 3.1.8a: Idempotency table
create table public.offervana_idempotency (
  submission_id text primary key,
  customer_id integer null,
  user_id bigint null,
  referral_code text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index on public.offervana_idempotency (expires_at);

-- 3.1.8b: Dead-letter table
create type public.offervana_failure_reason as enum (
  'transient-exhausted',
  'permanent-failure',
  'email-conflict',
  'validation-drift'
);
create table public.offervana_submission_failures (
  id bigserial primary key,
  submission_id text not null,
  reason public.offervana_failure_reason not null,
  draft_json jsonb not null,
  dto_json jsonb not null,
  detail text null,
  resolved_at timestamptz null,
  created_at timestamptz not null default now()
);
create index on public.offervana_submission_failures (created_at desc);
create index on public.offervana_submission_failures (resolved_at) where resolved_at is null;
```

Row-level security: RLS enabled, no public policies — only service-role key can read/write. Schema migrations live under `supabase/migrations/` (standard Supabase CLI layout), versioned in git.

#### 3.1.9 Environment variables (new)

| Var | Scope | Purpose |
|---|---|---|
| `OFFERVANA_BASE_URL` | server | e.g. `https://app.offervana.com` — dev/uat/prod-specific |
| `SUPABASE_URL` | server | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | server | **Service role key.** Never expose to client. Kept in Vercel encrypted env vars. |

Add `.env.example` documenting all three, plus a README note: the service-role key bypasses RLS and must only be imported inside `src/lib/supabase/server.ts`.

#### 3.1.10 Packages added

| Package | Version target | Purpose |
|---|---|---|
| `@supabase/supabase-js` | `^2` | Server-only client in `src/lib/supabase/server.ts` |
| `server-only` | `^0.0` | Build-time guard that prevents accidental client import of server modules |

No retry/backoff library — the logic is ~20 lines inside `client.ts`, and any lib (e.g. `p-retry`) would add a dep for trivially-bespoke behavior.

#### 3.1.11 Edits to existing files

| File | Edit |
|---|---|
| `src/app/get-started/thanks/page.tsx` | No structural change — E3 already reads `searchParams.ref`. E5 extends the rendered copy to handle `'unassigned'` and `'pending'` sentinel values gracefully (`"We've got your submission. Your Project Manager will reach out within 24 hours."`). Real PM name comes from E6. |
| `src/lib/seller-form/types.ts` | Optional: add `currentListingStatus?: string` passthrough field onto `SellerFormDraft` if E4 hasn't already (E3 arch §4.3 already lists it). E5 depends on it being present; confirm at E5-S3. |
| `.env.example` | Add the three new vars above with placeholder values. |
| `next.config.ts` | No change required for runtime — `runtime = 'nodejs'` is set at the action module level. |

### 3.2 `Offervana_SaaS` (companion PR — minor)

Separate PR in `Offervana_SaaS` that can ship before, alongside, or after E5's main work (E5 has a fallback that lets it ship with `CustomerLeadSource = 11` + `SurveyData.sellYourHouseFreePath` disambiguation until this lands).

| File | Change |
|---|---|
| `aspnet-core/src/Offervana.Core/Domain/Customer/Customer.cs:177–218` | Append two values: `[Description("Sell Your House Free – Cash Path")] SellYourHouseFree = 13,` and `[Description("Sell Your House Free – Renovation")] SellYourHouseFreeRenovation = 14,`. Enum is `int`-backed; no DB change. |
| `aspnet-core/src/Offervana.Application/Customer/CustomerAppServiceV2.cs:1185–1201` (`leadType` switch) | Add two `else if` arms that route both new values to `CustomerLeadType.CashOffersLandingPage` (same scoring + downstream treatment as CashOffers). If/when renovation warrants a distinct lead type, that's a follow-up. |
| `aspnet-core/src/Offervana.Application/Customer/CustomerAppServiceV2.cs:1362` (`CommerceAttribution.Source` tag) | Extend the ternary to `customerLeadSource == HomeReport ? "HomeReport" : customerLeadSource == SellYourHouseFree || customerLeadSource == SellYourHouseFreeRenovation ? "SellYourHouseFree" : "CashOffers"`. |
| `aspnet-core/src/Offervana.Application/Customer/CustomerAppServiceV2.cs:1303–1306` (`landingPageTag`) | Analogously extend the ternary with `"SellYourHouseFreePage"` for the two new values, so reporting tags stay useful. |

That's the whole Offervana change — **no DB migration, no new table, no new endpoint**. Everything routes through the existing `CreateHostAdminCustomer` happy path.

---

## 4. Integration contracts

### 4.1 `sell-house-for-free` → `Offervana_SaaS`

**Endpoint:** `POST {OFFERVANA_BASE_URL}/api/services/app/CustomerAppServiceV2/CreateHostAdminCustomer`

**Controller:** `Offervana.Customer.CustomerAppServiceV2.CreateHostAdminCustomer([FromBody] NewClientDto body)` — `CustomerAppServiceV2.cs:1103`. Class-level `[AbpAuthorize]` is overridden by method-level `[AllowAnonymous]`.

**Auth:** none. No `Authorization` header, no `Abp.TenantId` header, no API key. Sending a JWT would be ignored (and `AbpSession.UserId` falls back to null inside the method, which the code already handles — see `:1110-1112`).

**Request body** (JSON, `Content-Type: application/json`):

```json
{
  "SignUpData": {
    "FirstName": "string",
    "LastName": "string",
    "Email": "string",
    "Phone": "string"
  },
  "PropData": {
    "Address1": "string",
    "Address2": "string | null",
    "City": "string",
    "Country": "US",
    "GpsCoordinates": "lat,lng | ''",
    "StateCd": "AZ",
    "ZipCode": "string",
    "CustomerId": 0
  },
  "SurveyData": "<JSON string — see §3.1.3 shape>",
  "SendPrelims": true,
  "CustomerLeadSource": 13,
  "SubmitterRole": 0,
  "IsSellerSource": true,
  "GppcParam": "...",
  "Gclid": "...",
  "Gbraid": "...",
  "Wbraid": "...",
  "GadSource": "...",
  "GadCampaignId": "...",
  "UtmSource": "...",
  "UtmMedium": "...",
  "UtmCampaign": "...",
  "UtmTerm": "...",
  "UtmContent": "...",
  "Referrer": "...",
  "SessionId": "...",
  "EntryPage": "/",
  "EntryTimestamp": 1712345678901
}
```

All string fields nullable unless otherwise noted; Offervana's binder is tolerant to either camelCase or PascalCase (ABP uses Newtonsoft.Json with default contract resolver). We send PascalCase to match the server-side DTO shape so diffing against `NewClientDto.cs` stays straightforward.

**Response** (HTTP 200 — C# ValueTuple serialization quirk):

```json
{ "item1": 12345, "item2": 67890, "item3": "ABC12XYZ" }
```

Normalized by `client.ts` to `{ customerId: 12345, userId: 67890, referralCode: "ABC12XYZ" }`. Confirmed behavior by reading the Angular consumer at `homeowner-flow.component.ts:1006-1007` (`result.item2`, `result.item3`).

**Error responses** (observed / expected):

| Scenario | HTTP | Body shape | Our classification |
|---|---|---|---|
| Email already registered | 400/500 | `UserFriendlyException` message containing `"already"` / `"registered"` / `"taken"` — Offervana surfaces RegisterAsync failures verbatim | `email-conflict` → dead-letter with reason, seller sees "We already have you on file — your PM will reconcile" |
| Invalid payload (shouldn't happen — our Zod is tighter than Offervana's) | 400 | ABP error envelope `{ error: { message, details } }` | `permanent-failure` → dead-letter |
| Offervana 5xx / network timeout / `AbortError` | 5xx / n/a | — | transient → retry, exhausted → `permanent-failure` |
| Rate limit (429) | 429 | — | transient (respects `Retry-After` if present) |

**Timeouts:** 5s per attempt, 3 attempts, ~10s wall clock. `maxDuration = 15` on the Server Action leaves ~5s for validation + idempotency lookup + `redirect`.

**Idempotency:** **not provided by Offervana on this endpoint.** We own idempotency at the BFF using Supabase `offervana_idempotency`. We still send `X-Client-Submission-Id: <submissionId>` as an informational header — no-op today, upgradeable later without a client change.

**Side effects on Offervana** (all server-side, implicit — from reading `CustomerAppServiceV2.cs:1103–1377`):

1. `UserRegistrationManager.RegisterAsync()` — user row with password `"123456"` (Offervana-standard for host-admin leads; the user isn't expected to log in through our funnel).
2. `CustomerServiceV2.CreateCustomerAsync()` — customer row under the `"Dashboard"` host-admin tenant.
3. `PropertyAppService.CreateAsync()` — property row + `AddressSurveyInfo` + `HomeInfoDto { SquareFootage, BedroomsCount, BathroomsCount }`. `IsAPICreated: false`, `IsHomeReportCall: false`.
4. `_onboardingService.ValidateAvmValue(propertyId, !isHomeReport, sendPrelims: true)` — triggers AVM enrichment workflow + prelim emails.
5. `_blastAppService.AddCustomerToBlast(...)` — enrolls in blast.
6. `_notificationService.CreateNotification(PropertySubmission)` — in-platform notification to Offervana ops.
7. `_emailScheduler.SendHomeownerHostOfferRequestEmail(...)` — seller-facing email. **This is a transactional email we get "for free" — E6's SendGrid-via-Offervana plan can rely on this if the copy is acceptable; otherwise E6 sends a second branded email.**
8. `_customerIndexService.IndexCustomer(...)` — search indexing.
9. `EventBus.TriggerAsync(LeadCreatedEto)` — fires the ABP event bus, which downstream subscribers (Slack, GHL) may handle.
10. `CommerceAttribution` row — all UTM/gclid/referrer fields persist.
11. Slack property thread creation (`homeowner` / `agent` / `homeowner-and-agent` submitterRole) — already wired.

Our submission is a **writer to Offervana's system of record**. A successful 200 means all 11 side effects fired. A retry that actually succeeds at Offervana (duplicate create) would create duplicates — which is exactly why idempotency lives at our BFF layer, not at Offervana.

### 4.2 `sell-house-for-free` → Supabase (owned in this repo; shared with E6)

Two tables in §3.1.8. Read/write exclusively from `src/lib/supabase/server.ts` via service-role key. RLS denies public. No schema coupling between E5 tables and E6 tables except by `submission_id` / `referralCode` (loose — no FK, since the tables are logically separate concerns).

### 4.3 E3 ← E5 (consumer contract)

E3 exposes:
- `SellerFormDraft` shape (§4.3 of E3 arch) — E5 consumes verbatim, no additions to the draft type beyond what E3/E4 already ship.
- `SubmitState` return type — E5 preserves exactly.
- `submissionId` — stable UUID from E3's `idempotency.ts`, used as the BFF idempotency key.
- Zod schema — E5 **re-validates** using the same `fullSellerFormSchema`. No drift.

### 4.4 E4 ← E5 (consumer contract)

- `SellerFormDraft.enrichment.attomId` and `.mlsRecordId` → written to the `SurveyData` JSON string so Offervana persists them in `Property.SurveyJson` without schema change. PMs see them in the dashboard; reporting can query them.
- `SellerFormDraft.enrichment.listingStatus` → `SurveyData.currentListingStatus`. A `"currently-listed"` value is useful context for the PM when reconciling with the MLS listing that already exists.
- `SellerFormDraft.enrichment?.details?.gpsCoordinates` (if present) → `PropData.GpsCoordinates`. If absent, we send empty string (matches Angular reference behavior when no lat/lng is available).
- `enrichment?.status !== 'ok'` is explicitly allowed — E5 never blocks on enrichment.

### 4.5 E6 ← E5 (feeder contract)

- **Referral-code correlation key.** The redirect includes `?ref=<referralCode>`. `/get-started/thanks` reads it. E6 uses it as the FK to `pm_assignments.referral_code`.
- **`writePmSubmission(...)` inside `after()`.** E5 writes a row to E6's `submissions` table (created by E6) that includes: `submission_id`, `referral_code`, `customer_id`, `user_id`, `city`, `state_cd`, `pillar_hint`, `sell_your_house_free_path`, `currentListingStatus`, `created_at`, `is_dead_letter` (true if `referralCode === 'unassigned'` or `'pending'`).
- E6 reads this row in `/get-started/thanks/page.tsx` + in its PM-assignment workflow.
- **Fallback when E6 isn't live yet:** if the `submissions` table doesn't exist, `writePmSubmission` swallows the error (after `console.error`) and the dead-letter machinery is the recovery path. E5 does **not** fail the lead on E6-layer persistence failures — Offervana is the system of record; E6 is a local dispatch hint.

### 4.6 Secret + env handoff to E8 (launch readiness)

| Var | Environments needed | Rotation policy |
|---|---|---|
| `OFFERVANA_BASE_URL` | dev, uat, prod | Manual; environment-specific |
| `SUPABASE_URL` | dev (shared project permitted), uat, prod | Manual |
| `SUPABASE_SERVICE_ROLE_KEY` | dev, uat, prod | Rotatable from Supabase dashboard; E8 runbook documents the steps |

E8 launch checklist must include: verifying none of these ever appear in client-bundled code (grep the production `.next/static/**` for `SUPABASE_SERVICE_ROLE_KEY` / the actual key value — zero hits required).

---

## 5. Pattern decisions + deviations

### Decisions (with citations)

1. **Server Action as submit path.** Preserved from E3; E5 only replaces the body. Next.js 16 `02-guides/forms.md`, §Server Actions.
2. **Node runtime + `maxDuration = 15`.** Supabase SDK needs Node (not Edge) and a tight max duration keeps us inside Vercel's platform limits. Next.js 16 `03-api-reference/03-file-conventions/02-route-segment-config/maxDuration.md`.
3. **`after()` for post-response work.** PM handoff write + audit log run after the redirect is sent. Next.js 16 `03-api-reference/04-functions/after.md` — "`after` will be executed even if the response didn't complete successfully. Including when an error is thrown or when `notFound` or `redirect` is called" — exactly the semantics we need for the redirect-then-log pattern.
4. **Native `fetch` with manual retry.** Next.js 16 `03-api-reference/04-functions/fetch.md`. `cache: 'no-store'` because this is a mutation. Manual retry because the backoff rules are specific to Offervana behavior and wouldn't survive an off-the-shelf retry library's defaults (e.g. `p-retry`'s default 5xx-only retry excludes `AbortError`).
5. **`AbortSignal.timeout()` for per-attempt timeout.** Web-standard, no dependency. Supported in Node 18+.
6. **BFF-owned idempotency in Supabase.** Offervana doesn't support it; Supabase is the sanctioned DB for this repo (plan §E6 Q11a). Sharing infrastructure with E6 instead of standing up a separate Redis.
7. **Dead-letter to the same DB.** Same rationale — we already have Supabase; a queue-based DLQ would be over-engineered for MVP traffic (expected <100 submissions/day in the AZ launch).
8. **`CustomerLeadSource` enum additions (13, 14) instead of a schema change.** The column is already `int`. No DB migration. Rollback is a two-line revert. Decision authored alongside platform owner (Noah) per plan §E5 "CustomerLeadSource enum — existing values are HomeReport, CashOffers. We likely need a new value". Plan §Q9b: "likely a new CustomerLeadSource enum value such as SellYourHouseFree_Renovation".
9. **`isSellerSource: true`.** Matches the semantic of `CustomerLeadSource.SellerSource` (used elsewhere for homeowner-originated leads — see `CustomerAppServiceV2.cs:2641` in `UserAppService`) without overloading that enum value, which has a specific meaning in agent flows.
10. **`SurveyData` JSON carries pillar hint + path selection.** Offervana stores `Property.SurveyJson` verbatim, so additional fields pass through untouched. Matches the commerce-site Angular reference which stuffs additional fields into the same blob (e.g. `yearBuilt`, `poolType`, `isOwner` at `homeowner-flow.component.ts:722-739`).
11. **`SubmitterRole = 0` (Homeowner), hard-coded.** This site is homeowner-only; the agent / homeowner-and-agent branches in `CustomerAppServiceV2.cs:1254` are unreachable from our funnel.
12. **Pure mapper** (`mapper.ts` is a pure function, no I/O). 100% unit-testable. Keeps the `SellerFormDraft → NewClientDto` transform auditable — critical because this is the integrity point for the anti-broker claim ("nothing we don't disclose leaves our side").
13. **`server-only` guard.** Next.js 16 recommends `server-only` package for modules that must never ship to the client. Prevents accidental imports of `supabase/server.ts` from a Client Component.
14. **PascalCase over the wire.** Easier to diff payloads against `NewClientDto.cs` in code review; ABP's Newtonsoft binder accepts both casings.

### Deviations (with justification)

| Deviation | From | Why | Who accepts the risk |
|---|---|---|---|
| No `X-Idempotency-Key` header semantic on the **server** side | RFC-style idempotency keys on write endpoints | Offervana doesn't honor one today. We simulate the effect by BFF-side dedup in Supabase. Sending the header is a no-op but future-proofs. | Noah — revisit if Offervana adds native support, at which point the Supabase table becomes a cache + evidence trail rather than authoritative. |
| No circuit breaker | Production integration patterns often include one (e.g., Polly in .NET, `opossum` in Node) | Expected MVP traffic is <100/day and Offervana is a platform-core service — if it's down, the PM flow is broken regardless. Retry + dead-letter is sufficient. E8 sets a monitor on `offervana_submission_failures` row count per hour. | Noah — documented follow-up if traffic grows. |
| Dead-letter in the transactional DB rather than a dedicated queue | Azure Service Bus / SQS | Same: MVP scale. Supabase is already provisioned; adding a queue adds a second moving part for no tangible gain at this volume. Reconciliation is manual via a SQL view. | Noah — upgrade to a queue if failures > ~10/day. |
| Password hard-coded to `"123456"` in the mapper | Would normally generate a random password | Matches the existing commerce-site Angular behavior at `homeowner-flow.component.ts` (Offervana code at `CustomerAppServiceV2.cs:1117` also literally sets `var password = "123456"` inside the endpoint — **the password we send is ignored by the server**). We're matching existing Offervana semantics; the user never logs in through our funnel. | Noah — documented that the value is not a credential in any meaningful sense; if Offervana later enforces password policy, E5 switches to `crypto.randomUUID()` without client migration. |
| `redirect()` even on `permanent-failure` — with `?ref=unassigned` — rather than showing an error screen | Standard pattern: show error, let user retry | Retrying won't help if Offervana is throwing a permanent error on our payload — the user gets stuck in a loop. Instead we store dead-letter, redirect to thanks with an honest "your PM will reach out" message, and E6 PM manually reconciles within 24h. This is the **plan §4 E5 trust-posture call** — we promise a PM, we deliver a PM, the fact that the first automated step failed is our problem to clean up, not the seller's. | Noah + PM ownership — requires E6 to alert PMs when a submission lands with `referralCode === 'unassigned'`. |
| Hard-coded `sendPrelims: true` | Could be configurable | The commerce-site default and Offervana's own treatment for CashOffers leads. Making it configurable adds surface without product motivation. Revisit only if prelim emails prove noisy post-launch. | Noah. |
| CSRF not implemented at the Server Action level | Standard web-form hardening | Server Actions include built-in origin protection in Next.js 16 (`02-guides/authentication.md` — forms submitted via `action={serverFn}` are tied to the originating deployment via encrypted action-id). Third-party origins can't forge a submission. E8 pen-test verifies. | Noah — inherited from E3, reconfirmed here. |
| No request deduplication via email hash at the BFF | Preventing email-conflict failures before they hit Offervana | We could check Supabase for a recent `offervana_idempotency` row with a matching email hash — but that's a second lookup on every happy-path submission, and the email-conflict branch is already handled as a non-failure outcome. Not worth the latency. | Noah — add only if email-conflict rate is > 5% in the first month. |
| Supabase service-role key in the Server Action rather than going through Supabase RPC with row-level policies | More "pure" zero-trust design | Server-role key stays server-side; Supabase RPC with a custom JWT would still require the same key to mint the JWT. Simpler to use the SDK directly. RLS is defense-in-depth — since only the server-only module holds the key, defining policies is belt-and-suspenders. | Noah — E8 launch checklist includes a grep-audit that the key never appears client-side. |

---

## 6. Open questions

None blocking. Items to resolve in implementation:

- **Offervana enum additions ship sequencing** — if the Offervana companion PR lands *after* E5 goes live, E5's mapper must be implemented with the `CustomerLeadSource = 11` fallback + `sellYourHouseFreePath` in `SurveyData`. Once the enum lands, a one-commit change flips the mapper to use `13` / `14` and removes the transitional flag (the flag is additive inside the JSON blob — leaving it in is harmless).
- **Email-conflict handling nuance** — do we want to show "We already have a lead on file for this email — your PM will be in touch" vs. generic thanks? First implementation: generic. Refine in E6 once we see how often this fires.
- **PM pre-alert channel in `after()`** — do we want to Slack-ping PMs at lead time or let E6's assignment workflow handle it? Defer to E6 architecture; E5 provides the hook (`writePmSubmission`) but doesn't fire channel notifications directly.
- **`attribution.EntryTimestamp` format** — Offervana stores as `long` (Unix millis); E3's `attribution.ts` produces ISO string. The mapper does the ms conversion (`Date.parse(isoString)`); confirm E3 emits a parseable ISO string, else tighten the schema.
- **Observed error taxonomy from Offervana** — the `email-conflict` match regex is based on assumed `UserFriendlyException` wording. Confirm in the first E5 integration test against UAT; if the wording changes, the classifier updates.
- **Supabase region** — defer to E6 architecture. If E6 picks `us-west-2`, E5 consumes it.
- **Offervana AppInsights correlation ID surfacing** — Offervana's `LeadCreatedEto.CorrelationId` is `Guid.NewGuid()` server-side. If we want cross-system trace correlation, we could send a `trace-id` header that Offervana logs; defer to E8 instrumentation story.

---

## 7. Handoff notes for PM (suggested story boundaries)

Proposed ADO User Stories under the E5 Feature. Sequencing assumes E3 is complete and E4 is at least partially landed (`EnrichmentSlot` shape stable).

| # | Story | Size | Notes |
|---|---|---|---|
| E5-S1 | **Supabase client + env scaffolding** — `src/lib/supabase/server.ts`, `src/lib/supabase/schema.ts`, `.env.example` update, README note on service-role key handling; initial migration for `offervana_idempotency` + `offervana_submission_failures` + `offervana_failure_reason` enum | S | Shared infrastructure with E6. Adds `@supabase/supabase-js` + `server-only` deps. No Offervana coupling yet; 100% unit-testable with a Supabase stub. |
| E5-S2 | **Offervana HTTP client + retry + timeout + classification** — `src/lib/offervana/client.ts`, `src/lib/offervana/errors.ts`, table-driven unit tests for happy path, transient → retry, email-conflict body matcher, permanent failure, timeout | M | Pure IO + classification. Mock `fetch`. No Server Action integration yet. |
| E5-S3 | **`SellerFormDraft` → `NewClientDto` mapper + tests** — `src/lib/offervana/mapper.ts` with golden fixtures for cash-path, renovation-path, enrichment-present, enrichment-absent, partial-contact (should fail upstream Zod — mapper fixture asserts it's never called with invalid input); confirm `EntryTimestamp` ms conversion + PascalCase emission | M | Pure function. Easy to review against the Angular reference (`homeowner-flow.component.ts:969–998`). |
| E5-S4 | **BFF idempotency store** — `src/lib/offervana/idempotency.ts`, integration test against a local Supabase, 24h TTL check, concurrent-submit-same-ID test (second submission returns cached result without calling Offervana) | S | Builds on S1. |
| E5-S5 | **Dead-letter + structured logging** — `src/lib/offervana/dead-letter.ts`, integration test inserting the failure row, log-format contract test (`jsonc parse` on the emitted line matches the expected schema) | S | Builds on S1. |
| E5-S6 | **Wire the Server Action** — replace happy-path body of `src/app/get-started/actions.ts` to orchestrate S2–S5; `runtime = 'nodejs'`, `maxDuration = 15`; redirect with `?ref`; `after()` audit log + PM handoff stub (writePmSubmission swallows if E6 table missing); update `/get-started/thanks` copy for `'unassigned'` / `'pending'` refs | M | The glue. End-to-end test against Offervana UAT gated on creds. |
| E5-S7 | **Offervana_SaaS companion PR** — add `CustomerLeadSource = 13, 14` with `[Description]` attrs, extend `leadType` switch (route to `CashOffersLandingPage`), extend `landingPageTag` + `CommerceAttribution.Source` ternaries, unit tests for the new branches | S | Parallel-shippable. Merges independently of E5-S1..S6 since the Next.js side has the fallback behavior. |
| E5-S8 | **Smoke + chaos tests** — integration suite against UAT Offervana: happy submission creates Customer + Property + CommerceAttribution; idempotency replay test; timeout simulation (point `OFFERVANA_BASE_URL` at a 5s-stalling endpoint) verifies retry behavior; email-conflict by submitting twice with same email verifies the dead-letter branch | M | Runs in CI nightly against UAT; gated from PR CI by env-var presence. Produces the "end-to-end of submit → lead in Offervana → PM record in Supabase" evidence for the E8 launch gate. |

**Critical sequencing:** S1 unblocks S4 + S5. S1-S5 unblock S6. S7 is independent, ships whenever. S8 runs after S6.

**Parallelism:** S2, S3, S7 can be three contributors in parallel. S4 + S5 after S1 is done.

**Acceptance criteria cadence** — every E5 story must include:

- `next build` passes with `runtime = 'nodejs'` set on `actions.ts`.
- No client bundle contains `SUPABASE_SERVICE_ROLE_KEY` or `OFFERVANA_BASE_URL` (grep `.next/static/**` — zero hits).
- Unit tests for pure modules (`mapper.ts`, `errors.ts`) at ≥95% line coverage.
- Integration tests for IO modules (`client.ts`, `idempotency.ts`, `dead-letter.ts`) against a local Supabase + a mocked Offervana via `msw` (or equivalent).
- No third-party network origin appears at Server Action runtime except `OFFERVANA_BASE_URL` and `SUPABASE_URL`.
- Server Action with JS disabled still submits (progressive enhancement — inherited from E3).
- Docs: `docs/e5-offervana-integration.md` describes the idempotency guarantee + dead-letter recovery procedure for on-call.

**Not in E5 scope** (for PM clarity): real PM name on confirmation page (E6), PM assignment algorithm (E6), email notification to the PM (E6), Offervana AVM enrichment UX polish (outside this feature — lives in Offervana's existing workflow), rate-limit / spam protection at the BFF (E8), reCAPTCHA / Turnstile (E8 — flagged as deferred in E3), Sentry integration (E8).

---

## 8. References

- Project plan: `_bmad-output/planning-artifacts/project-plan-sell-house-for-free.md` §4 E5, §7 Offervana endpoints
- E1 architecture: `_bmad-output/planning-artifacts/architecture-e1-site-foundation.md`
- E3 architecture: `_bmad-output/planning-artifacts/architecture-e3-seller-submission-flow.md` (canonical payload, `SubmitState`, `submissionId`)
- E4 architecture sidecar: `_bmad-output/arch-working/e4-property-data-enrichment/index.md` (`EnrichmentSlot` contract)
- Offervana source of truth:
  - `Offervana_SaaS/aspnet-core/src/Offervana.Application/Customer/CustomerAppServiceV2.cs:1096–1377` — `CreateHostAdminCustomer`
  - `Offervana_SaaS/aspnet-core/src/Offervana.Core/CustomerProperty/dto/NewClientDto.cs` — request DTO
  - `Offervana_SaaS/aspnet-core/src/Offervana.Core/CustomerProperty/dto/CustomerV2Dtos.cs:750+` — `AddPropInput`
  - `Offervana_SaaS/aspnet-core/src/Offervana.Core/Domain/Customer/Customer.cs:177–218` — `CustomerLeadSource` enum
  - `Offervana_SaaS/aspnet-core/src/Offervana.Core/Domain/Customer/Customer.cs:271–281` — `SubmitterRole` enum
- Behavioral reference: `Offervana_SaaS/angular/src/app/commerce-site/homeowner-flow/homeowner-flow.component.ts:969–1032` — existing `_submitHostAdminCustomer` + response shape (`result.item1`, `result.item2`, `result.item3`)
- Next.js 16 Forms / Server Actions: `node_modules/next/dist/docs/01-app/02-guides/forms.md`
- Next.js 16 Backend for Frontend: `node_modules/next/dist/docs/01-app/02-guides/backend-for-frontend.md`
- Next.js 16 Route Handlers: `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md`
- Next.js 16 `after`: `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/after.md`
- Next.js 16 `fetch`: `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/fetch.md`
- Next.js 16 `redirect`: `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/redirect.md`
- Next.js 16 Data Security: `node_modules/next/dist/docs/01-app/02-guides/data-security.md`
- Next.js 16 Route Segment Config (`maxDuration`, `runtime`): `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/02-route-segment-config/`
- Supabase server client pattern: https://supabase.com/docs/guides/auth/server-side/nextjs
- Ecosystem map: `_bmad/zoo-core-CLAUDE.md`
- Curated patterns: `_bmad/memory/zoo-core/curated/patterns.md`
