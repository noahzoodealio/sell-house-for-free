-- E12-S1 (ADO 7973): durable enrichment cache schema.
-- Story:   https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7973
-- Feature: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7921
--
-- Two tables back the durable enrichment cache that sits *under*
-- src/lib/enrichment/cache.ts (unstable_cache, ephemeral / per-region).
-- The shape is per-endpoint jsonb columns + per-endpoint *_fetched_at
-- timestamps so each endpoint can stale-check independently and partial
-- refresh (e.g. MLS stale → refetch MLS, reuse fresh ATTOM) is a column
-- update, not a row replace. Raw payloads are stored — normalization
-- (src/lib/enrichment/normalize.ts) re-derives the EnrichmentSlot shape
-- and we want to be able to re-derive without re-paying ATTOM.
--
-- property_enrichments is keyed on address_key (sha256 from
-- src/lib/enrichment/normalize.ts:addressCacheKey). attom_id is an ATTOM
-- assertion, not our canonical identity — addresses without ATTOM matches
-- still need cache rows (for negative-cache + MLS-only paths).
--
-- area_enrichments handles area-scope ATTOM endpoints (salestrend,
-- schools) keyed on geoid_v4 — one zip = many addresses, so denormalizing
-- across addresses would multiply storage. Same payload-per-endpoint
-- pattern.
--
-- RLS is service-role only on both tables. There is no seller-facing or
-- team-facing read path; getEnrichment runs server-side via
-- getSupabaseAdmin() (src/lib/supabase/server.ts) which uses the service
-- role and bypasses RLS. Enabling RLS without granting any policies
-- denies everything to anon + authenticated by default — exactly what we
-- want.
--
-- No seller PII on these tables. Address alone is weakly-identifying;
-- joins to submissions / sellers happen at read time only.

-- =====================================================================
-- 1. property_enrichments — per-address durable cache
-- =====================================================================

create table if not exists public.property_enrichments (
  address_key text primary key,
    -- sha256 from addressCacheKey(); see src/lib/enrichment/normalize.ts.

  -- Locator fields. Stored denormalized for cheap regional filters
  -- (zip-scoped analytics, partition pruning if we ever shard).
  street1 text not null,
  city text not null,
  state text not null default 'AZ',
  zip text not null,

  -- ---- ATTOM per-property endpoints --------------------------------
  -- profile: /property/expandedprofile
  attom_profile_payload jsonb,
  attom_profile_fetched_at timestamptz,

  -- avm: /attomavm/detail
  attom_avm_payload jsonb,
  attom_avm_fetched_at timestamptz,

  -- avm_history: /avmhistory/detail
  attom_avm_history_payload jsonb,
  attom_avm_history_fetched_at timestamptz,

  -- sale: /sale/snapshot
  attom_sale_payload jsonb,
  attom_sale_fetched_at timestamptz,

  -- sales_history: /saleshistory/detail
  attom_sales_history_payload jsonb,
  attom_sales_history_fetched_at timestamptz,

  -- assessment: /assessment/detail
  attom_assessment_payload jsonb,
  attom_assessment_fetched_at timestamptz,

  -- assessment_history: /assessmenthistory/detail
  attom_assessment_history_payload jsonb,
  attom_assessment_history_fetched_at timestamptz,

  -- building_permits: /property/buildingpermits
  attom_building_permits_payload jsonb,
  attom_building_permits_fetched_at timestamptz,

  -- rental_avm: /valuation/rentalavm
  attom_rental_avm_payload jsonb,
  attom_rental_avm_fetched_at timestamptz,

  -- ---- MLS endpoints -----------------------------------------------
  -- mls_search: GET /api/properties/search
  mls_search_payload jsonb,
  mls_search_fetched_at timestamptz,

  -- mls_details: GET /api/properties/attom/{attomId}
  mls_details_payload jsonb,
  mls_details_fetched_at timestamptz,

  -- mls_history: GET /api/properties/{mlsRecordId}/history
  mls_history_payload jsonb,
  mls_history_fetched_at timestamptz,

  -- mls_images: list of image URLs (not blobs); azure-blob-preferred
  -- subset is computed at read time in src/lib/enrichment/service.ts.
  mls_images jsonb,

  -- ---- Cross-cutting -----------------------------------------------
  sources text[] not null default '{}',
    -- Which endpoints we have payloads for. Empty array = negative-cache
    -- row (looked up, no match, will retry after negative-cache TTL).

  geoid_v4 text,
    -- ATTOM GeoIDV4 resolved once and reused for area-scope endpoints
    -- (links into area_enrichments). Populated from attom_profile_payload
    -- when present.

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- zip index for regional analytics (per-endpoint hit-rate by zip in S6
-- dashboards) and for ad-hoc operational queries.
create index if not exists property_enrichments_zip_idx
  on public.property_enrichments (zip);

-- Covering index for the staleness sweep: pulls the address_key + the
-- profile freshness without touching the wide jsonb columns.
create index if not exists property_enrichments_profile_staleness_idx
  on public.property_enrichments (address_key, attom_profile_fetched_at);

-- geoid_v4 index for area-scope read joins.
create index if not exists property_enrichments_geoid_idx
  on public.property_enrichments (geoid_v4)
  where geoid_v4 is not null;

alter table public.property_enrichments enable row level security;

-- updated_at maintenance trigger.
create or replace function public.touch_property_enrichments_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists property_enrichments_touch_updated_at
  on public.property_enrichments;
create trigger property_enrichments_touch_updated_at
  before update on public.property_enrichments
  for each row
  execute function public.touch_property_enrichments_updated_at();

comment on table public.property_enrichments is
  'Durable cache of ATTOM + MLS responses keyed by address_key (sha256 from addressCacheKey). Per-endpoint jsonb + *_fetched_at columns enable independent stale-checks and partial refresh — see src/lib/enrichment/durable-cache-policy.ts for TTLs (E12-S3). Service-role only via RLS default-deny; no seller PII on this table.';

comment on column public.property_enrichments.sources is
  'Endpoints we have payloads for. Empty array marks a negative-cache row (address looked up, no upstream match) that the policy table re-checks after the negative-cache TTL.';

-- =====================================================================
-- 2. area_enrichments — per-region durable cache
-- =====================================================================

create table if not exists public.area_enrichments (
  geoid_v4 text primary key,
    -- ATTOM GeoIDV4 (zip-or-finer geography). One row per region.

  -- ---- ATTOM area-scope endpoints ----------------------------------
  -- area_sales_trend: /salestrend/snapshot
  attom_sales_trend_payload jsonb,
  attom_sales_trend_fetched_at timestamptz,

  -- schools: /school/search
  attom_schools_payload jsonb,
  attom_schools_fetched_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.area_enrichments enable row level security;

create or replace function public.touch_area_enrichments_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists area_enrichments_touch_updated_at
  on public.area_enrichments;
create trigger area_enrichments_touch_updated_at
  before update on public.area_enrichments
  for each row
  execute function public.touch_area_enrichments_updated_at();

comment on table public.area_enrichments is
  'Durable cache of ATTOM area-scope endpoints (salestrend, schools) keyed by geoid_v4. Same payload-per-endpoint shape as property_enrichments. Service-role only via RLS default-deny.';
