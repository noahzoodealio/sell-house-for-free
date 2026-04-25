-- E11-S5 (ADO 7933): messages delivery status + dead-letter table.
-- Story:   https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7933
-- Feature: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7920
--
-- Adds delivery-status tracking on outbound rows (reconciled by the Resend
-- delivery webhook) and a dead-letter table for inbound emails the routing
-- logic could not match to a submission. Dead-letter rows give ops a paper
-- trail when an inbound parse falls outside the recognized address pattern.

-- 1. messages delivery columns ----------------------------------------

alter table public.messages
  add column if not exists delivery_status text
    check (delivery_status in ('pending', 'delivered', 'bounced', 'complained'))
    default 'pending';

alter table public.messages
  add column if not exists delivery_updated_at timestamptz;

comment on column public.messages.delivery_status is
  'Outbound delivery state reconciled by /api/team/messages/resend-delivery from Resend webhook events. Inbound rows stay at the default ''pending'' (the column is meaningful only for direction = ''outbound'').';

-- Dedup helper: outbound rows are reconciled by resend_message_id from the
-- delivery webhook, so making lookup fast matters.
create index if not exists messages_resend_message_idx
  on public.messages (resend_message_id)
  where resend_message_id is not null;

-- 2. messages_dead_letter ---------------------------------------------

create table if not exists public.messages_dead_letter (
  id bigserial primary key,
  raw_payload jsonb not null,
  reason text not null,
  resend_message_id text,
  recipient_address text,
  sender_address text,
  created_at timestamptz not null default now()
);

create index if not exists messages_dead_letter_created_idx
  on public.messages_dead_letter (created_at desc);

alter table public.messages_dead_letter enable row level security;
-- No policies — service-role only. Operator inspects via Studio.

comment on table public.messages_dead_letter is
  'Inbound emails the team-portal routing logic could not match to a submission. Manually triaged via Supabase Studio + the team-portal messaging runbook section. raw_payload is the verbatim Resend webhook payload for postmortem (PII present — treat accordingly).';
