-- E11-S9 (ADO 7937): admin-roster event types + last_login_at.
-- Story:   https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7937
-- Feature: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7920
--
-- Adds the six team_member_* event types to the team_activity_events check
-- constraint so admin-roster mutations have a durable audit trail. Also
-- adds team_members.last_login_at, populated by the team auth callback
-- (E11-S2) on every successful login — surfaced in the roster UI as a
-- "last seen" column.

-- 1. team_activity_events.event_type extension --------------------------

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
    'document_deleted',
    'status_changed',
    'login',
    'login_rejected_inactive',
    'team_member_added',
    'team_member_deactivated',
    'team_member_reactivated',
    'team_member_role_changed',
    'team_member_coverage_changed',
    'team_member_capacity_changed'
  ));

-- 2. team_members.last_login_at -----------------------------------------

alter table public.team_members
  add column if not exists last_login_at timestamptz;

comment on column public.team_members.last_login_at is
  'Timestamp of the most recent successful /team/auth/callback login. Updated by recordTeamLoginEvent in src/lib/team/auth.ts.';
