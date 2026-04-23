---
slug: openapi-outer-switch
scope: substantial
task: switch E5 offervana integration from internal ABP CustomerAppServiceV2/CreateHostAdminCustomer to the OuterAPI /openapi/Customers enterprise endpoint
ado-ticket: null
files-touched-planned:
  - src/lib/offervana/types.ts
  - src/lib/offervana/client.ts
  - src/lib/offervana/errors.ts
  - src/lib/offervana/mapper.ts
  - src/lib/offervana/idempotency.ts
  - src/lib/offervana/__tests__/client.test.ts
  - src/lib/offervana/__tests__/errors.test.ts
  - src/lib/offervana/__tests__/mapper.test.ts
  - src/lib/offervana/__tests__/idempotency.test.ts
  - src/lib/offervana/__tests__/dead-letter.test.ts (fixture DTO shape)
  - src/lib/supabase/schema.ts (drop/nullable user_id)
  - supabase/migrations/<timestamp>_make_user_id_nullable.sql (new)
  - scripts/e5-smoke.mjs (header + path + DTO shape + assertion)
started-at: 2026-04-23
---

# Plan — switch E5 to OuterAPI /openapi/Customers

## What + Why

The current E5 happy path hits the **internal ABP admin surface** (`/api/services/app/CustomerAppServiceV2/CreateHostAdminCustomer`) with a `Bearer` token. That is the commerce-site flow, not the enterprise integration path. The correct surface for the sell-house-for-free BFF is the **OuterAPI**:

- `POST /openapi/Customers` — enterprise customer creation (submitted property goes here).
- `/openapi/OffersV2` family — offer read/accept/counter (future epic; **out of scope** for this task, noted for later).

Auth is an `ApiKey: {key}` header (not `Authorization: Bearer`). `ZOODEALIO_API_KEY` is unchanged — only the header name.

## Contract deltas (verified against live Swagger)

| | Old (internal) | New (OuterAPI) |
|---|---|---|
| Path | `/api/services/app/CustomerAppServiceV2/CreateHostAdminCustomer` | `/openapi/Customers` |
| Method | POST | POST |
| Auth header | `Authorization: Bearer ${KEY}` | `ApiKey: ${KEY}` |
| Request DTO | `NewClientDto` (nested: PropData + SignUpData + SurveyData JSON string + attribution) | `CreateCustomerDto` (flat) |
| Name fields | `signUpData.firstName` + `signUpData.lastName` | `name` + `surname` (both required, maxLen 64) |
| Email | `signUpData.email` | `emailAddress` (nullable) |
| Phone | `signUpData.phone` | `phoneNumber` (nullable) |
| Address | `propData.address1/city/stateCd/zipCode/country` | **Flat top-level** `address1/address2/city/stateCd/zipCode/country` |
| Zip validation | (none server-side) | `^[0-9]{5}(?:-[0-9]{4})?$` — our AZ-only Zod already satisfies this |
| Property facts | `surveyData` JSON string (`bedrooms`/`bathrooms`/`squareFootage` top-level inside the blob) | **Flat** `bedroomsCount` (int), `bathroomsCount` (double), `squareFootage` (double) at DTO top level |
| Required extras | *(none beyond DTO shape)* | `floors` (int, default 1), `isEmailNotificationsEnabled` (bool, default true), `isSmsNotificationsEnabled` (bool, default true) |
| Attribution (utm/gclid/gbraid etc.) | Top-level flat | **No home in CreateCustomerDto.** Options: (a) stash in `additionalInfo` (string, nullable), (b) drop for now — OuterAPI is not designed for marketing-attribution ingestion. Decision: stash a compact JSON string in `additionalInfo` (cap at ~1KB) so PMs don't lose campaign context. |
| Pillar hint / consent versions / condition / timeline | In `surveyData` JSON blob | Stash in `additionalInfo` alongside attribution (same KB cap). |
| Lead source | `customerLeadSource: 13 | 14` | **Not in the OuterAPI DTO.** Likely handled by the enterprise tenant's configured default lead source. We drop the field; PMs can still disambiguate via the pillar-hint string in `additionalInfo`. |
| Success response | `{ result: { item1: customerId, item2: userId, item3: referralCode }, success: true }` (ValueTuple unwrap) | `{ result: GetCustomersDto { id, firstName, lastName, phone, email, referalType, referalCode, createdOn, updatedOn }, success: true }` — `id` is customerId; `referalCode` is the referral (note upstream misspelling) |
| userId | `item2` | **Not returned** — we drop `userId` from our cached payload entirely |
| Error envelope | ABP `{ error: { message, details } }` | Same ABP envelope (OuterAPI sits on the same server) |

## Verified probes

- `GET /openapi/Customers` with `ApiKey: {key}` → `{"result":[], success: true}` (empty tenant list; auth accepted)
- `GET /openapi/Customers` with `Authorization: Bearer {key}` → 401-equivalent `"ApiKey missing from header"`
- `GET /openapi/Offers` without key → 405 Method Not Allowed, confirms path exists
- `/openapi/v2/Offers` → 404 (user's hint was off by one — actual path is `/openapi/OffersV2`)

## File-level plan

### 1. Types (`src/lib/offervana/types.ts`)

- Replace `NewClientDto` + `AddPropInput` + `SignUpData` interfaces with a single flat `CreateCustomerDto`.
- Update `OffervanaOkPayload` → `{ customerId: number; referralCode: string }` (drop `userId`).
- `SubmitResult` tagged union unchanged.

### 2. Client (`src/lib/offervana/client.ts`)

- Constant change: `CREATE_HOST_ADMIN_PATH` → `CREATE_CUSTOMER_PATH = "/openapi/Customers"`.
- Header rename: `Authorization: Bearer ${apiKey}` → `ApiKey: ${apiKey}`.
- Function rename: `createHostAdminCustomer` → `createOuterApiCustomer` for clarity.
- Param type: `CreateCustomerDto`.
- Forward-compat `X-Client-Submission-Id` header stays.
- JSDoc updated to reference OuterAPI + the five result variants unchanged.

### 3. Errors / response normalizer (`src/lib/offervana/errors.ts`)

- `normalizeOkPayload` rewrite:
  - Unwrap ABP envelope: `body.result` first.
  - Read `id` (customerId) and `referalCode` — note `"referal"` misspelling upstream. Fallback to `referralCode` camelCase just in case they fix it.
  - Drop item1/item2/item3 handling entirely — that was the internal ValueTuple format.
- `classifyResponse` unchanged (ABP envelope + regex + status code rules carry over).

### 4. Mapper (`src/lib/offervana/mapper.ts`)

- `mapDraftToCreateCustomerDto` — new name.
- Emit the flat CreateCustomerDto. Defaults for required fields:
  - `floors: 1`
  - `isEmailNotificationsEnabled: true`, `isSmsNotificationsEnabled: true`
  - `bedroomsCount: enriched ?? user ?? 1`
  - `bathroomsCount: enriched ?? user ?? 1`
  - `squareFootage: enriched ?? user ?? 1500`
- Name split on whitespace (logic reused).
- `additionalInfo`: JSON-stringify a compact object with pillar, consent versions, condition, timeline, attribution (utm/gclid/gbraid/referrer/entryPage/entryTimestamp/etc), currentListingStatus, attomId, mlsRecordId, sellYourHouseFreePath. Cap at ~1KB. This is the only hiding-place for everything not on the formal DTO.
- Drop `customerLeadSource` — not in the DTO.
- Drop top-level attribution fields on the DTO (they're now inside additionalInfo).
- Keep `coordinates: null` / `yearBuilt: user-or-enriched ?? null`.

### 5. Idempotency (`src/lib/offervana/idempotency.ts` + `supabase/schema.ts`)

- `OffervanaIdempotencyRow.user_id` → nullable (`number | null`).
- New migration `supabase/migrations/<ts>_offervana_idempotency_drop_user_id.sql`:
  - `alter table public.offervana_idempotency alter column user_id drop not null;`
  - (Keep the column for backward compat with older cached rows; new writes pass null.)
- `storeIdempotent(submissionId, payload)` — `payload` no longer carries `userId`. Insert `user_id: null`.
- `lookupIdempotent` return type drops `userId`.

### 6. Server Action (`src/app/get-started/actions.ts`)

- One import rename: `createHostAdminCustomer` → `createOuterApiCustomer`.
- `dispatchAfter` audit log drops `userId` from `offervana.submit.ok` (customerId + referralCode + attempts only).
- Rest stays.

### 7. Dead-letter fixture (`src/lib/offervana/__tests__/dead-letter.test.ts`)

- Replace the old nested `sampleDto` fixture with a flat CreateCustomerDto sample.
- Redaction logic in `dead-letter.ts` already strips `signUpData` — switch to stripping `name`, `surname`, `emailAddress`, `phoneNumber` at the DTO top level (since there's no nested signUpData anymore). **This is a code change in dead-letter.ts itself.** Add to plan:
  - `src/lib/offervana/dead-letter.ts` — update `redactDtoPii` to strip the four PII fields from CreateCustomerDto instead of a single `signUpData` subtree.

### 8. Tests

- Rewrite all fixture DTOs in client/errors/mapper/dead-letter tests to the flat CreateCustomerDto shape.
- Errors tests: add cases for the new ABP-wrapped `GetCustomersDto` happy response + `referalCode` misspelling.
- Mapper tests: assert `name`/`surname` split, flat property facts, required `floors`/notification bools, `additionalInfo` JSON content.

### 9. Smoke (`scripts/e5-smoke.mjs`)

- Header to `ApiKey`.
- Path to `/openapi/Customers`.
- DTO to the flat shape.
- Happy assertion: `body.result.id` is number + `body.result.referalCode` is string + `body.success === true`.
- Email-conflict + timeout scenarios keep their structure (classification logic is unchanged).

### 10. Out of scope — **Offers** (documented follow-up)

- `/openapi/OffersV2` (GET list, POST create, PUT update)
- `/openapi/OffersV2/Accept` (PATCH)
- `/openapi/OffersV2/SubmitCounter` + `/openapi/OffersV2/UpdateCounter` (PATCH)
- `/openapi/OffersV2/GetHistory` (GET)

These wire into the portal (offer display + accept/counter) and are a separate epic. We are not touching them in this task. Will surface as a follow-up in the wrap-up summary.

## Validation checklist

1. `npm test` — all green; fixtures rewritten.
2. `next build` — clean TypeScript; no leaked keys in `.next/static/**` (grep for `ZOODEALIO_API_KEY`).
3. `node scripts/e5-smoke.mjs happy` — live UAT call returns 200 with `result.id` + `result.referalCode`.
4. `node scripts/e5-smoke.mjs timeout` — classifier still catches TimeoutError.
5. Migration applied: `node scripts/apply-migration.mjs supabase/migrations/<ts>_offervana_idempotency_drop_user_id.sql`.
6. One commit on the existing `feature/e5-offervana-host-admin-7781` branch — conventional-style: `e5: switch to OuterAPI /openapi/Customers + ApiKey header`.

## Halt conditions

- Supabase migration won't apply — pause for user.
- Live UAT returns a shape different from the swagger (wouldn't be the first time) — pause, document, adjust DTO.
- OuterAPI rejects the request with a validation error we can't resolve — pause; show the error message.

## Scope re-check

Still substantial. Not escalating to `zoo-core-dev-story` — this is a scoped refactor of E5's integration surface, not new functionality. ADO story 7861 + 7865 + 7868 + 7870 are all implicitly re-validated by the smoke test.

---

**Awaiting user approval.** Will compact context (via `/clear` or equivalent) after approval and before executing.
