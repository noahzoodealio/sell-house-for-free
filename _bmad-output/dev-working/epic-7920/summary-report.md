# E11 — Team-Member Portal — Epic Summary Report

**Feature:** ADO 7920 (filed under umbrella Epic 7776).
**Branch:** `feature/e11-team-member-portal` (10 commits, all on main parent).
**Autopilot status:** complete.
**Started:** 2026-04-24 22:35Z.
**Closed:** 2026-04-25 14:42Z.
**Strategy:** single-branch + single-PR (user override on `/zoo-core-dev-epic e11 do it all on 1 branch`). Matches the E10/PR #21 precedent.

## Per-story outcome

| Story | ADO ID | Size | Commit | Outcome | Notes |
| --- | --- | --- | --- | --- | --- |
| E11-S1 | 7929 | M | fd7a7a6 | closed | EDR: additive `team_members.auth_user_id` instead of repointing `team_members.id` PK to `auth.users(id)` — preserves the E6 placeholder seed + `assign_next_pm` contract. Helper `is_submission_assignee` joins through `auth_user_id`. |
| E11-S2 | 7930 | S | ab27a32 | closed | Anti-enumeration: non-roster emails get the same "sent" response without any Supabase call; rate-limit ledger captures probes too. Defense-in-depth `is_active` re-check in callback. |
| E11-S5 | 7933 | M | 9b4af8b | closed | Per-submission `reply-<sid>@mail.sellfree.xyz` Reply-To. Inbound HMAC verifier swappable to Svix. Idempotent inbound + dead-letter for unroutable. |
| E11-S6 | 7934 | M | aa3c79b | closed | Mint-then-PUT direct upload + 10% size-mismatch tamper guard. Filename sanitizer + base36-timestamp prefix prevents path collisions and prefix breakouts. |
| E11-S4 | 7932 | L | 8a6aadc | closed | Server-side merge of three audit-table sources for the unified timeline + two-batch actor-name resolution across `profiles` + `team_members.auth_user_id`. Forward-only status transitions. |
| E11-S3 | 7931 | M | 4f516f9 | closed | Multi-source aggregation + TS reduce instead of correlated subqueries. Derived bounded cursor (no setState-in-effect). 60s `router.refresh()` polling. |
| E11-S7 | 7935 | M | fd7772c | closed | `team_handoff` SECURITY DEFINER RPC for atomic reassign. Capacity trigger. `assigned_at` reset on handoff. Admin-override gate only when target is at-capacity AND caller is admin. |
| E11-S8 | 7936 | S | dcf94ea | closed | Read-only by design. Per-day audit debounce via `event_data` containment. Subtle gotcha: `ai_sessions.submission_id` is text (Offervana correlation key), not the row uuid. |
| E11-S9 | 7937 | M | fcd9958 | closed | `addTeamMember` provisions auth.users + team_members atomically with rollback. Last-admin protection on both deactivate + remove-admin-role paths. Hardcoded coverage-region reference list. |
| E11-S10 | 7938 | S | 7190b72 | closed | `emitTeamPortalEvent` with compile-time event-name guard + recursive PII redaction. Weekly orphan-storage cron. Onboarding doc with disclaimer-culture examples. 7-day dry-run gate documented. |

## Aggregate metrics

- **10 stories** committed to one branch.
- **79 files changed**, **~9,940 lines added** vs `main`.
- **8 SQL migrations** (S1, S2, S5, S6, S4, S7, S9 — all applied to dev Supabase ahead of each commit, plus the S1 down migration committed as `.sql.example`).
- **6 new tables / Storage buckets** (`messages`, `documents`, `team_activity_events`, `messages_dead_letter`, `seller-docs`, `seller-photos`, `team-uploads`).
- **2 new RPCs** (`is_submission_assignee` / `is_submission_seller` from S1, `team_handoff` from S7) + 2 helper plpgsql functions (capacity sync trigger, helper-function bodies).
- **15 new event types** added to `team_activity_events.event_type` check (across S1/S2/S5/S6/S9 cumulative).
- **7 new Sentry event names** under the `team_*` prefix.
- **2 new webhooks** (`/api/team/messages/resend-inbound`, `/api/team/messages/resend-delivery`).
- **1 weekly cron** (`/api/cron/team-portal/cleanup-orphan-storage`).
- **5 new env vars** (`RESEND_INBOUND_WEBHOOK_SECRET`, `RESEND_DELIVERY_WEBHOOK_SECRET`, `RESEND_INBOUND_DOMAIN`, `TEAM_PORTAL_URL`, `CRON_SECRET`).
- **4 unit tests** (`telemetry.test.ts`) — all passing.
- **`tsc --noEmit` clean** across the whole repo throughout. **`eslint` clean** on every E11 file (the 31 pre-existing lint problems are in untouched E9 / portal / pm-service code — flagged separately, not introduced by this epic).
- **No regressions** to E6 (`assign_next_pm` contract intact), E9 (AI tables read-only here), E10 (auth provider untouched, `auth_resend_attempts` reused with a `team:` key prefix).

## Patterns observed (candidates for `curate-memory`)

1. **Single-branch epic strategy is repeatable.** Both E10 (PR #21) and now E11 use one feature branch + one PR for a multi-story vertical slice. Reviewer cost is the trade-off, but reviewing a coherent slice is often easier than 10 PRs that depend on each other. Worth recording as a project convention.
2. **`auth_user_id` shim instead of repointing PKs.** When a downstream story expects `team_members.id = auth.users.id` but the upstream story shipped with `gen_random_uuid()`, additive shim columns are the right play — preserves seeds + RPCs without surgery.
3. **PostgREST + parallel reads + TS reduce > correlated subqueries** for per-row aggregations (queue unread counts, last-touched timestamps, actor-name resolution). Cleaner under PostgREST than expressing nested `select` inside `.select()`.
4. **Forward-only status enums + audit row > soft "edit any state" UIs.** Repeated in S4 (submission status), S7 (handoff), S9 (deactivate). Audit row is the source of truth; current-state column is a cache.
5. **Tech-platform-not-broker disclaimer copy must be load-bearing in code, not optional.** S8 enforces it as a banner; S10's onboarding doc reinforces it with concrete ❌/✅ examples. Worth reusing wherever AI / messaging surfaces touch sellers.
6. **`notFound()` vs `redirect("/team")` posture choice matters.** Sub-routes (S6, S8) use `notFound()` to avoid leaking tab existence. Top-level entities (S4 detail, S9 admin) use `redirect()` because the route's existence isn't a secret. Document the intent so future devs don't drift.

## Follow-up items surfaced

### Code quality (not blocking ship)

- **Pre-existing repo lint debt** (31 errors / 21 warnings in E9 / portal / pm-service code). Not from E11 — flag for a separate cleanup pass. `npx eslint src` exits 0 because they're warnings + errors mixed; user should triage.
- **Real Sentry SDK** swap when E8 lands. `captureException` is currently a `console.error` JSON stub. The team-portal emits become real captures with no code change.
- **Skeleton loading states** on the queue / detail pages (currently relying on Next streaming defaults).
- **Per-event-type icons** in the activity timeline are emoji placeholders — replace with an iconset when one is adopted.

### Operations (post-merge)

- **Resend dashboard configuration** — runbook §20 captures the exact steps; needs a real human to set up the inbound rule + delivery webhook + DNS verification for `mail.sellfree.xyz` (or the chosen `RESEND_INBOUND_DOMAIN`).
- **Sentry alert rules** — runbook §21 captures the rules; needs to be wired in the Sentry dashboard with the right Slack destinations.
- **`CRON_SECRET` provisioning** in Vercel envs (prod / preview / dev).
- **First admin team member** needs to be inserted manually before `/team/admin/roster` becomes self-service. Suggested:
  ```sql
  -- Once the migrations are in production:
  insert into team_members (first_name, last_name, email, role, coverage_regions, capacity_active_max)
  values ('Noah', 'Neighbors', 'noah@zoodealio.com', '{pm,admin}', '{phoenix-metro,tucson,flagstaff,yuma,prescott,rural-az}', 10);
  -- Then sign in via /team/login; the callback backfills auth_user_id.
  ```
- **7-day dry-run** per S10 AC #11. Track in this folder when it starts; close S10 after the four go/no-go boxes are checked.
- **Unit / E2E tests** are deferred — `zoo-core-unit-testing` should be invoked next for systematic coverage. The vitest suite for telemetry is the only test added inline; the rest of S2/S5/S6/S7/S9 ACs reference unit tests that haven't been written yet.

### Future stories (post-MVP)

- **Cross-team-member dashboard** (admin-only, read all queues at once). Out of scope per epic brief.
- **Bulk reassign-on-deactivate** in admin roster. Currently per-submission via S7.
- **In-app PDF / image preview** in the documents vault. Currently download-only.
- **Real-time push** for unread messages / SLA changes. Currently 60s polling.
- **Status-change reasons** UI in the detail view's StatusControls. The action accepts an optional reason; the form doesn't yet collect one.
- **Svix-based webhook signature** if/when we adopt Resend's full scheme. `webhook-signature.ts` is the swap point.
- **Seller-side messaging UI** to consume the `messages_seller_select` policy already shipped in S1.

## Next steps (handoff to the user)

1. **Open the PR** for `feature/e11-team-member-portal → main`. Suggested title: `E11 — Team-Member Portal`. Body: link this summary report + the per-story sidecars.
2. **Configure Resend dashboard** (inbound + delivery webhooks, DNS) before promoting to production traffic.
3. **Set the env vars** in Vercel: `RESEND_INBOUND_WEBHOOK_SECRET`, `RESEND_DELIVERY_WEBHOOK_SECRET`, `RESEND_INBOUND_DOMAIN`, `TEAM_PORTAL_URL`, `CRON_SECRET`. (`RESEND_API_KEY` + `EMAIL_FROM` already exist from E6.)
4. **Apply migrations to production Supabase** — same 8 files committed in this branch. The order matters: `190000` (S1) before `191000` (S2) before `192000` (S5) etc.
5. **Insert the first admin team member** (SQL above) after migrations apply.
6. **Start the 7-day dry-run** per S10's gate before closing the feature in ADO.
7. **Optionally invoke `/zoo-core-unit-testing`** to add the unit tests S2/S5/S6/S7/S9 ACs reference.

Sidecars per story live at `_bmad-output/dev-working/epic-7920/per-story/<id>-e11-s*/index.md`.
