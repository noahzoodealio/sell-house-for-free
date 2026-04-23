---
epic-id: 7781
epic-title: "E5 — Offervana Host-Admin Submission"
parent-epic: 7776
target-service: sell-house-for-free
branch: feature/e5-offervana-host-admin-7781
base: origin/main (140c589)
isolation: single-branch (no worktree; no per-story branches)
autopilot-status: planning
started-at: 2026-04-23
---

# Epic 7781 Execution Plan — E5 Offervana Host-Admin Submission

## Invocation deltas (from user on activation)

1. **Single branch for all 8 stories.** Autopilot does NOT open per-story branches or PRs. One feature branch off `origin/main`, one eventual PR at epic close.
2. **`ZOODEALIO_API_KEY`** is the auth env var name (already present in `.env.local`).
3. **Base URL hardcoded** to `https://sellfreeai.zoodealio.net` in source. Do NOT introduce an `OFFERVANA_BASE_URL` env var. The epic description mentions `OFFERVANA_BASE_URL`; this plan overrides.

These three deltas override the matching portions of the ADO epic description. All other architectural decisions from the Epic body stand.

## Contract verification (done before plan writeup)

- Pulled `https://sellfreeai.zoodealio.net/swagger/v1/swagger.json` — confirmed it is the same Offervana ABP backend.
- `POST /api/services/app/CustomerAppServiceV2/CreateHostAdminCustomer` exists, accepts `NewClientDto`, returns `System.ValueTuple<int, long, string>` (`item1`/`item2`/`item3`), `[AllowAnonymous]`.
- Existing E3 Server Action body (`src/app/get-started/actions.ts:68-94`) is a stub that logs draft + redirects with `submissionId` as `ref`. E5 replaces only the happy-path body; signature + `SubmitState` shape stay stable.
- `.env.local` already contains: `ZOODEALIO_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`, plus Postgres direct-connect vars. No gaps block development.
- `ATTOM_*` + `MLS_*` already wired from E4.

## Architecture locked (from Epic 7781 description, §Decisions locked)

Keeping verbatim except where the invocation deltas override:

- Server Action preserved from E3 — replace only happy-path body; `SubmitState` + Zod call unchanged.
- `runtime = 'nodejs'` + `maxDuration = 15` on `actions.ts`. Supabase SDK requires Node.
- `after()` for PM-submissions write + audit log after `redirect()`.
- Native `fetch` with manual retry (3 attempts, ~0/1s/4s + jitter, ≤10s wall clock, `AbortSignal.timeout(5000)` per attempt, `cache: 'no-store'`).
- Response normalized from `{item1, item2, item3}` → `{customerId, userId, referralCode}` in `client.ts`.
- BFF-owned idempotency in Supabase `offervana_idempotency` with 24h TTL.
- Dead-letter to Supabase `offervana_submission_failures` + one-line structured log. Queue = table at MVP scale.
- Email-conflict path: `?ref=pending`, dead-letter with `reason='email-conflict'`, idempotency row with `referral_code='pending'`, honest "we already have you on file" copy.
- Permanent failure path: `?ref=unassigned`, never an error screen.
- `isSellerSource=true`, `submitterRole=0`, `sendPrelims=true` hard-coded.
- Pure mapper (`mapper.ts`) — 100% unit-testable, no I/O.
- `server-only` guard on `src/lib/supabase/server.ts`.
- PascalCase payload on the wire (ABP's Newtonsoft binder accepts both; PascalCase matches `NewClientDto.cs` for easy code review).
- No circuit breaker in MVP.

## Auth approach

`CreateHostAdminCustomer` is `[AllowAnonymous]` so the API key is not strictly required by that single endpoint. However per the user directive we pass `Authorization: Bearer ${ZOODEALIO_API_KEY}` on every Offervana call anyway — future-proof + matches the convention for ABP/OpenIdDict when non-anonymous endpoints get added later. `Abp.TenantId` header is omitted (host-admin tenant = null/0 for anonymous). If S8 UAT smoke fails on tenant resolution we revisit in S8 and document.

## Story topology

8 child User Stories (7854, 7861, 7865, 7868, 7869, 7870, 7871, 7872). Execution order from Epic §7 with one amendment noted in S7:

| # | Order | ADO ID | Story | Size | Depends on | Risk | Notes |
|---|------|--------|-------|------|-----------|------|-------|
| 1 | S1 | 7854 | Supabase client + env + migrations | S | — | Low | Installs `@supabase/supabase-js`, `server-only`. Two tables + enum. |
| 2 | S2 | 7861 | Offervana HTTP client + retry + timeout + classifier | M | S1 | **High** | First network IO; hardcoded base URL; `Authorization: Bearer ${ZOODEALIO_API_KEY}`. |
| 3 | S3 | 7865 | `SellerFormDraft → NewClientDto` pure mapper | M | S1 | **High** | Golden fixtures vs Angular reference `homeowner-flow.component.ts:969–998`. Standalone — S2/S3 could parallel but we serialize. |
| 4 | S4 | 7868 | BFF idempotency store | S | S1 | Low | 24h TTL, concurrent-replay test. |
| 5 | S5 | 7869 | Dead-letter + structured log | S | S1 | Low | Log-contract test. |
| 6 | S6 | 7870 | Wire Server Action (glue) | M | S2, S3, S4, S5 | **High** | The integration point. `runtime='nodejs'`, `maxDuration=15`, `after()`, `redirect()`. |
| 7 | S7 | 7871 | `Offervana_SaaS` companion PR — `CustomerLeadSource = 13, 14` | S | — | n/a | **Dropped entirely** — model already changed upstream; we hit an outer API with an enterprise key. See below. |
| 8 | S8 | 7872 | UAT smoke + chaos tests | M | S6 | Med | Points at `sellfreeai.zoodealio.net`. |

### S7 handling

**Dropped entirely.** Per user clarification on activation: the Offervana_SaaS data model has already been restructured outside this autopilot, and we're calling an outer API fronted by an enterprise API key (`ZOODEALIO_API_KEY`). No `Offervana_SaaS` changes are needed from this epic — no enum additions, no switch-arm edits, no companion PR.

Consequence for the mapper (S3): no `sellYourHouseFreePath` fallback flag logic. The mapper emits the `CustomerLeadSource` values the architecture documents (13 for the listing/cash path, 14 for the renovation path) directly. If UAT surfaces a mismatch, S8 catches it and we adapt.

Autopilot will add an ADO comment on 7871 explaining the drop, then close it out of scope.

### Parallelism note

The autopilot is a single executor. S2 + S3 + S4 + S5 could parallelize in a team setting (all only depend on S1); we serialize them in the order above. Rationale: S2 has the most unknowns (actual header shape, error envelope) so running it next surfaces issues earliest.

## Strike counters

All stories start at strike-count = 0. 3-strike rule applies to the outer `zoo-core-code-review` loop per story. Inner `zoo-core-unit-testing` fix loop keeps its 3-iteration cap.

## Halt conditions

- Any story reaches 3 review strikes → halt, surface to Noah.
- Any story generates EF/Postgres migrations that haven't been applied → halt for migration-apply confirmation. **Expected in S1** (two new Supabase tables + enum). Autopilot will pause after S1 authors the SQL and ask Noah to apply via Supabase dashboard / `supabase db push` before proceeding to S2.
- Any new env var beyond what `.env.local` already has → halt. Current list is sufficient (`ZOODEALIO_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` already present).

## Out of scope (do not scope-creep)

- Offervana_SaaS C# changes of any kind → already handled outside this autopilot; S7 dropped (see above).
- PM name + assignment algorithm on `/thanks` → E6.
- PM email / SMS notification → E6.
- Rate-limiting / reCAPTCHA / Turnstile → E8.
- Sentry / external log vendor → E8.
- Circuit breaker for Offervana outages → documented follow-up.
- Paging / alerting on dead-letter queue depth → E6 / E8.

## Branch plan

- Branch: `feature/e5-offervana-host-admin-7781` cut from `origin/main` (commit `140c589`).
- Commits: one per story close-out (conventional-commit style matching previous epic history), plus any intra-story fix commits from unit-testing / code-review loops.
- PR: opened at epic close after S8 passes (or at halt with progress to date).
- No per-story branches, no per-story PRs.

## ADO status policy (as autopilot progresses)

- Epic 7781 on S1 start: `New` → `In Development`.
- Each story on its dev-story start: `New` → `In Development`.
- Each story on close-out: → `Ready For Testing` (matches project's custom workflow per user memory on ADO states).
- Epic on S8 close-out: → `Ready For Testing`.
- S7 is left `New` with a comment explaining deferral.

## Sidecar pointers

- `epic-plan.md` (this file) — source of truth, survives compaction.
- `per-story/{story-id}/sidecar.md` — dev-story manages each.
- `summary-report.md` — written at epic close.

---

**Approved 2026-04-23 — S7 drop confirmed by user; autopilot beginning.**
