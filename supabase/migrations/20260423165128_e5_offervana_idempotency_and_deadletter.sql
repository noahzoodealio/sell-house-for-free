-- E5-S1 (ADO 7854): Offervana BFF idempotency + dead-letter tables.
-- Story: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7854
-- Both tables are server-only (accessed via service-role key from src/lib/supabase/server.ts).
-- RLS is ON with no public policies — no anon/auth access whatsoever.

create type public.offervana_failure_reason as enum (
  'transient-exhausted',
  'permanent',
  'email-conflict',
  'malformed-response'
);

create table public.offervana_idempotency (
  submission_id text primary key,
  customer_id integer not null,
  user_id bigint not null,
  referral_code text not null,
  created_at timestamptz not null default now()
);

-- Supports the 24h TTL sweeper (implemented out-of-band; E6 / E8 owns it).
create index offervana_idempotency_created_at_idx
  on public.offervana_idempotency (created_at);

alter table public.offervana_idempotency enable row level security;

create table public.offervana_submission_failures (
  id uuid primary key default gen_random_uuid(),
  submission_id text not null,
  reason public.offervana_failure_reason not null,
  detail jsonb,
  draft_json jsonb,
  dto_json jsonb,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

-- On-call grep / dashboard queries pivot on submission_id + resolved_at.
create index offervana_submission_failures_submission_id_idx
  on public.offervana_submission_failures (submission_id);

create index offervana_submission_failures_unresolved_idx
  on public.offervana_submission_failures (created_at)
  where resolved_at is null;

alter table public.offervana_submission_failures enable row level security;
