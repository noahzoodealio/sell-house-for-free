---
slug: e10-s1-supabase-auth-provider-config
ado-story-id: 7923
ado-url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7923
parent-epic-id: 7919
branch: feature/e10-passwordless-auth
status: implemented
started-at: 2026-04-24T00:00:00Z
---

# E10-S1 — Supabase Auth provider config

## Scope delivered (code-side)

Pure config/docs story. No `src/**` diff. Two edits:

1. **`.env.example`** — added `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` with a comment block explaining safety posture.
2. **`docs/pm-ops-runbook.md`** — appended Section 12 "Auth provider configuration (E10)" with 8 subsections covering provider states, TTLs, redirect allow-list, email-template disable, Twilio, rate limits, credential rotation, and do-not list.

## Manual steps still required (blocks downstream smoke tests, not the commit)

These are NOT in the commit — they are dashboard/vendor actions only the user can perform:

- [ ] Supabase dashboard → Auth → Providers → **Email:** enable Magic Link + OTP.
- [ ] Supabase dashboard → Auth → Providers → **Phone:** enable; paste Twilio Account SID + Auth Token + Messaging Service SID.
- [ ] Supabase dashboard → Auth → URL Configuration → add `/portal/auth/callback` + `/portal/setup` to allow-list for Prod + Preview + Local.
- [ ] Supabase dashboard → Auth → Email Templates → **disable** built-in `signup` + `magiclink` templates.
- [ ] Supabase dashboard → Auth → Rate Limits → confirm defaults (30/hr magic-link, 60/hr email OTP).
- [ ] Twilio: register A2P 10DLC brand + campaign (or verify toll-free). Fill brand/campaign IDs into runbook Section 12.5.
- [ ] Vercel → Project Settings → Environment Variables → add `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` for Production + Preview + Development (same values as server-only `SUPABASE_URL` + `SUPABASE_ANON_KEY`).

## Acceptance criteria mapping

| AC | Evidence |
|---|---|
| 1 | Runbook §12.1 documents email provider with both modes enabled. Dashboard step pending. |
| 2 | Runbook §12.5 documents Twilio wiring; creds live in Supabase dashboard, never in `.env.*`. Dashboard step pending. |
| 3 | Runbook §12.5 documents A2P 10DLC with placeholder brand/campaign IDs to fill. |
| 4 | Runbook §12.3 documents exact allow-list entries + env matrix. Dashboard step pending. |
| 5 | Runbook §12.2 documents 6-digit OTP length. |
| 6 | Runbook §12.2 documents 300s OTP expiry. |
| 7 | Runbook §12.2 documents 86400s magic-link expiry. |
| 8 | Runbook §12.4 documents built-in template disable posture. |
| 9 | Runbook §12.6 documents rate-limit baselines. |
| 10 | Test plan documented as manual steps above; smoke pending dashboard config. |
| 11 | `.env.example` appended with `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`. |
| 12 | Documented in sidecar "Manual steps" section; requires user action in Vercel. |
| 13 | Runbook §12.1-§12.8 covers all required content. |
| 14 | `git diff --stat` shows only `.env.example` + `docs/pm-ops-runbook.md` modified (no `src/**`). |

## Files changed

- `.env.example` — +9 lines (2 new vars + comment block)
- `docs/pm-ops-runbook.md` — +~70 lines (Section 12 "Auth provider configuration (E10)")

## Known deviations from story AC

- AC 3: A2P 10DLC brand/campaign IDs left as placeholders in runbook (`_____`) — user must fill after Twilio registration.
- AC 12-13: Dashboard/Vercel work is documented but not executed. Downstream stories (S2, S3) cannot be fully smoke-tested until the user completes Manual Steps above, but the code can still land.

## Out of scope (per story spec)

- `/portal/auth/callback` route (S2)
- `/portal/login` UI (S3)
- RLS (S4)
- Middleware (S5)
- Full Sentry runbook (S6)
