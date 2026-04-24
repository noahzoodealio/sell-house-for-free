-- E10-S4 (ADO 7926): seller-facing RLS on profiles, submissions, submission_offers.
-- Story:   https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7926
-- Feature: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7919
--
-- RLS was enabled on each of these tables by E6-S1 with no policies
-- (default-deny, service-role only). E10 makes the seller's OWN session
-- carry read access to their OWN rows. Writes remain service-role only —
-- the E6 orchestrators continue to be the sole insert/update paths.
--
-- auth.uid() is set by Supabase from the JWT on each request; the SSR
-- client (E10-S2) mints the correct claim when the session cookie is
-- valid.

-- profiles — seller reads + updates their own profile. No insert/delete
-- policies: E6-S3 is the only legitimate insertion path (service-role).
create policy profiles_select_own
  on public.profiles
  for select
  using (id = auth.uid());

create policy profiles_update_own
  on public.profiles
  for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- submissions — seller reads their own rows only. Writes remain
-- service-role only (E6-S3 orchestrator owns the write path).
create policy submissions_select_own
  on public.submissions
  for select
  using (seller_id = auth.uid());

-- submission_offers — no direct seller_id column; ownership is via the
-- submission's seller_id. The exists() subquery applies RLS transitively.
-- submissions(seller_id) is indexed by E6-S1, so the subquery is cheap.
create policy submission_offers_select_own
  on public.submission_offers
  for select
  using (
    exists (
      select 1
      from public.submissions
      where submissions.id = submission_offers.submission_id
        and submissions.seller_id = auth.uid()
    )
  );
