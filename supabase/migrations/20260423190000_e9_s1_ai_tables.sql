-- AI Agent Suite — E9 Phase A (S1). Tables: ai_sessions, ai_messages, ai_tool_runs, ai_artifacts.
-- Read architecture-e9-ai-agent-suite.md §3.1.1 before editing.
-- Story: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7896
-- Feature: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7895
--
-- All four tables are server-only (service-role key from src/lib/supabase/server.ts).
-- RLS is ON with zero public policies — no anon/authenticated access. Service role
-- bypasses RLS by convention, matching the E5 `submissions` posture.

create extension if not exists pgcrypto;

-- Enums --------------------------------------------------------------------

create type public.ai_message_role as enum (
  'user',
  'assistant',
  'tool',
  'system'
);

create type public.ai_tool_status as enum (
  'pending',
  'running',
  'ok',
  'error',
  'timeout'
);

create type public.ai_artifact_kind as enum (
  'comp_report',
  'doc_summary',
  'offer_analysis',
  'valuation'
);

-- ai_sessions --------------------------------------------------------------
-- One row per homeowner conversation. submission_id is a soft reference to
-- E6's submissions table; the FK constraint is intentionally omitted so E9
-- ships independently of E6 ordering. context_json defaults to '{}' so the
-- session can be minted before bootstrap (S22 fallback greeting path).

create table public.ai_sessions (
  id uuid primary key default gen_random_uuid(),
  submission_id text,
  context_json jsonb not null default '{}'::jsonb,
  token_budget_in integer not null default 200000,
  token_budget_out integer not null default 50000,
  tokens_used_in integer not null default 0,
  tokens_used_out integer not null default 0,
  ip_hash text,
  created_at timestamptz not null default now(),
  last_active_at timestamptz not null default now(),
  ended_at timestamptz
);

create index ai_sessions_submission_id_idx
  on public.ai_sessions (submission_id);

create index ai_sessions_last_active_at_idx
  on public.ai_sessions (last_active_at desc);

alter table public.ai_sessions enable row level security;

-- ai_messages --------------------------------------------------------------
-- Every turn. bigserial id is cheaper than uuid for (session_id, created_at)
-- access pattern. content_json holds AI SDK v6 UIMessage shape (parts[]).

create table public.ai_messages (
  id bigserial primary key,
  session_id uuid not null references public.ai_sessions (id) on delete cascade,
  role public.ai_message_role not null,
  content_json jsonb not null default '{}'::jsonb,
  token_in integer,
  token_out integer,
  created_at timestamptz not null default now()
);

create index ai_messages_session_id_created_at_idx
  on public.ai_messages (session_id, created_at);

alter table public.ai_messages enable row level security;

-- ai_tool_runs -------------------------------------------------------------
-- One row per tool invocation. message_id uses SET NULL so the audit trail
-- survives message compaction out of the 24-message window. workflow_run_id
-- is populated only when the tool delegated to a Vercel Workflow
-- (i.e. start_comp_job).

create table public.ai_tool_runs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.ai_sessions (id) on delete cascade,
  message_id bigint references public.ai_messages (id) on delete set null,
  tool_name text not null,
  status public.ai_tool_status not null default 'pending',
  input_json jsonb,
  output_json jsonb,
  error_detail jsonb,
  latency_ms integer,
  workflow_run_id text,
  created_at timestamptz not null default now()
);

create index ai_tool_runs_session_id_created_at_idx
  on public.ai_tool_runs (session_id, created_at desc);

create index ai_tool_runs_tool_name_status_idx
  on public.ai_tool_runs (tool_name, status);

alter table public.ai_tool_runs enable row level security;

-- ai_artifacts -------------------------------------------------------------
-- Durable outputs. payload_json shape varies by `kind` — validated at the
-- application-layer Zod schema (S10/S12/S17/S19), not at the DB. Required
-- `disclaimer` field is enforced in the Zod schema, not here.

create table public.ai_artifacts (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.ai_sessions (id) on delete cascade,
  kind public.ai_artifact_kind not null,
  payload_json jsonb not null,
  created_at timestamptz not null default now()
);

create index ai_artifacts_session_id_kind_created_at_idx
  on public.ai_artifacts (session_id, kind, created_at desc);

alter table public.ai_artifacts enable row level security;
