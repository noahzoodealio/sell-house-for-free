-- AI Agent Suite — E9 Phase A (S4). Per-IP rate-limit counter.
-- Read architecture-e9-ai-agent-suite.md §3.1 + §5 Decision 12 before editing.
-- Story: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7899
--
-- Single-table sliding-window counter. One row per (hashed) client IP.
-- Enforced by src/lib/ai/budget.ts#enforceBudget. RLS locked, service-role
-- only — matches E5/E9-S1 posture. No anon/authenticated access.

create table public.ai_ip_budgets (
  ip_hash text primary key,
  window_start timestamptz not null default now(),
  request_count integer not null default 0
);

create index ai_ip_budgets_window_start_idx
  on public.ai_ip_budgets (window_start);

alter table public.ai_ip_budgets enable row level security;

-- Atomic increment helper. Keeps the counter logic out of the app and lets
-- Postgres handle concurrency on the same ip_hash via row-level locking.
-- Returns the new request_count (so the caller can compare against the ceiling
-- without a separate read round-trip).
create or replace function public.ai_increment_ip_budget(
  p_ip_hash text,
  p_window_seconds integer,
  p_now timestamptz default now()
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  insert into public.ai_ip_budgets as b (ip_hash, window_start, request_count)
  values (p_ip_hash, p_now, 1)
  on conflict (ip_hash) do update
    set
      window_start = case
        when b.window_start < (p_now - make_interval(secs => p_window_seconds))
          then p_now
        else b.window_start
      end,
      request_count = case
        when b.window_start < (p_now - make_interval(secs => p_window_seconds))
          then 1
        else b.request_count + 1
      end
  returning request_count into v_count;
  return v_count;
end;
$$;
