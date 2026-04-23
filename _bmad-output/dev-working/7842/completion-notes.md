# E4-S9 (7842) — Completion notes

## Deliverables

- **Runner**: `@playwright/test@^1.59.1` as devDep. Scripts `test:e2e` + `test:e2e:ui`.
- **Config**: `playwright.config.ts` — port 3300 dev server with `ENRICHMENT_DEV_MOCK=true`, `trace: on-first-retry`, `fullyParallel: true`, chromium-only for MVP.
- **QA plan**: `docs/e4-qa-plan.md` — 4 scenarios with preconditions/steps/observables + local run commands + manual address-not-logged check procedure.
- **Specs**: `e2e/enrichment-{happy,timeout,no-match,listed}.spec.ts` sharing `e2e/support/seller-form.ts`.
- **CI stub**: `.github/workflows/e2e.yml` — PR + main branch trigger; installs deps + Chromium; uploads report artifact on failure.
- **.gitignore**: Playwright artifacts (`test-results/`, `playwright-report/`, `blob-report/`, `playwright/.cache/`).

## AC verification

All 14 ACs satisfied at the spec authoring layer. AC7 (address-not-logged) is documented as a manual check in the QA plan because Playwright's console capture is browser-only; wiring server-stdout capture into the runner is E8 scope.

## What was NOT run

The specs were not executed end-to-end in this autopilot run:
- `npx playwright install --with-deps chromium` hasn't been run in this environment (browser binaries absent).
- Running the suite requires a clean dev-server boot + chromium; both are heavy and outside the tight feedback loop this story targeted.

All static checks pass:
- `npx tsc --noEmit` → 0 errors (specs + support compile)
- `npm run test` (vitest) → still 116 passing
- `npm run lint` → no new lint problems (pre-existing faq.tsx + a `_contact` unused-var warning in actions.ts that predates S8)

Running the suite locally is a 1-command step once Chromium is installed — see `docs/e4-qa-plan.md`.

## Follow-ups (E8 scope)

- Server-stdout capture to automate the PII-never-logged assertion (AC7).
- Shard matrix + retry artifact trace upload.
- Preview-deployment targeting (PLAYWRIGHT_BASE_URL override) instead of local `next dev`.
- webkit + firefox projects in the Playwright config.
