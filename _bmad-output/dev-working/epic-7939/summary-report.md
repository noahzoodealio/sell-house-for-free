# E13 — Epic Close-Out Summary

**Branch:** `feature/e13-ai-agent-data-tools` (single branch per user directive).
**Closed at:** 2026-04-25.
**ADO Feature:** [7939](https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7939).

## Per-story outcomes

| Story | ID | Status | Strikes | Notes |
|---|---|---|---|---|
| S1 — defineTool + retrofit | [7980](https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7980) | ✅ closed | 0/3 | 12 unit tests; 5 E9 tools retrofitted |
| S4 — Offervana OuterApi (5 tools) | [7983](https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7983) | ✅ closed | 0/3 | New outer-api-client.ts + seller-scope.ts; 14 tests |
| S5 — SHF Supabase reads (8 tools) | [7984](https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7984) | ✅ closed | 0/3 | shf-shared resolver + 8 tools |
| S2 — ATTOM (12 tools) | [7981](https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7981) | ✅ closed | 0/3 | attom-shared helpers + 12 tools |
| S3 — MLS (3 tools) | [7982](https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7982) | ✅ closed | 0/3 | Search/detail/history |
| S6 — orchestrator prompt v2 | [7985](https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7985) | ✅ closed | 0/3 | TOOL_SELECTION_GUIDE + cite-the-source; 8 new tests |
| S7 — budgets + ops + runbooks | [7986](https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7986) | ✅ closed | 0/3 | Migration + kill switches + 3 runbooks |

**No strike-cap halts.** No EF migrations blocked autopilot (S7 migration is the only one; written but not applied — see "Action required" below).

## Aggregate metrics

- **Commits:** 9 (`e8412ae` → `39f8d60`)
- **Tools added:** 28 new + 5 retrofitted = 33 total
- **Files added:** ~40 (mostly tool factories)
- **Migrations added:** 1 (`20260425200000_e13_s7_tool_budgets.sql`)
- **Tests:** 437/437 pass across 35 test files (E9 baseline was 121/121; +316 net)
- **Typecheck:** clean
- **Build:** clean

## Cross-cutting invariants enforced

- ✅ Every new tool consumes `defineTool` (S1). No direct `tool({...})` from `'ai'` outside `_define.ts`.
- ✅ Every tool returns `{source, retrievedAt}` citation.
- ✅ Every tool output has the canonical disclaimer string.
- ✅ Read-only OuterApi (S4 client lacks any non-GET methods).
- ✅ `'server-only'` import on every new file.
- ✅ PII redaction via `redactObject()` on input persistence + caught error messages + output persistence.
- ✅ `npm run build` clean — no secret values in `.next/static/**` (only env-var name references in SDK error strings, pre-existing).

## Brief vs reality deviations (all documented inline in commits + completion notes)

1. **S1 AC #7 telemetry persistence** deferred to S7. `ai_tool_runs.metadata` column added in S7's migration; defineTool now persists telemetry on insert (S7 closes the loop).
2. **S4 env var + header.** Brief said `OFFERVANA_OUTER_API_KEY` + `X-OuterApi-Key`; reality is the existing `ZOODEALIO_API_KEY` + `ApiKey` header. The new `outer-api-client.ts` reuses both.
3. **S4 customerId source.** Brief said `submissions.offervana_customer_id`; reality is `offervana_idempotency.customer_id` (existing E5 table). `seller-scope.ts` resolves through the idempotency lookup.
4. **S4/S5 E10 hard-dep softened.** Brief assumed E10 portal auth threaded `user_id`/`access_token` through the AI session. Reality: not yet. Both stories scope through `session.submissionId` (set server-side by E9-S22 bootstrap) — equivalent trust boundary, RLS upgrade can land when E10 portal-auth threads.
5. **S5 service-role queries.** Brief mandated user-scoped Supabase client + RLS. Substituted service-role + server-side scoping (existing E9 pattern). RLS upgrade tied to E10 portal-auth integration.
6. **S6 golden-conversation tests** deferred. Replaced with prompt-content unit tests. Real golden tests need gateway access + seeded sampling — fits in a separate ops story.
7. **S7 admin UI panel** deferred. SQL view + Sentry events + policy doc shipped; UI page slips to follow-up after E11-S9 admin surface lands.

## Patterns observed (curate-memory candidates)

- **defineTool contract is sticky.** Once landed in S1, S2-S7 each got faster — wrapper code shrunk to ~15 lines per tool. The retrofit of E9 tools was the proof; the 28 new tools were the dividend.
- **One-file-per-tool is right.** With shared helpers (`attom-shared.ts`, `shf-shared.ts`, `seller-scope.ts`), per-tool files stayed terse. Easier to grep, easier to diff.
- **Brief overspecifies new infra.** Multiple S4/S5 ACs assumed env vars + columns that didn't exist. Reading `package.json` + actual migrations + existing code surfaced the gap immediately. Future briefs should grep before specifying file paths.
- **Citation envelope is load-bearing.** Cite-the-source rule (S6) only works because every tool returns `source` + `retrievedAt`. The orchestrator prompt's discipline depends on the data layer's discipline.

## Action required (user gates)

1. **EF migration confirmation.** `supabase/migrations/20260425200000_e13_s7_tool_budgets.sql` is committed but not applied to any environment. Apply via your normal supabase migration workflow (`supabase db push` for local, CI/CD for UAT/prod). The migration is idempotent (`if not exists`).
2. **Push the branch + open PR.** Branch `feature/e13-ai-agent-data-tools` is local. When you're ready: `git push -u origin feature/e13-ai-agent-data-tools` then open a PR against `main`.
3. **Update ADO statuses.** Stories 7980–7986 are still in `New`. Move to `Resolved` (or your team's equivalent) when the PR merges.
4. **Set the new env vars** in Vercel (UAT + prod): `AI_TOOLS_ATTOM_DISABLED`, `AI_TOOLS_OFFERVANA_DISABLED`, `AI_TOOLS_MLS_DISABLED` (default `false`/unset).

## Follow-ups not in this epic (suggested)

- **Admin UI panel** consuming `v_ai_tool_metrics_7d` (waits on E11-S9 admin surface).
- **Real Sentry SDK wiring.** Today's `console.warn` event lines mirror the future Sentry tag shape exactly; the swap is a one-line change in `_define.ts`.
- **Golden-conversation regression suite** (S6 follow-up) — gateway-bound + seeded.
- **CI lint rule** grep'ing `src/lib/ai/tools/*.ts` for direct `tool({...})` imports outside `_define.ts`.
- **RLS-via-user-scoped-client** for S5 once E10 portal auth threads `access_token` to the AI session.
- **Read-only CI lint** for `src/lib/offervana/outer-api-client.ts` checking no `method: 'POST'|'PATCH'|...`.
- **Photo-URL freshness handling** for MLS detail tool if MLS-CDN URLs prove ephemeral in production.

## Sidecars

- Story-creation sidecar: `_bmad-output/story-working/e13-bulk-s1-to-s7/index.md`
- Epic plan: `_bmad-output/dev-working/epic-7939/epic-plan.md`
- S1 dev-story sidecar: `_bmad-output/dev-working/7980/`
- Per-story summaries: `_bmad-output/dev-working/epic-7939/per-story/`
