---
slug: e8-bulk-s1-to-s13
parent-feature-id: 7784
parent-feature-url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7784
ado-grandparent-epic-id: 7776
ado-grandparent-epic-url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7776
mode: bulk
mode-ado: mcp
stories-planned:
  - e8-s1-hosting-dns-cutover-plan
  - e8-s2-security-headers-next-config
  - e8-s3-proxy-ts-scaffold
  - e8-s4-sentry-error-tracking
  - e8-s5-web-vitals-lighthouse-budget
  - e8-s6-turnstile-integration
  - e8-s7-playwright-smoke-marketing-routes
  - e8-s8-playwright-a11y-no-third-party
  - e8-s9-launch-gate-script
  - e8-s10-anti-third-party-build-check
  - e8-s11-sas-rotation-tracker
  - e8-s12-operational-runbooks
  - e8-s13-dns-cutover-execution
stories-created:
  - id: 7822
    url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7822
    title: "E8-S1 — Hosting + DNS cutover plan: Vercel project + env-var matrix + docs/launch/dns-cutover.md (no DNS flip yet)"
    size: M
  - id: 7824
    url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7824
    title: "E8-S2 — Security headers in next.config.ts: static CSP + HSTS + Permissions-Policy + COOP/CORP + SRI + poweredByHeader false + docs/security/csp.md"
    size: S
  - id: 7826
    url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7826
    title: "E8-S3 — proxy.ts scaffold: apex canonicalization + matcher excluding static assets + nonce-ready hook"
    size: XS
  - id: 7828
    url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7828
    title: "E8-S4 — Sentry error tracking: @sentry/nextjs + instrumentation.ts + client/edge + beforeSend PII scrub + withSentryConfig source maps"
    size: M
  - id: 7829
    url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7829
    title: "E8-S5 — Web Vitals + first-party analytics + Lighthouse budget: web-vitals.tsx + lighthouserc.json + CI lighthouse job"
    size: S
  - id: 7831
    url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7831
    title: "E8-S6 — Turnstile integration: <Turnstile/> widget + src/lib/rate-limit.ts verifier + actions.ts token-gate before Offervana POST"
    size: M
  - id: 7833
    url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7833
    title: "E8-S7 — Playwright E2E: playwright.config.ts + smoke.spec.ts (full-spine) + marketing-routes.spec.ts + fixtures + CI job against preview URL"
    size: M
  - id: 7844
    url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7844
    title: "E8-S8 — Playwright a11y (axe-playwright) + no-third-party request-origin allowlist: a11y.spec.ts + no-third-party.spec.ts"
    size: S
  - id: 7850
    url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7850
    title: "E8-S9 — Launch gate script: scripts/check-launch-gate.ts with 10 assertions + Vercel Ignored Build Step + CI pre-e2e gate"
    size: S
  - id: 7851
    url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7851
    title: "E8-S10 — Anti-third-party-PII build-time check: scripts/check-third-party-deps.mjs with denylist + CI integration"
    size: XS
  - id: 7853
    url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7853
    title: "E8-S11 — MLS photo-SAS rotation tracker: scripts/rotate-sas-token.ts + docs/launch/sas-rotation.md + weekly GitHub cron"
    size: XS
  - id: 7855
    url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7855
    title: "E8-S12 — Operational runbooks: docs/launch/{checklist,secret-rotation,env-matrix} + docs/runbooks/{incident-response,rollback} + docs/security/{threat-model,no-third-party-pii}"
    size: M
  - id: 7860
    url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7860
    title: "E8-S13 — DNS cutover execution: flip apex+www+CAA per runbook, post-cutover 6-curl validation, Zoodealio.Infrastructure README note, +30d hstspreload.org TODO"
    size: XS
started-at: 2026-04-18T02:20:00Z
completed-at: 2026-04-18T02:39:00Z
last-completed-step: 5
---

# E8 bulk S1→S13 — PM Working Sidecar

## Plan

Thirteen stories decomposing Feature **7784** per architecture §7. Sequencing:

- **S1 unblocks everything** — Vercel project + env-var matrix + DNS runbook (no DNS flip)
- **S2, S3, S4, S5, S6, S7, S10, S11 land in parallel** once S1 is done
- **S8 depends on S7** (shares Playwright harness)
- **S9 depends on S2 + S4 + S6 + S11** being code-complete (gate checks their env vars + invariants)
- **S12 can land anywhere in parallel** (docs-only)
- **S13 is the last merge** — actual DNS flip, Infrastructure README note, +30-days hstspreload issue; closes umbrella Epic 7776

All thirteen filed as User Story children under Feature 7784 via `wit_add_child_work_items` with area/iteration path `Offervana_SaaS`, matching precedent from E1 (7777/7785–7790), E2 (7778/7796–7810), E3 (7779/7811–7821). IDs 7822, 7824, 7826, 7828, 7829, 7831, 7833, 7844, 7850, 7851, 7853, 7855, 7860 — non-monotonic gaps because other filings interleaved during the run (7823, 7825, 7827, 7830, 7832, 7834–7843, 7845–7849, 7852, 7854, 7856–7859 are not E8 stories).

### Filing order

S1 (7822) → S2 (7824) → S3 (7826) → S4 (7828) → S5 (7829) → S6 (7831) → S7 (7833) → S8 (7844) → S9 (7850) → S10 (7851) → S11 (7853) → S12 (7855) → S13 (7860). One at a time via single-item `wit_add_child_work_items` calls so each story gets the full `format: "Html"` treatment and parent link.

## Execution log

### Filed in order

1. **7822** — E8-S1 Hosting + DNS cutover plan. 17 ACs. Creates Vercel project, populates prod/preview/dev env vars per architecture §3.12, writes `docs/launch/dns-cutover.md` (pre-cutover + records + 6-curl validation + rollback), writes `docs/launch/env-matrix.md`, lands minimal `proxy.ts` apex-canonicalization (coordinates with S3). **No DNS flip** — S13 flips.
2. **7824** — E8-S2 Security headers. 16 ACs. Edits `next.config.ts`: static CSP block from architecture §3.2 (script-src + style-src + img-src + connect-src + frame-src + frame-ancestors + form-action + base-uri + object-src + upgrade-insecure-requests), HSTS 2y preload, X-Content-Type-Options, Referrer-Policy, Permissions-Policy (camera/mic/geo/interest-cohort disabled), X-Frame-Options DENY belt-and-suspenders, COOP/CORP same-origin, `poweredByHeader: false`, `experimental.sri.algorithm: 'sha256'`. Writes `docs/security/csp.md` explaining the `style-src 'unsafe-inline'` Tailwind-v4 deviation.
3. **7826** — E8-S3 proxy.ts scaffold. 15 ACs. Creates `proxy.ts` (repo root, NOT `middleware.ts`) with apex 308 + matcher excluding static assets + SEO artifacts + images. Unit test on 5 cases (www host, uppercase, apex, preview URL, missing host). Commented TODO for future nonce migration.
4. **7828** — E8-S4 Sentry error tracking. 21 ACs. Three config files at root (`sentry.{server,client,edge}.config.ts`) + `instrumentation.ts` NEXT_RUNTIME dispatch + appends to `src/instrumentation-client.ts` (E3 already owns). `tracesSampleRate: 0.1` prod / `1.0` preview. `replaysSessionSampleRate: 0` + `replaysOnErrorSampleRate: 0` + no `replayIntegration` anywhere (plan §3 NF, architecture §5 deviation). `src/lib/sentry-scrub.ts` + unit tests over 5 fixture categories proving PII (`email`, `phone`, `firstName`, `lastName`, `street1`, `street2`) never survives event upload. `withSentryConfig` in `next.config.ts` for source maps on prod only. Env-matrix appended.
5. **7829** — E8-S5 Web Vitals + Lighthouse budget. 17 ACs. `src/components/analytics/web-vitals.tsx` (Client Component) rendered from root layout, `useReportWebVitals` feeds `@vercel/analytics` `track()` + selectively forwards CLS>0.1 or LCP>4000ms breaches to `Sentry.captureMessage`. `scripts/lighthouse-budget.mjs` + `lighthouserc.json` with budgets: LCP<2500ms, CLS<0.1, TBT<200ms, JS<200KB on `/` + `/get-started`. CI job runs on `deployment_status.environment=='Preview'` success.
6. **7831** — E8-S6 Turnstile integration. 21 ACs. Creates `src/lib/rate-limit.ts` (`verifyTurnstile` + `checkRateLimit` LRU fallback) + unit tests. Edits E3-S7's `<ConsentBlock>` to render `<Turnstile/>` on final step via `next/script strategy="afterInteractive"`. Edits E3-S8's `actions.ts` to verify token server-side first-thing before Offervana POST. Failure copy is generic ("Please complete the challenge and try again") — error codes go to Sentry only. Dev + preview use Cloudflare's test keys. Env-matrix rows appended. Closes E3 §5 deviation.
7. **7833** — E8-S7 Playwright smoke + marketing-routes. 22 ACs. `playwright.config.ts` + `tests/e2e/{smoke,marketing-routes}.spec.ts` + helpers. Smoke is the full-spine: home → funnel (5 steps with KNOWN_GOOD_ADDRESS Phoenix 85001) → Turnstile test token → submit → `/thanks?ref=<uuid>` → PM-name assertion (proves E6 integration). Idempotent-retry test verifies E5 `X-Idempotency-Key` contract (architecture §4.2). `marketing-routes.spec.ts` iterates `ROUTES` asserting 200 + title + JSON-LD parse + noindex discipline. CI job on `deployment_status=='Preview'`. Separate `production-smoke.yml` runs post-prod-deploy.
8. **7844** — E8-S8 A11y + no-third-party. 17 ACs. Installs `@axe-core/playwright`. `a11y.spec.ts` iterates per-route (home + how-it-works + all 4 pillars + az/phoenix + faq + all 4 funnel steps) asserting zero serious + zero critical WCAG 2.2 AA violations. `no-third-party.spec.ts` walks full flow asserting every request hits the ALLOWED_ORIGINS allowlist (self + va.vercel-scripts.com + challenges.cloudflare.com + `*.ingest.*.sentry.io` + MLS blob + vercel-storage). Helper `helpers/allowed-origins.ts` has a three-places-or-it's-wrong comment.
9. **7850** — E8-S9 Launch gate script. 16 ACs. `scripts/check-launch-gate.ts` with 10 named assertion functions (NEXT_PUBLIC_SITE_URL match, consent `isPlaceholder: false`, broker license populated, robots.ts prod-gates, /get-started noindex, Sentry env vars, Turnstile env vars, integration env vars prod-only, no `REPLACE_IN_E7` strings, MLS SAS > 60 days). Each failure names the owning doc. Wired into Vercel Ignored Build Step + CI pre-e2e. < 2s idempotent.
10. **7851** — E8-S10 Anti-third-party build-time check. 11 ACs. `scripts/check-third-party-deps.mjs` greps `package.json` + `package-lock.json` for a hardcoded DENYLIST (react-ga, react-ga4, react-gtm-module, hotjar, @hotjar/*, @fullstory/*, mixpanel-browser, segment, @segment/analytics-next, analytics.js, react-facebook-pixel, tiktok-pixel, posthog-js). Exact name match. Error names `docs/security/no-third-party-pii.md`. CI step before `pnpm build`. Pairs with S8's runtime spec per architecture §5 decision 11.
11. **7853** — E8-S11 SAS rotation tracker. 15 ACs. `docs/launch/sas-rotation.md` with pinned `Current SAS expires: 2027-02-11` line format. `scripts/rotate-sas-token.ts` with 3-level exit semantics (silent / warn 30–60d / fail <30d) + TEST_NOW mocking. Weekly GitHub cron (`0 10 * * 1`) opens/de-dupes a GitHub issue when days<60. `docs/runbooks/mls-sas-rotation.md` mirrors platform runbook. Closes E4 sidecar's SAS deferral. S9's assertion 10 consumes this.
12. **7855** — E8-S12 Operational runbooks. 18 ACs. Seven docs: `launch/{checklist,secret-rotation,env-matrix}` + `runbooks/{incident-response,rollback}` + `security/{threat-model,no-third-party-pii}`. The launch checklist integrates every E8 story (S1–S11) as pre-cutover checkboxes + cutover section + post-cutover + +30-days section. Each runbook has a *Signed off by* table. Expands S6's `no-third-party-pii.md` stub to full doc. Cross-references among csp.md / no-third-party-pii.md / checklist.md / rollback.md.
13. **7860** — E8-S13 DNS cutover execution. 21 ACs. The final merge. Execute the S1 runbook end-to-end. 6 curl validations (HSTS, CSP, www→apex 308, sitemap, robots, /get-started noindex). Production smoke passes. PR to `Zoodealio.Infrastructure` with one-paragraph Vercel-hosting note. GitHub issue opened for +30-days hstspreload.org submission. `docs/launch/checklist.md` signed off. Closes Feature 7784 and umbrella Epic 7776.

### Content decisions (cross-story patterns)

- **Blueprint stability.** Every E8 story follows the same section cadence as E1/E2/E3 siblings (banner → User story → Summary → Files touched → Acceptance criteria → Technical notes → Suggested tasks → Out of scope → References → Notes).
- **AC count scales with risk-sensitivity.** S1 (17), S2 (16), S3 (15), S4 (21), S5 (17), S6 (21), S7 (22), S8 (17), S9 (16), S10 (11), S11 (15), S12 (18), S13 (21). S4 (Sentry PII scrub) + S6 (Turnstile) + S7 (smoke) + S13 (cutover) earn the most because they carry PII or launch-execution risk.
- **Forward + backward-compat contracts made explicit.** S3's proxy is nonce-ready (hook commented); S6 consumes S1's env-matrix + S2's CSP allowlist; S8 consumes S7's harness; S9 consumes S11's manifest format; S13 consumes literally every other story. Every one has explicit "don't break this later" language.
- **Bleeding-edge Next.js 16 call-outs.** Every Notes tail pins the single most-likely training-data regression for that story: S1 `proxy.ts` (not middleware), S2 `experimental.sri.algorithm` flag name + `poweredByHeader` top-level, S3 `proxy.ts` file convention again + edge-default runtime, S4 `instrumentation.ts` + `src/instrumentation-client.ts` (not `_app.tsx`), S5 `useReportWebVitals` from `next/web-vitals`, S6 `next/script strategy="afterInteractive"` (not hand-rolled `<script>`), S7 Playwright 1.43+ for async searchParams, S8 + S10 + S11 + S12 + S13 are naming things + discipline.
- **Architecture §5 deviations enforced.** Static CSP over nonce (S2). Sentry without replay, `tracesSampleRate: 0.1` prod (S4). Smoke hits real backends (S7). Turnstile over reCAPTCHA (S6). Rollback via Vercel promote, not revert-commit (S12/S13).
- **Three-places-or-it's-wrong discipline.** Every third-party origin must be: (1) in S2's CSP, (2) in S8's ALLOWED_ORIGINS, (3) justified in S12's `docs/security/no-third-party-pii.md`. S8 + S12 + S2 cross-reference each other in comments.

### Bulk-mode compaction

Each story drafted individually and filed via `wit_add_child_work_items` immediately (one item per call). Per-story deep context discarded between drafts. Feature 7784 body + architecture §7 decomposition table re-referenced by memory rather than re-fetched. E3's sibling 7811 was fetched once at the start for HTML-format pattern confirmation; reused from memory afterward.

### Style match to E1 + E2 + E3 siblings

- Same HTML vocabulary (`<h2>`, `<ul>`, `<ol>`, `<code>`, `<strong>`, `<em>`, occasional tables — absent from E8 stories since no tabular content was needed).
- Same area/iteration path (`Offervana_SaaS`).
- State `New`, priority `2` (ADO defaults).
- `Microsoft.VSTS.TCM.ReproSteps` auto-populated by ADO with identical HTML — matches E1/E2/E3 pattern.

### Format bug avoided (E2 lessons applied)

All thirteen stories filed with `format: "Html"` placed **inside each item object** (not top-level). The E2 bug (S1–S9 of E2 filed with top-level `format`, stored as markdown-escaped HTML) was avoided from story 1. Confirmed via API response: every story shows `"multilineFieldsFormat":{"System.Description":"html","Microsoft.VSTS.TCM.ReproSteps":"html"}`. Entity-escaped code samples like `<code>&lt;Turnstile&gt;</code>` preserve literal HTML-entity refs correctly.

## Not done

- No tags assigned (matches E1/E2/E3 precedent).
- No assignees, no sprint iteration (matches E1/E2/E3; sprint planning will assign).
- Did not append patterns to `zoo-core-agent-pm/ado-history.md` — directory still doesn't exist.
- No inter-story `Related` links filed in ADO. Hierarchy (Parent) link is on each story pointing at 7784; sibling dependencies documented in each story body under `Blocks` / `Depends on`.
- Figma frames not fetched — per architecture working sidecar, per-step designs should be requested during individual story pickup if ever (E8 is almost entirely infra/ops; Figma surface is minimal).

## Next steps

1. Review the thirteen rendered stories on ADO: 7822, 7824, 7826, 7828, 7829, 7831, 7833, 7844, 7850, 7851, 7853, 7855, 7860. Spot-check HTML renders cleanly and AC Gherkin-style gates read as actionable.
2. Feature 7784 is now fully decomposed — E8 is ready for sprint planning. All 13 stories filed.
3. **Critical path for parallel work:** S1 unblocks everything. S2 + S3 + S4 + S5 + S6 + S10 + S11 can run in parallel once S1 is done. S7 depends on S6 + upstream E5/E6. S8 depends on S7. S9 depends on S2 + S4 + S6 + S11. S12 is docs-only so anywhere-parallel. S13 is the terminal merge that requires all of the above.
4. **Upstream dependency gate:** S7's smoke spec asserts E5 idempotency + E6 PM-assignment + SendGrid sandbox. If E5 or E6 aren't code-complete when S7 starts, the PM-name assertion gets a `test.skip` with a `// TODO(E6)` marker, and S7 is re-reviewed when they land.
5. **Architecture §6 open questions resolve before S13:** Vercel plan tier (affects S6 LRU fallback), Offervana sandbox tenant (affects S7 cleanup strategy), OTel post-MVP (not blocking), apex domain final (affects S1 + S13), DNS registrar (affects S13 runbook syntax), Sentry project naming (affects S4 env vars), CI runner (assumed GitHub Actions).
6. **E8 implementation start gate:** E1 + E3 + E4 are shipped. E2 + E5 + E6 + E7 should reach code-complete before S7/S13 execute; S1–S6 + S10–S12 can start immediately.
7. **Umbrella Epic closure:** when S13 merges, close Feature 7784 and umbrella Epic 7776. MVP launched.
