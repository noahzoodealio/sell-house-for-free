---
work-item-id: 7937
work-item-type: User Story
work-item-code: E11-S9
parent-feature: 7920
parent-epic: 7776
repo: sell-house-for-free
branch: feature/e11-team-member-portal
last-completed-step: 5
file-groups:
  - migration
  - lib
  - actions
  - components-page
started-at: 2026-04-25T01:30:00Z
---

# E11-S9 — Admin roster sidecar

## Files added / modified

- `supabase/migrations/20260424196000_e11_s9_admin_roster_events.sql` — adds 6 `team_member_*` event types + `team_members.last_login_at`.
- `src/lib/team/coverage-regions.ts` — hardcoded reference list of 6 AZ regions.
- `src/lib/team/roster.ts` — `listRoster`, `countActiveAdmins`, `VALID_ROLES` enum, RosterRow type.
- `src/app/team/admin/roster/actions.ts` — addTeamMember, setTeamMemberActive, updateRoles, updateCoverageRegions, updateCapacityMax. Each authorizes admin + audits + revalidates.
- `src/components/team/roster/AddMemberForm.tsx` — invite form (auth.users + team_members + magic-link OTP send).
- `src/components/team/roster/RosterRowControls.tsx` — per-row inline controls.
- `src/app/team/admin/roster/page.tsx` — admin-gated roster list with show/hide-inactive toggle.
- Modified: `src/lib/team/auth.ts` — `recordTeamLoginEvent` now also writes `team_members.last_login_at` on successful login (matches the new column added in this migration).

## Engineering decisions

### EDR-1: 404 for non-admins, not 403

Per AC #1. Tells curious sessions there's nothing to find at `/team/admin/roster` — keeps the existence of the admin surface non-discoverable.

### EDR-2: addTeamMember provisions auth.users first, then team_members, with rollback

The team_members.auth_user_id FK requires the auth.users row to exist first. If the team_members insert fails post-auth-create (rare — RLS or constraint mismatch), we delete the auth user via `admin.auth.admin.deleteUser(authUserId).catch(() => {})` to prevent a half-created user. Magic-link invite is sent at the end as best-effort; failure to send doesn't roll back the row.

### EDR-3: Last-admin protection

`countActiveAdmins` runs before deactivation OR role change that would remove admin from the last active admin. Returns `{ ok: false, reason: "last_admin" }` instead of allowing the unrecoverable state.

### EDR-4: Hardcoded coverage regions list

Per AC's reference-list rule. Free text breeds typos that pollute `assign_next_pm`. New region = code change + migration if backfill is needed.

### EDR-5: Per-row inline controls, not a giant editable table

Inline editable cells across many columns get unwieldy. Each row is a card with its own controls component. Each individual control writes immediately on change (debounce-free) — there are < 10 team members; the network overhead is trivial.

### EDR-6: `last_login_at` populated by the auth callback

Migration adds the column; `recordTeamLoginEvent` (called from `/team/auth/callback`) writes it on every successful `login` event. Already-deployed callbacks pick up the new write path on first login post-deploy.

### EDR-7: Deactivate revokes session via `auth.admin.signOut(userId)`

Best-effort. Even if it silently fails, S2's defense-in-depth `is_active` re-check on the callback bounds access-token windows to ~1h.

### EDR-8: Bulk reassign-on-deactivate is out of scope

AC #4 mentions an optional 'reassign their active queue now' feature; we leave that to a manual admin step (via S7 handoff per submission). MVP team is small enough to handle one-at-a-time.

## Halt expected

After commit: pause for user to apply `20260424196000_e11_s9_admin_roster_events.sql`.

## Manual smoke

1. Sign in as an admin team member.
2. Navigate to `/team/admin/roster`.
3. Click "Add team member", fill in email + name + roles + coverage + capacity, submit.
4. Verify a `team_activity_events` row with `event_type = 'team_member_added'` is written.
5. Verify the new member receives a magic-link email and can log in.
6. Toggle a role on an existing row — verify role_changed audit row + immediate effect.
7. Try removing `admin` from yourself when you're the only admin — expect "Cannot remove the last active admin." error.
8. Deactivate a non-admin row — verify `signOut` revokes their session + audit row written.

## References

- Story: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7937
- Supabase admin auth: https://supabase.com/docs/reference/javascript/auth-admin-createuser
- Coverage list: `src/lib/team/coverage-regions.ts`
