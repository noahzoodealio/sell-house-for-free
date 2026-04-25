-- E13-S7 (ADO 7986): per-session tool-call budgets + ai_tool_runs.metadata.
-- Story:   https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7986
-- Feature: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7939
--
-- Adds three integer-budget columns to ai_sessions and a metadata jsonb column
-- to ai_tool_runs (S1 plumbing finally has a column to land in). Budgets reset
-- on session expiry — there is no roll-over. Defaults reflect the brief:
-- ATTOM 30, Offervana 25, MLS 15 calls per session.
--
-- Plus a 7d metrics view for /team/admin (E11-S9) consumption.

alter table public.ai_sessions
  add column if not exists tool_budget_attom_remaining integer not null default 30;

alter table public.ai_sessions
  add column if not exists tool_budget_offervana_remaining integer not null default 25;

alter table public.ai_sessions
  add column if not exists tool_budget_mls_remaining integer not null default 15;

alter table public.ai_tool_runs
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create index if not exists ai_tool_runs_metadata_budget_bucket_idx
  on public.ai_tool_runs ((metadata->>'budget_bucket'));

create index if not exists ai_tool_runs_metadata_scope_violation_idx
  on public.ai_tool_runs ((metadata->>'scope_violation'))
  where metadata->>'scope_violation' is not null;

-- 7d per-tool metrics view for the admin surface. Aggregates ai_tool_runs
-- over a rolling window. p50/p95 by latency_ms, plus error_rate and
-- scope_violation count from metadata.
create or replace view public.v_ai_tool_metrics_7d as
  select
    tool_name,
    count(*) as call_count,
    sum(case when status = 'error' then 1 else 0 end) as error_count,
    case
      when count(*) = 0 then 0
      else round(
        100.0 * sum(case when status = 'error' then 1 else 0 end) / count(*),
        2
      )
    end as error_rate_pct,
    percentile_cont(0.5) within group (order by latency_ms) as p50_latency_ms,
    percentile_cont(0.95) within group (order by latency_ms) as p95_latency_ms,
    sum(
      case
        when (metadata->>'scope_violation')::boolean = true then 1
        else 0
      end
    ) as scope_violation_count
  from public.ai_tool_runs
  where created_at >= now() - interval '7 days'
  group by tool_name;

-- View inherits RLS from underlying tables; ai_tool_runs is service-role only,
-- and the admin UI reads via service role per E11-S9 pattern.
