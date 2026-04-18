---
slug: e5-bulk-s1-to-s8
parent-epic-id: 7781
parent-epic-url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7781
ado-grandparent-epic-id: 7776
ado-grandparent-epic-url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7776
mode: bulk
mode-ado: mcp
stories-planned:
  - e5-s1-supabase-client-env-scaffolding
  - e5-s2-offervana-http-client-retry-classify
  - e5-s3-seller-draft-to-newclientdto-mapper
  - e5-s4-bff-idempotency-store
  - e5-s5-dead-letter-structured-logging
  - e5-s6-wire-server-action-redirect-after
  - e5-s7-offervana-saas-companion-pr-enum-additions
  - e5-s8-smoke-chaos-integration-tests
stories-created:
  - id: 7854
    url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7854
    title: "E5-S1 — Supabase client + env scaffolding + migrations (offervana_idempotency + offervana_submission_failures + failure-reason enum)"
    size: S
  - id: 7861
    url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7861
    title: "E5-S2 — Offervana HTTP client + retry + timeout + classify (ValueTuple item1/item2/item3 normalization + SubmitResult tagged union)"
    size: M
  - id: 7865
    url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7865
    title: "E5-S3 — SellerFormDraft → NewClientDto pure mapper + golden fixtures (cash/renovation paths, enrichment present/absent, clamps, PascalCase, consent, attribution)"
    size: M
  - id: 7868
    url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7868
    title: "E5-S4 — BFF idempotency store (lookupIdempotent + storeIdempotent + 24h TTL + concurrent-same-submissionId replay)"
    size: S
  - id: 7869
    url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7869
    title: "E5-S5 — Dead-letter persistence + structured JSON logging (recordDeadLetter + offervana_submission_failures writer + log-contract schema)"
    size: S
  - id: 7870
    url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7870
    title: "E5-S6 — Wire Server Action: replace E3 stub body + runtime=nodejs + maxDuration=15 + redirect + after() (idempotency + Offervana + dead-letter + PM handoff stub)"
    size: M
  - id: 7871
    url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7871
    title: "E5-S7 — Offervana_SaaS companion PR: CustomerLeadSource = 13 (SellYourHouseFree) + 14 (Renovation) + leadType switch + landingPageTag + CommerceAttribution.Source"
    size: S
  - id: 7872
    url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7872
    title: "E5-S8 — UAT smoke + chaos integration tests (happy submit, idempotency replay, transient retry, timeout simulation, email-conflict, dead-letter recovery evidence for E8)"
    size: M
started-at: 2026-04-18T02:35:00Z
completed-at: 2026-04-18T02:48:35Z
last-completed-step: 5
---

# E5 bulk S1→S8 — PM Working Sidecar

## Plan

Eight stories decomposing Feature **7781** (E5 Offervana Host-Admin Submission) per architecture §7. All filed as User Story children under 7781 with area/iteration `Offervana_SaaS`, matching E1/E2/E3/E4/E6 siblings.

### Critical sequencing

- **S1 unblocks S4 + S5** — Supabase client + env + two tables + failure-reason enum. Shared infrastructure with E6 (7823).
- **S2, S3, S7 run in parallel** — HTTP client (S2), pure mapper (S3), Offervana_SaaS companion PR (S7). Three contributors, no dependencies between them.
- **S4, S5 run in parallel after S1** — idempotency + dead-letter both build on `supabase/server.ts`.
- **S6 is the glue** — replaces E3 stub body in `actions.ts`; depends on S1–S5.
- **S8 runs after S6** — UAT integration suite; produces E8 launch-gate evidence.

### Filing order

S1 (7854) → S2 (7861) → S3 (7865) → S4 (7868) → S5 (7869) → S6 (7870) → S7 (7871) → S8 (7872). Monotonic numeric sequence preserves at-a-glance readability (with small gaps where other ADO work items landed concurrently — no E5 sibling is hidden in the gaps).

### Parallelism DAG

```
S1 ─┬─> S4 ─┐
    └─> S5 ─┤
S2 ─────────┤
S3 ─────────┼─> S6 ─> S8
S7 (independent, ships any time)
```

## Story-size summary

| # | ID | Story | Size |
|---|---|---|---|
| S1 | 7854 | Supabase client + env + migrations | S |
| S2 | 7861 | Offervana HTTP client + retry + timeout + classify | M |
| S3 | 7865 | `SellerFormDraft → NewClientDto` pure mapper + golden fixtures | M |
| S4 | 7868 | BFF idempotency store (24h TTL) | S |
| S5 | 7869 | Dead-letter persistence + structured JSON logging | S |
| S6 | 7870 | Wire Server Action + `runtime=nodejs` + `maxDuration=15` + `after()` | M |
| S7 | 7871 | Offervana_SaaS companion PR (CustomerLeadSource 13/14) | S |
| S8 | 7872 | UAT smoke + chaos integration tests (E8 launch-gate evidence) | M |

## Execution log

### Filed in order

1. **7854** — E5-S1 Supabase client + env scaffolding. 17 ACs. Two new files (`src/lib/supabase/server.ts` with `server-only` + `React.cache` lazy env + `schema.ts` hand-written row types), one SQL migration (`offervana_idempotency` + `offervana_submission_failures` + `offervana_failure_reason` enum + RLS + indexes), `.env.example` + README updates, two new deps (`@supabase/supabase-js` + `server-only`). Shared infra with E6-S1 (7823) — story explicitly coordinates ownership of the client module. Notes pin `server-only` runtime guard + lazy-env DX rationale + no `anon` key allowed.
2. **7861** — E5-S2 Offervana HTTP client. 19 ACs. Two/three new files (`client.ts`, `errors.ts`, `types.ts` for `NewClientDto`). `AbortSignal.timeout(5000)`, 3-attempt retry (0/1s/4s ±250ms jitter), `cache: 'no-store'`, `X-Client-Submission-Id` header, ValueTuple `{item1,item2,item3}` normalization, email-conflict regex matcher, 429 `Retry-After` capped at 4s, PII-redaction on errors, `SubmitResult` tagged union. No third-party retry dep. Notes pin the ValueTuple serialization quirk (confirmed from `homeowner-flow.component.ts:1006-1007`).
3. **7865** — E5-S3 `SellerFormDraft → NewClientDto` mapper. 18 ACs. Pure function + 5+ golden fixtures (cash-path, renovation-path, enrichment-present, enrichment-absent, clamped, empty-attribution). Clamp rules match Angular reference exactly (bedrooms 1–100, bathrooms 0.5–50, sqft >0 default 1500). `SurveyData` is a JSON **string** not object (Offervana dynamic-deserialize path). PascalCase keys on wire. Transitional `CustomerLeadSource = 11` fallback via `OFFERVANA_LEAD_SOURCE_STRICT` env flag (13/14 after S7 lands). Attribution flattened to 15 top-level fields; `EntryTimestamp` ms conversion. Consent pass-through. 98% line / 95% branch coverage required — the anti-broker audit file.
4. **7868** — E5-S4 BFF idempotency store. 16 ACs. `lookupIdempotent` / `storeIdempotent` + `.upsert({ onConflict: 'submission_id' })` atomic semantic. 24h TTL + application-side `where expires_at > now()` filtering. Integration test for concurrent-same-submissionId (must stay at one row). `.maybeSingle()` not `.single()`. No PII in the row (drafts live in S5 dead-letter table). No retry / no cleanup cron (MVP scale).
5. **7869** — E5-S5 Dead-letter persistence + structured logging. 16 ACs. `recordDeadLetter(draft, dto, meta)` inserts to `offervana_submission_failures` + emits one `console.error(JSON.stringify({...}))` line. Log schema Ops-facing — stable field names (`event: 'offervana_dead_letter'`, `submissionId`, `reason`, `detail`, `createdAt`, `referralCodeFallback`). **PII in DB row, not in log line** (audit boundary). Never throws — S6 calls from inside `after()`. Secondary-failure path emits `offervana_dead_letter_persistence_failed` log. Detail capped at 4KB in DB, 500 chars in log. No retry.
6. **7870** — E5-S6 Wire Server Action. 20 ACs. Replaces happy-path body of `src/app/get-started/actions.ts` (preserves E3's signature + Zod + `SubmitState` shape verbatim). Module-level `export const runtime = 'nodejs'` + `export const maxDuration = 15`. Orchestration: validate → lookupIdempotent → mapper → submitToOffervana → switch(result.kind) → storeIdempotent → `after()` for dead-letter + PM handoff + audit log → `redirect()`. Email-conflict → `ref=pending`; permanent-failure → `ref=unassigned`. `/get-started/thanks/page.tsx` gets graceful copy for both sentinel refs. New `src/lib/pm/handoff.ts` stub swallows errors (E6-S5 7832 supersedes). New `docs/e5-offervana-integration.md` runbook. Bundle-safety grep (zero hits on service-role key in `.next/static/**`). `redirect()` must stay outside try/catch (sentinel). `after()` runs even after `redirect()` — intentional.
7. **7871** — E5-S7 Offervana_SaaS companion PR. 13 ACs. Cross-repo; independent sequencing. Three files + test file in `aspnet-core/`: `Customer.cs` (append `SellYourHouseFree = 13` + `SellYourHouseFreeRenovation = 14` with `[Description]` attrs), `CustomerAppServiceV2.cs` (leadType switch → `CashOffersLandingPage`; `landingPageTag` → `"SellYourHouseFreePage"`; `CommerceAttribution.Source` → `"SellYourHouseFree"`). **No DB migration** (enum is `int`-backed). Rollback caveat documented: flip env to fallback BEFORE reverting the PR. Renovation-specific scoring deferred to future story (both values route to `CashOffersLandingPage` for MVP).
8. **7872** — E5-S8 UAT smoke + chaos tests. 16 ACs. Six scenarios in `tests/e5-integration/`: happy submit (verifies real Offervana Customer/Property/CommerceAttribution + Supabase idempotency row), idempotency replay (fetch-spy assert zero outbound on 2nd POST), transient retry (mock server 503×2 → 200, count = 3), timeout simulation (mock hang → ≤15s wall clock → `ref=unassigned` + dead-letter row), email-conflict (2nd POST with same email → `ref=pending` + dead-letter `reason=email-conflict`), bundle-safety grep. Tests gated by `E5_INTEGRATION_TESTS='true'` + UAT env vars. Nightly Azure DevOps job @ 02:00 America/Phoenix. JSON report artifact is the E8 launch-gate deliverable. 5 clean nightly runs before story closes.

### Content decisions (cross-story patterns)

- **Blueprint stability.** Every story follows the E3/E6 section cadence: banner (Parent / Story order / Size / Blocks / Depends on / Scope) → User story → Summary → Files touched → Acceptance criteria (numbered `<ol>`) → Technical notes → Suggested tasks → Out of scope → References → Notes (bleeding-edge Next.js 16 / React 19 pinned regressions).
- **AC density scales with correctness-sensitive surface.** S2 (19), S3 (18), S6 (20) earn the most ACs because they own wire-format fidelity (ValueTuple, PascalCase, SurveyData JSON, `redirect()` + `after()` semantics). S1 (17), S4 (16), S5 (16), S7 (13), S8 (16) run lighter.
- **Forward-compat contracts explicit in Technical notes.** S1's `getSupabaseAdmin()` + `server-only` guard. S2's `SubmitResult` tagged union. S3's `NewClientDto` PascalCase + `SurveyData` JSON-string + `OFFERVANA_LEAD_SOURCE_STRICT` flag. S6's `redirect()` sentinel + `after()` guarantees. S7's enum values pinned to 13/14.
- **Bleeding-edge call-outs in Notes tail.** S1 `server-only` barrier + `React.cache` scope + lazy env DX. S2 `AbortSignal.timeout()` Node 18+ + `cache: 'no-store'` for mutations + ValueTuple quirk. S3 PascalCase + `SurveyData` must stringify + clamp exactly + CustomerLeadSource env-flag strict-false default. S4 `.upsert()` atomic + `.maybeSingle()` not `.single()` + app-side TTL filtering. S5 never-throw + PII-in-DB-not-log + `console.error` stream selection. S6 `redirect()` sentinel outside try/catch + `after()` runs after redirect + `runtime`/`maxDuration` module-level. S7 int-pinned enum + no DB migration + rollback env-flip-before-revert. S8 UAT side effects + unique email per run + mock Offervana for 503/hang.
- **Architecture §5 deviations enforced in ACs.** BFF-owned idempotency (Offervana has no primitive). No circuit breaker (MVP scale). Dead-letter in Supabase not a queue. Password `"123456"` omitted from mapper (server hard-codes it). `redirect()` on permanent-failure with `?ref=unassigned` not error screen. Hard-coded `sendPrelims`/`submitterRole`/`isSellerSource`. Transitional `CustomerLeadSource = 11` fallback.

### Bulk-mode compaction

Each story drafted individually and filed via `wit_add_child_work_items` one item per call; monotonic IDs 7854–7872 (with small gaps from other ADO work landing concurrently — verified no E5 sibling is hidden). Feature 7781 body + architecture §7 decomposition table re-referenced by memory rather than re-fetched. Per-story deep context discarded between drafts.

### Style match to E1/E2/E3/E4/E6 siblings

- Same HTML vocabulary (`<h2>`, `<ul>`, `<ol>`, `<code>`, `<strong>`, `<em>`, `<br>`, `<pre>` on S7). No tables (not needed for E5's content — all sizing lives in this sidecar + architecture).
- Same area/iteration path (`Offervana_SaaS` / `Offervana_SaaS`).
- State `New`, priority `2`, `ValueArea = Business` (default).
- `format: "Html"` placed INSIDE each item object (not top-level — E2 bug lesson applied). Verified via API response: every story shows `"multilineFieldsFormat":{"System.Description":"html","Microsoft.VSTS.TCM.ReproSteps":"html"}`.
- Code samples use `&lt;` / `&gt;` / `&amp;` / `&quot;` entity refs; literal characters rendered correctly in E1–E4/E6 stories.

### Format bug avoided (E2 lessons applied)

All eight stories filed with `format: "Html"` placed **inside each item object**. The E2 bug (S1–S9 of E2 filed with top-level `format`, stored as markdown-escaped HTML) was avoided from story 1. `multilineFieldsFormat` confirms `html` on both `System.Description` and `Microsoft.VSTS.TCM.ReproSteps` for every filed item.

## Not done

- No tags assigned (matches E1/E2/E3/E4/E6 precedent).
- No assignees, no sprint iteration (matches precedent; sprint planning will assign).
- Did not append patterns to `zoo-core-agent-pm/ado-history.md` — directory still doesn't exist locally.
- No inter-story `Related` links filed in ADO. Hierarchy (Parent) link is on each story pointing at 7781; sibling dependencies documented in each story body under `Depends on` / `Blocks`.
- No cross-repo artifact link from 7781 to the future Offervana_SaaS companion PR (S7 will be a separate Azure DevOps PR when it opens — can be attached via artifact link then if the team wants a hard cross-ref).
- No Figma frames — not applicable (E5 has no new UI surface beyond the existing E3-owned `/get-started/thanks` copy tweak in S6).

## Next steps

1. Review the eight rendered stories on ADO: 7854 / 7861 / 7865 / 7868 / 7869 / 7870 / 7871 / 7872. Spot-check that HTML renders cleanly (no escaped tags).
2. Feature 7781 is now fully decomposed — E5 is ready for sprint planning. All 8 stories filed.
3. **Critical path for parallel work:** S1 unblocks S4 + S5. S2, S3, S7 can run in parallel from day one. S6 is the glue (blocked on S1–S5). S8 runs after S6. E5 implementation is gated on E3 (7818) + E4 stubs landing first (already filed, largely complete per prior bulk runs).
4. S1's Supabase client coordination with E6-S1 (7823): confirm 7823's final PR before cutting S1's branch so the `src/lib/supabase/server.ts` module is owned exactly once.
5. S7 (Offervana companion PR) coordination with platform owner (Noah) — can ship before, during, or after the Next.js work. Once merged, flip `OFFERVANA_LEAD_SOURCE_STRICT=true` on deployed envs to move from the transitional fallback to strict 13/14 emission.
6. Suggested next skill: `/zoo-core-create-architecture` for E7 (AZ compliance / anti-broker disclosure) or E8 (launch readiness), whichever is next on the critical path. E5 → E6 → E7 → E8 is the plan-project sequencing.
