---
feature: e4-property-data-enrichment
services-in-scope:
  - sell-house-for-free
  - Zoodealio.MLS (consume)
upstream-research: _bmad-output/planning-artifacts/project-plan-sell-house-for-free.md §4 E4
started-at: 2026-04-17T00:00:00Z
last-completed-step: 5
---

# E4 Architecture — Working Sidecar

**Scope recap (plan §4 E4):**
Server-side BFF route triggered on address-complete from E3. Calls `Zoodealio.MLS` as the single enrichment source. Two-call sequence (search → ATTOM details), with optional third call for images when listed. Returns a normalized `EnrichmentSlot` to the form so it can: (a) pre-fill bed/bath/sqft/year-built, (b) confirm "is this your home?" via photos, (c) detect already-listed and offer the second-opinion conversation.

**Boundaries:**
- **No direct ATTOM API calls.** `Zoodealio.MLS` is the proxy for both ATTOM-sourced details and listing/photo data.
- **No write calls.** E4 is read-only; nothing is persisted to MLS or Offervana.
- **No PII in/out beyond what the seller already typed** (the address). The MLS API has no concept of the seller; it returns property data only.
- **The form must still submit if MLS times out, errors, or returns no match.** Enrichment is best-effort.
- **Photo ingestion lag (~12h, 06:00/18:00 UTC).** UX surfaces this for fresh listings.

**Services in scope:**
- `sell-house-for-free` — adds `src/app/api/enrich/route.ts` BFF route, `src/lib/enrichment/*` client + types + cache, `useAddressEnrichment(address)` hook, listing-status UI surfaces in E3 step 2.
- `Zoodealio.MLS` — read-only consumer; no platform-side changes.

**Dependency on E3:**
- Consumes `<AddressField onAddressComplete>` seam from E3-S4.
- Writes into `SellerFormDraft.enrichment: EnrichmentSlot` (slot defined in E3 §4.3).
- Reuses `SellerFormDraft.submissionId` as a correlation key for log lines.

**Survey targets (step 2 — to do next):**
- Next.js 16 Route Handlers (`route.md`) — caching, runtime, timeouts.
- Next.js 16 `unstable_cache` / `cache` patterns vs. external KV.
- React 19 `useTransition` / SWR-style hook patterns for non-blocking enrichment.
- `Zoodealio.MLS` four endpoints already documented in plan §7 "Known facts captured from investigations".
- Service Bus / Temporal photo cycle — plan §7 confirms 06:00/18:00 UTC.
- SAS token expiry **2027-02-11** — needs a rotation tracking mechanism.

**Open questions still carrying:**
- Combobox library for address autocomplete (deferred from E3).
- TTL for enrichment cache (per-address) — propose 24h since MLS data is stable on that timeframe.
- Whether to use `/properties/{id}/history` for an MVP "previously listed" signal or defer.
- Whether MLS calls need a JWT today (plan §7 says de facto anonymous) — propose forward-compat header but no token in MVP.
- AZ-only filter — MLS will still return non-AZ matches if address is mistyped; we trust the AZ zip-range schema gate from E3.

**Handoff pointers:**
- Feeds: `zoo-core-create-epic` for E4, then `zoo-core-create-story`.
- Replaces E3's plain `<AddressField>` with a Combobox without changing the props (E3 §4.3 contract).
