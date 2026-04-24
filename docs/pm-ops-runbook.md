# PM Ops Runbook

Operational procedures for the E6 PM service (`team_members` roster, `submissions` lifecycle, `assign_next_pm` RPC, notification log, Sentry alerts).

## 0. Scope + contracts

- **Supabase project:** shared project used by E5 (idempotency), E6 (PM service + seller data), E9 (AI agent), E10 (auth). Region `us-west-2`.
- **Tables owned by this runbook:** `team_members`, `profiles`, `submissions`, `submission_offers`, `assignment_events`, `notification_log`.
- **RPC owned:** `public.assign_next_pm(p_submission_id uuid)` — returns `(assignment_kind, team_member_id, pm_first_name, pm_photo_url)`.
- **Error signals:** `E6_NO_ACTIVE_PMS` (SQLSTATE P0001), `E6_SUBMISSION_NOT_FOUND` (SQLSTATE P0002).
- **Log breadcrumbs (orchestrator):** `[e6.assign].start`, `[e6.assign].ok`, `[e6.assign].failed`.
- **Sentry event names (alert contract):** `pm_assignment_failed` (critical on `no_active_pms`, else error), `pm_email_failed` (error).

## 1. Local dev reset

`supabase db reset` applies all migrations in order, runs `supabase/seed.sql`, and leaves the DB in a known state:

- Three placeholder `team_members` rows (Jordan / Morgan / Taylor, `.placeholder@sellyourhousefree.com` emails, `role={pm}`, `coverage_regions={all}`, no phone/photo).
- No `auth.users`, no `profiles`, no `submissions` — those are created by submit flow.

Run once after schema changes:
```
supabase db reset
```

The seed uses `on conflict (email) do nothing` so re-running is idempotent.

## 2. Verifying the RPC

Use `supabase/verify.sql` (reference-only SQL, never executed by CI). Paste into Supabase Studio SQL Editor or psql connected with the service-role.

Four snippets:
1. **Fresh assignment** — proves happy path and `assignment_kind='fresh'`.
2. **Idempotent re-call** — proves same `p_submission_id` returns same PM, no double-increment.
3. **Three-way round-robin fairness** — proves sequential submissions cycle all three placeholders.
4. **E6_NO_ACTIVE_PMS** — deactivates all and confirms SQLSTATE P0001 raise.

Run cleanup block at end of `verify.sql` when finished.

## 3. Add / disable / reassign a team_member

**Add a new team member:**
```sql
insert into public.team_members
  (first_name, last_name, email, phone, photo_url, bio, active, role, coverage_regions)
values
  ('Pat', 'Example', 'pat@sellyourhousefree.com',
   '+15555551234', '/pm/pat.jpg', 'Senior Project Manager.',
   true, array['pm']::text[], array['all']::text[]);
```

**Disable (keep row, stop new assignments):**
```sql
update public.team_members set active = false where email = 'pat@sellyourhousefree.com';
```

**Reassign an in-flight submission** (team member is leaving, or workload balancing):
```sql
-- 1. Find the submission
select id, submission_id, referral_code, pm_user_id, status
  from public.submissions
  where referral_code = 'REF-GOES-HERE';

-- 2. Update assignment + write audit trail in one transaction
begin;
  update public.submissions
     set pm_user_id = (select id from public.team_members where email = 'new.person@sellyourhousefree.com'),
         updated_at = now()
   where referral_code = 'REF-GOES-HERE';

  insert into public.assignment_events (submission_id, team_member_id, kind, reason)
  select id, pm_user_id, 'reassigned', 'manual: original PM unavailable'
    from public.submissions where referral_code = 'REF-GOES-HERE';
commit;
```

**Unassign** (rare — triage queue):
```sql
begin;
  update public.submissions set pm_user_id = null, status = 'new' where referral_code = 'REF';
  insert into public.assignment_events (submission_id, team_member_id, kind, reason)
    select id, null, 'unassigned', 'triage: needs senior review' from public.submissions where referral_code = 'REF';
commit;
```

## 4. Seller-account lifecycle

E6 creates `auth.users` + `profiles` for every seller at submit time (service-role). E10 ships the passwordless auth UI.

**Locate a seller by email:**
```sql
select p.id, p.full_name, p.email, p.phone, p.created_at, p.tcpa_accepted_at
  from public.profiles p
  where lower(p.email) = lower('seller@example.com');
```

**Re-send magic link** (seller lost their first login email):

```js
// Requires service-role client; run from a one-off script or Supabase Studio SQL with the admin function
const { data, error } = await supabase.auth.admin.generateLink({
  type: 'magiclink',
  email: 'seller@example.com',
  options: { redirectTo: 'https://sellyourhousefree.com/portal' },
});
```

**GDPR-style delete (seller requests data removal):**
```sql
begin;
  -- Cascade chain: auth.users → profiles → submissions → submission_offers + assignment_events + notification_log
  -- (profiles.id references auth.users(id) on delete cascade; submissions.seller_id references profiles(id)
  -- on delete restrict, so delete submissions first, then delete auth user.)
  delete from public.submissions where seller_id = (
    select id from public.profiles where lower(email) = lower('seller@example.com')
  );
  delete from auth.users where id = (
    select id from public.profiles where lower(email) = lower('seller@example.com')
  );
  -- Cascade from auth.users → profiles handles the profile row automatically.
commit;
```

Note: Offervana keeps its own copy of the seller record — a local delete does NOT propagate upstream. File a parallel request with Offervana ops if the seller's ask is cross-system.

## 5. Reading a submission for troubleshooting

Canonical submission-join SQL:
```sql
select
  s.submission_id, s.referral_code, s.status, s.assigned_at,
  p.full_name as seller_name, p.email as seller_email,
  tm.first_name as pm_first_name, tm.email as pm_email,
  s.address_line1 || ', ' || s.city || ', ' || s.state || ' ' || s.zip as property,
  array_agg(distinct so.path) as offer_paths,
  (select count(*) from public.notification_log nl where nl.submission_id = s.id) as email_attempts
from public.submissions s
left join public.profiles p on p.id = s.seller_id
left join public.team_members tm on tm.id = s.pm_user_id
left join public.submission_offers so on so.submission_id = s.id
where s.referral_code = 'REF-GOES-HERE'
group by s.id, s.submission_id, s.referral_code, s.status, s.assigned_at,
         p.full_name, p.email, tm.first_name, tm.email,
         s.address_line1, s.city, s.state, s.zip;
```

Look at the assignment history:
```sql
select kind, reason, created_at, (select email from public.team_members where id = team_member_id)
  from public.assignment_events
  where submission_id = (select id from public.submissions where referral_code = 'REF')
  order by created_at asc;
```

Look at email delivery:
```sql
select attempt, recipient_type, status, provider_message_id, error_reason, created_at
  from public.notification_log
  where submission_id = (select id from public.submissions where referral_code = 'REF')
  order by created_at asc;
```

## 6. Outage response

### Supabase down

`[e6.assign].failed reason=db_error` or `reason=timeout` flood in logs / Sentry.

1. Check Supabase status page (status.supabase.com).
2. Users can still submit — the Offervana POST completes + the `offervana_idempotency` row is written. The PM assignment fails, the seller lands on `/portal/setup` with a `<FallbackMessage />`.
3. Once Supabase recovers, manually process stuck submissions:
```sql
-- Find submissions that never got assigned (seller submitted but orchestrator failed)
select oi.submission_id, oi.referral_code, oi.created_at
  from public.offervana_idempotency oi
  left join public.submissions s on s.submission_id = oi.submission_id
  where s.id is null
    and oi.created_at > now() - interval '24 hours';
```
For each, trigger the orchestrator manually by re-firing the submit action (or ops-only script — TBD post-launch).

### Resend down

`pm_email_failed` Sentry events flood. Assignment rows still commit — only email is degraded.

1. Check resend.com/status.
2. `notification_log` captures every failed attempt with sanitized error.
3. Once Resend recovers, optionally batch-resend via a one-off script (defer to ops if/when it happens).

### Offervana down

E5's concern — E6 never receives a successful result, never runs. See `docs/ai-agent-policy.md` + E5's runbook.

## 7. Sentry alert rules

Configure in Sentry dashboard → Project `sell-house-for-free` → Alerts → Create Alert Rule:

### Rule: `pm_assignment_failed` — CRITICAL

- **Trigger:** event.message contains `pm_assignment_failed` AND `severity == critical`.
- **Throttle:** 1 alert per minute per fingerprint.
- **Route:** PagerDuty (on-call engineer).
- **Rationale:** `critical` severity only fires on `reason=no_active_pms` — the entire PM pool is empty or inactive. Every minute of this state is a silently-lost lead.

### Rule: `pm_assignment_failed` — ERROR

- **Trigger:** event.message contains `pm_assignment_failed` AND `severity == error`.
- **Throttle:** 5 alerts per 5 minutes per fingerprint.
- **Route:** Slack `#launch-alerts`.
- **Rationale:** covers timeout, db_error, profile_failed, submission_failed, unexpected. Ops should notice during business hours but doesn't warrant paging.

### Rule: `pm_email_failed`

- **Trigger:** event.message contains `pm_email_failed`.
- **Throttle:** 5 alerts per minute per fingerprint.
- **Route:** Slack `#launch-alerts`.
- **Rationale:** email degradation doesn't block the seller redirect. Ops reviews daily; spiky patterns (e.g., Resend account suspended) warrant follow-up.

### Synthetic alert test

Once rules are live, fire a test event from preview env:
```js
// One-off tsx script or paste into a Vercel function
import * as Sentry from '@sentry/nextjs';
Sentry.captureMessage('pm_assignment_failed — synthetic test', { level: 'fatal' });
Sentry.captureMessage('pm_email_failed — synthetic test', { level: 'error' });
```

Verify PagerDuty + Slack both received the synthetic events. Silence them once confirmed.

**Note (2026-04-24):** the repo currently emits Sentry events via a stubbed `captureException` in `src/lib/pm-service/observability.ts` — structured JSON to `console.error`, not the real Sentry SDK. E8 swaps this for `Sentry.captureException` with the SAME event names + severity mapping. Alert rules above can be drafted now; they activate when E8 wires the SDK.

## 8. Launch checklist (go / no-go)

Before flipping prod env to live:

- [ ] Supabase prod project created + migrations applied (`supabase db push`)
- [ ] Prod roster migration applied (see section 9)
- [ ] Real PM photos uploaded to `public/pm/*.jpg` (≤ 100KB, ≤ 200×200)
- [ ] `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_ANON_KEY` set in Vercel prod
- [ ] `RESEND_API_KEY` set in Vercel prod (prod-scoped API key)
- [ ] Resend sending domain verified (DKIM + DMARC green)
- [ ] `EMAIL_FROM` + `EMAIL_REPLY_TO` set in Vercel prod
- [ ] E7 TCPA footer copy landed in `src/lib/email/templates/disclaimer.tsx` (replaces `TODO(E7)` stub)
- [ ] E8 Sentry project wired (`@sentry/nextjs` installed, `observability.ts` swapped)
- [ ] Sentry alert rules created per section 7
- [ ] Synthetic alert test fired + acknowledged
- [ ] One manual end-to-end test submit in prod with a test seller address → verify submission row + emails deliver
- [ ] PM ack: real PMs confirm they've received the test notification in their inbox

## 9. Production roster migration

Template migration at `supabase/migrations/YYYYMMDDHHMMSS_seed_prod_roster.sql.example` (example only — real migration is authored locally and applied via `supabase db push` without committing PII to the repo):

```sql
-- Production roster — DELETE placeholders, INSERT real team_members.
-- Applied manually via `supabase db push`; not auto-applied by CI.
-- Do NOT commit the populated version to git — real names + emails + phones
-- are private directory data.

begin;

-- Remove placeholder seed rows. Safe because assign_next_pm's pm_pool
-- index excludes active=false + rolls forward; any submissions already
-- assigned to a placeholder were manually reassigned before launch.
delete from public.team_members where email like '%.placeholder@%';

insert into public.team_members
  (first_name, last_name, email, phone, photo_url, bio, active, role, coverage_regions)
values
  -- ('Pat', 'Example', 'pat@sellyourhousefree.com', '+1...', '/pm/pat.jpg', '...', true, array['pm']::text[], array['all']::text[]),
  -- ('Chris', 'Example', 'chris@sellyourhousefree.com', '+1...', '/pm/chris.jpg', '...', true, array['pm']::text[], array['all']::text[]),
  ;

commit;
```

### Cutover procedure

1. Author a concrete migration file locally at `supabase/migrations/YYYYMMDDHHMMSS_seed_prod_roster.sql` using real data.
2. **Do not commit it** (or commit a redacted version with `XXX` placeholders — team call).
3. Run `supabase db push` against the prod project (prompts for password).
4. Verify: `select count(*) from public.team_members where active=true and 'pm' = any(role);` returns the expected count.
5. Soak-test: submit one real test seller; verify they get assigned to a real PM (not a placeholder).
6. Delete the local migration file if it wasn't committed.

## 10. What we didn't automate

- No automated PM rotation based on workload — pure round-robin.
- No area-aware routing — `coverage_regions` captured but not used by `assign_next_pm` (MVP).
- No SMS / Slack PM pings — email only.
- No dead-letter queue for failed emails — `notification_log.status='failed'` rows are the manual-processing ledger.
- No seller-facing status polling — the `/portal/setup` page is the one snapshot they see; no "where is my PM" re-queries.
- No SLA tracking dashboard — ops eyeballs `notification_log` + `assignment_events` timestamps.
- No automated rotation of Supabase / Resend keys — manual per S8 launch checklist.

All of the above are deliberate MVP scope cuts. Revisit post-launch based on real volume + ops pain.

## 11. Ownership

- **Code owner (E6):** the engineer who landed the PR (see `git log` on the relevant files).
- **Runtime owner:** whoever is on call (rotation TBD).
- **Copy / legal:** E2 marketing for tone, E7 for compliance wording.
- **Infrastructure (Supabase, Resend, Sentry accounts):** Zoodealio infra team.
- **PM roster changes (adding / disabling / reassigning):** ops team via SQL snippets in section 3.
