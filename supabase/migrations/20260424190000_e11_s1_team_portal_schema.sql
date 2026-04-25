-- E11-S1 (ADO 7929): team-portal schema additions.
-- Story:   https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7929
-- Feature: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7920
--
-- Three new tables (messages, documents, team_activity_events), three private
-- Storage buckets (seller-docs, seller-photos, team-uploads), and two helper
-- functions (is_submission_assignee, is_submission_seller) used by the RLS
-- policies on the new tables and on storage.objects.
--
-- Why a helper function. RLS policies that read another RLS-protected table
-- (e.g. submissions or team_members) recurse against their own policies and
-- either fail the planner or self-deny. SECURITY DEFINER lets the helper
-- read with the function-owner's rights, breaking that loop. Both helpers
-- are STABLE so the planner can hoist them.
--
-- Engineering decision: team_members.id is NOT changed to reference
-- auth.users(id). E6-S1 ships team_members.id as gen_random_uuid() and the
-- placeholder seed (three .placeholder@... rows) populates it with random
-- UUIDs that have no matching auth.users. Repointing the PK would break
-- `supabase db reset`. Instead we add team_members.auth_user_id as the link
-- to auth.users — set on first magic-link login in E11-S2 / via the admin
-- roster in E11-S9. is_submission_assignee joins through that column.

-- =====================================================================
-- 1. team_members.auth_user_id
-- =====================================================================

alter table public.team_members
  add column if not exists auth_user_id uuid unique
    references auth.users(id) on delete cascade;

create index if not exists team_members_auth_user_idx
  on public.team_members (auth_user_id);

comment on column public.team_members.auth_user_id is
  'The auth.users row this team member authenticates as. Backfilled on first /team/login by E11-S2; pre-seeded by E11-S9 admin roster invitations. Placeholder seed rows leave this NULL — they cannot authenticate.';

-- =====================================================================
-- 2. messages — two-way seller ↔ team thread
-- =====================================================================

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  direction text not null check (direction in ('inbound', 'outbound')),
  -- sender_user_id is auth.users.id; nullable because inbound Resend parse
  -- may receive an email from a sender we cannot match to a known user.
  sender_user_id uuid references auth.users(id) on delete set null,
  sender_email text,
  body text not null,
  body_html text,
  subject text,
  resend_message_id text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists messages_thread_idx
  on public.messages (submission_id, created_at desc);

create index if not exists messages_unread_idx
  on public.messages (submission_id)
  where read_at is null and direction = 'inbound';

alter table public.messages enable row level security;

comment on table public.messages is
  'Two-way seller ↔ team thread, one row per inbound or outbound message scoped to a submission. Outbound rows record the Resend message id so E11-S5 can reconcile delivery webhook events. read_at is meaningful only for inbound rows (seller → team unread state); outbound read state is the seller portal''s problem and not tracked here.';

-- =====================================================================
-- 3. documents — Storage catalog
-- =====================================================================

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  bucket text not null check (bucket in ('seller-docs', 'seller-photos', 'team-uploads')),
  storage_path text not null,
    -- Path within the bucket. Convention: '<submission_id>/<filename>'.
  doc_kind text not null check (doc_kind in (
    'listing-agreement',
    't47-disclosure',
    'hoa-disclosure',
    'title-commitment',
    'inspection-report',
    'offer-contract',
    'seller-photo',
    'other'
  )),
  filename text not null,
  content_type text,
  size_bytes bigint,
  status text not null default 'uploaded' check (status in (
    'uploaded',
    'awaiting-signature',
    'signed',
    'received',
    'archived'
  )),
  uploaded_by uuid references auth.users(id) on delete set null,
  uploaded_at timestamptz not null default now(),
  last_downloaded_at timestamptz
);

create index if not exists documents_submission_kind_idx
  on public.documents (submission_id, doc_kind);

create unique index if not exists documents_storage_path_idx
  on public.documents (bucket, storage_path);

alter table public.documents enable row level security;

comment on table public.documents is
  'Catalog of files in seller-docs / seller-photos / team-uploads. Single row per file (no version history in v1). uploaded_by points to the auth user who uploaded — seller for seller-docs/seller-photos uploads, team member for team-uploads. NULL is reserved for future system-generated documents (e.g. server-side template renders).';

-- =====================================================================
-- 4. team_activity_events — audit trail
-- =====================================================================

create table if not exists public.team_activity_events (
  id bigserial primary key,
  submission_id uuid not null references public.submissions(id) on delete cascade,
  team_user_id uuid not null references auth.users(id) on delete restrict,
  event_type text not null check (event_type in (
    'email_sent',
    'note_added',
    'handoff_initiated',
    'handoff_completed',
    'ai_context_viewed',
    'document_uploaded',
    'document_downloaded',
    'status_changed'
  )),
  event_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists team_activity_submission_idx
  on public.team_activity_events (submission_id, created_at desc);

create index if not exists team_activity_actor_idx
  on public.team_activity_events (team_user_id, created_at desc);

alter table public.team_activity_events enable row level security;

comment on table public.team_activity_events is
  'Append-only audit trail of every team-member action against a submission. INSERT is service-role only (no policy granted to authenticated) so server actions are the sole write path; this prevents tampered audit rows. team_user_id ON DELETE RESTRICT preserves the trail even if a team member is removed.';

-- =====================================================================
-- 5. Helper functions
-- =====================================================================

-- Returns TRUE if auth.uid() is the assigned team member for sub_id, or has
-- the 'admin' role badge. SECURITY DEFINER bypasses RLS on submissions and
-- team_members (avoiding policy recursion). STABLE for plan caching within
-- a statement.
create or replace function public.is_submission_assignee(sub_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.submissions s
    join public.team_members tm on tm.id = s.pm_user_id
    where s.id = sub_id
      and tm.auth_user_id = auth.uid()
      and tm.active = true
  )
  or exists (
    select 1
    from public.team_members
    where auth_user_id = auth.uid()
      and 'admin' = any(role)
      and active = true
  );
$$;

revoke all on function public.is_submission_assignee(uuid) from public;
grant execute on function public.is_submission_assignee(uuid) to authenticated, service_role;

comment on function public.is_submission_assignee is
  'TRUE if auth.uid() is the team member currently assigned to sub_id, or holds the admin badge. SECURITY DEFINER avoids RLS recursion when called inside a policy. Active-only — deactivated team members lose access immediately.';

-- Returns TRUE if auth.uid() is the seller on sub_id. Used by storage RLS
-- so a seller can read/write their own bucket paths.
create or replace function public.is_submission_seller(sub_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.submissions
    where id = sub_id
      and seller_id = auth.uid()
  );
$$;

revoke all on function public.is_submission_seller(uuid) from public;
grant execute on function public.is_submission_seller(uuid) to authenticated, service_role;

comment on function public.is_submission_seller is
  'TRUE if auth.uid() is the seller on sub_id. SECURITY DEFINER avoids RLS recursion. Used by storage RLS to grant seller access to seller-docs and seller-photos paths only.';

-- =====================================================================
-- 6. RLS policies — messages
-- =====================================================================

drop policy if exists messages_team_select on public.messages;
create policy messages_team_select
  on public.messages
  for select
  using (public.is_submission_assignee(submission_id));

drop policy if exists messages_team_insert on public.messages;
create policy messages_team_insert
  on public.messages
  for insert
  with check (public.is_submission_assignee(submission_id));

drop policy if exists messages_team_update on public.messages;
create policy messages_team_update
  on public.messages
  for update
  using (public.is_submission_assignee(submission_id))
  with check (public.is_submission_assignee(submission_id));

-- Sellers see their own thread (E11 does not wire a seller messaging UI but
-- the policy is ready for a future seller-side surface).
drop policy if exists messages_seller_select on public.messages;
create policy messages_seller_select
  on public.messages
  for select
  using (public.is_submission_seller(submission_id));

-- =====================================================================
-- 7. RLS policies — documents
-- =====================================================================

drop policy if exists documents_team_select on public.documents;
create policy documents_team_select
  on public.documents
  for select
  using (public.is_submission_assignee(submission_id));

drop policy if exists documents_team_insert on public.documents;
create policy documents_team_insert
  on public.documents
  for insert
  with check (public.is_submission_assignee(submission_id));

drop policy if exists documents_team_update on public.documents;
create policy documents_team_update
  on public.documents
  for update
  using (public.is_submission_assignee(submission_id))
  with check (public.is_submission_assignee(submission_id));

-- Sellers can SELECT/INSERT seller-docs + seller-photos rows for their own
-- submission only. They cannot touch team-uploads.
drop policy if exists documents_seller_select on public.documents;
create policy documents_seller_select
  on public.documents
  for select
  using (
    public.is_submission_seller(submission_id)
    and bucket in ('seller-docs', 'seller-photos')
  );

drop policy if exists documents_seller_insert on public.documents;
create policy documents_seller_insert
  on public.documents
  for insert
  with check (
    public.is_submission_seller(submission_id)
    and bucket in ('seller-docs', 'seller-photos')
  );

-- =====================================================================
-- 8. RLS policies — team_activity_events
-- =====================================================================

-- SELECT for the assignee + admin only. No INSERT/UPDATE/DELETE policies
-- for authenticated — server actions write via service-role (bypasses RLS),
-- which is the AC #9 contract: clients cannot forge audit rows.
drop policy if exists team_activity_select on public.team_activity_events;
create policy team_activity_select
  on public.team_activity_events
  for select
  using (public.is_submission_assignee(submission_id));

-- =====================================================================
-- 9. Storage buckets (private)
-- =====================================================================

insert into storage.buckets (id, name, public)
values
  ('seller-docs', 'seller-docs', false),
  ('seller-photos', 'seller-photos', false),
  ('team-uploads', 'team-uploads', false)
on conflict (id) do nothing;

-- =====================================================================
-- 10. RLS policies — storage.objects
-- =====================================================================
-- Each bucket: team assignee (or admin) gets full CRUD scoped to the
-- submission_id derived from the path's first segment. Sellers get scoped
-- SELECT/INSERT on seller-docs and seller-photos only. The path convention
-- is '<submission_id>/<filename>'; split_part(name, '/', 1) yields the id.

-- ---- seller-docs ----------------------------------------------------

drop policy if exists seller_docs_team_all on storage.objects;
create policy seller_docs_team_all
  on storage.objects
  for all
  to authenticated
  using (
    bucket_id = 'seller-docs'
    and public.is_submission_assignee((split_part(name, '/', 1))::uuid)
  )
  with check (
    bucket_id = 'seller-docs'
    and public.is_submission_assignee((split_part(name, '/', 1))::uuid)
  );

drop policy if exists seller_docs_seller_select on storage.objects;
create policy seller_docs_seller_select
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'seller-docs'
    and public.is_submission_seller((split_part(name, '/', 1))::uuid)
  );

drop policy if exists seller_docs_seller_insert on storage.objects;
create policy seller_docs_seller_insert
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'seller-docs'
    and public.is_submission_seller((split_part(name, '/', 1))::uuid)
  );

-- ---- seller-photos --------------------------------------------------

drop policy if exists seller_photos_team_all on storage.objects;
create policy seller_photos_team_all
  on storage.objects
  for all
  to authenticated
  using (
    bucket_id = 'seller-photos'
    and public.is_submission_assignee((split_part(name, '/', 1))::uuid)
  )
  with check (
    bucket_id = 'seller-photos'
    and public.is_submission_assignee((split_part(name, '/', 1))::uuid)
  );

drop policy if exists seller_photos_seller_select on storage.objects;
create policy seller_photos_seller_select
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'seller-photos'
    and public.is_submission_seller((split_part(name, '/', 1))::uuid)
  );

drop policy if exists seller_photos_seller_insert on storage.objects;
create policy seller_photos_seller_insert
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'seller-photos'
    and public.is_submission_seller((split_part(name, '/', 1))::uuid)
  );

-- ---- team-uploads ---------------------------------------------------
-- No seller policies — team-uploads is team-only, full CRUD for assignees.

drop policy if exists team_uploads_team_all on storage.objects;
create policy team_uploads_team_all
  on storage.objects
  for all
  to authenticated
  using (
    bucket_id = 'team-uploads'
    and public.is_submission_assignee((split_part(name, '/', 1))::uuid)
  )
  with check (
    bucket_id = 'team-uploads'
    and public.is_submission_assignee((split_part(name, '/', 1))::uuid)
  );
