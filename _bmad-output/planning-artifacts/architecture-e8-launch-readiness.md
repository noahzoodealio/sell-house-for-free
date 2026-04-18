# Architecture — E8 Launch Readiness

- **Feature slug:** `e8-launch-readiness`
- **ADO Feature:** [7784](https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7784)
- **Repo:** `sell-house-for-free` (Next.js 16.2.3, React 19.2.4, Tailwind v4)
- **Upstream:** `_bmad-output/planning-artifacts/project-plan-sell-house-for-free.md` §4 E8
- **Depends on:** E2 (marketing routes live for smoke test), E5 (Offervana submission path wired), E6 (PM assignment + SendGrid trigger wired), E7 (final consent copy + legal pages shipped). E1/E3/E4 already landed as part of the critical path.
- **Feeds:** production launch (closes umbrella Epic 7776).
- **Author:** Noah (Architect) · 2026-04-17
- **Status:** draft — ready for PM decomposition

---

## 1. Summary

E8 is the **hardening + cutover** Feature. It adds no user-facing capability. It closes every seam E1-E7 left open for later — security headers + CSP, Sentry-backed error tracking + source maps, Web Vitals exported to a first-party sink, a Playwright E2E smoke test that exercises the full integration spine (form → enrichment → Offervana lead → PM notified), an environment-variable and secret-rotation runbook, a DNS/domain cutover runbook, a rate-limit + abuse-mitigation posture (Turnstile on the submit Server Action), a pre-launch gate that verifies E7's consent copy has been finalized (`isPlaceholder: false`), a third-party-PII audit, and the MLS photo-SAS rotation tracker (E4 sidecar deferral, expires **2027-02-11**).

The hosting target is **Vercel** (plan Q8). Azure Container Apps was evaluated and rejected — rationale in §5. `Zoodealio.Infrastructure` is informational-only in MVP (a single paragraph in its README noting that this service is not in Terraform); no IaC module is added.

**Affected services:** `sell-house-for-free` (primary); `Zoodealio.Infrastructure` (docs-only).

**Pattern adherence snapshot**

| Area | Choice | Pattern source |
|---|---|---|
| Security-critical headers | `proxy.ts` for CSP + nonce; `next.config.ts` `headers()` for the static header bundle | Next.js 16 `02-guides/content-security-policy.md` + `03-api-reference/05-config/01-next-config-js/headers.md` |
| Middleware naming | `proxy.ts` (not `middleware.ts`) | Next.js 16 `03-api-reference/03-file-conventions/proxy.md` — `middleware` is deprecated |
| CSP strategy | **Static CSP in `next.config.ts` + SRI for scripts**, *not* per-request nonce | Next.js 16 CSP doc §Without Nonces + §Subresource Integrity — preserves static generation / CDN caching which the marketing site depends on |
| Error tracking | `@sentry/nextjs`, init from `instrumentation.ts` (server) + `instrumentation-client.ts` (browser) | Next.js 16 `02-guides/instrumentation.md` + Sentry Next.js 16 integration |
| Web Vitals sink | `useReportWebVitals` → Vercel Analytics (first-party) + optional Sentry Performance | Next.js 16 `02-guides/analytics.md` |
| E2E smoke | Playwright under `tests/e2e/`, runs in CI + against preview URL | Next.js 16 `02-guides/testing/playwright.md` |
| Rate limiting + abuse | Cloudflare Turnstile on the submit Server Action; Vercel WAF rules for `/api/*` | Plan §3 NF (no Google reCAPTCHA — ships PII to Google) + E3 §5 deviation |
| Env-var management | Vercel Project Environment Variables (Production / Preview / Development); secrets never in-repo | Next.js 16 `02-guides/environment-variables.md` + production-checklist §Security |
| Secret rotation | Runbook in `docs/launch/secret-rotation.md` with owners + cadences | Operational standard — no framework convention |
| DNS cutover | Runbook in `docs/launch/dns-cutover.md` | Operational standard |
| Launch gate | `scripts/check-launch-gate.ts` invoked by Vercel `Ignored Build Step` and CI | Plan §7 Q12 + E3 §5 consent-copy gate |

**Deferrals closed by E8**

| Deferral | Source | How E8 closes it |
|---|---|---|
| CSP / security headers | E1 arch §7 + §6 deviation table | §3.2 + §3.3 below |
| Rate-limit + CAPTCHA | E3 arch §5 deviation "flag for E8 review before launch" | §3.4 Turnstile + §3.5 Vercel WAF |
| Consent-copy `isPlaceholder: false` | E3 arch §5 deviation + §7 | §3.9 launch gate script |
| MLS photo-SAS expiry 2027-02-11 | E4 sidecar | §3.10 rotation tracker + calendar reminder |
| Third-party-PII pixel audit | Plan §3 NF + §7 Q12 | §3.8 audit + CSP `connect-src` allowlist |
| `robots.ts` prod-only indexing | E1 §3.1 | §3.9 launch gate assertion |
| `/get-started/*` noindex in prod | E3 §3.1 | §3.9 launch gate assertion |

---

## 2. Component diagram

```
     ┌─────────────────────────────────────────────────────────────────────┐
     │                              Vercel                                  │
     │   ┌─────────────────────┐  ┌────────────────┐  ┌─────────────────┐  │
     │   │  Production          │  │  Preview       │  │  Development    │  │
     │   │  sellyourhousefree   │  │  pr-NN.vercel  │  │  localhost      │  │
     │   │  .com  (apex + www)  │  │  .app          │  │                 │  │
     │   └──────────┬───────────┘  └───────┬────────┘  └────────┬────────┘  │
     │              │ every env reads same codebase, different env vars     │
     └──────────────┼─────────────────────────────────────────────┼────────┘
                    ▼                                             ▼
     ┌─────────────────────────────────────────────────────────────────────┐
     │              sell-house-for-free (E1-E7 codebase + E8 adds)          │
     │                                                                      │
     │   proxy.ts   ────────▶  (matcher: all paths except _next/image,     │
     │                          _next/static, favicon, api/* prefetches)    │
     │   • sets x-nonce (if dyn)                                            │
     │   • hash/SRI-based CSP via next.config                               │
     │                                                                      │
     │   next.config.ts ──▶  async headers() { ... }                        │
     │   • CSP (script-src + style-src + connect-src allowlist)             │
     │   • Strict-Transport-Security max-age=63072000; includeSubDomains    │
     │   • X-Content-Type-Options: nosniff                                  │
     │   • Referrer-Policy: strict-origin-when-cross-origin                 │
     │   • Permissions-Policy: camera=(), microphone=(), geolocation=()     │
     │   • X-Frame-Options: DENY (belt+suspenders with frame-ancestors)     │
     │   • poweredByHeader: false                                           │
     │   • experimental.sri.algorithm: 'sha256'                             │
     │                                                                      │
     │   instrumentation.ts ──▶ Sentry server init (Node runtime only)     │
     │   instrumentation-client.ts                                          │
     │     (E3 already owns; E8 extends)                                    │
     │     • Sentry browser init                                            │
     │     • Web Vitals report → @vercel/analytics + Sentry Perf            │
     │                                                                      │
     │   src/lib/rate-limit.ts  ──▶ Turnstile server-side verify wrapper   │
     │   src/components/get-started/consent-block.tsx (edit)                │
     │     • <Turnstile/> widget gated on final step                       │
     │                                                                      │
     │   app/get-started/actions.ts (edit from E5)                          │
     │     • verify Turnstile token before Offervana POST                   │
     │                                                                      │
     │   tests/e2e/                                                         │
     │     ├── smoke.spec.ts                                                │
     │     ├── marketing-routes.spec.ts                                     │
     │     ├── a11y.spec.ts   (axe-playwright)                              │
     │     └── helpers/                                                     │
     │                                                                      │
     │   scripts/                                                           │
     │     ├── check-launch-gate.ts  (consent copy + env vars + noindex)   │
     │     ├── rotate-sas-token.ts   (MLS photo SAS — 2027-02-11 expiry)   │
     │     └── lighthouse-budget.mjs                                        │
     │                                                                      │
     │   docs/                                                              │
     │     ├── launch/                                                      │
     │     │    ├── checklist.md                                            │
     │     │    ├── dns-cutover.md                                          │
     │     │    ├── secret-rotation.md                                      │
     │     │    └── env-matrix.md                                           │
     │     ├── security/                                                    │
     │     │    ├── csp.md                                                  │
     │     │    ├── no-third-party-pii.md                                   │
     │     │    └── threat-model.md                                         │
     │     └── runbooks/                                                    │
     │          ├── incident-response.md                                    │
     │          └── rollback.md                                             │
     └─────────────────────────────────────────────────────────────────────┘
                     │                                │
                     │                                │
                     ▼                                ▼
        ┌──────────────────────┐         ┌────────────────────────┐
        │ External observers    │         │ External sinks          │
        │ • Sentry (errors +    │         │ • SendGrid (via         │
        │   perf)               │         │   Offervana, E6 owns)   │
        │ • Vercel Analytics    │         │ • Offervana _SaaS       │
        │   (Web Vitals)        │         │   (E5 owns)             │
        │ • Turnstile (bot)     │         │ • Zoodealio.MLS         │
        │ • Lighthouse CI       │         │   (E4 owns)             │
        └──────────────────────┘         └────────────────────────┘
```

---

## 3. Per-service changes

Everything lives inside `sell-house-for-free` except §3.11 (single doc entry in `Zoodealio.Infrastructure/`).

### 3.1 Repo layout additions

| Path | Purpose |
|---|---|
| `proxy.ts` (root) | Minimal — sets `x-nonce` if we ever need it; primarily exists to future-proof and to exclude static assets from header processing. Static CSP is set via `next.config.ts` `headers()`, so the proxy is thin. |
| `instrumentation.ts` (root) | `register()` dispatches to Sentry Node init (`NEXT_RUNTIME === 'nodejs'`) and edge init if needed. |
| `src/instrumentation-client.ts` | **Edited.** E3 created this for attribution harvest. E8 appends Sentry browser init + `useReportWebVitals` wiring. |
| `src/lib/rate-limit.ts` | `verifyTurnstile(token)` server helper + typed response. Uses `process.env.TURNSTILE_SECRET_KEY`. |
| `src/components/get-started/consent-block.tsx` | **Edited.** Adds `<Turnstile/>` widget (Cloudflare's official script loaded via `next/script`) on the final step. The token is submitted as a hidden `FormData` field; the Server Action verifies it before calling Offervana. |
| `src/app/get-started/actions.ts` | **Edited** (E5 is prior editor). Adds Turnstile verification as the first step of the happy path. On failure returns `{ ok: false, errors: { _form: 'Please complete the challenge' } }`. |
| `scripts/check-launch-gate.ts` | Node script enforcing §3.9 gate. Returns non-zero exit code on failure. |
| `scripts/rotate-sas-token.ts` | Stub that prints current expiry + warns if < 60 days away. Run weekly via GitHub Actions cron. |
| `scripts/lighthouse-budget.mjs` | Lighthouse-CI runner checking LCP < 2.5s, CLS < 0.1, total-blocking-time < 200ms across the top routes. |
| `tests/e2e/` | Playwright suite. See §3.6. |
| `playwright.config.ts` | Playwright config. |
| `docs/launch/*.md` | Operational runbooks. See §4.3. |
| `docs/security/*.md` | Security-posture docs. See §4.4. |
| `.github/workflows/ci.yml` | **New or edited.** Runs `pnpm lint`, `pnpm build`, `pnpm test:e2e` (on preview URL), `pnpm check:launch-gate`. |
| `.github/workflows/sas-rotation-reminder.yml` | Weekly cron; emails ops if SAS expiry < 60 days. |

### 3.2 Security headers (`next.config.ts`)

Static header block applied to all paths except `/_next/static`, `/_next/image`, and `/favicon.ico`. This is deliberately **not** per-request nonce'd — see §5 deviation.

| Header | Value | Reason |
|---|---|---|
| `Content-Security-Policy` | `default-src 'self'; script-src 'self' https://challenges.cloudflare.com https://va.vercel-scripts.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://zoodealiomls.blob.core.windows.net https://*.vercel-storage.com; font-src 'self' data:; connect-src 'self' https://o*.ingest.sentry.io https://*.ingest.us.sentry.io https://va.vercel-scripts.com https://challenges.cloudflare.com; frame-src https://challenges.cloudflare.com; frame-ancestors 'none'; form-action 'self'; base-uri 'self'; object-src 'none'; upgrade-insecure-requests` | Hard-gates XSS + injection. `style-src 'unsafe-inline'` is necessary while we use Tailwind's runtime class emission in a few places; tracked as a post-launch hardening item — see §6. |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | 2-year HSTS. Apex is eligible for [hstspreload.org](https://hstspreload.org) after launch. |
| `X-Content-Type-Options` | `nosniff` | |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), interest-cohort=()` | Explicitly disables FLoC/Topics API and hardware access we never use. |
| `X-Frame-Options` | `DENY` | Belt-and-suspenders with `frame-ancestors 'none'`; still useful for older browsers. |
| `Cross-Origin-Opener-Policy` | `same-origin` | |
| `Cross-Origin-Resource-Policy` | `same-origin` | |

Plus `poweredByHeader: false` in `next.config.ts` root (not a header, but removes the `X-Powered-By: Next.js` leak — plan §3 NF trust posture).

### 3.3 `proxy.ts`

Intentionally thin. Exists to:
- Redirect `http://` → `https://` (Vercel already does this; keep the proxy as defense-in-depth for any future hosting move).
- Redirect `www.sellyourhousefree.com` → `sellyourhousefree.com` (apex-primary; canonical host per §3.11 DNS design).
- Matcher excludes `_next/*`, `api/*`, static files, and `next-router-prefetch` traffic per Next.js 16 `content-security-policy.md` §Adding a nonce with Proxy example.

No nonce generation in MVP (static CSP above). The proxy function returns `NextResponse.next()` in the common case — this is explicit rather than absent so we have a documented hook for future CSP-nonce migration without restructuring.

### 3.4 Turnstile (rate-limit + abuse)

**Why Turnstile, not reCAPTCHA:** Plan §3 NF prohibits third-party PII trackers. reCAPTCHA v3 reads cookies and ships fingerprinting data to Google. Cloudflare Turnstile is privacy-preserving — no cookies, no cross-site tracking, and it ships a signed token that the server verifies via a single edge call. Documented as a decision in `docs/security/no-third-party-pii.md`.

**Implementation:**
- `<Turnstile/>` rendered on the final step only (inside `consent-block.tsx`). Widget script loaded via `next/script` with `strategy="afterInteractive"`. Site key from `NEXT_PUBLIC_TURNSTILE_SITE_KEY`.
- The widget emits a token into a hidden form field `cf-turnstile-response`.
- `submitSellerForm` in `actions.ts` reads the token via `formData.get('cf-turnstile-response')` and calls `verifyTurnstile(token)` before the Offervana POST. Verify endpoint: `https://challenges.cloudflare.com/turnstile/v0/siteverify`.
- On failure: return validation error, do **not** call Offervana, do **not** create a PM assignment. The form stays on the final step with a retry widget.

**Rate limit at the edge:** Vercel WAF rule: `/get-started/*` and `/api/submit` capped at 20 req/min per IP. Anything over → Vercel's built-in 429 page. This is a Vercel-Pro-and-above feature; confirm in §6 open questions whether the project is on that tier.

### 3.5 Error tracking — Sentry

**Package:** `@sentry/nextjs` latest (14.x as of 2026-04; confirm current against Next.js 16 compatibility).

**Initialization split:**
- `instrumentation.ts` — `register()` conditionally imports `./sentry.server.config.ts` when `NEXT_RUNTIME === 'nodejs'` (pattern from Next.js 16 `instrumentation.md`).
- `src/instrumentation-client.ts` — imports `./sentry.client.config.ts` at module top (runs before React hydrates; ideal for catching hydration errors).
- `sentry.edge.config.ts` — edge runtime init (for `proxy.ts` errors).

**Config choices:**
- `tracesSampleRate: 0.1` in production, `1.0` in preview — plan doesn't need full perf tracing yet, and Sentry pricing is volume-sensitive.
- `replaysSessionSampleRate: 0` — **no session replay in MVP.** Plan §3 NF prohibits DOM replay of PII-bearing pages.
- `replaysOnErrorSampleRate: 0` — same reasoning.
- `beforeSend(event)` — **mandatory scrub hook**. Strips `email`, `phone`, `firstName`, `lastName`, `street1`, `street2` from event payloads before upload. Implementation in `src/lib/sentry-scrub.ts`; unit-tested against fixtures. Without this, an unhandled error inside `submitSellerForm` could ship PII to Sentry.
- `integrations: [Sentry.browserTracingIntegration()]` — minimal; replay/profiling explicitly excluded.
- Source maps: `withSentryConfig(nextConfig, { ...sourceMapsOptions })` with `silent: true`. Uploaded only on production deploys; disabled for preview builds to keep iteration fast.

**Env vars:** `SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` (build-time only; never in `NEXT_PUBLIC_*`).

**Release tagging:** Sentry release = `process.env.VERCEL_GIT_COMMIT_SHA`. Automatic via `withSentryConfig`.

### 3.6 E2E smoke — Playwright

**Packages:** `@playwright/test`, `@axe-core/playwright` (dev deps only).

**Runs:**
- **Locally:** `pnpm test:e2e` — spins up `next dev` on port 3000.
- **CI:** GitHub Actions job `e2e` — runs against the Vercel preview URL passed in via `PLAYWRIGHT_TEST_BASE_URL`. Gated by the preview deployment being healthy (Vercel deployment webhook → GitHub `deployment_status` event).
- **Post-deploy smoke:** same suite, against production URL, on every production deploy. Failure pages ops in Sentry (bootstrap alert rule).

**Suites:**

| File | Covers |
|---|---|
| `smoke.spec.ts` | **The critical path from plan §E8.** Visits `/`, clicks "Get started", types a known-good AZ address (`123 Main St, Phoenix, AZ 85001`), waits for enrichment to either populate bed/bath or quietly degrade, fills property/condition/contact steps, solves the **Turnstile test-mode token** (`XXXX.DUMMY.TOKEN.XXXX` per Cloudflare's docs), submits, asserts redirect to `/get-started/thanks?ref=<non-empty>`, and asserts a real PM is named on the confirmation page. Backing services: **real Zoodealio.MLS (prod)**, **Offervana sandbox tenant** (not production — §6 open question about provisioning), **Supabase test project**, **SendGrid sandbox mode** (SendGrid's `mail_settings.sandbox_mode.enable = true` — no real email goes out). The test creates a real Offervana lead in the sandbox; a cleanup task (`afterAll`) deletes it via Supabase key + Offervana admin API if available, otherwise it's tagged with a test-run UUID and ops clears weekly. |
| `marketing-routes.spec.ts` | Crawls every route in `src/lib/routes.ts`, asserts 200, asserts `<title>`, asserts structured-data JSON-LD parses, asserts `robots` meta tag is absent on public routes and `noindex` on `/get-started/*`. |
| `a11y.spec.ts` | Runs axe on home, how-it-works, each pillar, each `/az/[city]`, `/faq`, `/get-started` each step. Expects zero serious/critical violations; warnings go to report. |
| `no-third-party.spec.ts` | **The anti-PII audit as a test.** Listens to all network requests during a full-flow run; asserts no origin outside the allowlist (`self`, `vercel-scripts.com`, `challenges.cloudflare.com`, `ingest.sentry.io`, `zoodealiomls.blob.core.windows.net`). Fails the build if any unknown origin fires. This is the mechanism behind plan §7 Q12. |

**Fixtures:**
- `tests/e2e/helpers/test-address.ts` — known-good AZ address that returns a real MLS match in prod MLS data.
- `tests/e2e/helpers/turnstile.ts` — pre-resolved test-mode token helper.
- `tests/e2e/helpers/cleanup.ts` — sandbox Offervana lead cleanup.

### 3.7 Web Vitals + first-party analytics

**Client-side:** `src/components/analytics/web-vitals.tsx` — Client Component using `useReportWebVitals(metric)`. On each metric:
1. `track(metric.name, { value: Math.round(metric.value), id: metric.id })` via `@vercel/analytics` (already wired from E1).
2. `Sentry.captureMessage('webvital', { level: 'info', extra: { ...metric } })` only for CLS > 0.1 or LCP > 4000 — these are SLA-warning thresholds, not every data point, to keep Sentry volume sane.

**Budget verification:** `scripts/lighthouse-budget.mjs` runs via GitHub Actions against the preview URL. Fails the build if:
- LCP > 2500ms on simulated 4G
- CLS > 0.1
- TBT > 200ms
- Total JS transfer > 200KB on `/` and `/get-started`

Thresholds configured in `lighthouserc.json`.

### 3.8 Anti-third-party-PII audit

Two-layer enforcement:

**Build-time:** `scripts/check-third-party-deps.mjs` greps `package.json` + `package-lock.json` for a denylist: `['react-ga', 'react-ga4', 'react-gtm-module', 'hotjar', '@hotjar/*', 'react-fullstory', 'fullstory', 'mixpanel-browser', 'segment', 'analytics.js', 'react-facebook-pixel', 'tiktok-pixel']`. Any hit → build fails with an explanatory error pointing at `docs/security/no-third-party-pii.md`.

**Runtime:** Playwright `no-third-party.spec.ts` (§3.6) asserts no origin outside allowlist fires during a full-flow run. This catches dynamically-injected snippets a dep check would miss (e.g. someone copy-pastes a GA snippet into an MDX file).

**Doc:** `docs/security/no-third-party-pii.md` is the canonical explainer — binding promise in plan §3 NF + legal/compliance rationale from E7.

### 3.9 Launch gate

`scripts/check-launch-gate.ts` — single script, green-or-red. Exit code 0 passes; anything non-zero blocks deploy. Wired two ways:

1. **Vercel `Ignored Build Step`:** `pnpm check:launch-gate` — set via Vercel dashboard → Project Settings → Git → Ignored Build Step. On non-zero exit, Vercel skips the deploy.
2. **CI:** same command runs in `.github/workflows/ci.yml` before `pnpm test:e2e`.

**Assertions** (tightened one-by-one across E1-E7 as they land; E8 just owns the script):

| Assertion | Source deferral |
|---|---|
| `NEXT_PUBLIC_SITE_URL` is set and matches `SITE.url` | E1 §3.6 |
| All three consent constants in `src/content/consent/*.ts` have `isPlaceholder: false` | E3 §5 deviation |
| `JK Realty` broker license number populated in `src/lib/site.ts` (not `'TODO'`) | Plan Q2 |
| `/robots.ts` emits `disallow: '/'` when `VERCEL_ENV !== 'production'`; emits full allow when `= 'production'` | E1 §3.1 |
| `/get-started/*` routes export `metadata.robots.index === false` | E3 §3.1 |
| `SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT` env vars present at build time | §3.5 |
| `TURNSTILE_SECRET_KEY` + `NEXT_PUBLIC_TURNSTILE_SITE_KEY` present | §3.4 |
| `OFFERVANA_BASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` present (production env only) | E5, E6 |
| No file under `src/content/consent/` contains the literal string `REPLACE_IN_E7` | E3 §3.4 |
| MLS SAS token present and expiry > 60 days away (read from a manifest committed by ops) | E4 sidecar |

The gate is **idempotent and fast** (< 2s) so it can run on every PR without slowing iteration. Each assertion is a named function with a clear failure message pointing at the doc that owns the rule.

### 3.10 MLS photo-SAS rotation tracker

**Tracker mechanism:** `docs/launch/sas-rotation.md` has a single-line fact: `Current SAS expires: 2027-02-11`. `scripts/rotate-sas-token.ts` parses that date, compares to `Date.now()`, emits a warning to stderr if < 60 days remain, non-zero exit if expired.

**Reminder mechanism:** `.github/workflows/sas-rotation-reminder.yml` is a weekly cron that runs the script and opens a GitHub issue (title: `MLS SAS token expires in N days`) if the warning threshold trips. Issue is auto-assigned to `@zoodealio-ops` team.

**Rotation runbook:** `docs/runbooks/mls-sas-rotation.md` — the actual how-to for ops (this belongs in `Zoodealio.MLS/` long-term; in MVP we mirror it here so our consumer has a complete picture of what breaks if rotation lapses).

### 3.11 DNS + hosting

**Decision:** Vercel (plan Q8).

**Production domain:** `sellyourhousefree.com` (apex) + `www.sellyourhousefree.com` → 308 redirect to apex via `proxy.ts`.

**DNS records** (runbook: `docs/launch/dns-cutover.md`):

| Record | Type | Value | TTL |
|---|---|---|---|
| `@` | A | `76.76.21.21` (Vercel Anycast) | 300 |
| `@` | AAAA | `2606:4700:…` (Vercel IPv6) | 300 |
| `www` | CNAME | `cname.vercel-dns.com.` | 300 |
| `_vercel` | TXT | `vc-domain-verify=…` | 300 |
| `@` | CAA | `0 issue "letsencrypt.org"` | 3600 |
| `@` | CAA | `0 issuewild ";"` | 3600 |
| `@` | CAA | `0 iodef "mailto:security@sellyourhousefree.com"` | 3600 |

Registrar: TBD (ops decision; cross-check for Zoodealio's existing registrar contract). Runbook assumes Cloudflare DNS with proxy **disabled** (gray cloud) — Vercel needs direct reach for TLS + ISR.

**Certificates:** Vercel auto-provisions Let's Encrypt via ACME. Renewal is handled by Vercel; no runbook action needed unless DNS changes.

**Post-cutover validation:** runbook closes with six curl assertions (apex redirect, HSTS header present, CSP header present, `/sitemap.xml` 200, `/robots.txt` 200 with production allow, `/get-started` 200 with noindex meta).

**Zoodealio.Infrastructure footnote:** add one paragraph to `Zoodealio.Infrastructure/README.md`:

> **sell-house-for-free** is hosted on Vercel (not in Azure). No Terraform module exists for it and none is planned. DNS records live in the registrar DNS panel (see `sell-house-for-free/docs/launch/dns-cutover.md`). The only cross-service secret shared with the Azure estate is the `Offervana_SaaS` API origin, which is consumed read-only from the Vercel environment.

### 3.12 Environment variable matrix

Canonical list assembled from E1-E7. Populated in Vercel Project Environment Variables per env. Doc: `docs/launch/env-matrix.md`.

| Var | Scope | Prod | Preview | Dev | Introduced by | Sensitivity |
|---|---|---|---|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | Build + runtime | `https://sellyourhousefree.com` | `https://${VERCEL_URL}` | `http://localhost:3000` | E1 | Public |
| `VERCEL_ENV` | Vercel-provided | `production` | `preview` | unset | Vercel | Public |
| `OFFERVANA_BASE_URL` | Runtime server | `https://api.offervana.com` | `https://staging-api.offervana.com` | same as preview | E5 | Public (URL only) |
| `OFFERVANA_HOST_ADMIN_TOKEN` | Runtime server | secret | secret | secret | E5 | **Secret** |
| `SUPABASE_URL` | Runtime server | prod project URL | staging project URL | local or staging | E6 | Public |
| `SUPABASE_SERVICE_ROLE_KEY` | Runtime server | secret | secret | secret | E6 | **Secret** |
| `SUPABASE_ANON_KEY` | Client + server | prod anon key | staging anon key | — | E6 | Public (RLS-gated) |
| `SENDGRID_API_KEY` | Runtime server | secret | secret (sandbox-mode) | sandbox | E6 | **Secret** |
| `SENTRY_DSN` | Client + server | prod DSN | prod DSN | dev DSN or unset | E8 | Public |
| `SENTRY_AUTH_TOKEN` | Build only | secret | secret | unset | E8 | **Secret** |
| `SENTRY_ORG` | Build only | `zoodealio` | `zoodealio` | unset | E8 | Public |
| `SENTRY_PROJECT` | Build only | `sell-house-for-free` | `sell-house-for-free` | unset | E8 | Public |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Client | prod key | prod key (or test key) | test key (`1x00000000…`) | E8 | Public |
| `TURNSTILE_SECRET_KEY` | Runtime server | secret | secret | test secret (`1x0000…`) | E8 | **Secret** |
| `MLS_API_BASE_URL` | Runtime server | `https://api.zoodealio-mls.com` | same | same | E4 | Public |
| `MLS_JWT` | Runtime server | secret (forward-compat, not required today) | secret | unset | E4 | **Secret** |

**Rotation cadence** (`docs/launch/secret-rotation.md`):
- `OFFERVANA_HOST_ADMIN_TOKEN`: every 90 days or on departure of any `Dashboard`-tenant operator.
- `SUPABASE_SERVICE_ROLE_KEY`: every 180 days.
- `SENDGRID_API_KEY`: every 365 days or on suspected compromise.
- `SENTRY_AUTH_TOKEN`: every 365 days.
- `TURNSTILE_SECRET_KEY`: on suspected compromise only (Cloudflare tokens are scoped and low-risk).
- `MLS_JWT`: when we actually start sending one (see E4 sidecar — MVP doesn't require it).

All rotations are **in-place in Vercel UI** with a zero-downtime strategy: add the new value as a second env var (`_V2` suffix), update code to try V2 then V1, deploy, delete V1 after two deploy cycles.

---

## 4. Integration contracts

E8 is integration-light by design — it consumes what E1-E7 already integrated. The "contracts" here are **operational**: runbooks, gates, and health probes.

### 4.1 E8 ← E2 (marketing routes feed smoke tests)

**Contract:** E2's `src/lib/routes.ts` registry is the source of truth for `marketing-routes.spec.ts`. If E2 adds a route, the Playwright suite picks it up automatically via `import { ROUTES } from '@/lib/routes'`. No E8 code change required.

### 4.2 E8 ← E5 (Offervana submission idempotency)

**Contract:** E5 must emit `X-Idempotency-Key: <submissionId>` on the Offervana POST. E8's smoke test reuses one submission ID across three retries and asserts Offervana creates exactly one lead. If E5's idempotency is broken, the smoke test fails before launch.

### 4.3 E8 ← E6 (PM assignment + SendGrid trigger)

**Contract:** After successful Offervana POST, E6 assigns a PM via Supabase (round-robin) and triggers SendGrid (via Offervana `Integrations/`). E8's smoke test asserts:
1. `GET /api/pm-assignment/:referralCode` returns a real PM record (E6 exposes this endpoint for the confirmation page; E8 just consumes it).
2. SendGrid sandbox API log shows a delivery attempt within 10 seconds.

If E6 hasn't shipped the SendGrid sandbox-mode switch, E8 blocks launch — it's called out in §6 open questions.

### 4.4 E8 ← E7 (consent copy finalized)

**Contract:** E7 edits `src/content/consent/{tcpa,terms,privacy}.ts` and flips `isPlaceholder: false`. The launch gate (§3.9) asserts this. There is no functional contract — the gate is purely "did E7 finish their copy pass."

### 4.5 E8 → production (cutover)

**Contract:** Production deploy succeeds only if (in order):
1. `pnpm check:launch-gate` exits 0.
2. `pnpm test:e2e` (smoke + marketing + a11y + no-third-party) all pass against the preview URL.
3. `pnpm lighthouse:budget` passes budgets.
4. DNS runbook §11 checklist is signed off by ops (manual gate — Vercel doesn't gate on this, but `docs/launch/checklist.md` requires it before promoting a preview to production).

**Rollback:** `docs/runbooks/rollback.md` — single command: `vercel rollback <deployment-url>`. Vercel keeps the previous deployment live. Rollback is zero-downtime. DNS does not change. Sentry release is tagged so alerts attribute correctly post-rollback.

### 4.6 Operational runbooks (new docs)

Each is a self-contained Markdown doc. E8 owns authorship; ops owns execution post-launch.

| Path | Purpose | Owner after launch |
|---|---|---|
| `docs/launch/checklist.md` | The pre-launch checklist humans walk through | Ops lead |
| `docs/launch/dns-cutover.md` | DNS record changes + validation curls | Ops lead |
| `docs/launch/secret-rotation.md` | Cadences + zero-downtime rotation procedure | Ops lead |
| `docs/launch/env-matrix.md` | §3.12 table, kept in sync with Vercel | Dev lead |
| `docs/launch/sas-rotation.md` | MLS SAS expiry date + rotation notes | Platform (owner: Zoodealio.MLS team) |
| `docs/security/csp.md` | Explains the chosen CSP, what each directive unlocks | Dev lead |
| `docs/security/no-third-party-pii.md` | The binding promise + how it's enforced in code | Compliance + dev lead |
| `docs/security/threat-model.md` | STRIDE-lite for this service — spoofing, tampering, info disclosure, DoS, elevation | Security (if we have one; otherwise dev lead) |
| `docs/runbooks/incident-response.md` | On-call workflow: Sentry alert → triage → comms | Ops lead |
| `docs/runbooks/rollback.md` | One-command rollback + when to use it vs. hotfix | Ops lead |
| `docs/runbooks/mls-sas-rotation.md` | Step-by-step SAS rotation (mirrored from Zoodealio.MLS) | Platform |

---

## 5. Pattern decisions + deviations

### Decisions (with citations)

1. **Vercel over Azure Container Apps** — plan Q8. Vercel gives functional + performance fidelity for every Next.js 16 feature we use (Next.js 16 `02-guides/deploying-to-platforms.md` §Feature Support Matrix), zero Terraform surface, native integration with `@vercel/analytics` (already used by E1 + E3), and preview-deployment URLs that `@sentry/nextjs` + Playwright CI consume natively. ACA would require Docker multi-stage, Terraform module, custom cache handler for ISR, and a separate Application Insights integration — all for the same Next.js app, at higher ops cost.
2. **Static CSP in `next.config.ts` headers over per-request nonce in `proxy.ts`** — Next.js 16 `content-security-policy.md` §Dynamic Rendering Requirement is explicit: nonce-based CSP forces every page into dynamic rendering, disables ISR, disables static optimization, disables CDN caching, incompatible with PPR. Our marketing pages (E2 §2) are the bulk of traffic and the bulk of the perf budget; forcing them dynamic for CSP nonces is a bad trade. Static CSP + `unsafe-inline` scoped to `style-src` (with SRI for scripts) is the right posture until we have a concrete XSS threat model that requires nonces.
3. **`proxy.ts` (not `middleware.ts`)** — Next.js 16 `03-api-reference/03-file-conventions/proxy.md`: "The `middleware` file convention is deprecated and has been renamed to `proxy`." We align with the new convention immediately.
4. **Cloudflare Turnstile over Google reCAPTCHA** — plan §3 NF prohibits third-party PII. reCAPTCHA reads cookies + fingerprints; Turnstile doesn't. E3 §5 deviation already flagged this; E8 closes it.
5. **Sentry over LogRocket / FullStory / Datadog RUM** — Sentry does error tracking without DOM replay. LogRocket and FullStory both ship DOM replays containing PII (plan §3 NF). Datadog RUM is closer to Sentry's posture but comes with per-session pricing that doesn't fit a consumer funnel's volume profile. Sentry's `beforeSend` hook + explicit `replaysSessionSampleRate: 0` is the clean answer.
6. **`@sentry/nextjs` init via `instrumentation.ts`** — Next.js 16 `02-guides/instrumentation.md` is explicit that server-side init goes here. The SDK's own docs for Next.js 16 follow the same pattern. No legacy `_app.tsx` hooks.
7. **Playwright over Cypress / Puppeteer direct** — Next.js 16 `02-guides/testing/playwright.md` is a first-class testing guide. Playwright has native fixtures, better CI parallelism, and `@axe-core/playwright` for the a11y spec. Cypress works but its proxy handling with Next.js 16 redirects is historically noisy.
8. **Launch gate as a script, not a hook** — the gate runs the same in CI, Vercel's Ignored Build Step, and a developer's laptop. No magic, no framework-specific config. Pure Node script → same output everywhere.
9. **Zero-downtime secret rotation via dual-env-var with `_V2` suffix** — Vercel doesn't natively support staged rotation; this is the cleanest path that survives the 2-minute-or-so gap between setting an env var and the next deployment. Documented in `docs/launch/secret-rotation.md`.
10. **Rollback via Vercel promoting a prior deployment, not a revert commit** — Vercel keeps every deployment addressable. Promoting the last-known-good deployment is instant; reverting a commit + re-deploying is not. Hotfixes go through normal PR flow after the rollback stabilizes the site.
11. **Anti-third-party-PII audit as both a build-time and runtime test** — plan §3 NF is a binding legal/brand promise. One layer is not enough: a dep-denylist misses dynamically-injected snippets, and a runtime test misses libraries lazy-loaded only on specific user paths. Both layers → high confidence.
12. **SAS rotation tracker in `sell-house-for-free`** — ideally this lives in `Zoodealio.MLS/` (token owner), but E4 already flagged it as our consumer concern. Mirroring the runbook + auto-reminder here means we don't wake up on 2027-02-11 with blank photos in production.

### Deviations (with justification)

| Deviation | From | Why | Who accepts the risk |
|---|---|---|---|
| `style-src 'unsafe-inline'` in CSP | Next.js 16 CSP doc's strict example | Tailwind v4's runtime arbitrary-value classes (e.g. `text-[44px]`, pervasive in E1 type ramp and E2 heading utilities) generate inline `<style>` tags during hydration. Blocking `'unsafe-inline'` on `style-src` today would break hero typography. Scripts remain strictly locked (`script-src` has no `'unsafe-inline'`). Tracked as a post-launch hardening item: either migrate arbitrary values to `@layer components` extracted classes, or move to per-request nonce'd CSS via proxy. | Noah — documented in `docs/security/csp.md`. |
| `img-src` allows `https://zoodealiomls.blob.core.windows.net` | Strict CSP would prefer same-origin images only | E4 photos come from Azure Blob with SAS tokens. Proxying through our origin would double the bandwidth cost and negate Vercel's image optimization on MLS URLs. The blob host is narrowly scoped (single subdomain, read-only SAS), so the risk is low. | Noah. |
| `tracesSampleRate: 0.1` in prod | Sentry default is `0` | Plan §3 NF targets LCP < 2.5s on 4G. Without tracing we can't see the long tail of slow sessions. 10% sampling is a defensible cost/visibility tradeoff. Tune based on first-week data. | Noah. |
| `replaysSessionSampleRate: 0` even in preview | Sentry default is `0.1` for preview | DOM replays of preview deploys include test-seeded PII. Keep replay off entirely; rely on Sentry breadcrumbs + console + network events. | Noah — plan §3 NF. |
| Production smoke test creates a real Offervana sandbox lead | Cleaner setups stub the backend | The whole point of the plan §E8 smoke ("form submit → enrichment lands → host-admin lead created → PM gets notified") is that the end-to-end spine works. Stubbing Offervana validates our code but not the integration. The sandbox tenant absorbs test leads; a `[TEST-E2E-${uuid}]` prefix on the property address makes them visually greppable and a weekly cleanup runs against them. | Noah — preferred over a stub. |
| No OpenTelemetry tracing in MVP | Next.js 16 explicitly recommends OTel | Sentry Performance covers the MVP need (web vitals + transaction timings). Full OTel traces via `@vercel/otel` are valuable once we have multiple services correlating, but this service is a single Next.js app fronting three HTTP calls. Revisit after 30 days in production. | Noah — §6 open question. |
| No session replay, ever | Industry default is to ship replay | Plan §3 NF. The moment someone wants replay, `docs/security/no-third-party-pii.md` is the artifact that forces a conscious decision rather than a default. | Noah — enforced via Sentry config + explicit doc. |
| Launch gate enforces `isPlaceholder: false` across ALL three consent constants | Simpler gates check only TCPA | TCPA is the loudest legal risk, but privacy + terms are load-bearing too — the "we do not sell your data" promise (plan §1) is in the privacy constant. Gating on all three means E7 can't accidentally ship with one placeholder left behind. | Noah — plan §3 NF. |
| Zoodealio.Infrastructure gets a README note, not a Terraform module | Ecosystem default is Terraform for everything | Vercel isn't in our Azure estate; modeling it in Terraform would be a lossy abstraction over Vercel's own API. One paragraph in the Terraform README keeps the ecosystem map honest without creating a fake module. | Noah — documented. |

---

## 6. Open questions

Non-blocking. Each has a proposed default E8 ships with; the question is whether ops/product wants to override.

- **Vercel plan tier** — Vercel WAF rate-limit rules require Pro or Enterprise. Proposed default: provision Pro for launch; re-evaluate at 30 days. If the team wants Hobby (free) at launch, we fall back to application-level rate-limiting in the Server Action via an in-memory LRU. Decision needed before §3.4 is set.
- **Sandbox Offervana tenant for smoke tests** — plan §5 E5 says Offervana has a host-admin flow under the `"Dashboard"` tenant. Does Offervana have a sibling sandbox tenant? If not, we either (a) use production Offervana with `[TEST-E2E]` lead prefixes + weekly cleanup, or (b) skip the Offervana leg of the smoke test in CI and rely on a manual one-time check at cutover. Proposed: (a) — document weekly cleanup cron owner.
- **OTel tracing post-MVP** — adopt `@vercel/otel` + a tracing backend (Honeycomb, Tempo, or Application Insights since we're Azure-adjacent elsewhere) after 30 days in production, or skip indefinitely? Proposed: evaluate at 30 days; decision gate is whether we've hit a debugging wall that Sentry couldn't resolve.
- **Apex domain** — plan references "Sell Your House Free" brand; apex assumed `sellyourhousefree.com`. Confirm with legal + registrar (plan Q1 closed the brand name, not the apex DNS). Alternate candidates (`sellyourhousefreeaz.com`, `sellhousefree.com`) mentioned but not decided.
- **DNS-record registrar** — does Zoodealio already hold domains at Cloudflare, Namecheap, GoDaddy, or Route53? DNS records differ slightly (CAA syntax quirks). Proposed: Cloudflare DNS with orange-cloud proxying **off** (Vercel needs direct reach). Cross-check with existing Zoodealio DNS inventory.
- **Sentry project naming** — `zoodealio/sell-house-for-free` assumed. Confirm with the existing Sentry org setup.
- **CI runner** — GitHub Actions assumed; is Azure DevOps Pipelines preferred since ADO is already where work items live? Proposed: GitHub Actions for runtime reasons (Vercel deploy-webhook integration is cleaner), ADO for work-item automation only. Ops to confirm.
- **Tailwind arbitrary values vs. CSP `style-src` lockdown** — post-launch hardening. Plan: wait until E2+E3 have stabilized; then either extract `.text-display-1` etc. into `@layer components` (E1 arch §7 open question) or migrate to per-request nonce'd CSS. Not an MVP blocker.
- **hstspreload.org submission** — after launch, once HSTS has been live for 30+ days with `preload` directive, submit the domain. Post-MVP task, added to `docs/launch/checklist.md` as a 30-days-after item.

---

## 7. Handoff notes for PM (suggested story boundaries)

Proposed decomposition into ADO User Stories under the E8 Feature (7784). This Feature is the final gate before launch; the stories split cleanly along security / observability / testing / ops-docs lines and can mostly land in parallel after S1.

| # | Story | Size | Notes |
|---|---|---|---|
| E8-S1 | **Hosting + DNS cutover plan** — Vercel project setup, env-var matrix populated in Vercel dashboard (prod + preview), DNS runbook (`docs/launch/dns-cutover.md`), apex + www records, CAA records, post-cutover validation curls, `proxy.ts` apex canonicalization redirect | M | Ops-heavy. Unblocks everything downstream since deploys happen on Vercel. Does not touch DNS yet — just prepares the runbook + Vercel project. |
| E8-S2 | **Security headers (`next.config.ts`)** — static CSP (per §3.2), HSTS, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, X-Frame-Options, COOP, CORP, `poweredByHeader: false`, SRI enablement | S | No nonce work; pure `headers()` block. Doc: `docs/security/csp.md`. |
| E8-S3 | **`proxy.ts` scaffold** — thin proxy with apex canonicalization + matcher excluding static assets; return `NextResponse.next()` for all other paths | XS | Documented hook for future nonce migration. |
| E8-S4 | **Sentry error tracking — server + client + edge** — `@sentry/nextjs` install, `instrumentation.ts`, `instrumentation-client.ts` edit, `sentry.{server,client,edge}.config.ts`, `beforeSend` PII scrub helper in `src/lib/sentry-scrub.ts` with unit tests, `withSentryConfig` in `next.config.ts` for source-map upload, env vars added to Vercel | M | Critical that the PII scrub is unit-tested against realistic SellerFormDraft fixtures. |
| E8-S5 | **Web Vitals + first-party analytics + Lighthouse budget** — `src/components/analytics/web-vitals.tsx` (Client Component), import in root layout after existing `<Analytics/>`, `scripts/lighthouse-budget.mjs`, `lighthouserc.json`, GitHub Actions job `lighthouse` | S | Non-blocking if LCP budget fails initially; story exits with the budget file in place and a known-passing baseline. |
| E8-S6 | **Turnstile integration** — `<Turnstile/>` widget via `next/script` in `consent-block.tsx` gated to final step, hidden-input token, `src/lib/rate-limit.ts` verify helper, edit to `actions.ts` to verify before Offervana POST, env vars | M | Edits E3 + E5 code; low risk (additive). Doc: `docs/security/no-third-party-pii.md` §Turnstile rationale. |
| E8-S7 | **Playwright E2E suite — smoke + marketing-routes** — `playwright.config.ts`, `tests/e2e/smoke.spec.ts`, `tests/e2e/marketing-routes.spec.ts`, helpers (test-address, turnstile test token, sandbox cleanup), CI workflow that runs against the preview URL | M | Depends on E6 exposing PM assignment + SendGrid sandbox switch. If E6 hasn't shipped sandbox SendGrid, the `PM notified` assertion in smoke.spec is a hardcoded skip with a TODO reference. |
| E8-S8 | **Playwright E2E suite — a11y + no-third-party** — `tests/e2e/a11y.spec.ts` using `@axe-core/playwright` across every route in `ROUTES`, `tests/e2e/no-third-party.spec.ts` asserting request-origin allowlist | S | Runs after S7 (same Playwright harness). |
| E8-S9 | **Launch gate script** — `scripts/check-launch-gate.ts` with all assertions from §3.9, `pnpm check:launch-gate` script, wire into CI and Vercel Ignored Build Step | S | Every assertion has a named function + failure message pointing at the owning doc. |
| E8-S10 | **Anti-third-party-PII build-time check** — `scripts/check-third-party-deps.mjs` with denylist, `pnpm check:no-third-party` script, wire into CI | XS | Pairs with S8's runtime test; `docs/security/no-third-party-pii.md` is the canonical explainer. |
| E8-S11 | **SAS rotation tracker + reminder workflow** — `scripts/rotate-sas-token.ts`, `docs/launch/sas-rotation.md`, `.github/workflows/sas-rotation-reminder.yml` weekly cron that opens a GitHub issue on < 60 days | XS | Single commitment ceremony — zero cognitive load after it's in place. |
| E8-S12 | **Operational runbooks** — `docs/launch/{checklist,secret-rotation,env-matrix}.md`, `docs/runbooks/{incident-response,rollback,mls-sas-rotation}.md`, `docs/security/{threat-model,no-third-party-pii}.md` | M | Docs-only story. Every runbook closes with a "signed off by" section that forces an ops human to read it before launch. |
| E8-S13 | **DNS cutover execution** — actual DNS flip, post-cutover curl validation, hstspreload.org submission scheduled for +30 days, `Zoodealio.Infrastructure/README.md` note added | XS | **Final step before launch.** Runs only after every other story is merged and the launch gate passes. |

**Critical sequencing:**
- S1 first (Vercel project + runbook; unblocks all deploys).
- S2, S3, S4, S5, S6, S7, S10, S11 land in parallel once S1 is done.
- S8 depends on S7 (shares Playwright harness).
- S9 depends on S2/S4/S6/S11 being code-complete (the gate checks env vars + assertions from each).
- S12 can land anywhere in parallel (docs).
- S13 is the last merge. It changes DNS and nothing else.

**Acceptance criteria cadence** — every E8 story must include:

- CI passes (`pnpm lint`, `pnpm build`, `pnpm check:launch-gate`, `pnpm test:e2e` if the story touches the path Playwright covers).
- Any new env vars added to Vercel for all three environments (prod/preview/dev) with owners documented in `docs/launch/env-matrix.md` in the same PR.
- Any new external origin allowlisted in `docs/security/no-third-party-pii.md` with a one-line justification, and simultaneously in the CSP `connect-src` / `img-src` / `frame-src` directives + the Playwright `no-third-party.spec.ts` allowlist. Three-places-or-it's-wrong.
- Playwright smoke still green against preview URL after the merge.
- Sentry and `@vercel/analytics` verified receiving events after the merge (manual check in preview, documented in the PR description).

**Not in E8 scope** (for PM planning clarity): post-launch OTel tracing, post-launch CSP nonce migration, `hstspreload.org` submission (+30 days after launch), any application-feature work, any Offervana/MLS/Shared changes, blog/Strapi wiring (plan §4 E2 explicitly deferred), multi-state expansion, agent dashboard, seller account.

---

## 8. References

- Project plan: `_bmad-output/planning-artifacts/project-plan-sell-house-for-free.md` §4 E8 + §3 non-functionals + §7 Q10/Q12
- E1 architecture: `_bmad-output/planning-artifacts/architecture-e1-site-foundation.md` — §7 open questions (CSP), §6 deviation table (no CSP in E1, no Sentry in E1)
- E3 architecture: `_bmad-output/planning-artifacts/architecture-e3-seller-submission-flow.md` — §5 deviation "No CAPTCHA in E3 MVP" + §5 "isPlaceholder: false"
- E4 sidecar: `_bmad-output/arch-working/e4-property-data-enrichment/index.md` — SAS token expiry 2027-02-11
- Next.js 16 `02-guides/content-security-policy.md` — static vs. nonce tradeoff
- Next.js 16 `03-api-reference/03-file-conventions/proxy.md` — middleware rename to proxy
- Next.js 16 `02-guides/production-checklist.md` — full pre-launch reference
- Next.js 16 `02-guides/instrumentation.md` — `register()` + `NEXT_RUNTIME` split
- Next.js 16 `02-guides/analytics.md` — `useReportWebVitals` pattern
- Next.js 16 `02-guides/deploying-to-platforms.md` — feature support matrix confirming Vercel fit
- Next.js 16 `02-guides/testing/playwright.md` — E2E scaffolding
- Next.js 16 `03-api-reference/05-config/01-next-config-js/headers.md` — static header block syntax
- Cloudflare Turnstile docs — https://developers.cloudflare.com/turnstile/
- `@sentry/nextjs` Next.js 16 compatibility — Sentry docs site
- hstspreload.org submission guide
- MDN CSP — https://developer.mozilla.org/docs/Web/HTTP/CSP
