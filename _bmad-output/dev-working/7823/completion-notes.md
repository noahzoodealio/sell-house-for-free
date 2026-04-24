# E6-S1 Completion Notes

- **Branch:** `feature/e6-s1-supabase-schema-and-rpc-7823`
- **Commit:** `2127005`
- **Migrations applied:** 5 files, shared Supabase project `vzgjdfcdgpidmzglfjmr`, 2026-04-24
- **ADO:** 7823 — Supabase provisioning + schema + assign_next_pm RPC

## What shipped

5 migrations creating the E6 data model:

1. `team_members` — unified TC/PM/Agent roster with `role text[]` badges + round-robin counters.
2. `profiles` — mirror of `auth.users` with TCPA/terms consent columns. FK from `auth.users(id)` on delete cascade.
3. `submissions` + `submission_offers` + `assignment_events` — canonical seller-submission record, per-path offer detail, assignment audit trail.
4. `notification_log` — per-attempt outbound email log (FK to `submissions`, RLS-protected).
5. `assign_next_pm` PL/pgSQL RPC — idempotent round-robin assignment with `FOR UPDATE SKIP LOCKED` and `E6_NO_ACTIVE_PMS` P0001 signal.

Plus:
- `src/lib/supabase/schema.ts` extended with 6 row types, 4 enums, `AssignNextPmResult`, and `Database['public']['Functions']`.
- `.env.example` documents the Supabase + E6 email env surface (8 new vars).
- `supabase/seed.sql` banner stub (S2 fills).

## Follow-ups for downstream stories

- **S2:** populate `supabase/seed.sql` with three placeholder `team_members`; write RPC smoke snippets in `supabase/verify.sql`.
- **S3:** orchestrator `assignPmAndNotify` upserts `submissions` + `submission_offers` + creates `auth.users` + `profiles` rows before calling `assign_next_pm` RPC.
- **S3/S4:** Sentry event names `pm_assignment_failed` + `pm_email_failed` locked as S8 alert contract.
- **S6:** `getAssignmentByReferralCode(ref)` reads `submissions.referral_code` → joins `team_members` for the PM preview.
- **S8:** prod roster migration will `delete from team_members where email like '%.placeholder@%'` before `insert`; writes to `team_members`, not `pm_members`.

## Known non-blockers

- Pre-existing lint errors (10) + warnings (17) in portal components + dead-letter utilities. Not introduced by S1. Will stay as-is unless E6 or later epic touches them.
- Uncommitted `vercel` package dep in `package.json` + lock file (from a prior exploratory session) — left untouched, not part of S1.

## Files touched

```
supabase/migrations/20260424170000_e6_s1_team_members.sql       | new
supabase/migrations/20260424170100_e6_s1_profiles.sql           | new
supabase/migrations/20260424170200_e6_s1_submissions.sql        | new
supabase/migrations/20260424170300_e6_s1_notification_log.sql   | new
supabase/migrations/20260424170400_e6_s1_assign_next_pm.sql     | new
supabase/seed.sql                                                | new (banner stub)
src/lib/supabase/schema.ts                                       | extended
.env.example                                                     | extended (Supabase + Email blocks)
```

8 files, +607 lines, 0 deletions.
