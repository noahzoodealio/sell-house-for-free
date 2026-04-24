---
work-item-id: 7823
work-item-type: user-story
parent-feature: 7782
parent-feature-url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7782
grandparent-epic: 7776
repo: sell-house-for-free
branch: feature/e6-s1-supabase-schema-and-rpc-7823
base-branch: main
started-at: 2026-04-24T00:00:00Z
file-groups:
  - { name: env-surface,    files: [".env.example"],                              commit: deferred }
  - { name: migrations,     files: ["supabase/migrations/20260424170000_e6_s1_team_members.sql","supabase/migrations/20260424170100_e6_s1_profiles.sql","supabase/migrations/20260424170200_e6_s1_submissions.sql","supabase/migrations/20260424170300_e6_s1_notification_log.sql","supabase/migrations/20260424170400_e6_s1_assign_next_pm.sql"], commit: deferred }
  - { name: typescript-types, files: ["src/lib/supabase/schema.ts"],             commit: deferred }
  - { name: seed-stub,      files: ["supabase/seed.sql"],                         commit: deferred }
last-completed-step: 5-halted
commit-sha: 2127005
halt-points:
  - supabase-db-push
---

# E6-S1 — Supabase schema + assign_next_pm RPC

Pre-flight deltas from filed story body:
- Supabase project already exists (E5 + E9 migrations live) — S1 adds migrations to it, not a new project.
- `getSupabaseAdmin()` already exported from `src/lib/supabase/server.ts` — no new client file.
- `@supabase/supabase-js` + `server-only` already installed — no package additions in S1.
- Migration filename convention: `YYYYMMDDHHMMSS_{slug}.sql` (per E5 + E9) — using `20260424170000` series.
- `.env.example` has no Supabase block — adding.

## Scope (revised 2026-04-23)

Six tables + one RPC, across 5 migrations.

| # | File | Objects |
|---|------|---------|
| 1 | `e6_s1_team_members.sql` | `team_members` (roster) + indexes + RLS |
| 2 | `e6_s1_profiles.sql` | `profiles` (mirrors `auth.users`) + consent columns + RLS |
| 3 | `e6_s1_submissions.sql` | `submissions` + `submission_offers` + `assignment_events` + enums + RLS |
| 4 | `e6_s1_notification_log.sql` | `notification_log` + RLS |
| 5 | `e6_s1_assign_next_pm.sql` | `assign_next_pm` PL/pgSQL function |

Plus: `.env.example` updates, `src/lib/supabase/schema.ts` type extensions, `supabase/seed.sql` stub (S2 fills).

## Halt at end

After files land + tsc passes: commit the branch and halt for user to run `supabase db push` against the shared project. Autopilot will not execute migrations.
