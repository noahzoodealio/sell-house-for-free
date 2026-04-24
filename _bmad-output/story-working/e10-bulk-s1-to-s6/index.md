---
slug: e10-bulk-s1-to-s6
parent-epic-id: 7919
parent-epic-url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7919
ado-grandparent-epic-id: 7776
ado-grandparent-epic-url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7776
mode: bulk
mode-ado: mcp
architecture-doc: null  # brief called for /zoo-core-create-architecture e10 but story decomposition proceeded directly from the epic brief; architecture doc can still be added before Dev picks this up
stories-planned:
  - e10-s1-supabase-auth-provider-config
  - e10-s2-portal-auth-callback
  - e10-s3-portal-login-otp-screen
  - e10-s4-seller-rls-and-portal-hydration
  - e10-s5-portal-auth-middleware
  - e10-s6-auth-ops-and-observability
stories-created:
  - id: 7923
    url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7923
    title: "E10-S1 — Supabase Auth provider config: enable email OTP + phone OTP (Twilio) + magic-link redirect to /portal/auth/callback"
    size: S
  - id: 7924
    url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7924
    title: "E10-S2 — /portal/auth/callback route: exchange magic-link + OTP verification, expired/used link re-send UI"
    size: M
  - id: 7925
    url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7925
    title: "E10-S3 — /portal/login OTP screen: email-or-phone tabbed sign-in, 6-digit verify, 3-per-15min rate limit, TCPA gate on phone"
    size: M
  - id: 7926
    url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7926
    title: "E10-S4 — Seller RLS policies on profiles/submissions/submission_offers + portal hydration from Supabase (localStorage shim = dev-only)"
    size: M
  - id: 7927
    url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7927
    title: "E10-S5 — Portal auth middleware: redirect anonymous /portal/* to /portal/login preserving ?redirect=; noindex header"
    size: S
  - id: 7928
    url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7928
    title: "E10-S6 — Auth ops + observability: Sentry events, alert rules, Twilio budget, runbook \"seller can't log in\" triage + session-revoke SOP"
    size: M
void-stubs:
  - id: 7922
    reason: created while debugging create-work-item tool payload shape; marked [VOID] in title
started-at: 2026-04-23T22:00:00Z
completed-at: 2026-04-23T22:10:00Z
last-completed-step: 5
---

# E10 — Seller Passwordless Auth — Story Decomposition

Filed 6 User Stories under Feature 7919 via `/zoo-core-create-story E10` on 2026-04-23.

## Suggested implementation order

1. **S1 (7923)** — provider config only; dashboard + env + runbook stub. Unblocks everything.
2. **S2 (7924)** — callback route + re-send UI + `auth_resend_attempts` table + `@supabase/ssr`.
3. **S3 (7925)** — `/portal/login` OTP form; reuses S2's rate-limit table + SSR client.
4. **S4 (7926)** — RLS policies + portal hydration from Supabase (dev-only localStorage fallback).
5. **S5 (7927)** — middleware guard; closes the anonymous-portal gap S4 left as a placeholder pane.
6. **S6 (7928)** — observability + runbook + 7-day dry-run. Intentionally runs last so thresholds reflect real traffic.

## Dependency chain

```
S1 ──┬── S2 ──┬── S3 ──┬── S4 ──┬── S5 ──┬── S6
     │        │         │        │         │
     └────────┴─────────┴────────┴─────────┘
        (S6 instruments all prior surfaces)
```

S2 and S3 share the `auth_resend_attempts` table (S2 creates; S3 reuses). S4's hydration doesn't gate S5 functionally, but S5's guard is a better UX than S4's empty-state pane, so S5 lands quickly after S4.

## Key architectural decisions locked in the stories

- **SSR client library:** `@supabase/ssr` (cookie-based; Supabase's current recommendation; replaces deprecated `@supabase/auth-helpers-nextjs`).
- **`shouldCreateUser: false` on all OTP sends** — login flow never provisions new users. E6-S3 is the sole `auth.users` insertion path.
- **Anon key is public** (`NEXT_PUBLIC_SUPABASE_*`); service-role key stays server-only (E6-S1 enforces `import 'server-only'`).
- **TCPA gate lives in the server action**, not the Supabase dashboard — only we know the consent version on `profiles`.
- **Same-origin enforcement** on every `redirect_to` / `redirect` param (callback + login verify). Off-origin silently collapses to `/portal`.
- **Rate limit shared** between re-send (S2) and login-send (S3) via one `auth_resend_attempts` table; 3 per identifier per 15 min.
- **Middleware runtime = `nodejs`** (explicit), per Fluid Compute knowledge-update.
- **PII in Sentry:** `user_id` + `identifier_type` only. Never raw email/phone. Unit test verifies no `@` chars in serialized payloads.

## Open questions answered in stories

From the epic brief's "Key decisions to lock at architecture time" list:

- Magic-link TTL: **24h** (kept from S1 dashboard setting); 30-min for resends not enforced in stories — can be added as S1 refinement.
- OTP code length: **6 digits** (kept).
- Session duration after login: NOT explicitly pinned in the stories — Supabase defaults apply (default session is 1h access token + 1-year refresh with 30-day absolute). Recommend a follow-up in S6's 7-day dry-run to document actual observed behavior.
- Phone OTP provider: **Twilio** (S1 AC 2).
- Phone OTP requires verified email first? **No** — S3 gates on TCPA consent only (matches epic-brief guidance).
- Second submission with same email: already safe via E6 `offervana_idempotency` + E6-S1 `profiles.email UNIQUE`. Not touched by E10.

## Flagged for Noah before Dev picks this up

1. **No architecture doc exists.** Epic brief called for `/zoo-core-create-architecture e10` before decomposition. Story ACs are grounded in the epic brief + real code research, so Dev has enough to implement — but if you want a formal arch doc, file it before S2 starts. Stories will remain valid.
2. **Twilio tenant decision.** S1 AC 2 assumes either new-account or reuse-Zoodealio-tenant. If a shared Zoodealio Twilio tenant exists, point S1 implementer to the credentials source.
3. **Session duration not pinned.** If you want 30-day sliding (epic-brief recommendation), add an AC to S1: "Supabase session settings — access token lifetime = 3600s (default), refresh token rotation enabled, inactivity timeout = 30 days."
4. **7-day dry-run on S6.** Intentional. S6 stays in Code Review for a week after S1-S5 land in preview, then tunes thresholds with real data. Adjust if you want to ship faster.

## Void stubs

- **7922** — stub created while debugging the create-work-item tool payload shape. Retitled `[VOID] test stub`. Recommend deleting via ADO UI at your convenience (no MCP delete tool available here).

## References

- Epic brief: `_bmad-output/epic-working/e10-seller-passwordless-auth/index.md`
- E6-S1 schema (profiles, submissions, submission_offers, team_members): `_bmad-output/story-working/e6-bulk-s1-to-s8/scope-revision-2026-04-23.md`
- TCPA registry: `src/content/consent/tcpa.ts`
- AI posture: `docs/ai-agent-policy.md`
- Analytics policy: `docs/analytics-policy.md`
- Memory — React 19 ref-as-prop: `C:\Users\Noah\.claude\projects\C--Users-Noah-sell-house-for-free\memory\feedback_react19_ref_as_prop.md`
- Memory — Storage Supabase-only: `C:\Users\Noah\.claude\projects\C--Users-Noah-sell-house-for-free\memory\project_storage_supabase_only.md`
- Memory — Unified team role: `C:\Users\Noah\.claude\projects\C--Users-Noah-sell-house-for-free\memory\project_unified_team_role.md`
