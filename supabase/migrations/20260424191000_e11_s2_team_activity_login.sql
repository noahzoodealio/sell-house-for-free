-- E11-S2 (ADO 7930): team_activity_events login support.
-- Story:   https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7930
-- Feature: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7920
--
-- E11-S1 ships team_activity_events with submission_id NOT NULL and an
-- event_type check constraint that doesn't include login events. /team/login
-- and /team/auth/callback need to write audit rows that aren't tied to a
-- submission. We relax NOT NULL on submission_id (login is the only
-- non-submission event class) and extend event_type to allow:
--   - login                         (callback exchange + is_active OK)
--   - login_rejected_inactive       (callback exchange OK + is_active false)
--
-- Why one table, not a separate team_session_events table. One audit
-- shape, one query for "what did this team member do today". Login rows
-- carry submission_id NULL; per-submission rows carry it set. The S1
-- runbook section already documents the table shape — no shape change
-- worth a second table.

alter table public.team_activity_events
  alter column submission_id drop not null;

-- Replace the event_type check constraint to add login + login_rejected_inactive.
alter table public.team_activity_events
  drop constraint if exists team_activity_events_event_type_check;

alter table public.team_activity_events
  add constraint team_activity_events_event_type_check
  check (event_type in (
    'email_sent',
    'note_added',
    'handoff_initiated',
    'handoff_completed',
    'ai_context_viewed',
    'document_uploaded',
    'document_downloaded',
    'status_changed',
    'login',
    'login_rejected_inactive'
  ));

-- Ensure the per-actor index still gives us "what did user X do" without
-- a submission filter. Already covered by team_activity_actor_idx in S1.
-- No additional indexes needed for login events at MVP volume.

comment on column public.team_activity_events.submission_id is
  'NULL for login / login_rejected_inactive events. NOT NULL for every other event_type (enforced at the application layer; not a check constraint to keep the migration straightforward).';
