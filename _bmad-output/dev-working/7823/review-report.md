# E6-S1 — Self-Review Report

Branch: `feature/e6-s1-supabase-schema-and-rpc-7823` @ `2127005`
Migrations applied to shared Supabase project `vzgjdfcdgpidmzglfjmr` on 2026-04-24.

## AC coverage

| AC | Evidence |
|----|----------|
| `pgcrypto` extension enabled | `20260424170000_e6_s1_team_members.sql:12` — `create extension if not exists pgcrypto;` |
| All 6 tables with columns/FKs/indexes as spec'd | 5 migration files; applied successfully (no SQL errors) |
| `submissions.referral_code` UNIQUE | `submissions.sql:57` — `referral_code text not null unique` |
| `submission_offers` UNIQUE `(submission_id, path)` | `submissions.sql:113` — `unique (submission_id, path)` |
| `team_members.role text[]` default `{pm}` (multi-badge) | `team_members.sql:28` — `role text[] not null default '{pm}'` |
| `assign_next_pm` idempotent on same submission | RPC `assign_next_pm:22-32` — early-return path when `v_submission.pm_user_id is not null` |
| `assign_next_pm` selects PM pool with `FOR UPDATE SKIP LOCKED` | RPC `:42-49` — `order by last_assigned_at nulls first, total_assignments asc, id limit 1 for update skip locked` |
| Raises `E6_NO_ACTIVE_PMS` SQLSTATE P0001 when none active | RPC `:51-53` — `raise exception 'E6_NO_ACTIVE_PMS' using errcode = 'P0001'` |
| Only `team_members` with `'pm' = any(role)` are eligible | RPC `:44` — `where active = true and 'pm' = any(role)` |
| RLS default-deny on all new tables | Every migration ends with `alter table ... enable row level security;` and NO policy `create` calls |
| `getSupabaseAdmin()` throws at first-call if env missing | Pre-existing in `src/lib/supabase/server.ts:10-19` — lazy env-guard throw |
| `import 'server-only'` guards server modules | Pre-existing first line of `server.ts`; S3/S4/S6 will apply same pattern to new modules |
| Migrations applied manually — CI does not auto-apply | No CI invocation of `supabase db push` anywhere in repo; `supabase/seed.sql` banner documents the rule |
| Seed file contains no real PII | `supabase/seed.sql` is a banner-only stub; S2 will add placeholder rows per the PII-forbidden rule |
| `.env.example` documents the new env surface | Appended Supabase + Email blocks at EOF — 8 vars |
| `auth.users` referential integrity | `profiles.id` references `auth.users(id) on delete cascade` |
| Consent columns captured | `profiles.tcpa_version`, `tcpa_accepted_at`, `terms_version`, `terms_accepted_at` |
| TypeScript types reflect schema | `src/lib/supabase/schema.ts` extended with 6 row types + 2 enums + `AssignNextPmResult` + `Database['public']['Functions']` |

## Deviations from filed story body

None that change correctness. Refinements:

1. **Idempotency key in RPC.** Story body says "idempotent on referral_code"; implementation keys on `submissions.pm_user_id is not null`. These are functionally equivalent because `submissions.referral_code` is UNIQUE (one submission row per referral code), so a re-call with the same `p_submission_id` always sees the prior assignment. The orchestrator (S3) is responsible for looking up the submission by `referral_code` or `submission_id` and passing the canonical `submissions.id` into the RPC.
2. **RPC signature simplified.** Architecture doc's original `assign_next_pm` took 12 params (seller PII + offervana IDs) for insert-into-`pm_assignments`. Post-revision, the `submissions` row is the canonical record and is upserted by the S3 orchestrator *before* the RPC call; the RPC only needs `p_submission_id`. Simpler + enforces orchestrator-owned data invariants (TCPA consent, offers insert, profile creation) rather than trying to cram them through PL/pgSQL.
3. **Migrations are 5, not 4.** Architecture doc listed 4 (`pm_roster`, `pm_assignments`, `notification_log`, `assign_next_pm_fn`). Post-revision, `pm_assignments` is split into `submissions` + `submission_offers` + `assignment_events` and `profiles` is added — natural re-grouping yields 5 migrations.
4. **Dangling-FK defense.** RPC adds a fallthrough when `pm_user_id` is set but the referenced `team_members` row no longer exists (race with `on delete set null`). Clears the stale pointer and proceeds to fresh assignment. Not in architecture doc but prevents a wedge.

## Validation (post-migration)

- `npx tsc --noEmit` — clean
- `npm run lint` — 10 errors + 17 warnings, **all pre-existing** (React hooks rules in portal components, Next.js anchor tags, `_name`/`_surname` unused vars in `dead-letter.ts`). Zero from S1 files.
- `npx vitest run src/lib/supabase/__tests__/storage.test.ts` — 7/7 passing
- `npm run build` — `next build` completes; 17/17 static pages generated. Schema.ts extension did not break any consumer.

## Not in S1 (deferred per story scope)

- `src/lib/pm-service/**` — S3
- `src/lib/email/**` — S4
- `actions.ts` wiring — S5
- `/portal/setup` rewrite — S6
- Placeholder team_members seed rows — S2
- Production roster migration — S8
- Seller-scoped RLS policies — E10
- Team-portal RLS policies — E11

## Verdict

**pass** — all ACs covered, no blocking lint/test/build regressions introduced by S1 files, schema live in shared Supabase project. Ready for PR + ADO Resolved.
