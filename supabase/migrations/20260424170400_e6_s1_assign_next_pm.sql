-- E6-S1 (ADO 7823): assign_next_pm RPC.
-- Story:   https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7823
-- Feature: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7782
--
-- Concurrency-safe round-robin assignment of a team_member (pm badge) to
-- a submission row. Idempotent on submissions.pm_user_id — a second call
-- with the same p_submission_id returns the existing assignment without
-- double-incrementing the picked PM's counters.
--
-- Locking: SELECT ... FOR UPDATE SKIP LOCKED on the team_members pool
-- avoids two concurrent orchestrator calls both grabbing the same row.
-- SKIP LOCKED means each transaction gets the next-available row rather
-- than blocking on a contended one.
--
-- Error signal: raises E6_NO_ACTIVE_PMS with SQLSTATE P0001 when no
-- eligible team_members exist (active=true AND 'pm' = any(role)).
-- The E6-S3 orchestrator maps that to AssignResult.reason='no_active_pms'
-- and fires Sentry severity=critical (event name pm_assignment_failed).
--
-- Consumed by E6-S3 (src/lib/pm-service/assign.ts).

create or replace function public.assign_next_pm(p_submission_id uuid)
returns table (
  assignment_kind text,   -- 'fresh' | 'existing'
  team_member_id uuid,
  pm_first_name text,
  pm_photo_url text
)
language plpgsql
security invoker
as $$
declare
  v_submission submissions%rowtype;
  v_tm team_members%rowtype;
begin
  select * into v_submission from submissions where id = p_submission_id;
  if not found then
    raise exception 'E6_SUBMISSION_NOT_FOUND' using errcode = 'P0002';
  end if;

  -- Idempotency: if this submission already has a PM, return them.
  if v_submission.pm_user_id is not null then
    select * into v_tm from team_members where id = v_submission.pm_user_id;
    if not found then
      -- Dangling FK (team_member deleted via ON DELETE SET NULL race) —
      -- clear the stale pointer and fall through to fresh assignment.
      update submissions set pm_user_id = null where id = p_submission_id;
    else
      return query
        select 'existing'::text, v_tm.id, v_tm.first_name, v_tm.photo_url;
      return;
    end if;
  end if;

  -- Pick least-recently-assigned active PM. SKIP LOCKED prevents two
  -- concurrent callers from grabbing the same row.
  select * into v_tm
  from team_members
  where active = true
    and 'pm' = any(role)
  order by last_assigned_at nulls first, total_assignments asc, id
  limit 1
  for update skip locked;

  if not found then
    raise exception 'E6_NO_ACTIVE_PMS' using errcode = 'P0001';
  end if;

  update team_members
     set last_assigned_at = now(),
         total_assignments = total_assignments + 1,
         updated_at = now()
   where id = v_tm.id;

  update submissions
     set pm_user_id = v_tm.id,
         status = case
           when status = 'new' then 'assigned'::public.submission_status
           else status
         end,
         assigned_at = coalesce(assigned_at, now()),
         updated_at = now()
   where id = p_submission_id;

  insert into assignment_events (submission_id, team_member_id, kind, reason)
  values (p_submission_id, v_tm.id, 'assigned', 'round-robin');

  return query
    select 'fresh'::text, v_tm.id, v_tm.first_name, v_tm.photo_url;
end;
$$;

comment on function public.assign_next_pm is
  'Idempotent round-robin assignment. Picks least-recently-assigned active team_member with the pm badge. FOR UPDATE SKIP LOCKED is safe under concurrency. Raises E6_NO_ACTIVE_PMS (SQLSTATE P0001) when no eligible PMs exist. Sets submissions.pm_user_id, bumps team_members.last_assigned_at + total_assignments, writes assignment_events row. Idempotent on submissions.pm_user_id.';
