# Project Plan — Sell Your House Free (Arizona)

- **Project slug:** `sell-house-for-free` (repo name retained; brand name diverges)
- **Brand name:** **Sell Your House Free**
- **Mode:** Greenfield (new standalone client-facing service)
- **Repo:** `sell-house-for-free` (Next.js 16, React 19, Tailwind 4)
- **Upstream research:** none
- **Author:** Noah · 2026-04-16 (rev 4 — all 12 open questions resolved; storage backend locked to Supabase; renovation-only path is in-repo only)

---

## 1. Vision

A consumer-facing Arizona-only marketing site branded **Sell Your House Free.** A homeowner submits a single property + contact form and is promised:

- Listing on **MLS and all major platforms** (Zillow, Redfin, Realtor.com, etc.) — fulfilled under **JK Realty** (AZ broker of record)
- Access to **multiple cash offers**
- Two distinct renovation paths:
  - **Cash+ with Repairs** ("fix it and list it" / `FixListTypeDto`) — buyer pays for repairs as part of a Cash+ offer
  - **Renovation-only** — Hola Home renovates, seller then lists conventionally through us (no cash offer component, still free to seller)
- A **dedicated human Project Manager** who handles their listing end-to-end and moves data between parties

Behind the scenes, every submission is routed into **Offervana_SaaS under the host admin tenant**. There is no novel back-office system — the site is a branded, AZ-localized funnel that hands fulfillment to existing Zoodealio platform capabilities.

### The positioning that has to be unmistakable

Most "easy way to sell your house" sites are lead-resale fronts: collect a homeowner's info, sell it to local agents and brokerages, take a commission. **This is not that.** The site, the copy, the legal terms, and the back-end behavior all need to make this credible and verifiable:

- The seller pays **zero** — no listing fee, no commission, no "service" fee, no closing-side surprise.
- The seller's data is **not sold** to agents, brokers, or third-party lead aggregators.
- Revenue comes from **optional vendor products** the seller can opt into (renovation through Hola Home, optional add-ons), and from buyer-side spread on cash offers — never from charging the seller.
- Every seller is assigned a real **Project Manager** (a Zoodealio employee, not an outside agent) who handles the listing, coordinates between buyer/seller/title/renovation, and is the single point of contact.

This trust posture is a first-class product surface, not a footer disclaimer.

## 2. Strategic context

- **Why this exists:** Test-market a friendlier, consumer-grade brand ("Sell Your House Free") for the Zoodealio offer engine. The Offervana SaaS UI is operator-facing; this is the homeowner-facing front door.
- **Why Arizona:** Constrained launch market — keeps MLS, brokerage licensing, and disclosure scope to one jurisdiction for MVP. Aligns with where Zoodealio already has MLS coverage.
- **Why the trust posture matters:** A meaningful slice of inbound traffic will be **homeowners unhappy with their current listing agent**. They are the highest-intent, most-skeptical visitors we'll get. If the page reads as "another lead farm," they bounce. If it reads as "actual alternative to my current agent, with a real person managing it," they convert.
- **What this is NOT:** A new offer type, a new database, a new platform-side microservice, or a refactor of Offervana. It is a marketing surface + thin integration adapter.

## 3. Requirements summary

### Functional

- Public marketing site that explains the three pillars (list everywhere, multiple cash offers, renovate-before-move) **and the trust pillar** (no fees, no data resale, real PM) with AZ-local proof points.
- Dedicated **"Why it's free / how we make money"** page that lays out the revenue model in plain language.
- Multi-step seller submission form: address (AZ-validated) → property facts → condition / timeline / motivation → contact + consent.
- **Property data enrichment** triggered on address entry: pull ATTOM valuation + property facts (via existing Offervana ATTOM integration) and pull MLS listing state + photos (via `Zoodealio.MLS`) — surface back into the form to (a) pre-fill known facts so the seller types less, (b) detect if the property is **already listed** and route the conversation accordingly.
- Server-side submission handler that authenticates against Offervana_SaaS as the host admin tenant and creates the appropriate lead/property + offer-request records, attaching the enriched data.
- Confirmation experience that names the assigned Project Manager (or commits to "your PM will reach out within X hours") + transactional confirmation email.
- AZ-required disclosures, brokerage attribution, privacy/terms — including an explicit, plain-language **"we do not sell your information"** clause that's enforceable.
- Production hosting, error monitoring, conversion analytics.

### Non-functional

- Mobile-first, fast (LCP < 2.5s on 4G), accessible (WCAG 2.1 AA).
- SEO-optimized for AZ long-tail (city + "sell my house" + "alternative to listing agent" queries).
- Submissions must be idempotent and resilient to Offervana being briefly unavailable (retry / queue).
- Property enrichment must degrade gracefully — if ATTOM or MLS times out, the form still submits.
- Secrets for the host-admin Offervana credential and any service-to-service tokens never exposed client-side.
- Restrict form submissions to Arizona properties (front-end + server validation).
- "We don't sell your data" promise is binding — no third-party marketing pixels, no lead-resale integrations, no analytics that ship PII to ad networks.

### Out of scope (explicit)

- Seller account / login / dashboard. One-shot submission only in MVP.
- Live cash offer numbers on-page. Offers are delivered offline by Offervana flow + the assigned PM.
- Any modification to Offervana_SaaS or Zoodealio.MLS schema. If a needed endpoint is missing, that becomes its own platform-side epic in the parent repo.
- iOS/Android app, agent-facing tooling, investor-facing tooling.
- Multi-state expansion.
- Direct vendor (ATTOM, etc.) integrations from this repo. We consume Zoodealio services, not vendor APIs directly.

## 4. Epic map

Eight candidate epics. Each is sized to be deliverable in 1–2 weeks by a single dev once architected.

| # | Epic | Scope (services touched) | Depends on |
|---|------|--------------------------|------------|
| E1 | **Site Foundation & Design System** | `sell-house-for-free` only | — |
| E2 | **Core Marketing Pages + Trust Surface** | `sell-house-for-free` only | E1 |
| E3 | **Seller Submission Flow (front-end)** | `sell-house-for-free` only | E1 |
| E4 | **Property Data Enrichment (ATTOM + MLS)** | `sell-house-for-free` BFF + Offervana_SaaS (ATTOM proxy) + `Zoodealio.MLS` (consume) | E3 (form contract) |
| E5 | **Offervana Host-Admin Submission** | `sell-house-for-free` BFF + Offervana_SaaS (consume) | E4 |
| E6 | **Project Manager Handoff & Confirmation** | `sell-house-for-free` + email (SendGrid via Offervana) | E5 |
| E7 | **AZ Compliance & Anti-Broker Disclosure** | `sell-house-for-free` only | E1 |
| E8 | **Launch Readiness** | `sell-house-for-free` + `Zoodealio.Infrastructure` | E2, E5, E6, E7 |

### Epic detail (one paragraph each — architecture happens later, per-epic)

**E1 — Site Foundation & Design System.** Project scaffolding: routing layout, fonts, color tokens, component primitives (button, input, card, form-step), Tailwind theme config, global SEO defaults (`metadata`, OpenGraph, sitemap, robots), Vercel Analytics already wired. Establishes the visual + structural baseline every other epic builds on.

**E2 — Core Marketing Pages + Trust Surface.** Home, How It Works, the pillar pages (Listing+MLS, Cash Offers, **Cash+ with Repairs**, **Renovation-Only**), **a dedicated "Why It's Free / How We Make Money" page**, **a "Meet Your Project Manager" page**, About, FAQ/Trust (with skeptic-first questions: "Are you going to sell my info?", "What's the catch?", "How is this actually free?"), AZ-city SEO landers (Phoenix, Tucson, Mesa, Chandler, Scottsdale, Gilbert, Glendale). Anti-broker / pro-transparency messaging is woven through hero copy, not isolated to a page. **Content authoring uses MDX in-repo** — `Zoodealio.Strapi` is reserved for blog/article content and is out of scope for marketing pages (an optional blog area can pull from Strapi if/when we want one; not MVP).

**E3 — Seller Submission Flow.** Multi-step form (address → property facts → condition + timeline → contact + consent). AZ-only address autocomplete, draft persistence in `localStorage`, client validation, accessibility on every step, abandonment analytics. Defines the canonical form payload that E4 enriches and E5 maps to Offervana DTOs. **No live network calls in this epic** — it ends with a payload object posted to a stub server route. The "address entered" event is the trigger point E4 will hook into.

**E4 — Property Data Enrichment (MLS-sourced).** Server-side BFF route that, on address entry, calls **`Zoodealio.MLS`** as the single enrichment source. Two-call sequence:

1. `GET /api/properties/search?address={addr}` → returns `AttomId`, `MlsRecordId`, listing status, prices, days-on-market, agent/office (if listed), photo counts.
2. `GET /api/properties/attom/{attomId}` → returns the 168-field `PropertyDetailsDto` (ATTOM-sourced bed/bath/sqft/year-built/lot/etc.) for pre-fill.
3. (Optional, only if listed) `GET /api/properties/{mlsRecordId}/images` → returns Azure Blob photo URLs.

The enriched snapshot is returned to the form so it can: (a) pre-fill bed/bath/sqft/year-built so the seller types less, (b) display photos as a "is this your home?" confirmation, and (c) detect the **already-listed case** and gracefully open a conversation ("We see your home is currently listed — we can still help. Are you exploring a second opinion, or ready to switch representation?"). Includes: caching to respect MLS rate limits + cost, graceful degradation if MLS times out (the form must still submit), no enriched PII ever returned to the browser beyond what the seller would already see on Zillow. **No direct ATTOM calls from this repo** — `Zoodealio.MLS` is the proxy. Photo ingestion is async (12-hour cycle), so for fresh listings UX should say "photos may take a few hours to appear."

**E5 — Offervana Host-Admin Submission.** *De-risked substantially in rev 3.* Next.js server route forwards the E3 form state + E4 enrichment to Offervana via **`POST /api/services/app/CustomerAppServiceV2/CreateHostAdminCustomer`** — a single `[AllowAnonymous]` call. Offervana hard-codes the `"Dashboard"` host-admin tenant server-side and creates User + Customer + Property + CommerceAttribution in one transaction, returning `(customerId, userId, referralCode)`. **No ABP token exchange, no service-account provisioning, no tenant header — the original plan's auth complexity evaporates.**

Scope remaining for this Feature:

- **Payload mapping** — our form state → `NewClientDto` (SignUpData / PropData / SurveyData JSON / CustomerLeadSource enum / attribution fields). Forward UTM/gclid/session ID/referrer/entry-page directly into the attribution block.
- **CustomerLeadSource enum** — existing values are `HomeReport`, `CashOffers`. We likely need a new value (e.g., `SellHouseForFree`) to distinguish our submissions in downstream Offervana reporting. Small platform-side change.
- **Two fulfillment paths** (Q9 split — both use the same Offervana endpoint; differentiation is by metadata, not by a new platform feature):
  - **Path A — Cash offers + listing.** Maps to existing offer types downstream (`CashOfferTypeDto`, `CashOfferPlusTypeDto`, `FixListTypeDto`, `ListOnMarketTypeDto`). Offer-type selection happens later in the dashboard workflow.
  - **Path B — Renovation-only.** Unique to this platform as a marketing differentiator. Submits as a standard host-admin lead with a `CustomerLeadSource` value (likely `SellYourHouseFree_Renovation`) or equivalent metadata so the PM knows to route the seller to Hola Home for renovation, then to a conventional listing. **No Offervana_SaaS schema changes required.**
- **Idempotency** — use a stable client-generated submission ID; guard against double-POST on retry.
- **Retry with backoff** for transient failures; dead-letter + structured logging for permanent failures.
- **Referral code capture** — pass back to E6 as the submission reference and correlation key for PM assignment.

The existing `commerce-site/homeowner-flow` Angular component (`HomeownerFlowComponent`) is the behavioral reference — in particular SmartyStreets address validation (`PlaceService.verifySmartyPropAddress`) and the pre-fill call (`PropertyServiceProxy.getPropertyDetailsByAddress`) are subtleties to consciously reproduce or skip in E3+E4, not miss by accident.

**E6 — Project Manager Service & Confirmation.** Offervana_SaaS does **not** have a PM assignment system today, so we own the assignment logic in this repo as a lightweight backend on **Supabase** (the standard DB for everything in this repo). Scope:

- **PM roster** — Supabase table (`project_managers`), source of truth for who can be assigned. Seedable from env or admin-managed.
- **Assignment logic** — start with round-robin; evolve to area-aware (Phoenix vs. Tucson) or capacity-aware as needed.
- **Persistence** — Supabase table (`submissions` or `pm_assignments`) keyed by the Offervana `ReferralCode` returned from E5, with timestamps and assigned-PM ID.
- **Notification** — email at minimum (SendGrid via Offervana `Integrations/` so we inherit DKIM + templates), optionally SMS / Slack. Includes submission details and a deep-link back to the Offervana lead.
- **Confirmation surface** — server-rendered confirmation page names the assigned PM and commits to a contact window. Transactional confirmation email to the seller.

No status polling on-site in MVP — the PM is the channel. **Long-term question (defer):** whether the PM service eventually graduates into Offervana_SaaS as a platform feature, or stays here indefinitely. Defer until we see how operations actually use it.

**E7 — AZ Compliance & Anti-Broker Disclosure.** Privacy policy with an explicit **"we do not sell or share your personal information with real estate agents, brokerages, or lead aggregators outside of Zoodealio's fulfillment network"** clause that is binding and consistent with how the back-end actually behaves. Terms of service. **TCPA consent text on the form is non-trivial and gets first-class attention** — separately worded from the terms-of-service checkbox, explicit phone/SMS consent, opt-out mechanics on every message, kept in version-controlled copy with a date stamp. Brokerage licensure footer attribution naming **JK Realty** (AZ broker of record) with their license number. CCPA-style "do not sell my info" link (which here just confirms we never sold it). Cookie banner if analytics requires. Runs in parallel with E2.

**E8 — Launch Readiness.** Production domain + DNS, hosting (Vercel vs. Azure Container Apps decision), production env vars + secret rotation runbook, error tracking (Sentry or similar), end-to-end smoke test of "submit form → enrichment lands → host-admin lead created in Offervana → PM gets notified", page-speed budget verification, basic analytics goals configured. Hardening pass on the "no third-party PII pixels" promise — explicitly verify nothing client-side ships seller info to ad networks.

## 5. Dependency graph

```
                     ┌──────────────────────┐
                     │  E1 Site Foundation  │
                     └──────┬───────────────┘
        ┌───────────────────┼───────────────────────┐
        ▼                   ▼                       ▼
 ┌──────────────┐   ┌──────────────────┐   ┌────────────────┐
 │ E2 Pages +   │   │ E3 Submission    │   │ E7 AZ          │
 │ Trust        │   │ Flow (FE)        │   │ Compliance     │
 └──────┬───────┘   └────────┬─────────┘   └────────┬───────┘
        │                    │                      │
        │                    ▼                      │
        │           ┌──────────────────┐            │
        │           │ E4 Property Data │            │
        │           │ Enrichment       │            │
        │           │ (ATTOM + MLS)    │            │
        │           └────────┬─────────┘            │
        │                    │                      │
        │                    ▼                      │
        │           ┌──────────────────┐            │
        │           │ E5 Offervana     │            │
        │           │ Host-Admin       │            │
        │           │ Submission       │            │
        │           └────────┬─────────┘            │
        │                    │                      │
        │                    ▼                      │
        │           ┌──────────────────┐            │
        │           │ E6 PM Handoff    │            │
        │           │ & Confirmation   │            │
        │           └────────┬─────────┘            │
        │                    │                      │
        └────────────────────┼──────────────────────┘
                             ▼
                    ┌──────────────────┐
                    │ E8 Launch        │
                    │ Readiness        │
                    └──────────────────┘
```

## 6. Suggested development order

*Revised in rev 3 after Offervana investigation de-risked E5 and confirmed `Zoodealio.MLS` covers ATTOM. Highest-unknown work is now E6 (greenfield PM backend) and Q9b (renovation-only platform mapping).*

1. **E1 — Site Foundation** *(blocker for everything)*
2. **E3 — Submission Flow front-end** *(defines the canonical form payload that E4 + E5 need)*
3. **E4 — Property Data Enrichment** *(now low-unknown: 4 documented `Zoodealio.MLS` endpoints. Mostly schema mapping + caching + degradation)*
4. **E5 — Offervana Host-Admin Submission** *(now low-unknown for the happy path — single anonymous POST. The remaining unknown is Q9b renovation-only routing, which may spawn a sibling Offervana_SaaS epic)*
5. **E6 — PM Service & Confirmation** *(now the largest remaining unknown: greenfield lightweight backend for PM roster + assignment + persistence + notification. Architect early so E5 know what correlation key to expose)*
6. **E2 — Core Marketing Pages + Trust Surface** *(parallel with E4/E5/E6 if a second contributor exists; otherwise after the integration spine is in)*
7. **E7 — AZ Compliance & Anti-Broker Disclosure** *(parallel with E2; JK Realty broker info now known — TCPA wording is the heavyweight item)*
8. **E8 — Launch Readiness** *(closes everything out)*

**Critical path:** E1 → E3 → E4 → E5 → E6 → E8. Marketing (E2) and legal (E7) can slip slightly without delaying launch as long as minimum-viable versions exist by E8.

**Architecture sequencing tip:** start E6 architecture as soon as E5 architecture settles — the PM backend depends on E5's submission ID / referral-code return value, so designing E6 in parallel with E5 implementation is fine.

## 7. Open questions

### Resolved

| # | Question | Resolution |
|---|----------|------------|
| Q1 | Brand positioning | **Standalone consumer brand.** Final name: **Sell Your House Free.** |
| Q2 | AZ broker of record | **JK Realty.** License number to be added to E7 footer. |
| Q3 | Offervana host-admin lead-creation API | **Resolved by investigation.** Single `[AllowAnonymous]` `POST CustomerAppServiceV2/CreateHostAdminCustomer`. Hard-codes `"Dashboard"` host-admin tenant lookup. No auth complexity. See "Offervana endpoints" below. |
| Q4 | `Zoodealio.MLS` consumer surface | **Resolved by investigation.** See "MLS endpoints" below. |
| Q5 | ATTOM access pattern | **Resolved.** `Zoodealio.MLS` indexes ATTOM IDs directly and exposes the 168-field `PropertyDetailsDto` via `/api/properties/attom/{attomId}`. We use MLS as the single source; no Offervana ATTOM proxy needed. |
| Q6 | Already-listed UX | **Surface honestly.** "We see your home is currently listed — second opinion or ready to switch?" |
| Q7 | CMS choice | **MDX in-repo for marketing pages.** `Zoodealio.Strapi` is for blog/article content only; out of scope for marketing. |
| Q8 | Hosting target | **Vercel.** |
| Q9 | Renovation mapping | **Two paths, but only one platform path.** Path A — Cash+ with Repairs — maps to existing `FixListTypeDto`. Path B — renovation-only — is a **marketing differentiator only**; on the platform it submits as a standard host-admin lead with metadata flagging the seller's renovation interest (via `CustomerLeadSource` value or attribution field). The PM handles fulfillment routing (e.g., Hola Home directly). **No platform-side changes to Offervana_SaaS for Path B** — see Q9b. |
| Q9b | Renovation-only platform routing | **No Offervana changes.** The renovation-only flow is unique to this site. The submission lands in Offervana exactly like any other lead; the path-selection metadata travels in the payload (likely a new `CustomerLeadSource` enum value such as `SellYourHouseFree_Renovation`) so PMs and reporting can differentiate. Hola Home routing happens off-platform via the PM. |
| Q10 | Phone / SMS | **Collect phone with explicit, separately-worded TCPA opt-in.** Voice-only opt-out. Wording gets first-class attention in E7. |
| Q11 | PM assignment timing | **Offervana has no PM assignment system today.** PM assignment runs as a lightweight backend in *this* repo. E6 expanded accordingly. |
| Q11a | PM backend storage + logic | **Storage: Supabase** (used for everything DB-side in this repo). Roster as a Supabase table; submission ↔ PM mapping as a Supabase table; assignment algorithm starts with round-robin and can evolve to area-aware. Notification email at minimum (SendGrid via Offervana `Integrations/`); SMS / Slack optional. |
| Q12 | Analytics PII | Confirmed worth a pre-launch audit. No-third-party-PII promise enforced as part of E8 launch checklist. |

### Architecture-phase decisions (not blocking, just downstream)

- Supabase project provisioning + region (E6 architecture)
- Exact `CustomerLeadSource` enum values needed in Offervana for path differentiation (E5 architecture; likely a small enum addition, not a schema change)
- PM notification channels for MVP — email-only vs. email + SMS / Slack (E6 architecture)
- Whether to track listing-status history changes (E4 — `/properties/{id}/history` endpoint) or only current state for MVP

### Known facts captured from investigations

**MLS endpoints (`Zoodealio.MLS.Api`, public to JWT consumers):**
- `GET /api/properties/search?address={addr}` — returns paginated `PropertySearchResultDto` (AttomId, MlsRecordId, ListingStatus, LatestListingPrice, DaysOnMarket, beds/baths/sqft, year-built, photo counts, full address). This is the address-to-listing entry point.
- `GET /api/properties/{mlsRecordId}/history` — price/status history (status changes, prior list prices, sold price/date, listing agent/office name + dates).
- `GET /api/properties/attom/{attomId}` — full `PropertyDetailsDto` (168 fields) keyed by ATTOM ID.
- `GET /api/properties/{mlsRecordId}/images` — photo URLs from Azure Blob (`zoodealiomls.blob.core.windows.net/mlsimages`) with read-only SAS tokens (current SAS expires **2027-02-11** — needs rotation tracking).
- Backed by Azure AI Search index `mlsdata` at `zoodealio-mls-search.search.windows.net`.
- **Photo ingestion is async via Service Bus + Temporal workflows scheduled at 06:00 and 18:00 UTC daily** — photos can lag listing creation by up to ~12 hours. Worth surfacing in UX as "photos may take a few hours to appear."

**MLS endpoint behavior note (informational, not a blocker):** `Zoodealio.MLS.Api/Controllers/PropertiesController` registers JWT middleware but has no `[Authorize]` attributes on endpoints — they are de facto anonymous-callable. Our integration can send a JWT for forward-compat but doesn't need to today. Not pursued further as part of this project.

### Offervana endpoints (`Offervana.Application/Customer/CustomerAppServiceV2.cs`, all `[AllowAnonymous]`)

- **`POST /api/services/app/CustomerAppServiceV2/CreateHostAdminCustomer`** — primary endpoint. Input: `NewClientDto` containing:
  - `SignUpData` — firstName, lastName, email, phone
  - `PropData` — address1, address2, city, stateCd, zipCode, country, gpsCoordinates
  - `SurveyData` — JSON string with squareFootage, bedrooms, bathrooms
  - `CustomerLeadSource` — enum (e.g., `11 = HomeReport`, `12 = CashOffers`). **May need a new value for our submissions** — resolve in E5 architecture.
  - Attribution: `GppcParam, Gclid, Gbraid, Wbraid, GadSource, GadCampaignId, UtmSource, UtmMedium, UtmCampaign, UtmTerm, UtmContent, Referrer, SessionId, EntryPage, EntryTimestamp` — forward these from our site.
- **Server-side behavior** (one call creates everything):
  1. `UserRegistrationManager.RegisterAsync()` — user row
  2. `CustomerServiceV2.CreateCustomerAsync()` — customer row
  3. `PropertyAppService.CreateAsync()` — property row, keyed under the hard-coded `"Dashboard"` host-admin tenant
  4. `CommerceAttribution` row — stored with all UTM/gclid/session data
  5. Internally triggers `_onboardingSharedService.ValidateAvmValue()` — post-creation ATTOM AVM enrichment
- **Returns** `(int customerId, long userId, string ReferralCode)` — the `ReferralCode` is a good candidate for our on-page "submission reference" and PM backend correlation key.
- **Auth:** fully anonymous. No tenant header, no JWT, no service account needed.
- **Not in this call:** PM assignment (doesn't exist in Offervana — per Q11), offer-type selection (the `CustomerLeadSource` hints at the path but actual offer decisions happen downstream in the dashboard workflow).

### Architectural implication worth surfacing

The commerce site `/commerce-site/homeowner-flow` in the Angular app **already implements a submit-property flow** calling this same endpoint. We are intentionally rebuilding it in `sell-house-for-free` rather than embedding/reskinning because the trust posture and standalone-brand positioning (Q1) demand it — but the existing flow is the correct behavioral reference for E3 + E5 architecture. Any subtle behavior (address normalization via SmartyStreets at line 544, `getPropertyDetailsByAddress` pre-fill at line 682, etc.) should be reproduced or consciously skipped, not missed.

## 8. References

- Ecosystem map: `_bmad/zoo-core-CLAUDE.md`
- Offervana_SaaS reference checkout: `C:/Users/Noah/Desktop/Zoo-Core/Offervana_SaaS/`
- ATTOM credential location (do not duplicate elsewhere): `Offervana_SaaS/aspnet-core/src/Offervana.Web.Host/appsettings.json` → `Attom.PrivateToken`
- MLS service: `C:/Users/Noah/Desktop/Zoo-Core/Zoodealio.MLS/` (Api + FunctionApp + Temporal)
- Shared offer DTOs: `Zoodealio.Shared/`
- Pattern reference (architecture quality bar): `Zoodealio.TradeInHoldings/`

## 9. Next steps

1. Review + confirm the epic map, dev order, and open questions above.
2. File this as an ADO Feature under the Offervana_SaaS project (pending user confirmation — see sidecar).
3. Kick off **E1** with `/zoo-core-create-epic`, then `/zoo-core-create-architecture` for that epic.
4. In parallel, get answers to open questions 1, 2, 3, 4 — they unblock the most downstream work.
