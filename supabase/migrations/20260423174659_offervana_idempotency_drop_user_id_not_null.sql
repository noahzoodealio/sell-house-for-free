-- E5 follow-up: switching from the internal CreateHostAdminCustomer
-- (which returned user_id as ValueTuple item2) to the OuterAPI
-- /openapi/Customers (which returns GetCustomersDto with only `id` +
-- `referalCode`; no separate user id). Drop the NOT NULL constraint so
-- the idempotency store can insert user_id as null for new rows.
-- Existing rows stay as-is.

alter table public.offervana_idempotency
  alter column user_id drop not null;
