---
epic-id: 7919
epic-slug: e10-seller-passwordless-auth
epic-title: "E10 — Seller Passwordless Auth"
branch: feature/e10-passwordless-auth
base-branch: main
autopilot-status: complete
started-at: 2026-04-24T00:00:00Z
completed-at: 2026-04-24T03:00:00Z
---

# E10 — Seller Passwordless Auth — Summary Report

Six stories, one branch, one PR surface. Implemented end-to-end per the user's branch-strategy override. All stories land in a state where code review can run; two remain gated on real-world smoke that requires the user's Supabase/Twilio dashboard access.

## Per-story outcomes

| Story | Title | Outcome | ADO status | Sidecar |
|---|---|---|---|---|
| **S1 (7923)** | Supabase Auth provider config | ✅ code landed — manual dashboard + Vercel + Twilio steps pending | New → stays New until user confirms dashboard apply | `_bmad-output/story-working/e10-s1-supabase-auth-provider-config/` |
| **S2 (7924)** | `/portal/auth/callback` + re-send UI + migration | ✅ code landed — migration awaits `supabase db push` | stays New | `_bmad-output/story-working/e10-s2-portal-auth-callback/` |
| **S4 (7926)** | Seller RLS + portal hydration from Supabase | ✅ code landed — migration awaits `supabase db push`; cross-read smoke pending | stays New | `_bmad-output/story-working/e10-s4-seller-rls-and-portal-hydration/` |
| **S3 (7925)** | `/portal/login` OTP screen + server actions | ✅ code landed — live-smoke pending S1 dashboard + S2 migration | stays New | `_bmad-output/story-working/e10-s3-portal-login-otp-screen/` |
| **S5 (7927)** | Portal auth middleware | ✅ code landed — curl smokes pending deploy | stays New | `_bmad-output/story-working/e10-s5-portal-auth-middleware/` |
| **S6 (7928)** | Auth ops + observability | ✅ code + tests landed — 7-day dry-run gate per story AC | `implemented-awaiting-dry-run` | `_bmad-output/story-working/e10-s6-auth-ops-and-observability/` |

**ADO state note:** the work-item state `Active` isn't in the allowed transitions for this project's User Story workflow (tested early in S1 and failed). Story-status field transitions are left for manual update by the user once smokes verify in dev.

## Branch strategy (single-branch, per user override)

- All 6 commits on `feature/e10-passwordless-auth` cut from `main`.
- Commit style matches existing `e6-s*(id)` pattern.
- One PR covers the full epic — open with `gh pr create` when ready.

```
695caec e10-s6(7928): auth ops + observability wiring + runbook triage
6b68b7d e10-s5(7927): portal auth middleware
9ad1aa6 e10-s3(7925): /portal/login OTP screen + server actions
60689fd e10-s4(7926): seller RLS policies + portal Server Component hydration
13ee1ba e10-s2(7924): /portal/auth/callback + re-send UI + auth_resend_attempts migration
92fae14 e10-s1(7923): Supabase Auth provider config docs + .env.example
```

## Execution-order deviation from plan

Plan ordered: S1 → S2 → **S4** → **S3** → S5 → S6 (higher-risk S4 before S3 per risk-first tiebreak).

Actual: matched the plan exactly.

## Aggregate metrics

- **35 files changed, +2815 / -15 lines.**
- **2 Supabase migrations** added (`auth_resend_attempts`, `seller RLS`) — both require manual `supabase db push` to apply.
- **4 unit tests** added (`events.test.ts` PII guard). Total test suite: **400 passed** (was 396 before the epic).
- **Typecheck:** clean after every commit.
- **`next build`:** passes after every commit; final output shows new dynamic routes `ƒ /portal/auth/callback`, `ƒ /portal/auth/expired`, `ƒ /portal/login`, and `/portal` moved from static `○` to dynamic `ƒ` (expected — Server Component reads session cookies).
- **2 new packages:** `@supabase/ssr@^0.10.2`, `libphonenumber-js@^1.12.42`.

## Review findings (inline self-review during autopilot)

Hard failures: none.

Deviations flagged in per-story sidecars:

- **S2:** Email path via Supabase `generateLink` relies on the email template pipeline; if S1 dashboard disables built-in templates without a replacement wired, send may silently drop. Mitigation: verify during S1 smoke; swap to `sendEmail` with the `generateLink` URL if needed.
- **S4 (AC 6):** Rather than converting the full `PortalData` from snapshot, adapter populates user + property + offers live and leaves non-backed sections (team, plan, docs, guides) as neutral placeholders. Cleaner than leaking `seedPortal` demo copy; empty sections wait for follow-up stories.
- **S5 (AC 14):** Next 16 doesn't print middleware bundle size in local `next build`. Information is available via Vercel build UI — check when the branch deploys.
- **S6 (ACs 7-8, 13):** Sentry alert rules are documented in runbook §16; live configuration depends on E8's Sentry SDK wiring + on-call channel definition. The 7-day dry-run is a story-level gate per its own AC; S6 stays `implemented-awaiting-dry-run` until verified with real data.

## Patterns observed (candidates for `curate-memory`)

- **React 19 ref-as-prop:** every new component (`ResendForm`, `LoginForm`, `OtpCodeInput`) uses `Ref<HTMLElement>` prop; no `forwardRef`. Confirms the project convention.
- **Supabase RLS via `auth.uid()`:** the transitive `exists()` subquery pattern on `submission_offers` is idiomatic; E11's future team-member RLS can reuse the shape.
- **Structured-event pattern:** reusing `captureException` from `src/lib/pm-service/observability.ts` rather than inventing a second helper kept the Sentry-swap path single-sourced. When E8 wires the SDK, both PM and auth events light up together.
- **Same-origin redirect collapse (silent):** S2's callback + S3's login verify + S5's middleware all enforce same-origin on the redirect param with a silent collapse to `/portal` rather than an error. Open-redirect hardening convention worth locking in for other authenticated surfaces.
- **Auth event PII rule:** `userId` + `identifierType` + `method` + `reason` — never raw email/phone. Unit test as the canary. Future auth work should keep the rule + the `@`-char guard.

## Follow-ups surfaced

### Blocks PR merge (user action)

1. **Supabase dashboard config** (S1 manual steps, runbook §12).
2. **Apply migrations to dev:** `supabase db push` twice (auth_resend_attempts + seller_rls_policies).
3. **Twilio A2P 10DLC** registration; fill brand + campaign IDs into runbook §12.5.
4. **Vercel env vars:** `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` in Prod + Preview + Development.

### Smoke tests (after the above)

5. **Two-seller RLS smoke:** submit through E6 twice, confirm cross-read denial on `submissions` / `profiles` / `submission_offers`.
6. **Full flow smoke:** magic-link from E6 confirmation email → `/portal/auth/callback` → `/portal` hydration. Re-send flow via `/portal/auth/expired`. Email OTP flow via `/portal/login`. Phone OTP (TCPA-present) via `/portal/login`. Phone without TCPA shows clean reject.
7. **Middleware smoke:** curl `/portal` anonymously → 307 to `/portal/login?redirect=%2Fportal`.

### Deferred

8. **S6 7-day dry-run** (story AC — stays in Ready for Testing until real thresholds emerge).
9. **Sentry SDK install** — E8's scope. Once live, the two alert rules in runbook §16 can be created.
10. **E6-S4 custom Resend magic-link template** — if S1 deliverability verification shows Supabase isn't sending the magic link after built-in templates are disabled, follow up with a Resend-backed template that carries the `generateLink` URL.

## Close-out checklist

- [x] All 6 stories have code committed on `feature/e10-passwordless-auth`.
- [x] `next build` passes on branch tip.
- [x] All 400 existing tests pass; 4 new ones added.
- [x] Typecheck clean.
- [x] Each story has a sidecar in `_bmad-output/story-working/e10-s*/`.
- [x] Epic sidecar + summary in `_bmad-output/dev-working/epic-7919/`.
- [ ] PR opened (user action).
- [ ] Migrations applied (user action).
- [ ] Dashboard + Vercel + Twilio config (user action).
- [ ] 7-day dry-run (user-scheduled per S6).

## Next steps

Open the PR when ready:

```
gh pr create --title "E10: Seller Passwordless Auth (6 stories on one branch)" \
  --body-file _bmad-output/dev-working/epic-7919/summary-report.md
```

Then apply the two migrations in sequence and walk the smoke matrix above.
