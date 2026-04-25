-- E11-S4 (ADO 7932): submission_offers.team_note column.
-- Story:   https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7932
-- Feature: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7920
--
-- Adds a free-form text override slot per Offervana-returned offer row.
-- Used by /team/submissions/[id] detail view to capture the team
-- member's annotation against an offer (e.g. "explained reno path here,
-- seller leaning toward list" or "investor offered higher off-platform,
-- monitor"). The column lives on submission_offers because it is
-- per-offer; submission-wide notes go into team_activity_events as
-- event_type = 'note_added'.

alter table public.submission_offers
  add column if not exists team_note text;

comment on column public.submission_offers.team_note is
  'Free-form team annotation against this Offervana-returned offer. Set + read from /team/submissions/[id]. Empty/null when no override has been recorded.';
