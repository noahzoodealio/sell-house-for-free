---
work-item-id: 7843
work-item-type: story
work-item-tag: E4-S10
parent-epic: 7780
repo: sell-house-for-free
branch: feature/e4-property-enrichment-7780
last-completed-step: 6
started-at: 2026-04-21T23:38:00Z
---

# E4-S10 (7843) — Observability + SAS rotation runbook

## File groups

1. **`track` wiring** — `src/app/api/enrich/route.ts` adds `track('enrichment_status', {status, cache_hit})` with try/catch + structured-log fallback on both enrich exit points (out-of-area + post-MLS). Suggest kind intentionally not tracked (different audience; would muddy the dashboard).
2. **Env template + config doc** — `.env.example` (new, five E4 vars), `docs/configuration.md` (new, enrichment section + runbook links).
3. **Runbooks** — `docs/operations/sas-rotation.md` (expiry 2027-02-11, rotation steps, stopgap), `docs/e4-operations.md` (endpoints, log shape, error signatures, cache drain, escalation).

## AC-to-impl map

| AC | Impl |
|----|------|
| 1 `track` fires | `trackEnrichmentStatus(status, cacheHit)` called at both `handleEnrich` exits |
| 2 No PII in `track` | Only `status` + `cache_hit` — no submissionId/addressKey/address |
| 3 Non-blocking | `void track(...)` inside try/catch; failures log `track_failed` |
| 4 `@vercel/analytics` installed | Already at `^2.0.1` from E1; server-side import `@vercel/analytics/server` |
| 5 `.env.example` five vars | All five documented with one-line comment each |
| 6 No `NEXT_PUBLIC_` | `grep NEXT_PUBLIC_ .env.example` → no output |
| 7 SAS expiry in runbook | `docs/operations/sas-rotation.md` header states 2027-02-11 |
| 8 SAS procedure | 5-step procedure documented + stopgap path |
| 9 Calendar reminder | GitHub-issue-with-milestone pattern documented with placeholder URL — the doc carries a TODO for the shipping dev to file the issue post-merge (commit-time issue creation requires `gh` auth in this session that may not be scoped). |
| 10 Endpoints listed | `docs/e4-operations.md` table covers the three MLS hops |
| 11 Error signatures | Table of log-grep patterns with actions |
| 12 Cache drain | `revalidateTag('enrichment')` Server Action stub documented |
| 13 Escalation | Per-failure-mode paging table |
| 14 `docs/configuration.md` | New file with enrichment section + cross-links |
| 15 Log line format | Unchanged in this story — verified by existing route tests |
| 16 No Sentry | Not added |

## Follow-up (not AC-blocking)

- File the GitHub issue titled "MLS SAS rotation reminder — expires 2027-02-11" on `noahzoodealio/sell-house-for-free` with milestone `2027-01-15` and paste the URL into `docs/operations/sas-rotation.md` replacing the placeholder. This is a small post-merge task that needs repo-level `issues: write` auth.
