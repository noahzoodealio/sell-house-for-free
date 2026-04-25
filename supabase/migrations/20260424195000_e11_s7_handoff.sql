-- E11-S7 (ADO 7935): handoff plumbing — capacity columns + trigger + RPC.
-- Story:   https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7935
-- Feature: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7920
--
-- Adds two capacity columns to team_members, a trigger to keep
-- capacity_active_current accurate as submissions move between
-- team_members + open/closed statuses, and a SECURITY DEFINER RPC
-- `team_handoff` that performs the reassign + audit writes in one
-- transaction. The application server action calls the RPC + sends
-- emails after the DB transaction commits.

-- =====================================================================
-- 1. team_members capacity columns
-- =====================================================================

alter table public.team_members
  add column if not exists capacity_active_current int not null default 0;

alter table public.team_members
  add column if not exists capacity_active_max int not null default 10;

comment on column public.team_members.capacity_active_current is
  'Number of submissions currently in (assigned, active) status with this team_member as pm_user_id. Maintained by the team_members_capacity_sync trigger.';
comment on column public.team_members.capacity_active_max is
  'Soft cap displayed in the handoff UI. Admin can override to assign beyond it.';

-- Backfill capacity_active_current from existing rows.
update public.team_members tm
   set capacity_active_current = sub.cnt
  from (
    select pm_user_id, count(*) as cnt
      from public.submissions
     where status in ('assigned', 'active')
       and pm_user_id is not null
     group by pm_user_id
  ) sub
 where sub.pm_user_id = tm.id;

-- =====================================================================
-- 2. capacity-sync trigger
-- =====================================================================

create or replace function public.team_members_capacity_sync()
returns trigger
language plpgsql
as $$
declare
  v_old_open boolean;
  v_new_open boolean;
begin
  -- 'open' = status in ('assigned', 'active') AND pm_user_id is not null
  if tg_op = 'INSERT' then
    v_new_open := (new.status in ('assigned', 'active')) and new.pm_user_id is not null;
    if v_new_open then
      update public.team_members
         set capacity_active_current = capacity_active_current + 1
       where id = new.pm_user_id;
    end if;
    return new;
  elsif tg_op = 'UPDATE' then
    v_old_open := (old.status in ('assigned', 'active')) and old.pm_user_id is not null;
    v_new_open := (new.status in ('assigned', 'active')) and new.pm_user_id is not null;

    if v_old_open and not v_new_open then
      update public.team_members
         set capacity_active_current = greatest(0, capacity_active_current - 1)
       where id = old.pm_user_id;
    elsif (not v_old_open) and v_new_open then
      update public.team_members
         set capacity_active_current = capacity_active_current + 1
       where id = new.pm_user_id;
    elsif v_old_open and v_new_open and old.pm_user_id is distinct from new.pm_user_id then
      update public.team_members
         set capacity_active_current = greatest(0, capacity_active_current - 1)
       where id = old.pm_user_id;
      update public.team_members
         set capacity_active_current = capacity_active_current + 1
       where id = new.pm_user_id;
    end if;
    return new;
  elsif tg_op = 'DELETE' then
    v_old_open := (old.status in ('assigned', 'active')) and old.pm_user_id is not null;
    if v_old_open then
      update public.team_members
         set capacity_active_current = greatest(0, capacity_active_current - 1)
       where id = old.pm_user_id;
    end if;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists submissions_capacity_sync on public.submissions;
create trigger submissions_capacity_sync
after insert or update of pm_user_id, status or delete
on public.submissions
for each row
execute function public.team_members_capacity_sync();

-- =====================================================================
-- 3. team_handoff RPC
-- =====================================================================

create or replace function public.team_handoff(
  p_submission_id uuid,
  p_to_team_member_id uuid,
  p_actor_auth_user_id uuid,
  p_reason text,
  p_note text default null,
  p_admin_override boolean default false
)
returns table (
  outgoing_team_member_id uuid,
  outgoing_auth_user_id uuid,
  incoming_auth_user_id uuid,
  assignment_event_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_submission submissions%rowtype;
  v_to team_members%rowtype;
  v_from team_members%rowtype;
  v_assignment_id uuid;
begin
  if p_reason not in ('vacation','expertise_mismatch','coverage_region_gap','seller_request','performance_issue','other') then
    raise exception 'E11_HANDOFF_INVALID_REASON' using errcode = 'P0001';
  end if;

  select * into v_submission from submissions where id = p_submission_id for update;
  if not found then
    raise exception 'E11_HANDOFF_SUBMISSION_NOT_FOUND' using errcode = 'P0002';
  end if;

  select * into v_to from team_members where id = p_to_team_member_id;
  if not found or v_to.active is false then
    raise exception 'E11_HANDOFF_TARGET_INACTIVE' using errcode = 'P0001';
  end if;

  if v_submission.pm_user_id is not null then
    select * into v_from from team_members where id = v_submission.pm_user_id;
  end if;

  if v_submission.pm_user_id = p_to_team_member_id then
    raise exception 'E11_HANDOFF_SELF_HANDOFF' using errcode = 'P0001';
  end if;

  if not p_admin_override
     and v_to.capacity_active_current >= v_to.capacity_active_max then
    raise exception 'E11_HANDOFF_AT_CAPACITY' using errcode = 'P0001';
  end if;

  insert into assignment_events (submission_id, team_member_id, kind, reason)
  values (
    p_submission_id,
    p_to_team_member_id,
    'reassigned',
    coalesce(nullif(trim(coalesce(p_note, '')), ''), p_reason)
  )
  returning id into v_assignment_id;

  update submissions
     set pm_user_id = p_to_team_member_id,
         assigned_at = now(),
         updated_at = now()
   where id = p_submission_id;

  insert into team_activity_events (submission_id, team_user_id, event_type, event_data)
  values (
    p_submission_id,
    p_actor_auth_user_id,
    'handoff_initiated',
    jsonb_build_object(
      'from_team_member_id', v_submission.pm_user_id,
      'to_team_member_id', p_to_team_member_id,
      'reason', p_reason,
      'note', p_note,
      'admin_override', p_admin_override
    )
  );

  return query
    select v_submission.pm_user_id,
           v_from.auth_user_id,
           v_to.auth_user_id,
           v_assignment_id;
end;
$$;

revoke all on function public.team_handoff(uuid, uuid, uuid, text, text, boolean) from public;
grant execute on function public.team_handoff(uuid, uuid, uuid, text, text, boolean) to service_role;

comment on function public.team_handoff is
  'Atomic submission handoff: reassigns submissions.pm_user_id, resets assigned_at, writes assignment_events + team_activity_events rows. SECURITY DEFINER so the calling service-role can invoke without bypassing RLS in the application layer. Returns the prior assignee + auth user ids so the application can send notification emails.';
