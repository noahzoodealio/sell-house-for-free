-- reference only; never executed by CI
--
-- E6-S2 (ADO 7825): assign_next_pm RPC smoke snippets.
--
-- Paste these into Supabase Studio SQL Editor or psql (connected with
-- service-role) after `supabase db reset` (local) or `supabase db push`
-- (remote). Nothing in this file runs automatically — it is a human-
-- executed verification checklist for the S1 schema + S2 seed + S1 RPC.
--
-- Prerequisites:
--   1. Migrations 20260424170000..20260424170400 applied.
--   2. supabase/seed.sql loaded (three placeholder team_members exist).
--   3. At least one profiles + submissions row to call the RPC against.
--
-- Each snippet below is self-contained. Run them in order on a fresh DB
-- to validate the full contract.

-- ─── Snippet 1 — First assignment (fresh) ────────────────────────────
-- Creates a fake auth.users row, profile, and submission, then calls
-- the RPC. Expected: assignment_kind='fresh', pm_first_name in
-- {Jordan, Morgan, Taylor}, submissions.pm_user_id populated,
-- submissions.status='assigned', one assignment_events row written.

do $$
declare
  v_user_id uuid := gen_random_uuid();
  v_submission_uuid uuid;
  v_result record;
begin
  insert into auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, aud, role)
  values (v_user_id, 'verify1@example.test', '', null, now(), now(), 'authenticated', 'authenticated')
  on conflict (id) do nothing;

  insert into public.profiles (id, full_name, email)
  values (v_user_id, 'Verify One', 'verify1@example.test');

  insert into public.submissions
    (submission_id, seller_id, referral_code, address_line1, city, state, zip)
  values
    ('verify-sub-001', v_user_id, 'VERIFY-REF-001',
     '100 Verify Way', 'Phoenix', 'AZ', '85001')
  returning id into v_submission_uuid;

  select * into v_result from public.assign_next_pm(v_submission_uuid);
  raise notice 'Snippet 1: assignment_kind=%, pm=% (%)',
    v_result.assignment_kind, v_result.pm_first_name, v_result.team_member_id;
end $$;

-- ─── Snippet 2 — Idempotent re-call ──────────────────────────────────
-- Calls the RPC a second time against the same submission. Expected:
-- assignment_kind='existing', same team_member_id as snippet 1,
-- team_members.total_assignments NOT incremented a second time.

do $$
declare
  v_submission_uuid uuid;
  v_result1 record;
  v_result2 record;
begin
  select id into v_submission_uuid
  from public.submissions
  where submission_id = 'verify-sub-001';

  select * into v_result1 from public.assign_next_pm(v_submission_uuid);
  select * into v_result2 from public.assign_next_pm(v_submission_uuid);

  raise notice 'Snippet 2: first=%, second=%, same_tm=%',
    v_result1.assignment_kind, v_result2.assignment_kind,
    (v_result1.team_member_id = v_result2.team_member_id);
end $$;

-- ─── Snippet 3 — Three-way round-robin fairness ──────────────────────
-- Three fresh submissions in sequence. Expected: three distinct
-- team_member_ids (one per placeholder), in ascending last_assigned_at
-- order as the seed tie-breaker.

do $$
declare
  v_user_id uuid;
  v_submission_uuid uuid;
  v_result record;
  v_ids uuid[] := array[]::uuid[];
  i int;
begin
  for i in 2..4 loop
    v_user_id := gen_random_uuid();
    insert into auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, aud, role)
    values (v_user_id, format('verify%s@example.test', i), '', null, now(), now(), 'authenticated', 'authenticated')
    on conflict (id) do nothing;

    insert into public.profiles (id, full_name, email)
    values (v_user_id, format('Verify %s', i), format('verify%s@example.test', i));

    insert into public.submissions
      (submission_id, seller_id, referral_code, address_line1, city, state, zip)
    values
      (format('verify-sub-%s', lpad(i::text, 3, '0')), v_user_id,
       format('VERIFY-REF-%s', lpad(i::text, 3, '0')),
       format('%s00 Verify Way', i), 'Phoenix', 'AZ', '85001')
    returning id into v_submission_uuid;

    select * into v_result from public.assign_next_pm(v_submission_uuid);
    v_ids := array_append(v_ids, v_result.team_member_id);
    raise notice 'Snippet 3 iter %: pm=% (%)', i, v_result.pm_first_name, v_result.team_member_id;
  end loop;

  raise notice 'Snippet 3: distinct_count=% (expected 3)',
    cardinality((select array_agg(distinct x) from unnest(v_ids) x));
end $$;

-- ─── Snippet 4 — E6_NO_ACTIVE_PMS path ───────────────────────────────
-- Deactivates every placeholder, creates a fresh submission, and calls
-- the RPC. Expected: raise exception with SQLSTATE 'P0001' and message
-- 'E6_NO_ACTIVE_PMS'. After the test, reactivate the roster.

do $$
declare
  v_user_id uuid := gen_random_uuid();
  v_submission_uuid uuid;
  v_caught text;
begin
  update public.team_members set active = false;

  insert into auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, aud, role)
  values (v_user_id, 'verify-nopm@example.test', '', null, now(), now(), 'authenticated', 'authenticated')
  on conflict (id) do nothing;

  insert into public.profiles (id, full_name, email)
  values (v_user_id, 'Verify NoPM', 'verify-nopm@example.test');

  insert into public.submissions
    (submission_id, seller_id, referral_code, address_line1, city, state, zip)
  values
    ('verify-sub-nopm', v_user_id, 'VERIFY-REF-NOPM',
     '999 Empty Way', 'Phoenix', 'AZ', '85001')
  returning id into v_submission_uuid;

  begin
    perform public.assign_next_pm(v_submission_uuid);
    raise notice 'Snippet 4: UNEXPECTED — no exception raised';
  exception when sqlstate 'P0001' then
    get stacked diagnostics v_caught = message_text;
    raise notice 'Snippet 4: caught sqlstate P0001 — message=%', v_caught;
  end;

  update public.team_members set active = true;
end $$;

-- ─── Cleanup (optional — run to reset the local DB) ──────────────────
-- delete from public.submissions where submission_id like 'verify-sub-%';
-- delete from public.profiles where email like 'verify%@example.test';
-- delete from auth.users where email like 'verify%@example.test';
-- update public.team_members set last_assigned_at = null, total_assignments = 0;
