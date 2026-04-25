-- E11-S6 (ADO 7934): document_deleted event type for team_activity_events.
-- Story:   https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7934
-- Feature: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7920
--
-- Adds 'document_deleted' to the event_type check constraint so the
-- delete flow's audit row passes validation. S1 shipped with the eight
-- application event types + S2 added two login event types; S6 adds
-- document_deleted to round out the document lifecycle (uploaded /
-- downloaded already shipped in S1).

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
    'login_rejected_inactive'
  ));
