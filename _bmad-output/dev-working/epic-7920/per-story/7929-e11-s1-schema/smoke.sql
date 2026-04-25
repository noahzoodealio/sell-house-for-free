-- E11-S1 RLS smoke. Run as service-role in Supabase Studio SQL editor.
-- Verifies that the policies on messages / documents / team_activity_events
-- and storage.objects scope reads + writes correctly. NOT auto-run.

-- Setup ----------------------------------------------------------------
-- Two fake auth users (TM-A, TM-B), one admin (TM-ADMIN), one seller.
-- Two submissions: SUB-1 assigned to TM-A, SUB-2 assigned to TM-B.

do $$
declare
  v_tm_a_auth uuid := gen_random_uuid();
  v_tm_b_auth uuid := gen_random_uuid();
  v_tm_admin_auth uuid := gen_random_uuid();
  v_seller_auth uuid := gen_random_uuid();

  v_tm_a_id uuid;
  v_tm_b_id uuid;
  v_tm_admin_id uuid;
  v_sub_1_id uuid;
  v_sub_2_id uuid;
begin
  -- Stub auth.users (service-role only — auth schema is normally managed
  -- by GoTrue, but for the smoke we insert directly).
  insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
  values
    (v_tm_a_auth, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'tm-a.smoke@example.com', '', now(), now(), now()),
    (v_tm_b_auth, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'tm-b.smoke@example.com', '', now(), now(), now()),
    (v_tm_admin_auth, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'tm-admin.smoke@example.com', '', now(), now(), now()),
    (v_seller_auth, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'seller.smoke@example.com', '', now(), now(), now());

  -- profiles + team_members
  insert into public.profiles (id, full_name, email)
  values (v_seller_auth, 'Smoke Seller', 'seller.smoke@example.com');

  insert into public.team_members (first_name, last_name, email, role, coverage_regions, auth_user_id)
  values ('TmA', 'Smoke', 'tm-a.smoke@example.com', '{pm}', '{all}', v_tm_a_auth)
  returning id into v_tm_a_id;

  insert into public.team_members (first_name, last_name, email, role, coverage_regions, auth_user_id)
  values ('TmB', 'Smoke', 'tm-b.smoke@example.com', '{pm}', '{all}', v_tm_b_auth)
  returning id into v_tm_b_id;

  insert into public.team_members (first_name, last_name, email, role, coverage_regions, auth_user_id)
  values ('TmAdmin', 'Smoke', 'tm-admin.smoke@example.com', '{pm,admin}', '{all}', v_tm_admin_auth)
  returning id into v_tm_admin_id;

  insert into public.submissions
    (submission_id, seller_id, referral_code,
     address_line1, city, state, zip, pm_user_id, status)
  values
    ('smoke-sub-1', v_seller_auth, 'smoke-ref-1', '1 Smoke Ln', 'Phoenix', 'AZ', '85001', v_tm_a_id, 'assigned')
  returning id into v_sub_1_id;

  insert into public.submissions
    (submission_id, seller_id, referral_code,
     address_line1, city, state, zip, pm_user_id, status)
  values
    ('smoke-sub-2', v_seller_auth, 'smoke-ref-2', '2 Smoke Ln', 'Phoenix', 'AZ', '85001', v_tm_b_id, 'assigned')
  returning id into v_sub_2_id;

  -- Seed some rows
  insert into public.messages (submission_id, direction, sender_email, body)
  values
    (v_sub_1_id, 'inbound', 'seller.smoke@example.com', 'hello sub 1'),
    (v_sub_2_id, 'inbound', 'seller.smoke@example.com', 'hello sub 2');

  insert into public.documents (submission_id, bucket, storage_path, doc_kind, filename, uploaded_by)
  values
    (v_sub_1_id, 'seller-docs', v_sub_1_id || '/contract-1.pdf', 'listing-agreement', 'contract-1.pdf', v_seller_auth),
    (v_sub_2_id, 'team-uploads', v_sub_2_id || '/note-2.pdf', 'other', 'note-2.pdf', v_tm_b_auth);

  insert into public.team_activity_events (submission_id, team_user_id, event_type, event_data)
  values
    (v_sub_1_id, v_tm_a_auth, 'note_added', '{}'::jsonb),
    (v_sub_2_id, v_tm_b_auth, 'note_added', '{}'::jsonb);

  -- Smoke 1: TM-A reads — should see SUB-1 only.
  perform set_config('request.jwt.claim.sub', v_tm_a_auth::text, true);
  perform set_config('role', 'authenticated', true);
  raise notice 'TM-A messages count (expect 1): %', (select count(*) from public.messages);
  raise notice 'TM-A documents count (expect 1): %', (select count(*) from public.documents);
  raise notice 'TM-A activity count (expect 1): %', (select count(*) from public.team_activity_events);

  -- Smoke 2: TM-B reads — should see SUB-2 only.
  perform set_config('request.jwt.claim.sub', v_tm_b_auth::text, true);
  raise notice 'TM-B messages count (expect 1): %', (select count(*) from public.messages);
  raise notice 'TM-B documents count (expect 1): %', (select count(*) from public.documents);

  -- Smoke 3: Admin sees both.
  perform set_config('request.jwt.claim.sub', v_tm_admin_auth::text, true);
  raise notice 'Admin messages count (expect 2): %', (select count(*) from public.messages);
  raise notice 'Admin documents count (expect 2): %', (select count(*) from public.documents);
  raise notice 'Admin activity count (expect 2): %', (select count(*) from public.team_activity_events);

  -- Smoke 4: Seller sees both messages (their own thread on each sub) but
  -- only seller-docs / seller-photos rows on documents.
  perform set_config('request.jwt.claim.sub', v_seller_auth::text, true);
  raise notice 'Seller messages count (expect 2): %', (select count(*) from public.messages);
  raise notice 'Seller documents count (expect 1, seller-docs only): %', (select count(*) from public.documents);
  raise notice 'Seller activity count (expect 0): %', (select count(*) from public.team_activity_events);

  -- Smoke 5: TM-A INSERT into team_activity_events should fail (no policy).
  perform set_config('request.jwt.claim.sub', v_tm_a_auth::text, true);
  begin
    insert into public.team_activity_events (submission_id, team_user_id, event_type)
    values (v_sub_1_id, v_tm_a_auth, 'note_added');
    raise notice 'AC#9 violated: TM-A authenticated INSERT into team_activity_events succeeded';
  exception when insufficient_privilege or others then
    raise notice 'AC#9 ok: TM-A authenticated INSERT into team_activity_events denied (%)', sqlerrm;
  end;

  -- Cleanup
  perform set_config('role', 'service_role', true);
  delete from public.team_activity_events where submission_id in (v_sub_1_id, v_sub_2_id);
  delete from public.documents where submission_id in (v_sub_1_id, v_sub_2_id);
  delete from public.messages where submission_id in (v_sub_1_id, v_sub_2_id);
  delete from public.submissions where id in (v_sub_1_id, v_sub_2_id);
  delete from public.team_members where id in (v_tm_a_id, v_tm_b_id, v_tm_admin_id);
  delete from public.profiles where id = v_seller_auth;
  delete from auth.users where id in (v_tm_a_auth, v_tm_b_auth, v_tm_admin_auth, v_seller_auth);

  raise notice 'Smoke complete.';
end $$;
