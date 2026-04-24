-- E6-S1 (ADO 7823): team_members roster.
-- Story:   https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7823
-- Feature: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7782
--
-- Unified roster for Transaction Coordinators (tc), Project Managers (pm),
-- and Agents — any row may carry one or more role badges. The assign_next_pm
-- RPC (see 20260424170400_e6_s1_assign_next_pm.sql) selects from rows with
-- the 'pm' badge. Multi-badge support is load-bearing for E11 (team portal).
--
-- RLS is ON with zero public policies — service-role only. Team portal
-- policies land with E11.

create extension if not exists pgcrypto;

create table public.team_members (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  email text not null unique,
  phone text,
  photo_url text,
  bio text,
  active boolean not null default true,
  role text[] not null default '{pm}',
  coverage_regions text[] not null default '{}',
  -- Round-robin fairness bookkeeping (assign_next_pm updates these).
  last_assigned_at timestamptz,
  total_assignments int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Composite index mirrors the ORDER BY of the assign_next_pm pick query.
create index team_members_pm_pool_idx
  on public.team_members (active, last_assigned_at nulls first, total_assignments);

alter table public.team_members enable row level security;

comment on table public.team_members is
  'Unified roster of assignable TCs / PMs / Agents. role text[] is a multi-badge set: any subset of {tc,pm,agent}. The pm badge makes a row eligible for assign_next_pm. MVP managed via migrations; admin UI deferred.';
comment on column public.team_members.role is
  'Badges: any subset of {tc,pm,agent}. Default {pm}.';
comment on column public.team_members.coverage_regions is
  'Geographic badges: e.g. {phoenix,tucson} or {all}. Empty array = statewide/unrestricted.';
