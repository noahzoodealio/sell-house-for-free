# E6-S1 Implementation Plan

## File groups (commit order)

All file-groups ship in a single commit — atomic provisioning. Schema + types + env surface are inter-dependent.

### Group A — Migrations (5 files)

Paths: `supabase/migrations/20260424170{000,100,200,300,400}_e6_s1_*.sql`.

**1. `20260424170000_e6_s1_team_members.sql`**

`team_members` replaces `pm_members` / `project_managers` from earlier docs — unified role model:

```sql
create extension if not exists pgcrypto;

create table public.team_members (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  email text not null unique,
  phone text,
  photo_url text,
  bio text,
  active boolean not null default true,
  role text[] not null default '{pm}',
    -- multi-badge: any subset of {'tc','pm','agent'}; team_members with
    -- 'pm' badge are eligible for assign_next_pm.
  coverage_regions text[] not null default '{}',
    -- e.g. {'phoenix','tucson'} or {'all'} for statewide
  last_assigned_at timestamptz,
  total_assignments int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index team_members_pm_pool_idx
  on public.team_members (active, last_assigned_at nulls first, total_assignments);

alter table public.team_members enable row level security;
-- No policies: service role only. Seller/team portal policies in E10/E11.
```

**2. `20260424170100_e6_s1_profiles.sql`**

`profiles` mirrors `auth.users` 1:1. Populated server-side by S3 orchestrator.

```sql
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  phone text,
  tcpa_version text,
  tcpa_accepted_at timestamptz,
  terms_version text,
  terms_accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index profiles_email_lower_idx on public.profiles (lower(email));

alter table public.profiles enable row level security;
-- Seller RLS policies land with E10 (passwordless auth).
```

**3. `20260424170200_e6_s1_submissions.sql`**

Core seller-submission row + per-offer detail + assignment history.

```sql
create type public.submission_status as enum (
  'new', 'assigned', 'active', 'closed_won', 'closed_lost'
);

create type public.submission_offer_path as enum (
  'cash', 'cash_plus', 'snml', 'list'
);

create type public.assignment_event_kind as enum (
  'assigned', 'reassigned', 'unassigned'
);

create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  submission_id text not null unique,          -- maps 1:1 to offervana_idempotency.submission_id
  seller_id uuid not null references public.profiles(id) on delete restrict,
  referral_code text not null unique,          -- Offervana ReferralCode (idempotency key)
  -- Property snapshot
  address_line1 text not null,
  address_line2 text,
  city text not null,
  state text not null,
  zip text not null,
  beds int,
  baths numeric(3,1),
  sqft int,
  year_built int,
  -- Offer / listing intent
  seller_paths text[] not null default '{}',   -- any of {'cash','cash_plus','snml','list'}
  timeline text,                               -- e.g. '0-30', '30-60', '60-plus'
  pillar_hint text,                            -- for routing / email template variants
  -- Status + assignment
  status public.submission_status not null default 'new',
  pm_user_id uuid references public.team_members(id) on delete set null,
  assigned_at timestamptz,
  -- Bookkeeping
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index submissions_pm_idx on public.submissions (pm_user_id, assigned_at desc);
create index submissions_status_idx on public.submissions (status, created_at desc);
create index submissions_seller_idx on public.submissions (seller_id);

alter table public.submissions enable row level security;

create table public.submission_offers (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  path public.submission_offer_path not null,
  low_cents bigint,
  high_cents bigint,
  raw_payload jsonb,
  created_at timestamptz not null default now(),
  unique (submission_id, path)
);

create index submission_offers_submission_idx on public.submission_offers (submission_id);

alter table public.submission_offers enable row level security;

create table public.assignment_events (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  team_member_id uuid references public.team_members(id) on delete set null,
  kind public.assignment_event_kind not null,
  reason text,
  created_at timestamptz not null default now()
);

create index assignment_events_submission_idx on public.assignment_events (submission_id, created_at desc);

alter table public.assignment_events enable row level security;
```

**4. `20260424170300_e6_s1_notification_log.sql`**

Per-attempt row for outbound email sends. FK to `submissions`.

```sql
create type public.notification_status as enum (
  'retry_pending', 'sent', 'failed'
);

create type public.notification_recipient_type as enum (
  'seller', 'team_member'
);

create type public.notification_template_key as enum (
  'seller_confirmation', 'team_member_notification'
);

create table public.notification_log (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  recipient_type public.notification_recipient_type not null,
  recipient_email text not null,
  template_key public.notification_template_key not null,
  attempt int not null default 1,
  status public.notification_status not null,
  provider text not null default 'resend',
  provider_message_id text,
  error_reason text,                            -- sanitized, <= 500 chars
  created_at timestamptz not null default now()
);

create index notification_log_submission_idx
  on public.notification_log (submission_id, created_at desc);
create index notification_log_status_idx
  on public.notification_log (status, created_at desc);

alter table public.notification_log enable row level security;
```

**5. `20260424170400_e6_s1_assign_next_pm.sql`**

Concurrency-safe round-robin assignment. Idempotent on `submissions.referral_code`.

```sql
create or replace function public.assign_next_pm(p_submission_id uuid)
returns table (
  assignment_kind text,           -- 'fresh' | 'existing'
  team_member_id uuid,
  pm_first_name text,
  pm_photo_url text
)
language plpgsql
security invoker
as $$
declare
  v_submission submissions%rowtype;
  v_tm team_members%rowtype;
begin
  select * into v_submission from submissions where id = p_submission_id;
  if not found then
    raise exception 'E6_SUBMISSION_NOT_FOUND' using errcode = 'P0002';
  end if;

  -- Idempotency: referral_code (unique) ties the submission row; if
  -- pm_user_id is already set, return the existing assignment.
  if v_submission.pm_user_id is not null then
    select * into v_tm from team_members where id = v_submission.pm_user_id;
    return query
      select 'existing'::text, v_tm.id, v_tm.first_name, v_tm.photo_url;
    return;
  end if;

  select * into v_tm
  from team_members
  where active = true
    and 'pm' = any(role)
  order by last_assigned_at nulls first, total_assignments asc, id
  limit 1
  for update skip locked;

  if not found then
    raise exception 'E6_NO_ACTIVE_PMS' using errcode = 'P0001';
  end if;

  update team_members
     set last_assigned_at = now(),
         total_assignments = total_assignments + 1,
         updated_at = now()
   where id = v_tm.id;

  update submissions
     set pm_user_id = v_tm.id,
         status = case when status = 'new' then 'assigned'::public.submission_status else status end,
         assigned_at = coalesce(assigned_at, now()),
         updated_at = now()
   where id = p_submission_id;

  insert into assignment_events (submission_id, team_member_id, kind, reason)
  values (p_submission_id, v_tm.id, 'assigned', 'round-robin');

  return query
    select 'fresh'::text, v_tm.id, v_tm.first_name, v_tm.photo_url;
end;
$$;

comment on function public.assign_next_pm is
  'Idempotent round-robin assignment. Picks least-recently-assigned active team_member with pm badge. FOR UPDATE SKIP LOCKED is safe under concurrency. Raises E6_NO_ACTIVE_PMS (P0001) when no eligible team_members exist.';
```

### Group B — TypeScript types (`src/lib/supabase/schema.ts`)

Extend the `Database['public']['Tables']` shape with the six new tables. Keep the existing Offervana types; add alongside. Export a `TeamMemberRow`, `ProfileRow`, `SubmissionRow`, `SubmissionOfferRow`, `AssignmentEventRow`, `NotificationLogRow` for consumers.

### Group C — `.env.example` Supabase + E6 block

Append a new section after the AI Agent Suite block. Vars:
- `SUPABASE_URL` (already used by E5/E9, but not documented)
- `SUPABASE_SERVICE_ROLE_KEY` (same)
- `SUPABASE_ANON_KEY` (for future seller-auth clients; E10)
- `RESEND_API_KEY` (S4 installs)
- `EMAIL_FROM`, `EMAIL_REPLY_TO` (S4)
- `EMAIL_CONTACT_WINDOW_HOURS` (optional override, defaults 24)
- `PM_ASSIGN_TIMEOUT_MS` (optional override, defaults 5000)

### Group D — `supabase/seed.sql` stub

Empty placeholder with a banner comment. S2 fills it with three `team_members` rows.

## Commit

Single commit covering all groups:

```
e6-s1(7823): Supabase schema + assign_next_pm RPC

- 5 migrations: team_members + profiles + submissions/submission_offers/assignment_events + notification_log + assign_next_pm RPC
- RLS enabled on all new tables, no policies (service-role only; seller/team policies land in E10/E11)
- assign_next_pm uses FOR UPDATE SKIP LOCKED, idempotent on submission pm_user_id, raises E6_NO_ACTIVE_PMS (P0001) when no eligible PMs
- supabase/schema.ts extended with TeamMemberRow / ProfileRow / SubmissionRow / SubmissionOfferRow / AssignmentEventRow / NotificationLogRow
- .env.example documents SUPABASE_* + RESEND_* + EMAIL_* + PM_ASSIGN_TIMEOUT_MS

Migrations are NOT auto-applied by CI. Run `supabase db push` manually.
```

## Post-commit halt

Halt for user to run `supabase db push`. Verify via:

```sql
select tablename from pg_tables where schemaname='public' order by tablename;
-- expects: assignment_events, notification_log, profiles, submissions, submission_offers, team_members (plus existing)

\df public.assign_next_pm
-- expects: function definition

select relname, relrowsecurity from pg_class where relname in ('team_members','profiles','submissions','submission_offers','assignment_events','notification_log');
-- expects: all rowsecurity = true
```

Then resume → unit-testing → code-review.
