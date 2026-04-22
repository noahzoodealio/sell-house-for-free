# Workspace — E4-S13

**Repo:** `sell-house-for-free` (current working directory)
**Branch:** `feature/e4-property-enrichment-7780` (shared E4 branch; S12 just committed at `c327285`)
**Base:** `main`
**Push posture:** NO PUSH. User directive confirmed at S12 close-out — branch stays local.
**Validation markers:** `package.json` (next 16), `AGENTS.md`, `src/lib/seller-form/schema.ts`, `src/components/get-started/mls-status-notice.tsx` ← all present.

## Test runners

- `npx vitest run` — 154 tests passing pre-S13.
- `npx tsc --noEmit` — clean pre-S13.
- Playwright: specs authored in S9 but Chromium not installed locally (per epic summary-report.md); spec will be written for correctness but not executed here.

## Branch strategy

Single branch for the epic (epic convention established in S1–S10). One commit for S13 at close-out: `E4-S13 (7884): <summary>`.

## Local env

- `.env.local` present (pulled from Vercel development env per prior memory).
- `ENRICHMENT_DEV_MOCK=true` expected for local smoke.
