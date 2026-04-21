---
epic-id: 7780
epic-tag: E4
epic-title: Property Data Enrichment (ATTOM + MLS)
target-service: sell-house-for-free
branch-strategy: single-shared-branch
branch-name: feature/e4-property-enrichment-7780
test-framework: vitest
autopilot-status: complete
started-at: 2026-04-21T21:31:00Z
completed-at: 2026-04-21T23:44:00Z
stories-planned:
  - {id: 7834, tag: E4-S1, depends-on: [],           strike-count: 0, status: closed}
  - {id: 7835, tag: E4-S2, depends-on: [7834],       strike-count: 0, status: closed}
  - {id: 7836, tag: E4-S3, depends-on: [7835],       strike-count: 0, status: closed}
  - {id: 7840, tag: E4-S7, depends-on: [7834],       strike-count: 0, status: closed}
  - {id: 7837, tag: E4-S4, depends-on: [7834],       strike-count: 0, status: closed}
  - {id: 7838, tag: E4-S5, depends-on: [7836, 7837], strike-count: 0, status: closed}
  - {id: 7839, tag: E4-S6, depends-on: [7838, 7840], strike-count: 0, status: closed}
  - {id: 7841, tag: E4-S8, depends-on: [7839],       strike-count: 0, status: closed}
  - {id: 7842, tag: E4-S9, depends-on: [7839],       strike-count: 0, status: closed}
  - {id: 7843, tag: E4-S10, depends-on: [7839],      strike-count: 0, status: closed}
stories-completed:
  - {id: 7834, outcome: closed, commit: 4273da4}
  - {id: 7835, outcome: closed, commit: 45a60a4}
  - {id: 7836, outcome: closed, commit: 50e6c57}
  - {id: 7840, outcome: closed, commit: 30ab536}
  - {id: 7837, outcome: closed, commit: f1db0d3}
  - {id: 7838, outcome: closed, commit: f60c44e}
  - {id: 7839, outcome: closed, commit: c1a5cf1}
  - {id: 7841, outcome: closed, commit: 3a696f9}
  - {id: 7842, outcome: closed, commit: 76ae6c9}
  - {id: 7843, outcome: closed, commit: 031f5ae}
---

# E4 — Property Data Enrichment (ATTOM + MLS) · Autopilot Execution Plan

**Epic (Feature) ID:** 7780
**Title:** E4 — Property Data Enrichment (ATTOM + MLS)
**Parent:** 7776 — Sell House for Free (AZ) umbrella
**Target service:** `sell-house-for-free` (BFF + client) — `Zoodealio.MLS` consumed read-only
**Branch:** `feature/e4-property-enrichment-7780` (single shared branch for all 10 stories per user directive)
**Unit-test framework:** vitest (added to repo just before autopilot start)

## Feature summary

Light up the address-entered → property-data loop. New server-side BFF route `POST /api/enrich` calls `Zoodealio.MLS` as the **sole** enrichment source and returns a normalized `EnrichmentSlot` matching the contract E3 left in `SellerFormDraft.enrichment`. Node runtime, Zod validation, plain HTTP to MLS (forward-compat Bearer), `AbortSignal.timeout(4000)`, `unstable_cache` keyed by SHA-256 of normalized address (24h TTL ok / 1h no-match), envelope-always-200 (failures encoded in `status`). Client side swaps E3's plain `<AddressField>` for Headless UI `<Combobox>` driven by `/properties/search`; `useAddressEnrichment` hook with `useTransition` + `AbortController` + sessionStorage persists results; three new UI surfaces: `<EnrichmentBadge>`, `<EnrichmentConfirm>` photo strip, `<ListedNotice>` with three non-blocking chips.

## Execution order (topological, risk-weighted)

Linear order the autopilot will walk. Parallel opportunities from the Feature doc are collapsed to single-lane execution because we're on one branch.

| # | Story | Title |
|---|-------|-------|
| 1 | 7834 (E4-S1) | BFF route shape + Zod input + dev mock |
| 2 | 7835 (E4-S2) | MLS client (server-only) with timeout + retry + typed MlsError |
| 3 | 7836 (E4-S3) | Service + normalize + merge + `unstable_cache` |
| 4 | 7840 (E4-S7) | next/image Azure Blob remotePatterns (XS, front-loaded to unblock S6) |
| 5 | 7837 (E4-S4) | Headless UI Combobox `<AddressField>` swap |
| 6 | 7838 (E4-S5) | `useAddressEnrichment` hook + draft wiring |
| 7 | 7839 (E4-S6) | Enrichment UI surfaces (badge / confirm / pre-fill hints) |
| 8 | 7841 (E4-S8) | Already-listed conversation copy + `currentListingStatus` enum |
| 9 | 7842 (E4-S9) | Playwright E2E happy + degraded paths |
| 10 | 7843 (E4-S10) | Observability + SAS rotation runbook |

Rationale:
- **S1 first** — BFF contract + dev-mock unblocks everything without MLS reachability.
- **S2 → S3** — real MLS client before the service orchestrator that consumes it.
- **S7 before S6** — XS config; `next.config.ts` remotePatterns must land before the photo strip renders optimized.
- **S4 before S5** — Combobox is the caller of the hook; define caller surface first.
- **S5 → S6** — hook writes to draft; UI surfaces read from draft.
- **S8 / S9 / S10 last** — copy polish, E2E, observability wrap the epic.

## Branch + commit strategy

- **One branch:** `feature/e4-property-enrichment-7780` cut from `main` at autopilot start. All 10 stories commit here.
- **One commit per story** at close-out: `E4-S{n} ({storyId}): <short summary>`. Matches prior convention (`e3-s10+s11(7820+7821)` in the log).
- **No per-story PRs.** Single PR at epic close targeting `main`.
- ADO state transitions: `New` → `In Development` (story start) → `Code Review` (inner review pass) → `Ready For Testing` (story close). Feature 7780 → `In Development` at autopilot start.

## Test strategy

- **Unit:** vitest. Per-story unit coverage aimed at pure logic — normalize/cache-key/envelope shape, MLS client error mapping, draft reducer, hook state transitions (with mocked fetch). `zoo-core-unit-testing` runs vitest between dev-story and code-review.
- **E2E:** Playwright in S9 — happy AZ submit, MLS timeout, no-match, currently-listed.

## 3-strike rule

Outer `zoo-core-code-review` loop per story. On 3rd fail, halt and surface the story + review reports + dev sidecar to the user. Inner vitest loop has its own 3-iteration fix cap (separate counter).

## EF migration halt

None expected — E4 is Next.js BFF + client only, no DB changes. If a story unexpectedly generates EF migrations, autopilot pauses for user confirmation.

## Environment variables added

Server-only, no `NEXT_PUBLIC_`:
- `MLS_API_BASE_URL` (required)
- `MLS_API_TOKEN` (optional, forward-compat)
- `ENRICHMENT_TIMEOUT_MS` (default 4000)
- `ENRICHMENT_CACHE_TTL_SECONDS` (default 86400)
- `ENRICHMENT_DEV_MOCK` (default false)

Added to `.env.example` in S1, operationalized in S10.

## New dependencies

- `@headlessui/react` — Combobox primitive (S4). One-off exception to E1's no-Radix/shadcn rule; documented in story.

## Out of scope (handoff)

- E5 real Offervana submission (consumes enrichment slot)
- E6 PM assignment + thanks page
- E7 production consent copy
- E8 rate-limit, CAPTCHA, global security headers, Sentry, SAS rotation calendar

## Sidecar progress tracking

Per-story sidecars at `_bmad-output/dev-working/{story-id}/` managed by `zoo-core-dev-story`. Epic-level progress in this file's frontmatter, updated between stories.
