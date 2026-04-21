---
work-item-id: 7842
work-item-type: story
work-item-tag: E4-S9
parent-epic: 7780
repo: sell-house-for-free
branch: feature/e4-property-enrichment-7780
test-framework: playwright
last-completed-step: 6
started-at: 2026-04-21T23:30:00Z
---

# E4-S9 (7842) — E2E happy + degraded paths

## File groups

1. **Runner install + config** — `package.json` (devDep + scripts), `playwright.config.ts`, `.gitignore` entries.
2. **QA plan doc** — `docs/e4-qa-plan.md`.
3. **Specs + shared helpers** — `e2e/support/seller-form.ts`, `e2e/enrichment-{happy,timeout,no-match,listed}.spec.ts`.
4. **CI stub** — `.github/workflows/e2e.yml` (owned downstream by E8).

## Fixture strategy

`ENRICHMENT_DEV_MOCK=true` with S1's magic-`street1` triggers. No MSW. Reduces deps and keeps the spec preconditions readable.

## AC-to-impl map

| AC | Impl |
|----|------|
| 1 QA plan doc | `docs/e4-qa-plan.md` |
| 2 Happy spec | `e2e/enrichment-happy.spec.ts` — captures `/api/enrich` (AC6), asserts `data-enrichment-status=ok`, `data-prefilled=true` on a numeric input |
| 3 Timeout | `e2e/enrichment-timeout.spec.ts` — asserts badge copy + Next enabled |
| 4 No-match | `e2e/enrichment-no-match.spec.ts` — asserts badge copy |
| 5 Listed | `e2e/enrichment-listed.spec.ts` — asserts three chips, ready-to-switch flows into `input[name=currentListingStatus]`, 3 thumbnails |
| 6 Cache-Control | `captureEnrichResponse` helper asserts `private, no-store` |
| 7 Address-not-logged | Deferred to manual check; documented in QA plan (capturing server stdout from inside Playwright isn't supported without extra infra — E8 scope) |
| 8 submissionId threaded | Each spec captures from `input[name=submissionId]` + asserts final URL regex |
| 9 No real MLS | `webServer.env.ENRICHMENT_DEV_MOCK=true` in config + workflow env |
| 10 No sleeps | Only `expect.toBe…` auto-waits and `toHaveURL` regex |
| 11 Parallel-safe | `fullyParallel: true`; each spec generates its own submissionId |
| 12 CI stub | `.github/workflows/e2e.yml` |
| 13 Local run doc | Commands in `docs/e4-qa-plan.md` |
| 14 Test-ids minimized | `getByRole` / `getByLabel` everywhere; only `data-enrichment-status` + `data-prefilled` as hooks, both already in component code |
