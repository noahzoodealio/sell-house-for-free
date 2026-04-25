---
work-item-id: 7929
work-item-type: User Story
work-item-code: E11-S1
parent-feature: 7920
parent-epic: 7776
repo: sell-house-for-free
branch: feature/e11-team-member-portal
last-completed-step: 4
file-groups:
  - schema-migration
  - down-migration
  - runbook
started-at: 2026-04-24T22:38:00Z
---

# E11-S1 — Schema sidecar

## Engineering decisions

### EDR-1: `team_members.auth_user_id` column instead of changing `team_members.id` PK

The AC text literally reads `submissions.pm_user_id = auth.uid()` and `team_members.id = auth.uid()`, which presumes `team_members.id` references `auth.users(id)` (1:1 with profiles).

**Existing E6-S1 state:** `team_members.id uuid primary key default gen_random_uuid()` — independent identity, not linked to `auth.users`. `supabase/seed.sql` inserts three `.placeholder@sellyourhousefree.com` PMs whose ids are not real auth users.

**Options considered:**

1. Change `team_members.id` to FK `auth.users(id)`. Breaks the seed (placeholder rows have no matching auth.users); breaks the round-trip on `supabase db reset`. Would require also removing/restructuring placeholder seed.
2. Drop placeholders, repoint seed to first create `auth.users` rows then matching `team_members`. Complex; the placeholder PMs are intentionally non-authenticating (they exist to exercise `assign_next_pm` in local dev without real users).
3. **(chosen) Additive:** add `team_members.auth_user_id uuid unique references auth.users(id) on delete cascade`, nullable. Real team members get it set on first magic-link login (S2). Placeholder seed leaves it NULL — placeholders cannot authenticate anyway. Helper `is_submission_assignee` joins through `auth_user_id`.

**Trade-off accepted:** the literal AC text says `team_members.id = auth.uid()`; we satisfy the AC's intent (team-member-scoped RLS) via the join while preserving E6's seed + `assign_next_pm` contract. Helper text is logically equivalent.

### EDR-2: Helper SECURITY DEFINER signature

`is_submission_assignee(sub_id uuid) returns boolean` — joins `submissions → team_members` filtering on `team_members.auth_user_id = auth.uid()` AND `team_members.active = true`. The active-check matters: a deactivated team member's old session shouldn't continue reading rows — they hit the policy and get filtered out the moment they're toggled off in S9. Inactive admin users likewise lose admin scope.

### EDR-3: `documents.uploaded_by` trigger guard, not just FK

The AC's `uploaded_by uuid references auth.users(id)` allows NULL. We add a default of `auth.uid()` so server-side inserts that forget to set it pick up the right user automatically; service-role inserts can still pass NULL explicitly for system-generated docs (future).

### EDR-4: `team_activity_events` is service-role-only INSERT

AC #9 says "INSERT only from service-role (server actions write, never direct from client — enforced by no-policy-for-authenticated INSERT)". Implementation: enable RLS, add SELECT policy for assignees, **omit any INSERT/UPDATE/DELETE policy**. Authenticated requests' INSERTs are denied by default; service-role bypass writes the audit row.

## File-groups (planned)

- **schema-migration** — `supabase/migrations/20260424190000_e11_s1_team_portal_schema.sql`
- **down-migration** — `supabase/migrations/20260424190001_e11_s1_team_portal_schema_down.sql.example` (reference-only, like the E6-S8 prod roster)
- **runbook** — append section to `docs/pm-ops-runbook.md`

## Halt expected

After schema-migration commit: pause for user to apply migration to dev Supabase before continuing to subsequent stories.

## References

- Story: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7929
- E6-S1 schema: `supabase/migrations/20260424170000_e6_s1_team_members.sql` + `..170200_e6_s1_submissions.sql`
- E10-S4 RLS pattern: `supabase/migrations/20260424180100_e10_s4_seller_rls_policies.sql`
- E9-S1 storage bucket pattern: `supabase/migrations/20260423190100_e9_s1_ai_storage_bucket.sql`
