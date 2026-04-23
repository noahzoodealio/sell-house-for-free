-- E5 follow-up: persist OffersV2 payload + propertyId on the idempotency row
-- so the portal can read back the fetched offers without re-calling Offervana.
--
-- propertyId is required to re-fetch OffersV2 later (idempotency replay path
-- currently returns it as null; see src/lib/offervana/idempotency.ts). The
-- offers_v2_payload column stores the raw `{ result: [...] }` array exactly
-- as returned by /openapi/OffersV2 — the mapper in src/lib/offervana/map-offers.ts
-- reads it and projects it into the portal's PortalOffer shape.

alter table public.offervana_idempotency
  add column if not exists property_id integer,
  add column if not exists offers_v2_payload jsonb,
  add column if not exists offers_v2_fetched_at timestamptz;
