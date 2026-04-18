---
feature: e6-pm-service-and-confirmation
services-in-scope:
  - sell-house-for-free (authoritative — owns Supabase schema, PM assignment, email dispatch, confirmation page)
  - Supabase (new, dedicated project; authoritative for PM roster + assignment records)
  - SendGrid (external; consumed via @sendgrid/mail)
  - Offervana_SaaS (read-only — ReferralCode + customerId handed off from E5; E6 does NOT call Offervana back)
upstream-research: _bmad-output/planning-artifacts/project-plan-sell-house-for-free.md §4 E6
started-at: 2026-04-17
last-completed-step: 5
---

# E6 — Project Manager Service & Confirmation — arch working notes

## Scope snapshot
- Greenfield lightweight backend, NO Offervana schema changes
- Supabase is the system of record for PM roster + submission↔PM mapping
- Notifications: SendGrid direct (shared Zoodealio sending domain for DKIM consistency)
- Confirmation page replaces E3's stub at `/get-started/thanks`
- E5 is the call site — after successful `CreateHostAdminCustomer`, E5's actions.ts calls into E6's assignment function

## Key design decisions
1. Round-robin assignment via Postgres stored procedure (transactional, concurrency-safe)
2. Idempotency keyed on Offervana's `ReferralCode`
3. All DB access server-side only (service role key never leaves server)
4. Emails are best-effort — failures logged, don't block redirect
5. No client-side Supabase; no admin UI in MVP (roster via migrations/seed)

## Patterns surveyed
- Zoodealio baseline: `_bmad/memory/zoo-core/curated/patterns.md` — SendGrid via `Integrations/` (Offervana only; our BFF uses `@sendgrid/mail` directly)
- E1 arch §5 — E6 owns `@supabase/supabase-js` dep (E1 does not install)
- E3 arch §4.5 — E3 hands off `/get-started/thanks?ref=<submissionId>`; E6 replaces body
- E5 (not yet arch'd) — E5 returns `ReferralCode` from Offervana; E6 uses it as correlation key

## Open questions (non-blocking)
- Supabase region — us-west-2 preferred
- PM admin UI — defer
- SendGrid template authorship — decide during dev
- Slack ops alerts — defer to E8
- Area-aware assignment — defer
