---
slug: e10-seller-passwordless-auth
ado-epic-id: 7919
ado-url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7919
ado-parent-epic-id: 7776
ado-parent-epic-url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7776
work-item-type: Feature
mode: mcp
action: create-new
status: filed
created-at: 2026-04-23T00:00:00Z
filed-at: 2026-04-23T21:27:54Z
---

# E10 — Seller Passwordless Auth — Epic Brief

Filed as ADO Feature **7919** under Epic 7776 on 2026-04-23 via `/zoo-core-create-epic`. Full architecture doc to follow via `/zoo-core-create-architecture e10` before story decomposition is locked.

## Summary

Sellers authenticate into `/portal` via Supabase Auth with **no password ever**. Two entry modes:

1. **First-login (seamless)** — the magic link in the E6 seller-confirmation email auto-authenticates the seller into `/portal`. They never see a sign-in screen on their first visit.
2. **Future logins** — seller chooses email OTP or phone OTP at a minimal sign-in screen. 6-digit code (SMS or email), 5-min TTL, 3-attempt lockout.

No password field anywhere. No "create account" step anywhere. No OAuth providers.

## Why

- Password-based auth is dead weight for a transactional real-estate portal — sellers come through once, don't memorize another password, and password reset becomes the single largest support ticket category.
- E6 already creates `auth.users` + `profiles` rows server-side at submit time. The magic link in the confirmation email *is* the first login event. Making it seamless is a ~1-story reveal of work we're already doing.
- Phone OTP is on-brand for the 4 seller paths — some sellers don't check email reliably but all check SMS.
- TCPA consent (E7) is the gating constraint for SMS; the registry already captures it.

## Dependencies

- **E6-S1** (revised) — `profiles` + `submissions` tables + `auth.users` row created at submit time
- **E6-S3** (revised) — server-side `supabase.auth.admin.createUser({ email, phone, email_confirm: false })` in `assignPmAndNotify`
- **E6-S4** (revised) — seller confirmation email contains the magic link
- **E7-S3 / E7-S4** — TCPA consent registry + captured consent version on `profiles` (gates phone OTP)
- **Supabase Auth** — already provisioned in E6-S1; Phone provider needs Twilio (or MessageBird) credentials at the Supabase dashboard level

## Proposed stories (rough — 6 stories, subject to architecture refinement)

- **E10-S1** — Supabase Auth provider configuration: enable email OTP, enable phone OTP with Twilio, configure magic-link redirect to `/portal/auth/callback`, email template override (lightweight — just routes to the Resend-sent confirmation, not Supabase's default).
- **E10-S2** — `/portal/auth/callback/route.ts` — exchange the magic-link code for a session, set the auth cookie, redirect to `/portal`. Handle the expired-link + already-used-link cases with a clean re-send UI.
- **E10-S3** — `/portal/login/page.tsx` — minimal sign-in screen. Tab toggle: "Email me a code" / "Text me a code." POST `signInWithOtp({ email })` or `signInWithOtp({ phone })`. 6-digit input on the next step. Rate-limit: 3 sends per identifier per 15min.
- **E10-S4** — RLS policies on `profiles`, `submissions`, `submission_offers`, `submission_offers`: seller reads rows where `seller_id = auth.uid()`. Writes via server actions (service-role). Hydrate the portal from Supabase instead of `localStorage` (portal-data.ts seeding shim stays as last-resort fallback for dev).
- **E10-S5** — Portal auth middleware: anonymous visits to `/portal/*` redirect to `/portal/login` preserving `?redirect=`. Magic-link callback always honors `redirect` and goes to it post-session-set.
- **E10-S6** — Ops + observability: rate-limit tuning, Sentry events (`seller_login_succeeded`, `seller_login_failed`, `seller_magic_link_expired`), runbook section for "seller can't log in," session-revoke ops hook.

## Key decisions to lock at architecture time

- Magic-link TTL: default 24h (Supabase default) vs. shorten to 2h for security. Recommendation: 24h for first login (seller may not check email for hours), 30min for subsequent re-sends.
- OTP code length: 6 digits (Supabase default). Keep.
- Session duration after login: 30 days sliding. Longer is friendlier; shorter is safer. 30 days matches typical transaction window.
- Phone OTP provider: Twilio (native Supabase) vs. MessageBird vs. Vonage. Twilio unless we have a Zoodealio-wide reason to share another.
- Should phone OTP require verified-email first? Probably no — sellers who gave phone + TCPA consent should be able to log in via SMS only.
- What happens when a seller submits a second time with the same email? Second submit hits `email-conflict` in `offervana_idempotency`; does the second submission attach to the existing `auth.users` row? Yes — idempotency already makes this safe at the Offervana side; our side just needs not to double-insert the `profiles` row.

## Out of scope for E10

- OAuth (Google/Apple/Facebook) — not needed for this audience, adds consent complexity.
- Password-based login fallback — intentionally excluded.
- Multi-factor auth beyond OTP — OTP is already the primary factor.
- Team-member auth — lives in E11.
- Session revocation UI for sellers — ops can do this via Supabase dashboard for MVP.
- Passkeys / WebAuthn — future epic.

## Coordination

- **E6** provisions the auth user + sends the first magic link — E10 builds the receive + re-send + ongoing sign-in.
- **E7** owns TCPA consent copy and registry — E10 reads the current version on `profiles` before enabling phone OTP.
- **E11** (team-member portal) shares the same Supabase Auth instance but has its own role check + separate login route (`/team/login` probably). E10 doesn't cover team auth; but E10-S1's provider config applies to both.

## References

- Supabase Auth — Phone Login: https://supabase.com/docs/guides/auth/phone-login
- Supabase Auth — Passwordless Email: https://supabase.com/docs/guides/auth/auth-email-passwordless
- `docs/ai-agent-policy.md` — disclaimer posture that applies to any seller-facing auth error UI
- TCPA consent registry: `src/content/consent/versions.ts` (E7-S3)
