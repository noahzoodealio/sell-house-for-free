---
feature: e5-offervana-host-admin-submission
services-in-scope:
  - sell-house-for-free
  - Offervana_SaaS (two CustomerLeadSource enum additions — server-side)
upstream-research: _bmad-output/planning-artifacts/project-plan-sell-house-for-free.md §4 E5
started-at: 2026-04-17T00:00:00Z
last-completed-step: 5
---

# E5 Architecture — Working Sidecar

**Scope recap (plan §4 E5):**
Next.js Server Action forwards the E3 `SellerFormDraft` + E4 `EnrichmentSlot` to Offervana via `[AllowAnonymous] POST CustomerAppServiceV2/CreateHostAdminCustomer`. Single call creates User + Customer + Property + CommerceAttribution under the hard-coded `"Dashboard"` host-admin tenant. Returns `(customerId, userId, referralCode)`. The referral code is the correlation key for E6's PM assignment backend.

**Boundaries:**
- **No ABP auth.** Endpoint is `[AllowAnonymous]`; no JWT, no tenant header, no service account.
- **No Offervana schema change.** Only additions: two new values on the `CustomerLeadSource` enum (`SellYourHouseFree = 13`, `SellYourHouseFreeRenovation = 14`).
- **BFF-side idempotency** — Offervana has no idempotency primitive on this endpoint, and the payload is not email-unique-safe (calling twice with the same email will throw "email already in use"). We own the idempotency table ourselves in Supabase, keyed by `submissionId` from E3.
- **Retry with exponential backoff** — 3 attempts (0ms / 1s / 4s) capped at 10s total wall clock. Transient failures only; user-caused validation errors do not retry.
- **Dead-letter** — permanent failures persist to a Supabase `offervana_submission_failures` table + structured log. Seller still gets routed to `/get-started/thanks` with an "unassigned" ref so UX is uniform; E6 PM alert includes the dead-letter state for manual recovery.
- **`ReferralCode` = correlation key** — flows into redirect `?ref=<code>`; E6 reads it on the confirmation page to render the assigned PM; E6's `pm_assignments` table foreign-keys to it.

**Services in scope:**
- `sell-house-for-free` — primary: replaces happy-path body of `src/app/get-started/actions.ts`; new `src/lib/offervana/{client,mapper,errors,idempotency}.ts`; new `src/lib/supabase/server.ts` server-only client; two new Supabase tables (`offervana_idempotency`, `offervana_submission_failures`); env vars for Offervana base URL + Supabase service role key; Vercel runtime = `nodejs` on the Server Action.
- `Offervana_SaaS` — minor: add two `CustomerLeadSource` enum values in `Offervana.Core/Domain/Customer/Customer.cs` (13, 14) + route the new sources through the existing `leadType` switch at `CustomerAppServiceV2.cs:1185–1201` to `CashOffersLandingPage` (they share scoring with Cash Offers). No DB migration — enum is stored as int; values 13 and 14 are already legal. Expose in `ClientListExportActivities` description fallback.

**Dependency on E3:**
- Preserves `submitSellerForm(prevState, formData): Promise<SubmitState>` signature.
- Reads the full `SellerFormDraft` (including `enrichment`, `attribution`, `pillarHint`, `consent`, `submissionId`) — all defined in E3 arch §4.3.
- Uses `SellerFormDraft.submissionId` as the idempotency key (already persisted in sessionStorage via `idempotency.ts`).
- Uses `SellerFormDraft.attribution` (UTM/gclid/…)  directly as the Offervana attribution block — no re-capture.

**Dependency on E4:**
- Reads `SellerFormDraft.enrichment` to enrich `SurveyData` JSON with `attomId`, `mlsRecordId`, and `currentListingStatus` — these are stored in the `SurveyData` JSON payload so Offervana's downstream reporting + the PM can see them without Offervana schema change.
- E4 timing out / erroring is tolerated — `enrichment?.status !== 'ok'` just means the SurveyData JSON lacks the MLS refs; the submit still succeeds.

**Dependency on E6:**
- E6 owns Supabase provisioning (plan §7 architecture-phase decisions). **E5 lands the Supabase client + two tables as shared infrastructure**; E6 layers `project_managers` + `pm_assignments` tables on top. Architect in tandem — decided together which repo owns `src/lib/supabase/`.
- E5 passes the `ReferralCode` to E6 via `?ref=` and via a post-response write to E6's `submissions` table (inside `after()`).

**Survey targets covered:**
- `Offervana_SaaS/aspnet-core/src/Offervana.Application/Customer/CustomerAppServiceV2.cs:1103–1377` — full read of `CreateHostAdminCustomer` body.
- `Offervana_SaaS/aspnet-core/src/Offervana.Core/CustomerProperty/dto/NewClientDto.cs` — canonical request shape.
- `Offervana_SaaS/aspnet-core/src/Offervana.Core/Domain/Customer/Customer.cs:177–218` — `CustomerLeadSource` enum (current max: 12).
- `Offervana_SaaS/aspnet-core/src/Offervana.Core/Domain/Customer/Customer.cs:271–281` — `SubmitterRole` enum.
- `Offervana_SaaS/aspnet-core/src/Offervana.Core/CustomerProperty/dto/CustomerV2Dtos.cs:750+` — `AddPropInput` shape.
- `Offervana_SaaS/angular/src/app/commerce-site/homeowner-flow/homeowner-flow.component.ts:969–998` — existing `_submitHostAdminCustomer` body used as behavioral reference for payload shape (`sendPrelims: true`, `submitterRole: 0`, `customerLeadSource: 11|12`).
- Next.js 16 `after()` (`03-api-reference/04-functions/after.md`) — confirmed ideal for post-response PM assignment + failure-logging work.

**Open questions still carrying (non-blocking, flagged in final arch):**
- Whether Offervana's `CustomerLeadSource` enum additions can ship in time for E5 — if not, E5 launches with `CustomerLeadSource = 11 (CashOffers)` and a `sellYourHouseFreePath: 'cash' | 'renovation'` field stashed inside the `SurveyData` JSON as a transitional flag.
- Whether we should short-circuit the known "email already registered" error into an idempotent success (plan §E5 implies we should — we'll treat it as a returning lead and try to fetch the existing `referralCode` via a follow-up call, or emit a dead-letter entry with a "returning seller" flag).
- Session vs stable idempotency: E3 stores `submissionId` in `sessionStorage` (cleared on success). If the user's browser drops the session between retries, we lose idempotency — acceptable because it's a narrow window.
- Supabase project region (E6 architecture-phase decision) — E5 consumes whatever E6 picks.

**Handoff pointers:**
- Feeds: `zoo-core-create-epic` for E5 (ADO Feature), then `zoo-core-create-story` for the seven sub-stories below.
- Unblocks E6 once the `ReferralCode` redirect contract and `offervana_submission_failures` table exist.

**Suggested story boundaries (see §7 in final doc):**
1. Supabase client + env wiring (shared infra with E6)
2. Offervana HTTP client + retry + timeout
3. `SellerFormDraft → NewClientDto` mapper + unit tests
4. BFF-side idempotency store + replay semantics
5. `actions.ts` happy-path replacement + redirect with `?ref=`
6. Dead-letter persistence + structured logging + `after()` post-response work
7. Offervana_SaaS companion PR: `CustomerLeadSource` enum additions (13, 14) + route through `leadType` switch
