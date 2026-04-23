-- AI Agent Suite — E9 Phase A (S1). Private Storage bucket `ai-docs`.
-- Read architecture-e9-ai-agent-suite.md §3.1.1 + §5 Deviations before editing.
-- Story: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7896
--
-- Private bucket for seller-uploaded PDFs and image attachments. Service-role
-- writes only; signed URLs minted per-use at the library layer (S8) with a
-- 60-minute TTL. Anonymous users cannot list, read, or upload.
--
-- Retention: 30 days. Implemented via a pg_cron job rather than a native
-- Storage lifecycle rule because the running Supabase Storage API does not
-- yet expose bucket-level lifecycle config uniformly across hosted + self-host.
-- The 30-day window is the invariant; the mechanism (pg_cron) is the fallback
-- called out in the story's AC#12. Summarised artifacts in public.ai_artifacts
-- are NOT subject to this retention (indefinite per architecture §5 Deviations).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'ai-docs',
  'ai-docs',
  false,
  10485760,
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp'
  ]
)
on conflict (id) do nothing;

-- 30-day auto-delete via pg_cron (see block comment above).
-- Nightly at 03:00 UTC: delete objects in the `ai-docs` bucket older than 30 days.

create extension if not exists pg_cron;

create or replace function public.delete_old_ai_docs()
returns void
language plpgsql
security definer
set search_path = public, storage
as $$
begin
  delete from storage.objects
  where bucket_id = 'ai-docs'
    and created_at < now() - interval '30 days';
end;
$$;

-- Idempotent schedule: unschedule any prior job with the same name first.
do $$
declare
  existing_jobid bigint;
begin
  select jobid into existing_jobid
  from cron.job
  where jobname = 'delete_old_ai_docs_nightly';
  if existing_jobid is not null then
    perform cron.unschedule(existing_jobid);
  end if;
end;
$$;

select cron.schedule(
  'delete_old_ai_docs_nightly',
  '0 3 * * *',
  $$select public.delete_old_ai_docs();$$
);
