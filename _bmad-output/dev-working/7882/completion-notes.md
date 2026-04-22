# E4-S11 Completion Notes

## Outcome
- State: **Ready For Testing** on ADO 7882
- Branch: `feature/e4-property-enrichment-7780` (shared epic branch)
- Commits: `ba66530`, `c6eff6b`, `a71278e`, `ddb582c`, `e8a4812`

## What shipped
Two-source property enrichment. MLS search + ATTOM `expandedprofile` now
fire in parallel via `Promise.allSettled`. MLS wins per-field; ATTOM fills
gaps (lot size, year built, etc. for off-MLS or sparse MLS records).
Envelope gains `ok-partial` when exactly one enabled source returns data.
`ENRICHMENT_SOURCES=mls` kills the ATTOM leg entirely for preview deploys
or ATTOM outages.

## Follow-ups for the team
- **Smoke test before merging the epic PR**: fire a real Phoenix address
  through `/api/enrich` locally with `.env.local` populated
  (`ATTOM_API_BASE_URL=https://api.gateway.attomdata.com/propertyapi/v1.0.0`,
  `ATTOM_PRIVATE_TOKEN=<key>`). Verify the log line carries `attomOk:true`,
  `attomLatencyMs` > 0, `sources:["mls","attom"]`. Already documented in the
  ADO comment.
- **Ops dashboards referencing `mlsHits`** (if any): the flag semantics
  changed from "call-made" to "returned-data." Update queries that use
  `mlsHits.search:false` as a proxy for "MLS didn't get called."
- **Future stories** (out of scope here): ATTOM AVM, sales history, equity;
  per-source cache TTLs; ATTOM coverage on the `suggest()` autocomplete path.

## Sidecar state
`index.md` now reflects `last-completed-step: 7`. Safe to delete the
dev-working folder after the epic merges to main if space is a concern.
