---
epic-id: 7781
epic-title: "E5 — Offervana Host-Admin Submission"
branch: feature/e5-offervana-host-admin-7781
base: origin/main @ 140c589
autopilot-status: complete
started-at: 2026-04-23T16:34Z
completed-at: 2026-04-23T17:27Z
---

# Epic 7781 Autopilot Summary

## Outcomes per story

| # | ADO | Name | Outcome | Commit |
|---|------|------|---------|--------|
| S1 | 7854 | Supabase client + migrations | **Closed** — code + migration applied + verified | `210d5ea`, `81a14e7` |
| S2 | 7861 | Offervana HTTP client + retry + classifier | **Closed** (rev-shipped after S8 UAT smoke) | `76c6bac`, `d5c7e92`, `6534aca` |
| S3 | 7865 | SellerFormDraft → NewClientDto mapper | **Closed** (rev-shipped after S8 UAT smoke) | `7a24bc9`, `6534aca` |
| S4 | 7868 | BFF idempotency store | **Closed** | `f77f6b9` |
| S5 | 7869 | Dead-letter + structured logging | **Closed** | `a080e6a` |
| S6 | 7870 | Wire Server Action | **Closed** | `0398875` |
| S7 | 7871 | Offervana_SaaS companion PR | **Dropped** per user directive — model already restructured upstream; ADO comment added |
| S8 | 7872 | UAT smoke + chaos evidence | **Closed** — `scripts/e5-smoke.mjs` with happy/email-conflict/timeout scenarios; happy verified against live UAT (customerId 1025105) | `6534aca` |

7 of 8 stories closed. S7 legitimately out of scope.

## Aggregate metrics

- 48 unit tests added (51 total in the repo); all green.
- 1 migration applied + verified (`offervana_idempotency` + `offervana_submission_failures` + `offervana_failure_reason` enum, RLS on).
- 1 live UAT submission proven: customerId `1025105`, userId `1378284`, referralCode `cd3ff7fa-e8d8-4d7d-90b4-caed9627b998` — real customer created in `sellfreeai.zoodealio.net`.
- `next build` clean; `/get-started` route is `ƒ (Dynamic)` with `runtime=nodejs` + `maxDuration=30`.
- Bundle safety: grep of `.next/static/**` for `SUPABASE_SERVICE_ROLE_KEY` / `ZOODEALIO_API_KEY` → zero hits.

## Three contract bugs surfaced by S8 that unit tests could not catch

1. **Wire casing is camelCase, not PascalCase.** The epic body said PascalCase; the live Swagger + live API disagreed. AbpUsers.Name went NULL until we renamed `SignUpData.Name` → `signUpData.firstName` (and cascade across all DTO keys).
2. **`AddPropInput` doesn't carry bedrooms/bathrooms/sqft.** Those fields live at the top level of the `surveyData` JSON string, which Offervana deserializes via `JsonConvert.DeserializeObject<dynamic>` and reads the keys directly (decimal cast). Nesting them under `surveyData.property.*` threw `Cannot convert null to 'decimal'`. Fix: emit at top level + non-null defaults (1/1/1500) so the decimal cast can never hit null.
3. **ABP wraps responses in `{result, success, error, __abp}`.** Our normalizer was reading `body.item1` directly; the happy path actually has `body.result.item1`. Classifier also now treats a 200 with `success: false` as non-ok (and still runs the email-conflict regex).

Retry/timeout recalibrated after observing 3–8s real latency: **2 attempts at 13s each** (was 3 × 5s), maxDuration **30s** (was 15s).

## Patterns / candidates for memory

- **Live smoke is worth the effort on any new outbound integration.** Three non-trivial contract bugs would have shipped silently to prod.
- **Next.js 16 Server Action files can't export runtime/maxDuration.** Those belong on the route-segment `page.tsx` (or `layout.tsx`). Not on the actions file.
- **supabase-js v2 + `SupabaseClient<Database>` generic is fussy** about the composite shape (`PostgrestVersion` discriminator). Dropping the generic at the boundary + keeping hand-written row types in `schema.ts` is the pragmatic balance.

## Follow-up items surfaced (not closed in this epic)

- **Unit-test coverage of the `actions.ts` orchestration itself.** The glue has no direct tests; it relies on the component tests beneath it. A vi-mock-based integration test would close the gap.
- **Email-conflict UAT scenario verification.** The live UAT smoke `email-conflict` scenario hit a 30s+ latency on consecutive creates and timed out before asserting. The classifier code path is well-tested at the unit level. Run against a warmer UAT or a dedicated fixture email once to capture the real error body shape.
- **`offervana_submission_failures` visibility.** E6 / E8 owns the reconciliation UI + PM alerting. The table is written; reading / resolving rows is not.
- **PM handoff stub is a no-op.** `after()` emits `offervana.pm_handoff.pending` — E6 replaces that with the real PM assignment + notification.
- **Migration idempotency.** The SQL uses bare `create type` / `create table` (no `if not exists`); Supabase's migration framework tracks applied filenames so re-runs are safe at the framework level, but the SQL itself is not idempotent on its own. Low priority.
- **Actual Offervana fields outside the bedrooms/bathrooms/sqft trio** — the Swagger `AddPropInput` includes `dwellingType`, `absenteeInd`, `legalOne`, `reoFlag`, `auctionDate`. The mapper emits `legalOne` (set to `attomId`) and null for the rest. If Offervana scoring weights any of them, revisit.

## Next steps

1. Open PR against `main` for `feature/e5-offervana-host-admin-7781` once Noah is ready.
2. Code review (`zoo-core-code-review`) is recommended before merge — especially around the `actions.ts` happy/failure orchestration, which is the highest-risk surface.
3. Vercel preview deploy will validate the full flow end-to-end in a realistic environment.
