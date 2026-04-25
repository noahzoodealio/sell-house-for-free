---
epic-id: 7921
epic-slug: e12-property-enrichments-durable-cache
target-service: sell-house-for-free
branch-strategy: single-branch (per user directive "all on 1 branch")
branch: feature/e12-property-enrichments-durable-cache
stories-planned:
  - id: E12-S1
    ado-id: 7973
    title: Schema migration — property_enrichments + area_enrichments
    depends-on: []
    risk: medium
    strike-count: 0
    status: pending
  - id: E12-S2
    ado-id: 7974
    title: durable-cache.ts helper (read/write Supabase wrapper)
    depends-on: [E12-S1]
    risk: low
    strike-count: 0
    status: pending
  - id: E12-S3
    ado-id: 7975
    title: TTL + staleness policy table
    depends-on: [E12-S2]
    risk: low
    strike-count: 0
    status: pending
  - id: E12-S4
    ado-id: 7976
    title: Wire durable cache into getEnrichment (in-memory → durable → upstream)
    depends-on: [E12-S3, E12-S5]
    risk: high
    strike-count: 0
    status: pending
  - id: E12-S5
    ado-id: 7977
    title: New ATTOM/MLS client wrappers (10 endpoints) writing through durable-cache
    depends-on: [E12-S2, E12-S3]
    risk: medium
    strike-count: 0
    status: pending
  - id: E12-S6
    ado-id: 7978
    title: Ops + observability (Sentry events, analytics dims, stale-sweep)
    depends-on: [E12-S4]
    risk: low
    strike-count: 0
    status: pending
  - id: E12-S7
    ado-id: 7979
    title: Opportunistic backfill from offervana_idempotency
    depends-on: [E12-S4]
    risk: low
    strike-count: 0
    status: pending
stories-completed: []
autopilot-status: running
started-at: 2026-04-25T16:21:00Z
user-overrides:
  - skip-migration-confirmation: true
  - skip-s4-go-live-confirmation: true
  - autopilot-mode: end-to-end
---

# E12 — Execution Plan

**Epic:** [#7921 — Property Enrichments Durable Cache (ATTOM multi-endpoint + MLS)](https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7921)
**Service:** `sell-house-for-free` (Next.js / Supabase)
**Branch strategy:** ⚠️ **Single branch** — per user directive `e12 - all on 1 branch.`

---

## Pre-execution gaps to resolve with user

1. **No child stories filed in ADO** — Epic 7921 has zero child links. The 7-story decomposition lives only in the Epic body and `_bmad-output/epic-working/e12-property-enrichments-durable-cache/index.md`.
   - **Recommended:** file all 7 stories at execution kickoff with concise descriptions that link back to the parent Epic body for the full ACs. Lightweight ceremony, full traceability. ADO IDs get patched into this plan once known.
   - **Alternative:** skip ADO filing and execute against the brief directly. Loses per-story status tracking but is faster.

2. **No architecture doc for E12 yet** — brief recommends `/zoo-core-create-architecture e12` first. The Epic body itself is detailed enough (key decisions are locked: per-endpoint jsonb columns, address_key PK, raw payload storage, separate area_enrichments, negative-cache TTL, no PII). Going straight to execution is acceptable; we'll lock open questions in the per-story plans.

3. **Single-branch override** — every story commits to `feature/e12-property-enrichments-durable-cache`. One PR at the end of S7 (or earlier checkpoint if user prefers). Per-story branches are skipped. Code-review still runs per story.

---

## Source of truth

- Epic body: `mcp__ado__wit_get_work_item id=7921` — full 7-story decomposition + locked decisions
- Brief: `_bmad-output/epic-working/e12-property-enrichments-durable-cache/index.md`
- Existing code: `src/lib/enrichment/{service,cache,attom-client,mls-client,normalize}.ts`
- Migration baseline: `supabase/migrations/` (last entry 20260424195000_e11_s7_handoff.sql)

---

## Topological order + risk

Linear chain — every story builds directly on the previous. Risk concentrated in S1 (schema, irreversible-ish) and S4 (wires the new path into the live submission flow). S5 can technically run in parallel with S4 since both depend on S2/S3, but on a single branch we serialize for clean review.

```
S1 (schema)  ──▶  S2 (helper)  ──▶  S3 (TTL policy)  ──▶  S4 (wire into service)  ──▶  S6 (observability)
                                                  └──▶  S5 (new clients) ──▶  (writes through S2/S3)
                                                                    │
                                                              S7 (backfill) — runs after S4

Order: S1 → S2 → S3 → S5 → S4 → S6 → S7
```

Why **S5 before S4**: S5's new client wrappers can land in isolation (each writes through durable-cache automatically per S2/S3) without touching the live `getEnrichment` path. S4 then is the single switching moment where the new behavior goes live across both old and new endpoints. Reduces blast radius of S4.

---

## Per-story summary

### E12-S1 — Schema migration
- **Files:** new migration `supabase/migrations/{ts}_e12_s1_property_enrichments.sql`
- **Tables:** `property_enrichments` (PK `address_key`), `area_enrichments` (PK `geoid_v4`); per-endpoint jsonb cols + `*_fetched_at` timestamps; `sources text[]`; indexes on `zip` + covering `(address_key, attom_profile_fetched_at)`
- **RLS:** default-deny, service-role-only
- **Halt:** ✅ EF/Supabase migration → user confirms `npx supabase db push` (or equivalent) before subsequent stories run
- **Risk:** medium — schema is wide; once applied, future changes are migrations not ALTERs

### E12-S2 — `src/lib/enrichment/durable-cache.ts`
- Pure Supabase wrapper. `readDurable(addressKey, endpoint)` + `writeDurable(addressKey, endpoint, payload)`
- Single endpoint enum drives column routing
- Unit tests against mocked `getSupabaseAdmin()`
- **Risk:** low

### E12-S3 — TTL policy
- New file `src/lib/enrichment/durable-cache-policy.ts` exporting per-endpoint TTL constants matching the Epic body table (profile 90d, mls 1h, etc.)
- `isStale(endpoint, fetchedAt): boolean` helper
- **Risk:** low

### E12-S5 — New ATTOM + MLS client wrappers
- **ATTOM new endpoints (per-property):** AVM detail, AVM history, sale snapshot, sales history, assessment, assessment history, building permits, rental AVM
- **ATTOM new endpoints (area):** salestrend, school search
- **MLS new:** `getListingHistory(mlsRecordId)`
- Each wrapper: read durable → if hit && !stale return; else fetch upstream → write durable → return. Same retry-once / config-validation discipline as `attom-client.ts`
- **Risk:** medium — 11 new endpoints, narrow-typed extracts

### E12-S4 — Wire into `getEnrichment`
- Extend `service.ts:getEnrichment` ordering: in-memory → durable → upstream → durable write → in-memory write
- Partial refresh: if only MLS stale, refetch MLS; reuse fresh ATTOM
- Negative-cache (`sources = []`) writes to durable with 1h TTL
- All existing E2E tests must still pass; new test for durable-hit path
- **Risk:** high — touches the live submission flow

### E12-S6 — Ops + observability
- Sentry events: `enrichment_durable_hit`, `enrichment_upstream_refetch`, `enrichment_stale_refresh_skipped_outage`, `enrichment_upstream_error`
- Vercel Analytics dimensions on existing `track('enrichment_status', …)`: add `durable_hit: boolean`, `endpoint: string`
- Optional `scripts/enrichment-stale-sweep.ts`
- Runbook entry under existing ops doc
- **Risk:** low

### E12-S7 — Opportunistic backfill
- `scripts/enrichment-backfill.ts` — read `offervana_idempotency` for salvageable payloads, write into `property_enrichments`, dry-run flag
- Skip entirely if zero salvageable rows
- **Risk:** low

---

## Branch + commit policy

- **Branch:** `feature/e12-property-enrichments-durable-cache` cut from `main`
- **One commit per story** (or logical sub-step), prefixed `e12-s{n}({ado-id}): {summary}` matching the convention seen in recent commits (`e11-s10(7938): …`)
- **One final PR** to `main` after S7 (or earlier checkpoint if user halts)
- Code-review runs per-story — each story gets its own review verdict before proceeding

---

## Halt + escalation rules

- **3-strike outer review loop** per story (skill default) — surface review report + dev plan + verdicts to user
- ~~Migration halt~~ — **disabled per user directive**, autopilot does not wait for migration application
- ~~Live-flow halt after S4~~ — **disabled per user directive**, autopilot continues straight into S6/S7

---

## Compaction strategy

After each story closes out, preserve:
- This `epic-plan.md` (source of truth, status fields updated in frontmatter)
- `per-story/{story-id}/sidecar.md` (story-level summary)

Discard per-story working context. Resume autopilot by re-reading this file.

---

## Final summary report

After S7 (or autopilot halt), write `_bmad-output/dev-working/epic-7921/summary-report.md` with per-story outcomes, durable-cache hit-rate metrics observed in the new tests, ATTOM/MLS endpoint coverage, and follow-up items.
