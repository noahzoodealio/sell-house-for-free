# E4 — Property Data Enrichment · Autopilot summary report

**Feature:** 7780 — E4 Property Data Enrichment (ATTOM + MLS)
**Branch:** `feature/e4-property-enrichment-7780`
**Start:** 2026-04-21 21:31 · **End:** 2026-04-21 23:44 (cumulative across prior resumed sessions; this final pass took ≈2h wall-clock for S8–S10)
**Outcome:** All 10 stories closed. Feature is PR-ready.

## Per-story outcome

| # | Story | Commit | State | Notes |
|---|-------|--------|-------|-------|
| 1 | 7834 (E4-S1) BFF route + Zod + dev mock | 4273da4 | closed | Envelope-always-200 contract landed |
| 2 | 7835 (E4-S2) MLS client + timeout + typed error | 45a60a4 | closed | Forward-compat Bearer ready |
| 3 | 7836 (E4-S3) Service + normalize + `unstable_cache` | 50e6c57 | closed | 24h ok TTL, 1h no-match TTL, tag `enrichment` |
| 4 | 7840 (E4-S7) `next/image` Azure Blob allow-list | 30ab536 | closed | Front-loaded to unblock S6 |
| 5 | 7837 (E4-S4) Headless UI Combobox `<AddressField>` | f1db0d3 | closed | Suggest autocomplete (250ms debounce, 4-char min) |
| 6 | 7838 (E4-S5) `useAddressEnrichment` hook + draft wiring | f60c44e | closed | `useTransition` + AbortController + sessionStorage cache |
| 7 | 7839 (E4-S6) Enrichment UI surfaces | c1a5cf1 | closed | Badge + confirm strip + listed-notice + property pre-fill hints |
| 8 | 7841 (E4-S8) Listed conversation copy + enum + pre-nudge | 3a696f9 | closed | `currentListingStatus` enum locked; cash-offers pre-nudge |
| 9 | 7842 (E4-S9) Playwright E2E specs | 76ae6c9 | closed | 4 specs + QA plan + CI stub; specs not executed in autopilot (chromium absent) |
| 10 | 7843 (E4-S10) Observability + SAS runbook | 031f5ae | closed | `track()` wired + `.env.example` + two runbooks |

## Aggregate metrics

- **Stories completed:** 10 / 10.
- **Strike counts:** 0 on the outer review loop for every story. No retries.
- **Unit tests:** 116 passing across 11 vitest files. Growth across E4 was additive (S1 added route tests, S3 added normalize/cache tests, S5 added hook tests, etc.).
- **Playwright specs:** 4 authored (happy, timeout, no-match, listed) + shared helpers.
- **New top-level docs:** `docs/configuration.md`, `docs/e4-operations.md`, `docs/e4-qa-plan.md`, `docs/operations/sas-rotation.md`.
- **New dependencies:** `@headlessui/react` (runtime, Combobox), `@playwright/test` (dev, E2E).
- **Env vars added:** 5 (`MLS_API_BASE_URL`, `MLS_API_TOKEN`, `ENRICHMENT_TIMEOUT_MS`, `ENRICHMENT_CACHE_TTL_SECONDS`, `ENRICHMENT_DEV_MOCK`), all server-only.
- **Files changed (epic-wide):** ~60 files across src/ + docs/ + e2e/ + _bmad-output/.

## Branch + PR

Single branch per epic autopilot convention: `feature/e4-property-enrichment-7780`, cut from `main` at autopilot start. Ten sequential commits, one per story. No per-story PRs (epic-autopilot pattern). A single PR targeting `main` is the next step after this report.

## Patterns observed during the epic

Candidates for `zoo-core-curate-memory` if they don't already live there:

1. **Envelope-always-200 is the right shape for best-effort enrichment**. Letting the client branch on `envelope.status` keeps the funnel resilient without hiding signal. Worth codifying if other pillars add external data calls (valuation API, school-score lookup, etc.).
2. **Session-scoped React state + hidden FormData field** is the minimal way to carry a piece of PII-adjacent data from the client to a Server Action without `localStorage` rehydration. Used for `currentListingStatus`.
3. **Dev-mock via magic string on a business field** (`street1 === '__TIMEOUT__'`) is a cleaner Playwright contract than MSW when the fixture surface is small and all-or-nothing. Avoids adding another client-side dep.
4. **Pre-existing `data-*` attributes beat test-IDs**. E4 surfaces already carried `data-enrichment-status` + `data-prefilled` for other reasons; specs reuse them.

## Follow-up items surfaced

- **SAS rotation GitHub issue.** `docs/operations/sas-rotation.md` carries a placeholder URL + explicit TODO. File the issue on `noahzoodealio/sell-house-for-free` with milestone `2027-01-15` and update the runbook.
- **Playwright Chromium install + first local run.** Specs compile but weren't executed in this session. `npx playwright install --with-deps chromium` + `npm run test:e2e` locally before the PR opens.
- **E3-S2 reducer-action note.** S8 AC6 referenced "the existing reducer action (from E3-S2)". No formal reducer exists; `listedReason` is plain `useState`. Behavior is equivalent — captured in `7841/completion-notes.md`.
- **E8 owns:** Sentry, Vercel Analytics dashboards, alerting, secrets/shard/trace CI hardening, cache-invalidation admin UI, Lighthouse budgets.

## Handoff

E4 is ready for human QA (specs + manual) and merge. On merge, E5 (real Offervana submission) becomes the active E-epic; E5 consumes the `EnrichmentSlot` contract E4 landed.
