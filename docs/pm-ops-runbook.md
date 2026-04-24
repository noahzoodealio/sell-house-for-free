# PM Ops Runbook

Operational procedures for the E6 PM service (`team_members` roster, `submissions` lifecycle, `assign_next_pm` RPC, notification log). E6-S2 lands the seed/verify sections; E6-S8 expands this with Sentry alert responses, prod roster management, seller-account lifecycle, and the full launch checklist.

## Scope

- **Supabase project:** shared project used by E5 (idempotency), E6 (PM service + seller data), E9 (AI agent), E10 (auth). Region `us-west-2`.
- **Tables owned by this runbook:** `team_members`, `profiles`, `submissions`, `submission_offers`, `assignment_events`, `notification_log`.
- **RPC owned:** `public.assign_next_pm(p_submission_id uuid)`.
- **Error signals:** `E6_NO_ACTIVE_PMS` (P0001), `E6_SUBMISSION_NOT_FOUND` (P0002).
- **Sentry event names (S3 emits, S8 alerts on):** `pm_assignment_failed`, `pm_email_failed`.

## Local dev reset

When resetting the local DB (`supabase db reset`), the following happens in order:

1. Schema re-applied from `supabase/migrations/*.sql` (all five E6-S1 files plus siblings).
2. `supabase/seed.sql` re-loaded — three placeholder `team_members` (`jordan`/`morgan`/`taylor`.placeholder@sellyourhousefree.com) with `coverage_regions='{all}'`, `role='{pm}'`, no phone/photo.
3. `auth.users` + `public.profiles` + `public.submissions` remain empty.

The placeholder seed uses `on conflict (email) do nothing` so running the seed twice in a row is harmless.

## Verifying the RPC

After any schema change to `assign_next_pm` (or the tables it reads), run the four smoke snippets in `supabase/verify.sql`:

1. **Fresh assignment** — proves the happy path (insert auth.users + profile + submission, call RPC, confirm `assignment_kind='fresh'` and submission is marked assigned).
2. **Idempotent re-call** — proves a second call with the same submission UUID returns the same PM (`assignment_kind='existing'`) without double-incrementing counters.
3. **Three-way round-robin fairness** — proves three sequential submissions get three distinct placeholders (seeded ordering by `last_assigned_at NULLS FIRST`).
4. **E6_NO_ACTIVE_PMS** — proves that when no team_members are `active=true AND 'pm'=any(role)`, the RPC raises SQLSTATE `P0001` with message `E6_NO_ACTIVE_PMS`.

Snippets 3 and 4 mutate the placeholder state — run the cleanup block at the bottom of `verify.sql` when finished.

## Seed file rules

`supabase/seed.sql` runs on every `supabase db reset`. It **must not** contain:

- Real PII (real names, emails, phones, photo paths).
- Real team_members roster. Production roster is written in a separate, hand-curated migration (E6-S8) that deletes placeholders first.
- Any `auth.users` rows — the seed runs against a fresh auth-schema that seller flows will populate at submit time.
- Any `submissions` or `profiles` rows — same reason.

Placeholder emails must use the `.placeholder@sellyourhousefree.com` suffix so they're easy to grep + delete before production.

## Do-not-do list

- **Do not apply migrations from CI.** `supabase db push` is a manual step on a developer laptop (local/preview) or on-call engineer laptop (production). The halt-for-confirmation discipline is load-bearing — see the architecture doc §5 decision "migrations are not auto-applied."
- **Do not commit `SUPABASE_SERVICE_ROLE_KEY` anywhere.** The key lives in Vercel env (all environments) and `.env.local` (dev). `.env.example` documents the name only.
- **Do not prefix any Supabase env var with `NEXT_PUBLIC_`.** No code in this repo talks to Supabase from the browser.

## Placeholder → production roster cutover

E6-S8 ships a migration file along the lines of `supabase/migrations/YYYYMMDDHHMMSS_seed_prod_roster.sql` that:

1. `delete from public.team_members where email like '%.placeholder@%';`
2. `insert into public.team_members ...` with the real roster — names, emails, phones, photo paths in `public/pm/*.jpg`, correct `role` badges, correct `coverage_regions`.

The production migration is conditionally committed per PII sensitivity call (the S8 runbook covers the uncommitted path). Both paths keep placeholder rows out of prod.

## Expansion points

E6-S8 expands this runbook with:

- Adding, disabling, re-assigning a team_member.
- Re-sending a magic link for a locked-out seller.
- Reading `submissions` + `assignment_events` + `notification_log` to troubleshoot a specific submission.
- Canonical submission-join SQL.
- Outage response (Supabase outage, Resend outage, Offervana outage).
- Sentry alert-rule definitions + PagerDuty/Slack routing.
- Launch checklist.

Until S8 lands, this file is the minimum-viable runbook for local dev + preview.
