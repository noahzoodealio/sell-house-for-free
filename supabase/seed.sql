-- E6-S2 (ADO 7825): placeholder team_members seed.
-- Story:   https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7825
-- Feature: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7782
--
-- Three placeholder team_members rows so the assign_next_pm RPC is
-- end-to-end testable in local dev + preview environments. Production
-- roster ships via a separate hand-curated migration (see E6-S8:
-- supabase/migrations/XXXXXXXXXXXXXX_seed_prod_roster.sql) which
-- DELETEs these placeholders before inserting real rows.
--
-- Rules
-- -----
--   - NEVER commit real PII (real names, emails, phones, photo paths)
--     to this file. Placeholder emails use the
--     `.placeholder@sellyourhousefree.com` suffix so they're easy to
--     grep out before production stamping.
--   - photo_url + phone left NULL so the S6 <PmPreview> initials-
--     fallback code path is exercised during local smoke.
--   - `on conflict (email) do nothing` keeps `supabase db reset` safe
--     to re-run.
--   - `role` default `{pm}` makes every placeholder eligible for the
--     assign_next_pm pick loop. Multi-badge ({tc,pm} / {pm,agent}) is
--     exercised in E11's own seeds.
--   - `coverage_regions='{all}'` so no area-aware filter (future
--     extension) excludes them.

insert into public.team_members
  (first_name, last_name, email, phone, photo_url, bio, active, role, coverage_regions)
values
  ('Jordan', 'Placeholder', 'jordan.placeholder@sellyourhousefree.com',
   null, null, 'Placeholder PM — replace before launch', true,
   array['pm']::text[], array['all']::text[]),
  ('Morgan', 'Placeholder', 'morgan.placeholder@sellyourhousefree.com',
   null, null, 'Placeholder PM — replace before launch', true,
   array['pm']::text[], array['all']::text[]),
  ('Taylor', 'Placeholder', 'taylor.placeholder@sellyourhousefree.com',
   null, null, 'Placeholder PM — replace before launch', true,
   array['pm']::text[], array['all']::text[])
on conflict (email) do nothing;
