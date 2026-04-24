-- E6-S1 (ADO 7823): submissions + submission_offers + assignment_events.
-- Story:   https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7823
-- Feature: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7782
--
-- submissions is the canonical seller-submission row. One row per unique
-- submission_id (the text UUID already present on offervana_idempotency).
-- referral_code is Offervana's correlation key — unique, used for
-- idempotency in the assign_next_pm RPC and for the /portal/setup read
-- path (getAssignmentByReferralCode in E6-S3).
--
-- submission_offers holds one row per Offervana-returned path (cash /
-- cash_plus / snml / list). UNIQUE (submission_id, path) keeps the
-- offervana_idempotency.offers_v2_payload JSONB column a debug trail,
-- not a source of truth.
--
-- assignment_events is the audit trail for team_member assignments
-- (initial assign, reassign, unassign). Read by the ops runbook (E6-S8).

create type public.submission_status as enum (
  'new',
  'assigned',
  'active',
  'closed_won',
  'closed_lost'
);

create type public.submission_offer_path as enum (
  'cash',
  'cash_plus',
  'snml',
  'list'
);

create type public.assignment_event_kind as enum (
  'assigned',
  'reassigned',
  'unassigned'
);

-- submissions ----------------------------------------------------------

create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  submission_id text not null unique,
    -- 1:1 with offervana_idempotency.submission_id (the E3 UUID).
  seller_id uuid not null references public.profiles(id) on delete restrict,
  referral_code text not null unique,
    -- Offervana ReferralCode. Idempotency key for assign_next_pm.
  -- Property snapshot (denormalized from the submit payload so the team
  -- portal doesn't round-trip to Offervana for display).
  address_line1 text not null,
  address_line2 text,
  city text not null,
  state text not null,
  zip text not null,
  beds int,
  baths numeric(3,1),
  sqft int,
  year_built int,
  -- Offer/listing intent
  seller_paths text[] not null default '{}',
  timeline text,
  pillar_hint text,
  -- Status + assignment
  status public.submission_status not null default 'new',
  pm_user_id uuid references public.team_members(id) on delete set null,
  assigned_at timestamptz,
  -- Bookkeeping
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index submissions_pm_idx
  on public.submissions (pm_user_id, assigned_at desc);
create index submissions_status_idx
  on public.submissions (status, created_at desc);
create index submissions_seller_idx
  on public.submissions (seller_id);

alter table public.submissions enable row level security;

comment on table public.submissions is
  'Canonical seller-submission record. referral_code is the idempotency key for assign_next_pm. status transitions new → assigned → active → closed_won|closed_lost are managed by E6-S3 orchestrator (new → assigned) and E11 team portal (downstream transitions).';

-- submission_offers ----------------------------------------------------

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

create index submission_offers_submission_idx
  on public.submission_offers (submission_id);

alter table public.submission_offers enable row level security;

comment on table public.submission_offers is
  'One row per Offervana-returned path (cash/cash_plus/snml/list) for a submission. raw_payload is the full JSON for debugging; low_cents/high_cents are the structured view the UI + email templates render.';

-- assignment_events ----------------------------------------------------

create table public.assignment_events (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  team_member_id uuid references public.team_members(id) on delete set null,
  kind public.assignment_event_kind not null,
  reason text,
  created_at timestamptz not null default now()
);

create index assignment_events_submission_idx
  on public.assignment_events (submission_id, created_at desc);

alter table public.assignment_events enable row level security;

comment on table public.assignment_events is
  'Assignment audit trail. kind=assigned is written by assign_next_pm; reassigned/unassigned are written by future ops tooling (E6-S8 runbook describes the SQL).';
