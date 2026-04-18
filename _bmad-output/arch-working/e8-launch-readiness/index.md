---
feature: e8-launch-readiness
services-in-scope:
  - sell-house-for-free
  - Zoodealio.Infrastructure (DNS note only — no IaC changes required for Vercel MVP)
upstream-research: _bmad-output/planning-artifacts/project-plan-sell-house-for-free.md §4 E8
started-at: 2026-04-17T00:00:00Z
last-completed-step: 5
---

# E8 Architecture — Working Sidecar

**Scope recap (plan §4 E8):**
Close out all the structural seams E1-E7 left open so the site can go live on Vercel under a production apex domain, with: security headers + CSP, Sentry-backed error tracking, Web Vitals → first-party analytics sink, a Playwright E2E smoke test exercising the full integration spine (form → enrichment → Offervana lead → PM notified), an env-var + secret-rotation runbook, an anti-third-party-PII audit, a pre-launch gate that verifies consent copy has been finalized by E7, and rate-limit/abuse-mitigation posture.

**Boundaries:**
- **Vercel is the hosting target.** Per plan Q8. Azure Container Apps evaluated and rejected; the comparison is documented in §5.
- **No new application-level features.** E8 ships no new pages, no new form steps, no new integrations. It hardens what E1-E7 already shipped and flips env-aware toggles for production.
- **No platform-side changes.** Offervana, Zoodealio.MLS, Zoodealio.Shared all remain untouched. E8 is consumer-only.
- **Infrastructure repo minimal involvement.** `Zoodealio.Infrastructure/` is Terraform-for-Azure; since production hosting is Vercel, the Infrastructure repo is informational only in MVP. A short reference note is added so the ops team knows what *isn't* in Terraform.

**Accumulated deferrals E8 must close** (audited across E1-E7 arch + sidecars):
- CSP / security headers (E1 §7 + deviation table)
- Rate-limit + CAPTCHA/Turnstile review (E3 §5 deviation — "flag for E8 review before launch")
- Consent copy `isPlaceholder: false` gate (E3 §5 + §7 → E7 delivers copy; E8 gates release on it)
- MLS photo-SAS rotation tracker (E4 sidecar — expires 2027-02-11)
- Third-party PII pixel audit (plan §3 NF + §7 Q12)
- `robots.ts` production index-gate verification (E1 §3.1)
- `buildMetadata({ noindex: true })` still applied to `/get-started/*` in prod (E3 §3.1)

**Services in scope:**
- `sell-house-for-free` — adds `proxy.ts` (CSP + nonce), `instrumentation.ts` + `instrumentation-client.ts` edits (Sentry), `next.config.ts` `headers()` (static security headers), Playwright E2E suite under `tests/e2e/`, `docs/launch/*.md` runbooks, `docs/security/*.md` posture docs, prod env var matrix populated in Vercel.
- `Zoodealio.Infrastructure` — **informational** entry in the Terraform root README noting that `sell-house-for-free` is hosted on Vercel, not in Azure. No Terraform modules added.

**Dependency on predecessors:**
- E2 must be shipping marketing routes so smoke tests have real pages to hit and the sitemap is complete.
- E5 must be producing an idempotency-keyed submission path so the smoke test can exercise it without creating duplicate Offervana leads.
- E6 must expose the PM assignment + SendGrid notification seam so the smoke test can assert PM notification fires.
- E7 must have finalized consent copy (`isPlaceholder: false` on tcpa/terms/privacy constants) for the launch gate to pass.

**Survey targets (step 2 — completed):**
- Next.js 16 `02-guides/production-checklist.md` — CSP, tainting, env-var hygiene guidance.
- Next.js 16 `02-guides/content-security-policy.md` — **proxy.ts** (middleware renamed), nonce vs. static CSP tradeoffs, dynamic-rendering implications.
- Next.js 16 `03-api-reference/03-file-conventions/proxy.md` — matcher config, asset exclusions.
- Next.js 16 `02-guides/instrumentation.md` — `register()` pattern, `NEXT_RUNTIME` runtime split.
- Next.js 16 `02-guides/analytics.md` — `useReportWebVitals` Client-only boundary.
- Next.js 16 `02-guides/deploying-to-platforms.md` — feature matrix; confirms Vercel gives functional + performance fidelity for every feature the plan needs.
- Next.js 16 `02-guides/testing/playwright.md` — E2E test scaffolding pattern.
- Next.js 16 `03-api-reference/05-config/01-next-config-js/headers.md` — static header blocks.
- @vercel/analytics — already in deps from E1, first-party only.
- @vercel/otel — evaluated for tracing; deferred post-MVP (§6 open question).
- Sentry Next.js 16 SDK — `@sentry/nextjs` with native instrumentation.ts integration; no webpack plugin required in 16.
- Consent-copy pre-launch gate — mechanism: `isPlaceholder: boolean` flag on each constant, enforced by a `scripts/check-launch-gate.ts` run in CI + Vercel `Ignored Build Step`.

**Open questions still carrying (non-blocking):**
- Exact Sentry DSN + org project — ops to provision.
- Turnstile site keys — ops to provision IF we adopt Turnstile (recommended by §5).
- Apex domain final copy — "sellyourhousefree.com" assumed per brand; confirm with legal/registrar.
- Whether OTel tracing (via `@vercel/otel`) ships in MVP or post-launch (proposed: post-launch; Sentry Performance covers MVP needs).

**Handoff pointers:**
- Feeds: `zoo-core-create-epic` for E8, then `zoo-core-create-story`.
- Critical-path dependency: this is the last Feature under umbrella Epic 7776. Closing it closes the MVP.
