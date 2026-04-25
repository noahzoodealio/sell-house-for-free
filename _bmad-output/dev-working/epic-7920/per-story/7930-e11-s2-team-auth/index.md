---
work-item-id: 7930
work-item-type: User Story
work-item-code: E11-S2
parent-feature: 7920
parent-epic: 7776
repo: sell-house-for-free
branch: feature/e11-team-member-portal
last-completed-step: 5
file-groups:
  - migration
  - team-auth-lib
  - login-route-actions-form
  - callback-route
  - layout-middleware-stub
started-at: 2026-04-24T22:55:00Z
---

# E11-S2 — Team magic-link auth sidecar

## Files added

- `supabase/migrations/20260424191000_e11_s2_team_activity_login.sql` — relax `submission_id` NOT NULL + extend `event_type` check to include `login` + `login_rejected_inactive`.
- `src/lib/team/auth.ts` — roster lookups, `linkTeamMemberToAuthUser`, `recordTeamLoginEvent`.
- `src/app/team/login/page.tsx` — Server Component + error param surface.
- `src/app/team/login/actions.ts` — `sendTeamLoginLink` server action; rate limit, anti-enumeration, `signInWithOtp` with team callback.
- `src/components/team/login/LoginForm.tsx` — client island.
- `src/app/team/auth/callback/route.ts` — code/token-hash exchange, `is_active` re-check, `auth_user_id` backfill, `team_activity_events` audit.
- `src/app/team/auth/expired/page.tsx` — error page.
- `src/app/team/layout.tsx` — noindex metadata for `/team/*`.
- `src/app/team/page.tsx` — auth-confirmation stub (E11-S3 replaces).

## Files modified

- `middleware.ts` — matcher extended to `/team/:path*`; `/team/login` + `/team/auth/*` exempt; anonymous `/team/*` redirected to `/team/login` with `?redirect=` preserved.

## Engineering decisions

### EDR-1: Server action returns `{ ok: true, status: 'sent' }` for non-roster emails

AC #2 requires anti-enumeration. The action ledgers a rate-limit attempt for both roster + non-roster sends so an attacker can't probe N emails for free. Timing floor (1500ms) matches `/portal/login`.

### EDR-2: `signInWithOtp` uses `shouldCreateUser: true` for team

The seller portal sets `shouldCreateUser: false` because an existing seller `auth.users` row is created server-side at submit time (E6-S3). Team members onboarded via the S9 admin roster will have a `team_members` row but **no** `auth.users` row until first login. We let Supabase create the auth user on first magic-link send, then backfill `team_members.auth_user_id` in the callback. This keeps S9 simple — admins create rosters, not auth users.

Anti-enumeration is preserved because we **only call signInWithOtp when the email is on the roster**. Off-roster emails get the same "sent" response without any Supabase call, so no auth.users row gets accidentally created for a probe.

### EDR-3: First-login backfill runs in the callback, not the server action

The action knows the email; the callback knows the freshly-minted `auth.users.id`. Doing the backfill in the callback is the cleanest junction — `linkTeamMemberToAuthUser(email, userId)` runs once, idempotent under `auth_user_id IS NULL`.

### EDR-4: `submission_id` made nullable; login is the only NULL-eligible event_type

S1's `team_activity_events.submission_id` was NOT NULL. Login events have no submission. Relaxing the constraint is cleaner than introducing a second `team_session_events` table — same audit shape, same query for "what did this team member do today".

The migration also adds `'login'` and `'login_rejected_inactive'` to the `event_type` check constraint; everything else stays in S1's set. Application-layer rule (documented in the column comment): non-login events must carry a `submission_id`.

### EDR-5: Middleware extension reused the existing handler

The `/portal` and `/team` guards are identical except for the login redirect target. One handler, branched on `path.startsWith("/team")`. Avoids duplicating the SSR Supabase round-trip in two near-identical files.

### EDR-6: `/team/page.tsx` is a stub for now

E11-S3 owns the work-queue home. The stub page renders "Signed in as <email>" + a placeholder so the auth flow round-trips end-to-end. S3 overwrites the file. Marking it explicitly here so the reviewer doesn't think it's the final implementation.

## Halt expected

After commit: pause for user to apply `20260424191000_e11_s2_team_activity_login.sql` to dev Supabase.

## Manual E2E plan (AC #12)

After migration applies + dev server runs:

1. Insert a real auth-user-linked team_members row in dev Supabase (or use S9 admin roster when it lands; for now manual SQL):
   ```sql
   insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
   values (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'noah@zoodealio.com', '', now(), now(), now())
   returning id;
   -- copy the returned id
   insert into team_members (first_name, last_name, email, role, coverage_regions, auth_user_id)
   values ('Noah', 'Test', 'noah@zoodealio.com', '{pm,admin}', '{all}', '<copied-id>');
   ```
   *Or* skip the manual auth.users step and hit `/team/login` first — Supabase will mint the auth.users row, then backfill `team_members.auth_user_id` on the callback (provided the team_members row exists with matching email).
2. Hit `/team/login`, enter `noah@zoodealio.com`, click link in email.
3. Confirm landing on `/team` with "Signed in as noah@zoodealio.com".
4. In dev Supabase, set `team_members.active = false` for that row.
5. Refresh `/team`. Expected: redirect to `/team/login?error=inactive` with the inactive copy.
6. Inspect `team_activity_events`: one `login` row + one `login_rejected_inactive` row, both with `team_user_id = <auth.users.id>`, `submission_id = null`.

## Open follow-ups

- Unit tests (AC #10, #11) — deferred to `zoo-core-unit-testing` invocation post-S10.
- Sentry event names for team auth (`team_login_succeeded`, `team_login_failed`) — currently routed through the seller-named events; S10 updates the AuthEventInput taxonomy when it wires team-specific telemetry.

## References

- Story: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7930
- E10-S2 callback pattern: `src/app/portal/auth/callback/route.ts`
- E10-S3 form pattern: `src/components/portal/login/LoginForm.tsx`
- E10-S5 middleware pattern: original `middleware.ts`
- E10-S2 rate limiter: `src/lib/auth/resend-rate-limit.ts`
