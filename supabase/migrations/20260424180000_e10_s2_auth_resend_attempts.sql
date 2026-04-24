-- E10-S2 (ADO 7924): auth_resend_attempts — identifier-scoped rate-limit
-- counter shared between /portal/auth/callback re-send UI and /portal/login
-- OTP send. 3 attempts per identifier per 15 minutes is enforced at the
-- server-action layer; this table holds the ledger rows.
--
-- Story:   https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7924
-- Feature: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7919
--
-- RLS ON, default-deny. Only the service-role insert from the server action
-- touches the table. There is never a seller-side read of rate-limit
-- ledger rows.
--
-- Retention: rows older than 24h can be pruned by a future cron (not
-- implemented here — E10-S6 references the retention comment). The 15-min
-- window lookup index keeps the query cheap regardless of ledger size for
-- MVP volumes.

create table public.auth_resend_attempts (
  id uuid primary key default gen_random_uuid(),
  identifier text not null,
  identifier_type text not null check (identifier_type in ('email', 'phone')),
  attempted_at timestamptz not null default now()
);

-- Hot path: "count attempts for this identifier in the last 15 min." The
-- (identifier, attempted_at desc) composite supports the window scan.
create index auth_resend_attempts_identifier_time_idx
  on public.auth_resend_attempts (identifier, attempted_at desc);

alter table public.auth_resend_attempts enable row level security;

comment on table public.auth_resend_attempts is
  'Rate-limit ledger for passwordless auth send attempts. Service-role writes only; seller sessions never read. Prune rows > 24h via future cron; retention is a cost concern, not a correctness one.';
