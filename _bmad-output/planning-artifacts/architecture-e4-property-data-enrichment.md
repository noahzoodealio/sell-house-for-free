# Architecture — E4 Property Data Enrichment (MLS-sourced)

- **Feature slug:** `e4-property-data-enrichment`
- **Repo:** `sell-house-for-free` (Next.js 16.2.3, React 19.2.4, Tailwind v4)
- **Upstream:** `_bmad-output/planning-artifacts/project-plan-sell-house-for-free.md` §4 E4 + §7 "Known facts captured from investigations"
- **Depends on:** E1 (primitives, `SITE`, `ROUTES`, `buildMetadata`, tokens), E3 (`<AddressField>` seam, `SellerFormDraft.enrichment` slot, draft store, `submissionId` correlation key)
- **Feeds:** E5 (enrichment payload travels alongside `SellerFormDraft` to Offervana — `attomId`, `mlsRecordId`, `listingStatus` are useful attribution context)
- **Author:** Noah (Architect) · 2026-04-17
- **Status:** draft — ready for PM decomposition

---

## 1. Summary

E4 lights up the **address-entered → property-data** loop by adding a single server-side BFF route — `POST /api/enrich` — that calls `Zoodealio.MLS` as the **sole** enrichment source and returns a normalized `EnrichmentSlot` already shaped to the contract E3 left in `SellerFormDraft.enrichment`. Two upstream calls in the happy path (`/properties/search` → `/properties/attom/{attomId}`); a third (`/properties/{mlsRecordId}/images`) only when the property is currently listed.

The BFF runs in Node, validates with Zod, talks to MLS over plain HTTP without a token in MVP (the plan §7 investigation confirmed MLS endpoints are de-facto anonymous), wraps each upstream call in a 4-second `AbortSignal.timeout`, caches the joined result in `unstable_cache` keyed by a normalized-address hash for 24h, and never throws back to the client — every failure mode is returned as a typed envelope so the form can keep submitting.

On the client side, E4 swaps E3's plain `<AddressField>` for an accessible Headless UI `<Combobox>` driven by `/properties/search` suggestions, wires `useAddressEnrichment(address)` with `useTransition` + `AbortController` to keep the form responsive, persists results to `sessionStorage` so step-nav doesn't refetch, and adds three small UI surfaces: enrichment badge on the address step ("Looking up… → Found it"), pre-fill hints on the property step ("filled from public records — edit if wrong"), and an already-listed notice that opens the second-opinion conversation per plan Q6.

**Affected services:**
- `sell-house-for-free` — BFF route, MLS client, hook, three UI surfaces, Combobox swap. ~12 new files, 2 edits.
- `Zoodealio.MLS` — **read-only consumer.** No platform-side changes.

**Pattern adherence snapshot**

| Area | Choice | Pattern source |
|---|---|---|
| BFF route | `POST` Route Handler at `src/app/api/enrich/route.ts` | Next.js 16 `02-guides/backend-for-frontend.md` §Manipulating data ("POST to avoid putting geo-location data in the URL") |
| Server-only enforcement | `import 'server-only'` in `mls-client.ts` | Next.js 16 `02-guides/data-security.md` |
| Server cache | `unstable_cache` keyed by normalized-address hash, 24h TTL, tag `enrichment` | Next.js 16 `03-api-reference/04-functions/unstable_cache.md` |
| Per-call timeout | `fetch(url, { signal: AbortSignal.timeout(4000) })` | Standard Web API; works in Next.js Node runtime |
| Input validation | Zod (already added by E3-S2) | Next.js 16 `02-guides/forms.md` validation pattern |
| Client hook | `useTransition` + `AbortController` + `sessionStorage` mini-cache | React 19 `useTransition` + Next.js 16 `02-guides/backend-for-frontend.md` §Caveats §Server Components ("for client-side polled data, use SWR/react-query — or roll your own with cache + Abort") |
| Address autocomplete UI | Headless UI `<Combobox>` | Headless UI v2 — accessible (WAI-ARIA combobox), keyboard-complete, Tailwind-native |
| Cache invalidation | Tag-based via `revalidateTag('enrichment')` (no MVP user) | `unstable_cache.md` + `03-api-reference/04-functions/revalidateTag.md` |
| Response policy | `Cache-Control: private, no-store` on the BFF response | We cache server-side; never let CDN/browser cache another seller's address result |
| Logging | Structured JSON to stdout with correlation `submissionId` | Next.js logs are stdout; no extra dep needed |

**Pages, routes, and surfaces delivered**

| Surface | Type | Purpose |
|---|---|---|
| `POST /api/enrich` | Route Handler (Node runtime) | Address → `EnrichmentEnvelope`; sole consumer of MLS in this repo |
| `useAddressEnrichment(address)` | Client hook | Debounced fetch + cancellation + sessionStorage cache; populates `SellerFormDraft.enrichment` |
| `<AddressField>` (replaces E3 stub) | Client component | Headless UI Combobox; emits `onAddressComplete(addr)` once a suggestion is selected (or typed valid) — same prop contract as E3 |
| `<EnrichmentBadge>` | Client component | Inline status: `Looking up…` / `Found your home` / `Couldn't find a match — that's fine, just keep going` |
| `<EnrichmentConfirm>` | Client component | "Is this your home?" thumbnail strip on the property step (only when photos exist) |
| `<ListedNotice>` | Client component | Currently-listed conversation prompt on the address or property step |

**Boundaries (re-stated explicitly)**
- **No direct ATTOM API calls from this repo.** ATTOM is reached only via `Zoodealio.MLS`'s `/api/properties/attom/{attomId}` proxy.
- **Read-only.** Nothing is written to MLS, ATTOM, or Offervana in E4.
- **No PII in or out beyond the address.** MLS has no notion of the seller; the BFF never echoes form fields back.
- **The form must always submit.** `enrichment` is best-effort. If E4 returns `'timeout' | 'error' | 'no-match'`, the property step still works (manual entry).

---

## 2. Component diagram

```
                                Browser (E3 form)
                                        │
                                        │ user types / picks suggestion
                                        ▼
                ┌────────────────────────────────────────────────────┐
                │ <AddressField>  (Headless UI Combobox)             │
                │   • onChange(query) → debounced suggestion fetch   │
                │   • onAddressComplete(addr) ── E3 contract preserved│
                └──────────────────┬─────────────────────────────────┘
                                   │
                                   ▼
                ┌────────────────────────────────────────────────────┐
                │ useAddressEnrichment(address) — Client hook        │
                │   • 400ms debounce (E3 contract)                   │
                │   • normalizeAddress() → cache key                 │
                │   • sessionStorage hit?  → return                  │
                │   • startTransition(() => fetch('/api/enrich'…))   │
                │   • AbortController on address change              │
                │   • dispatch setEnrichment(slot) into form draft   │
                └──────────────────┬─────────────────────────────────┘
                                   │ POST /api/enrich  { address, submissionId }
                                   ▼
        ┌─────────────────────────────────────────────────────────────┐
        │  src/app/api/enrich/route.ts   (Node runtime, dynamic)     │
        │    1. Zod-validate body                                     │
        │    2. AZ-zip recheck (defense in depth)                     │
        │    3. getEnrichment(normalizedAddr)  ── unstable_cache wrap │
        │    4. Cache-Control: private, no-store                      │
        │    5. Always 200; envelope.status carries the failure mode  │
        └──────────────────┬──────────────────────────────────────────┘
                           │
                           ▼
        ┌─────────────────────────────────────────────────────────────┐
        │  src/lib/enrichment/service.ts  (server-only)              │
        │    getEnrichment(addr) =                                    │
        │      const search = await searchByAddress(addr)            │
        │      if (!search) return { status: 'no-match' }            │
        │      const [details, images] = await Promise.allSettled([  │
        │        getAttomDetails(search.attomId),                    │
        │        search.isListed                                     │
        │          ? getImages(search.mlsRecordId)                   │
        │          : Promise.resolve(undefined),                     │
        │      ])                                                     │
        │      return mergeToEnrichmentSlot(search, details, images) │
        │                                                             │
        │  Each upstream call: 4s timeout, 1 retry on 5xx/network    │
        │  Total budget enforced: 8s wall-clock                      │
        └──────────────────┬──────────────────────────────────────────┘
                           │
                           ▼
        ┌─────────────────────────────────────────────────────────────┐
        │  src/lib/enrichment/mls-client.ts  (server-only)           │
        │    • base URL from MLS_API_BASE_URL                         │
        │    • optional Bearer from MLS_API_TOKEN (forward-compat)    │
        │    • AbortSignal.timeout(4000)                              │
        │    • typed return; throws MlsError on 5xx after retry       │
        └──────────────────┬──────────────────────────────────────────┘
                           │
                           ▼  (3 upstream endpoints, plan §7)
        ┌─────────────────────────────────────────────────────────────┐
        │  Zoodealio.MLS.Api                                          │
        │   GET /api/properties/search?address=…                      │
        │   GET /api/properties/attom/{attomId}                       │
        │   GET /api/properties/{mlsRecordId}/images   (only if list.)│
        └─────────────────────────────────────────────────────────────┘


  Module layout:
    src/lib/enrichment/
      ├── types.ts            MLS DTOs + EnrichmentEnvelope (BFF I/O)
      ├── normalize.ts        address normalization + cache-key hash + AZ-zip guard
      ├── mls-client.ts       fetch wrappers (server-only, timeout, retry, typed)
      ├── service.ts          getEnrichment(addr) — orchestrator + mergeToEnrichmentSlot
      ├── cache.ts            unstable_cache wrapper + ENRICHMENT_CACHE_TAG
      └── use-address-enrichment.ts   Client hook (debounce, transition, abort, sessionStorage)

    src/components/get-started/
      ├── address-field.tsx       REPLACE — Headless UI Combobox; same props as E3
      ├── enrichment-badge.tsx    NEW — status pill on address step
      ├── enrichment-confirm.tsx  NEW — photo strip "is this your home?"
      └── listed-notice.tsx       NEW — currently-listed conversation prompt
```

---

## 3. Per-service changes

### 3.1 `sell-house-for-free` — new files

| File | Shape | Notes |
|---|---|---|
| `src/app/api/enrich/route.ts` | `POST` Route Handler | Zod-validates `{ address, submissionId }`. Calls `getEnrichment`. Always returns `200` with an `EnrichmentEnvelope` (the `status` field carries failure modes — `ok` / `no-match` / `out-of-area` / `timeout` / `error`). Sets `Cache-Control: private, no-store` and `Vary: Accept-Encoding`. `export const runtime = 'nodejs'` (default; explicit for clarity). `export const dynamic = 'force-dynamic'` (the route reads request body — never static). Logs one structured JSON line per request: `{ at, submissionId, status, durationMs, mlsHits, cacheHit }`. **Never** logs the raw address (PII-safe) — logs the cache-key hash instead. |
| `src/lib/enrichment/types.ts` | TS types | Re-exports `EnrichmentSlot` from `src/lib/seller-form/types.ts` (single source of truth) and adds: `EnrichmentEnvelope` (`{ status, slot?, errorCode?, retryable? }`), `EnrichInput` (`{ address: AddressInput; submissionId: string }`), MLS DTOs (`PropertySearchResultDto`, `PropertyDetailsDto`, `ListingImageDto`) typed exactly as plan §7 documents — only the fields E4 actually consumes are typed; the rest of the 168-field `PropertyDetailsDto` is left as `unknown` until needed. |
| `src/lib/enrichment/normalize.ts` | Pure functions | `normalizeAddress(addr)` — lowercase, trim, collapse whitespace, strip punctuation, normalize directionals. `addressCacheKey(addr)` — SHA-256 hex of `${street1}|${street2 ?? ''}|${city}|AZ|${zip5}` (no PII reaches logs; the digest is the cache key). `isAzZip(zip)` — 85001–86556 range check, mirrors E3 schema regex. `mergeToEnrichmentSlot(search, detailsResult, imagesResult, fetchedAt)` — produces `EnrichmentSlot` from raw MLS shapes; gracefully drops failed `Promise.allSettled` legs. |
| `src/lib/enrichment/mls-client.ts` | Server-only client | `import 'server-only'`. Three named exports — `searchByAddress(addr)`, `getAttomDetails(attomId)`, `getImages(mlsRecordId)`. Each: builds URL from `MLS_API_BASE_URL`, sends `Authorization: Bearer ${MLS_API_TOKEN}` only if env var is set (forward-compat per plan §7), `AbortSignal.timeout(ENRICHMENT_TIMEOUT_MS)` (default 4000), parses JSON. **Retry policy:** one retry on `ECONNRESET`/`fetch failed`/HTTP 5xx with 250ms delay; no retry on 4xx (those are real). On final failure throws a typed `MlsError` (`{ code: 'timeout' \| 'network' \| 'http' \| 'parse'; status?; endpoint }`). |
| `src/lib/enrichment/service.ts` | Server orchestrator | `getEnrichment(input: EnrichInput): Promise<EnrichmentEnvelope>`. Wraps the joined result in `unstable_cache` keyed by `addressCacheKey(input.address)` with `revalidate: 86400` and `tags: [ENRICHMENT_CACHE_TAG]`. **Cache key does not include `submissionId`** (we want different sellers entering the same address to share the cached result — the result is property-public, not person-specific). Uses `Promise.allSettled` for the parallelizable second leg (details + images). Catches `MlsError` and returns `{ status: 'timeout' \| 'error' }` envelopes; **does not throw**. Caches `'no-match'` results for 1h (shorter TTL — typos shouldn't pollute the cache for a day). |
| `src/lib/enrichment/cache.ts` | Cache helpers | Exports `ENRICHMENT_CACHE_TAG = 'enrichment'`. Re-exports a thin wrapper around `unstable_cache` so the call site in `service.ts` is one line and the deprecation note (see §5 deviation) lives in one place. |
| `src/lib/enrichment/use-address-enrichment.ts` | Client hook | `'use client'`. Signature: `useAddressEnrichment(address: AddressInput \| null) => { status, slot? }`. Behavior: 400ms debounce on address change; in-session cache lookup keyed by stable address hash via `sessionStorage:shf:enrich:v1`; if miss, `startTransition(() => fetch('/api/enrich'…))` with `AbortController`; on resolve writes to draft via `setEnrichment(slot)` exposed by `useSellerFormDraft` (E3 §4.3 contract); also pushes to sessionStorage so step-nav doesn't refetch. Dedupes concurrent identical addresses. Returns the envelope status so UI can render badge state. |
| `src/components/get-started/address-field.tsx` | **Replaces** E3 stub | Headless UI `<Combobox>` (single-select, `nullable`). `onChange(query)` debounces 250ms, calls `/api/enrich` in **suggestion-only mode** (`{ kind: 'suggest', query }`) — the same route serves both modes; suggest returns top-5 search results with display string + structured address. On select, calls `onAddressComplete(structuredAddr)`. Keyboard: ↑↓/Enter/Escape per WAI-ARIA combobox. Manual-typed addresses still emit `onAddressComplete` once `street+city+state+zip` validate (preserves E3 fallback path). 44×44 touch targets; `aria-busy` while loading. |
| `src/components/get-started/enrichment-badge.tsx` | UI status pill | `'use client'`. Reads enrichment status from `useSellerFormDraft`; renders one of: `idle` (nothing), `loading` ("Looking up your home…" + small spinner), `ok` ("✓ Found your home"), `out-of-area` ("Sorry — we're Arizona-only right now"), `no-match` ("We couldn't find this address in public records — that's OK, you can keep going"), `timeout`/`error` ("Couldn't reach our records right now — you can keep going"). Always-visible `aria-live="polite"`. **Never blocks step advance.** |
| `src/components/get-started/enrichment-confirm.tsx` | Photo strip | Renders on the property step **only when** `enrichment.photos?.length > 0`. Up to 3 thumbnails using `next/image` with `sizes="120px"` and `unoptimized={false}` (Azure Blob URLs flow through the Next image optimizer). Caption: "Is this your home? If not, just edit the address." Adds a "Not my home" link that returns to address step with the prior address pre-filled. |
| `src/components/get-started/listed-notice.tsx` | Already-listed prompt | Renders on address step (and re-shown on property step) **only when** `enrichment.listingStatus === 'currently-listed'`. Copy: "We see your home is currently listed. We can still help — are you exploring a second opinion, or ready to switch representation?" with two non-blocking radio chips (`'second-opinion' \| 'ready-to-switch' \| 'just-exploring'`) that write to `SellerFormDraft.currentListingStatus` (already in the schema from E3). Does not gate the form. |

### 3.2 `sell-house-for-free` — edits to existing files

| File | Edit | Notes |
|---|---|---|
| `src/lib/seller-form/types.ts` | Add `setEnrichment(slot: EnrichmentSlot)` to the `useSellerFormDraft` return type | Already a foreseen extension point per E3 §4.3. |
| `src/lib/seller-form/draft.ts` | Implement `setEnrichment` reducer action | Persists `enrichment` onto the draft; **excludes from `localStorage` write** (enrichment is sessionStorage-cached separately and recomputable; no point persisting it to localStorage). |
| `src/components/get-started/seller-form.tsx` | Add `useAddressEnrichment(currentAddress)` call inside the orchestrator; render `<EnrichmentBadge>` near the address step heading; render `<ListedNotice>` and `<EnrichmentConfirm>` inside the relevant steps | Pure additions; no shape change. |
| `src/components/get-started/steps/property-step.tsx` | When `enrichment.details` is present, pre-fill the matching numeric inputs and render a small "filled from public records" hint per pre-filled field with a "looks wrong?" inline edit affordance | Editable; the seller is the source of truth. |
| `src/components/get-started/steps/address-step.tsx` | Insert `<EnrichmentBadge>` right under the address inputs; render `<ListedNotice>` once enrichment lands | No change to validation. |
| `src/lib/seller-form/schema.ts` | Add `currentListingStatus: z.enum([...]).optional()` if not already present from E3 | E3 already provisioned the field; this just makes the enum strict. |
| `next.config.ts` | Add Azure Blob hostname to `images.remotePatterns`: `{ protocol: 'https', hostname: 'zoodealiomls.blob.core.windows.net', pathname: '/mlsimages/**' }` | Required for `next/image` to optimize MLS photos. |

### 3.3 Environment variables (new)

| Name | Required | Default | Purpose |
|---|---|---|---|
| `MLS_API_BASE_URL` | **yes (server-side)** | — | e.g., `https://zoodealio-mls-api.example/api` |
| `MLS_API_TOKEN` | no | unset | Bearer token if MLS becomes auth-required (forward-compat per plan §7 — endpoints are de facto anonymous today) |
| `ENRICHMENT_TIMEOUT_MS` | no | `4000` | Per-upstream-call timeout |
| `ENRICHMENT_CACHE_TTL_SECONDS` | no | `86400` (24h) | Server cache TTL for `'ok'` envelopes; `'no-match'` is fixed at 3600 |
| `ENRICHMENT_DEV_MOCK` | no | `false` | When `true`, BFF returns a hard-coded fixture `EnrichmentEnvelope` (used by E4-S1 to land the route shape before MLS reachability is solved in dev) |

All MLS env vars are server-only; no `NEXT_PUBLIC_` prefix. Document additions in `.env.example` (or `.env.local.example`) and in the `docs/configuration.md` runbook E1 created.

### 3.4 Packages added

| Package | Purpose | Where |
|---|---|---|
| `@headlessui/react` | Accessible Combobox primitive | `address-field.tsx` |

That's it. No SWR, no react-query, no fetch wrapper library, no UUID lib. Hash via `node:crypto` (server) and `crypto.subtle` (client) — both built-in.

### 3.5 Runtime + segment config

`src/app/api/enrich/route.ts` exports:

```ts
export const runtime = 'nodejs'        // explicit; we use node:crypto + AbortSignal.timeout
export const dynamic = 'force-dynamic' // route reads body; never static
```

No edge runtime — `unstable_cache` semantics and `node:crypto` are simpler in Node, MLS is in Azure (latency from Vercel Node functions is fine), and the per-second QPS is very low (one call per address typed by a human).

### 3.6 Observability

- **Structured logs** to stdout, one line per BFF invocation: `{ at, submissionId, addressKey, status, durationMs, mlsLatency: { search, details, images }, cacheHit, attomId? }`. The `addressKey` is the SHA-256 hex — **not the raw address**.
- **Counters via `@vercel/analytics` `track()`** — `enrichment_status`, dimensions: `status` (ok/no-match/out-of-area/timeout/error), `cache_hit` (boolean). First-party only; no PII.
- **No Sentry yet** (E8 lands error tracking). The structured logs + Vercel runtime logs are enough for E4 acceptance.

---

## 4. Integration contracts

### 4.1 BFF ⇄ Browser (`POST /api/enrich`)

**Request body (Zod-validated):**

```ts
type EnrichInput =
  | {
      kind: 'enrich'
      submissionId: string
      address: {
        street1: string
        street2?: string
        city: string
        state: 'AZ'
        zip: string  // 5-digit, AZ range 85001–86556
      }
    }
  | {
      kind: 'suggest'
      query: string  // 3..120 chars
      limit?: number // 1..10, default 5
    }
```

**Response — always `200 OK`** with `Content-Type: application/json`, `Cache-Control: private, no-store`. Body is one of:

```ts
// kind: 'enrich'
type EnrichmentEnvelope =
  | { status: 'ok'; slot: EnrichmentSlot; cacheHit: boolean }
  | { status: 'no-match'; cacheHit: boolean }
  | { status: 'out-of-area' }              // server AZ-zip recheck failed
  | { status: 'timeout';   retryable: true }
  | { status: 'error';     retryable: boolean; code: string }

// kind: 'suggest'
type SuggestEnvelope = {
  status: 'ok' | 'error'
  results?: Array<{
    label: string                          // human display string
    address: { street1; street2?; city; state: 'AZ'; zip }
    attomId?: string
    mlsRecordId?: string
    listingStatus?: 'not-listed' | 'currently-listed' | 'previously-listed'
  }>
}
```

**Status codes:** the route uses `200` for everything that successfully reached the handler; only true platform errors (e.g., the BFF itself crashed) yield `500`. Callers branch on `status` in the body, not the HTTP code. This keeps the form's degraded path simple — one `await fetch().then(r => r.json())` and a switch on `body.status`.

**Validation errors** (malformed body) → `400` with `{ error: 'invalid_input', issues: ZodIssue[] }`. The client shouldn't send these; surfacing them as `400` makes typos in the contract loud during dev.

**`submissionId` correlation:** the BFF echoes nothing back about it — it's a logging tag only.

### 4.2 BFF → `Zoodealio.MLS` (per plan §7)

For each call: base URL = `MLS_API_BASE_URL`, headers = `{ Accept: 'application/json', ['Authorization']?: 'Bearer ${MLS_API_TOKEN}' }`, signal = `AbortSignal.timeout(ENRICHMENT_TIMEOUT_MS)`.

**Call 1 — search by address (always):**

```
GET ${base}/properties/search?address=${encodeURIComponent(formattedAddr)}&pageSize=10
```

- Response: `{ items: PropertySearchResultDto[]; total: number }`.
- We **take the top result** that matches city + zip exactly. If no item matches city + zip, treat as `'no-match'` (MLS sometimes returns nearby fuzzy hits; we want a strict match).
- Fields consumed: `attomId`, `mlsRecordId`, `listingStatus`, `latestListingPrice`, `daysOnMarket`, `bedrooms`, `bathrooms`, `squareFootage`, `yearBuilt`, `photoCount`.

**Call 2 — ATTOM details (when search returns an `attomId`):**

```
GET ${base}/properties/attom/${attomId}
```

- Response: `PropertyDetailsDto` (168 fields). We type only the subset we render: `bedrooms`, `bathrooms`, `squareFootage`, `yearBuilt`, `lotSize`. The rest is opaque. This intentionally caps E4's coupling to the ATTOM schema — adding a field later means typing it then, not now.
- If this leg fails, we still return `status: 'ok'` with `slot.details` populated from the search result's coarser fields (`bedrooms`/`bathrooms`/`squareFootage`/`yearBuilt`). ATTOM is the better source but search has enough for pre-fill.

**Call 3 — listing images (when `mlsRecordId` exists AND `listingStatus === 'currently-listed'`):**

```
GET ${base}/properties/${mlsRecordId}/images
```

- Response: `ListingImageDto[]` with Azure Blob URLs (SAS-tokened; SAS expires **2027-02-11** per plan §7 — see §6 "SAS rotation tracking").
- Take the first 3 by display order; map to `slot.photos[]`.
- If this leg fails, return `slot.photos = undefined`. The "is this your home?" UI just doesn't render.

**Concurrency:** Call 1 must finish first (it provides the IDs for 2 + 3). Calls 2 and 3 run via `Promise.allSettled` in parallel.

**Total upstream budget:** 4s (call 1) + 4s (max of call 2/3) = 8s wall-clock worst case. The `useAddressEnrichment` hook surfaces a `status: 'loading'` UI for the whole window; the form is never blocked.

**Auth:** no token in MVP. If `MLS_API_TOKEN` is set (forward-compat), the `Authorization: Bearer …` header is added. Plan §7 confirms MLS endpoints have no `[Authorize]` attribute today.

**Retry policy:** at most one retry per call, only on `AbortError`/`fetch failed`/HTTP 5xx, with a 250ms delay. No retry on 4xx. If both attempts fail, the leg returns its own typed error to the orchestrator.

**Rate-limit / cost:** per plan §4 E4 ("caching to respect MLS rate limits + cost"). The 24h server cache + 60-min `no-match` cache + sessionStorage client cache means a typical seller submission causes **at most 1 search + 1 details + 0–1 images call** to MLS, even with corrections during the form. For the same address typed by a different seller within 24h: **0 calls.**

### 4.3 BFF ⇄ E3 form draft

E3 §4.3 already defined `EnrichmentSlot`. E4 fills the slot per:

```ts
// On address-complete → enrichment loading
draft.enrichment = { status: 'loading', fetchedAt: undefined }

// On envelope.status === 'ok'
draft.enrichment = envelope.slot   // populated by mergeToEnrichmentSlot

// On any non-ok status
draft.enrichment = { status: <envelope.status>, fetchedAt: now() }
```

**`SellerFormDraft` shape additions** (none — E3 §4.3 already provisioned `enrichment?: EnrichmentSlot` and `currentListingStatus?: string`).

### 4.4 BFF → E5 (downstream pass-through)

E5 maps `SellerFormDraft` to Offervana's `NewClientDto`. E4 makes E5 richer by populating fields E5 can forward:

- `attomId` → useful as Offervana attribution metadata (suggest: stuff into `SurveyData` JSON or a custom attribution field — E5 architecture decides).
- `mlsRecordId` → same.
- `listingStatus` → useful for the PM ("seller's home is currently listed, agent: <name>, days-on-market: <N>"). E5 can include in `SurveyData` JSON or a notes blob.

E4 doesn't presume what E5 does with this — it just makes sure the data lands cleanly in `SellerFormDraft.enrichment` so E5's `NewClientDto` mapper can read it.

### 4.5 Pre-existing schema mappings (read-only)

For reviewers: the MLS DTO field names listed below are taken verbatim from plan §7. If MLS renames a field at the source, only `src/lib/enrichment/types.ts` + `mergeToEnrichmentSlot` change.

| Source (MLS) | Target (`EnrichmentSlot`) | Notes |
|---|---|---|
| `PropertySearchResultDto.attomId` | `slot.attomId` | string |
| `PropertySearchResultDto.mlsRecordId` | `slot.mlsRecordId` | string |
| `PropertySearchResultDto.listingStatus` | `slot.listingStatus` | normalized to the 3-value union |
| `PropertyDetailsDto.bedrooms` (fallback: search.bedrooms) | `slot.details.bedrooms` | number |
| `PropertyDetailsDto.bathrooms` (fallback: search.bathrooms) | `slot.details.bathrooms` | number |
| `PropertyDetailsDto.squareFootage` (fallback: search.squareFootage) | `slot.details.squareFootage` | number |
| `PropertyDetailsDto.yearBuilt` (fallback: search.yearBuilt) | `slot.details.yearBuilt` | number |
| `PropertyDetailsDto.lotSize` | `slot.details.lotSize` | number; no search fallback (search doesn't expose it) |
| `ListingImageDto.url` | `slot.photos[].url` | Azure Blob, SAS-signed |
| `ListingImageDto.caption` | `slot.photos[].caption` | optional |
| (orchestrator) `Date.now()` ISO | `slot.fetchedAt` | for E4 staleness checks if ever needed |

**Listing-status normalization:**

```
MLS string                     → normalized
'Active' | 'ActiveUnderContract' | 'Pending' | 'ComingSoon'  → 'currently-listed'
'Closed' | 'Expired' | 'Withdrawn' | 'Cancelled'             → 'previously-listed'
(no MLS hit at all, or none of the above)                    → 'not-listed'
```

---

## 5. Pattern decisions + deviations

### Decisions (with citations)

1. **`POST` not `GET` for the BFF route** — Next.js 16 `02-guides/backend-for-frontend.md` §Manipulating data: *"This example uses POST to avoid putting geo-location data in the URL. GET requests may be cached or logged, which could expose sensitive info."* The seller's address is at the same sensitivity tier as geo coordinates.
2. **Single BFF route over 3 separate proxies** — `route.md` §HTTP Methods. One route owns the join + cache + envelope shape. Client never has to compose 3 calls; we never have to teach 3 caches to share keys; the budget calculation lives in one file.
3. **`unstable_cache` keyed by normalized-address hash** — `unstable_cache.md`. Only one external system to invalidate (`enrichment` tag). Value is property-public so cross-seller sharing is correct. **Note:** the docs say `unstable_cache` is being replaced by `use cache` in 16 — see deviation §1 below.
4. **`AbortSignal.timeout`** — Standard Web API; no extra dep. `fetch.md` confirms `signal` is the supported way to bound a fetch in Next.js Node runtime.
5. **`Promise.allSettled` for the parallelizable second leg** — Each leg can independently fail without blowing up the whole envelope; the `mergeToEnrichmentSlot` reducer keeps everything that succeeded.
6. **`'use client'` hook + `useTransition`** — React 19 `useTransition` (cited in E3 arch §5) keeps the form interactive while enrichment loads. `useTransition` is the right primitive here: enrichment is a non-urgent update to a large UI region.
7. **`AbortController` on the client + `AbortSignal.timeout` on the server** — defense in depth. Address changes during a slow lookup cancel the in-flight request; server-side timeout protects the BFF if the client cancels late.
8. **`sessionStorage` mini-cache on the client** — survives step nav inside the funnel without a refetch, doesn't survive cross-session (consistent with E3's session-only attribution + idempotency stores).
9. **Zod for input validation** — already added in E3-S2; reuse rather than introduce a separate validator.
10. **Headless UI `<Combobox>`** — WAI-ARIA-compliant, keyboard-complete, render-prop-driven (so styling stays in our Tailwind world). The "no Radix/shadcn" rule from E1 §6 was about avoiding kitchen-sink component libs; HU's Combobox is one primitive, used in one place.
11. **`Cache-Control: private, no-store`** — prevent CDN/intermediate caching of one seller's enrichment to another. Server-side `unstable_cache` is our shared cache (correctly keyed by address hash); the response is per-request and per-seller (we may add seller-derived hints later).
12. **`runtime = 'nodejs'`, `dynamic = 'force-dynamic'`** — `02-route-segment-config/`. The route reads the request body and uses `node:crypto`; both push it to Node + dynamic.
13. **`server-only` on `mls-client.ts`** — Next.js 16 `02-guides/data-security.md`. Hard guard against accidentally importing the MLS base URL or token into a client bundle.

### Deviations (with justification)

| Deviation | From | Why | Who accepts the risk |
|---|---|---|---|
| `unstable_cache` instead of the new `use cache` directive | Next.js 16 `unstable_cache.md` recommends `use cache` (Cache Components mode) | E1 did not enable `cacheComponents` (the project follows the `caching-without-cache-components.md` guide explicitly). Adopting `use cache` would require migrating the whole repo to Cache Components, which is out of E4 scope. `unstable_cache` is fully supported in 16 outside Cache Components. | Noah — flag as a follow-up if/when the project opts into Cache Components; the migration would touch only `cache.ts` + `service.ts`. |
| Headless UI added as a dep | E1 §6 "no Radix/shadcn" rule | HU's `<Combobox>` is one primitive used in one place. The rule was written against pulling in entire component kits; a single accessible combobox costs us less than rolling our own with full ARIA + keyboard semantics. Bundle impact: ~5KB gzipped tree-shaken to the Combobox export. | Noah — explicit one-off exception; documented here so future contributors don't read the no-deps rule as absolute. |
| Single BFF route serves both `'enrich'` and `'suggest'` modes | "One route per concern" REST norm | Both modes call the same upstream (`/properties/search`), share the same cache, and produce the same DTO subset. Splitting them would duplicate the MLS client wiring and double the surface area to log/monitor. The discriminated union keeps the contract honest. | Noah — if `'suggest'` ever needs different auth/rate-limiting from `'enrich'`, split. |
| Always returns HTTP `200`, even on `timeout`/`error` | REST convention (5xx on upstream failure) | The form's degraded path is "show a small message and let the seller continue." Treating `timeout` as `5xx` means the client has to handle network errors **and** envelope errors with two different code paths. Returning `200 + status: 'timeout'` collapses to one path: `switch (body.status)`. The HTTP `5xx` only fires for true BFF crashes, which monitoring will catch separately. | Noah — Sentry/error tracking added in E8 will need to alert on `status !== 'ok'` rates rather than HTTP 5xx, but that's a small dashboard tweak. |
| No CAPTCHA / per-IP rate limit on `/api/enrich` in MVP | Industry norm for public BFF endpoints | Mirrors E3's CAPTCHA-deferral posture. The endpoint is fronted by Vercel's basic abuse protection; the upstream is rate-limited at MLS. If we see scrape-style abuse (high QPS, many distinct addresses), Turnstile or a `@vercel/edge-config`-backed limiter is the follow-up. | Noah — flag for E8 launch checklist alongside E3's CAPTCHA review. |
| Skip `/properties/{id}/history` for MVP | Plan §4 E4 lists it as available | The search endpoint already returns `listingStatus` + `daysOnMarket`, which is enough to drive the "currently listed" UX. History adds price-drop and prior-agent context that's interesting but not core. Adding the call would push us closer to the 8s budget for no required UX. Defer until product asks. | Noah — open question §6. |
| Bypass `next/image` optimization for thumbnails? **No — we DO use the optimizer.** | Some teams set `unoptimized: true` for hot-linked third-party images | Azure Blob serves originals unconstrained; running through `next/image` ~10x reduces bandwidth for the small thumbnail surface and gives us responsive `srcset`. Cost is one entry in `next.config.ts` `remotePatterns`. The SAS token is preserved through the optimizer (it's part of the URL query, which Next forwards). | Noah. |
| Cache `'no-match'` results (1h) | Some teams never cache "miss" results | Sellers with typos retype quickly; without "miss caching" we'd hit MLS on every keystroke variant. 1h cap so that an address newly added to MLS becomes findable within an hour. | Noah — tunable via env if needed. |
| In-session client cache via `sessionStorage` rather than React Query / SWR | Industry default for fetch-in-effect | We have one fetch keyed by one input. `useTransition` + `AbortController` + `sessionStorage` is ~40 lines and zero new deps; SWR would be ~140KB of capability we don't use. | Noah — revisit if a future epic adds polling or multi-key fetches. |
| Server cache key excludes seller identity | Some teams scope all caches to user | Property data is **public** — same address yields same answer regardless of who's asking. Sharing the cache across sellers is a correctness win (warmer cache, less MLS load) and there's no privacy delta because the cached value contains no seller info. | Noah — explicitly fine; documented here so reviewers don't second-guess it. |

---

## 6. Open questions

None blocking. Items to resolve downstream:

- **MLS history endpoint for prior-agent intel** (`/properties/{id}/history`) — defer to a polish story or a post-launch product call. Adds latency budget, surfaces prior-agent's name to the seller (mild privacy / political consideration). Recommend punting.
- **SAS token rotation tracking** — the listing-image SAS expires **2027-02-11** per plan §7. Add a calendar reminder + a `docs/operations/sas-rotation.md` runbook entry as part of E4-S2 or E8 launch readiness. The image URLs themselves come from MLS; rotation happens MLS-side, but we need to know it happened so we can re-test.
- **Suggest-mode debounce + min-chars** — current proposal: 250ms debounce, min 4 chars. Tunable after first user data; doesn't require an arch change.
- **Cache key sensitivity to apartment/unit numbers** — current proposal: `street2` participates in the hash. Two units in the same building correctly cache separately. Confirm during E4-S3 implementation against real MLS data.
- **`MLS_API_TOKEN` issuance pathway** — only relevant if/when MLS adds `[Authorize]`. No action needed now; capture as a one-line note in `docs/configuration.md`.
- **Out-of-area handling** — current proposal returns `status: 'out-of-area'` envelope and the UI shows a friendly note. Do we **block** the form for non-AZ addresses, or let them through and let E5/PM filter? Plan §3 NF says "Restrict form submissions to Arizona properties (front-end + server validation)" — interpret as block. **Recommend:** the BFF returns `'out-of-area'`, and the address step disables Next until the seller corrects the zip. (Not strictly E4 scope; this enforcement lives in E3's schema, but worth flagging.)
- **Photo lag UX threshold** — show the "photos may take a few hours to appear" copy when `listingStatus === 'currently-listed'` and `photos.length === 0`. Verify against a real fresh-listing test in E4-S9.

---

## 7. Handoff notes for PM (suggested story boundaries)

Proposed decomposition into ADO User Stories under the E4 Feature. After S1-S3, multiple stories can land in parallel.

| # | Story | Size | Notes |
|---|---|---|---|
| E4-S1 | **BFF route shape + Zod input + dev mock** — `src/app/api/enrich/route.ts` with both `'enrich'` and `'suggest'` discriminated input, full envelope contract, `ENRICHMENT_DEV_MOCK=true` returning a fixture, structured logging in place but logging the cache-key hash not the address | S | Unblocks every other story by landing the contract. No real MLS yet. |
| E4-S2 | **MLS client** — `src/lib/enrichment/mls-client.ts` (server-only) with `searchByAddress`, `getAttomDetails`, `getImages`; `AbortSignal.timeout`; one-retry policy; typed `MlsError`; env-var driven base URL + optional bearer | M | Unit-testable in isolation against a local mock server (e.g. MSW node). |
| E4-S3 | **Service + normalize + merge** — `src/lib/enrichment/{service,normalize}.ts`; `getEnrichment(addr)` orchestrator with `Promise.allSettled`; address normalization + AZ-zip recheck + cache-key SHA-256; `mergeToEnrichmentSlot` reducer with all listing-status normalization | M | Replaces the dev mock from S1. Wraps everything in `unstable_cache` + tag. After this, the route is real. |
| E4-S4 | **Headless UI Combobox `<AddressField>` swap** — replace the E3 stub; debounced `'suggest'` calls; structured-address selection; manual-typed fallback preserved; full keyboard a11y + 44×44 touch targets | M | Adds `@headlessui/react` dep. Doesn't depend on enrichment landing — `'suggest'` works against the dev mock first. |
| E4-S5 | **Client hook + draft wiring** — `src/lib/enrichment/use-address-enrichment.ts`; debounce; `useTransition`; `AbortController`; `sessionStorage:shf:enrich:v1`; `setEnrichment(slot)` on the draft | S | Pure client logic. Tested with mocked `fetch`. |
| E4-S6 | **Enrichment UI surfaces** — `enrichment-badge.tsx`, `enrichment-confirm.tsx`, `listed-notice.tsx`; insertion in `address-step.tsx` and `property-step.tsx`; pre-fill hints + edit affordances on the property step | M | Pure UI; the data already arrives from S5. |
| E4-S7 | **Image optimization config** — add Azure Blob `remotePatterns` to `next.config.ts`; smoke-test SAS-token-bearing URLs through the optimizer | XS | Trivial but blocking S6's photo strip from rendering optimized. |
| E4-S8 | **Already-listed conversation copy + `currentListingStatus` capture** — copy approval; chip writes to draft; pre-nudge on condition step (`?pillar=cash-offers` already-listed sellers may want different copy) | S | Mostly content + state. Coordinate copy with the trust-posture brief from E2. |
| E4-S9 | **E2E happy + degraded paths** — Playwright (or whatever E1/E8 settle on; for E4 just author the test plan + first happy-path test) covering: (a) AZ address → enriched → submit; (b) MLS timeout → form still submits; (c) no-match → form still submits; (d) currently-listed → notice shows, form still submits | M | Doesn't have to wait for full Playwright wiring — can land the test plan as a markdown doc + a single happy-path test. |
| E4-S10 | **Observability + SAS rotation runbook** — `track('enrichment_status', …)` events; `docs/operations/sas-rotation.md`; `.env.example` updates; one-page `docs/e4-operations.md` with "what to do when MLS is down" | S | Wraps E4 for handoff to E8 launch readiness. |

**Critical sequencing:** S1 unblocks everything. S2 + S4 can run in parallel after S1 (S4 uses dev-mock from S1). S3 depends on S2. S5 depends on S1 + S3 (real responses). S6 depends on S5 + S7. S8 + S9 + S10 can land in parallel after S6.

**Parallelism:** after S1 lands, three contributors can split S2, S3, and S4. After S5, two contributors can split S6 and S8.

**Acceptance criteria cadence** — every E4 story must include:

- `next build` passes; the enrich route reports `Dynamic` (force-dynamic) in the route summary
- Server logs **never** contain the raw address — only the SHA-256 hex `addressKey`
- `Cache-Control: private, no-store` is on every `/api/enrich` response (verify in DevTools Network)
- Form submission **always** succeeds when `enrichment.status !== 'ok'` (covered by E4-S9 cases b/c)
- No client-side bundle imports anything from `src/lib/enrichment/{mls-client,service,cache}.ts` (Next will fail the build via `server-only`; verify intentional)
- Lighthouse LCP on `/get-started` (address step) stays under 2.5s on 4G — enrichment is a background activity and must not block first paint
- Axe run on the address + property steps with enrichment in `loading`/`ok`/`error` states reports zero violations

**Not in E4 scope** (for PM clarity): real Offervana submission (E5 replaces the Server Action body — it does **not** call `/api/enrich`; the enrichment slot already lives on the draft by then); PM assignment / real thanks page (E6); production consent copy (E7); rate-limit / CAPTCHA / global security headers (E8).

---

## 8. References

- Project plan: `_bmad-output/planning-artifacts/project-plan-sell-house-for-free.md` §4 E4 + §7 "Known facts captured from investigations" + Q5/Q6/Q9
- E1 architecture: `_bmad-output/planning-artifacts/architecture-e1-site-foundation.md`
- E3 architecture: `_bmad-output/planning-artifacts/architecture-e3-seller-submission-flow.md` (especially §4.3 enrichment slot contract)
- Next.js 16 Backend for Frontend: `node_modules/next/dist/docs/01-app/02-guides/backend-for-frontend.md` (POST-not-GET for sensitive params; rate-limiting; data validation)
- Next.js 16 Route Handlers: `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md`
- Next.js 16 Caching (without Cache Components): `node_modules/next/dist/docs/01-app/02-guides/caching-without-cache-components.md`
- Next.js 16 `unstable_cache`: `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/unstable_cache.md`
- Next.js 16 Data Security (`server-only`): `node_modules/next/dist/docs/01-app/02-guides/data-security.md`
- React 19 `useTransition`: https://react.dev/reference/react/useTransition
- Headless UI `<Combobox>`: https://headlessui.com/react/combobox
- Behavioral reference (Offervana Angular `getPropertyDetailsByAddress` pre-fill): `commerce-site/homeowner-flow/HomeownerFlowComponent` line ~682 — same intent (pre-fill from public records on address completion); E4 implements via the MLS BFF rather than calling Offervana's prop-details endpoint, because plan Q5 confirms `Zoodealio.MLS` is the single ATTOM proxy
