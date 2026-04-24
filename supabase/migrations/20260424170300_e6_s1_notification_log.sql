-- E6-S1 (ADO 7823): per-attempt notification log.
-- Story:   https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7823
-- Feature: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7782
--
-- One row per outbound email attempt. E6-S4 (Resend + React Email) writes
-- one row at status='retry_pending' before each attempt and updates it to
-- 'sent' or 'failed' once the attempt resolves. attempt is 1-indexed.
--
-- error_reason must be sanitized by the caller (see E6-S4 send.ts): strip
-- email/phone/to/from keys from provider error bodies, cap at 500 chars.
-- The DB does not enforce the cap — the application does.
--
-- RLS ON, no policies. Service-role only. E11 team portal will read via
-- service-role from the server.

create type public.notification_recipient_type as enum (
  'seller',
  'team_member'
);

create type public.notification_template_key as enum (
  'seller_confirmation',
  'team_member_notification'
);

create type public.notification_status as enum (
  'retry_pending',
  'sent',
  'failed'
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
  error_reason text,
  created_at timestamptz not null default now()
);

create index notification_log_submission_idx
  on public.notification_log (submission_id, created_at desc);
create index notification_log_status_idx
  on public.notification_log (status, created_at desc);

alter table public.notification_log enable row level security;

comment on table public.notification_log is
  'Per-attempt log of outbound emails. E6-S4 writes one row per attempt (status retry_pending → sent|failed). error_reason is application-sanitized (no PII, <=500 chars).';
