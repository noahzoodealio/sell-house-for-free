-- E6-S1 (ADO 7823): seller profiles mirror of auth.users.
-- Story:   https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7823
-- Feature: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7782
--
-- profiles is the canonical seller record. One row per auth.users row;
-- populated server-side at submission time via the E6-S3 orchestrator
-- (supabase.auth.admin.createUser + insert into profiles in the same
-- transactional unit-of-work). First magic-link click is the seller's
-- first login (E10 owns that surface).
--
-- tcpa_* + terms_* capture consent version + timestamp at submit time so
-- we can retro-prove acceptance if challenged. E7 owns the copy; E6 owns
-- the columns.
--
-- RLS is ON, no policies — service-role only. Seller-scoped read/write
-- policies land with E10.

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

-- Case-insensitive email uniqueness — E6-S3 uses supabase.auth.admin to
-- create users (which already lowercases emails), but the orchestrator's
-- insert into profiles should fail fast on duplicates from historical or
-- externally-created auth rows.
create unique index profiles_email_lower_idx on public.profiles (lower(email));

alter table public.profiles enable row level security;

comment on table public.profiles is
  'Seller profile mirror of auth.users. Populated server-side at submission time. TCPA/terms consent is captured at submit and never mutated; any re-consent writes a new timestamped row via a future consent_log table (E7).';
