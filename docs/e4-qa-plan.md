# E4 — Property Data Enrichment QA Plan

Scenario coverage for the E4 enrichment loop. Every scenario is codified in
`e2e/` and asserts the **"form always submits, enrichment is best-effort"**
contract. This doc is the human-facing reference; the Playwright specs are
the gate.

## Local run

Playwright runs against a dev server configured via `ENRICHMENT_DEV_MOCK=true`.
The config (`playwright.config.ts`) starts `next dev` on port 3300, sets the
env flag, and tears the server down after the suite.

```bash
# one-time: install Chromium + deps for Playwright
npx playwright install --with-deps chromium

# run the full suite
npm run test:e2e

# run a single spec
npm run test:e2e -- e2e/enrichment-listed.spec.ts

# interactive debugging
npm run test:e2e:ui
```

The dev server does **not** call the real MLS — `ENRICHMENT_DEV_MOCK=true` in
`webServer.env` routes `/api/enrich` to `src/lib/enrichment/fixtures.ts`.
Fixture scenarios are triggered by magic `street1` values.

## Fixture triggers

| `street1` (case-insensitive) | Envelope |
|---|---|
| `__TIMEOUT__` | `{status: 'timeout', retryable: true}` |
| `__NOMATCH__` | `{status: 'no-match', cacheHit: false}` |
| `__OUTAREA__` | `{status: 'out-of-area'}` |
| `__ERROR__`   | `{status: 'error', code: 'dev-mock'}` |
| `__LISTED__`  | `ok` with `listingStatus: 'currently-listed'` + 3 photos |
| anything else | canned happy `ok` (3bd/2ba/1620sf/1998), no photos |

All specs pair the magic `street1` with a valid AZ ZIP (`85001`) + city
(`Phoenix`) so the form's own validation accepts the address.

## Scenarios

### 1. Happy path (AZ-enriched submit) — `e2e/enrichment-happy.spec.ts`

**Preconditions.** `ENRICHMENT_DEV_MOCK=true`. No magic trigger in `street1`.

**Steps.**
1. Visit `/get-started`.
2. Capture `submissionId` from the hidden input.
3. Fill address step: `123 Main St`, `Phoenix`, ZIP `85001`. State is AZ-only.
4. Wait for enrichment badge to reach `data-enrichment-status="ok"`.
5. Advance to property step.
6. Assert `<EnrichmentConfirm>` is present ("Is this your home?") — but note
   the default happy fixture ships **no** photos, so the strip may be absent.
   Assert pre-fill hint ("Filled from public records — edit if wrong") on at
   least one numeric input via `data-prefilled`.
7. Advance through condition + contact, accept three consents, submit.
8. Assert URL is `/get-started/thanks?ref={submissionId}`.

**Expected observables.**
- Badge transitions: idle → loading → ok.
- `Cache-Control: private, no-store` on `/api/enrich`.
- Final URL contains `?ref=<uuid>` matching the captured submissionId.

### 2. Timeout (degraded) — `e2e/enrichment-timeout.spec.ts`

**Preconditions.** `street1 = __TIMEOUT__`.

**Steps.**
1. Fill address step with `__TIMEOUT__`, `Phoenix`, `85001`.
2. Assert badge reads "Couldn't reach our records right now — you can keep
   going" with `data-enrichment-status="timeout"`.
3. Assert Next is not blocked.
4. Advance; enter property facts manually (2bd/1ba/1000sf/2001/5000).
5. Complete + submit.
6. Assert redirect to `/thanks?ref=…`.

**Expected observables.**
- Badge copy exactly matches the timeout string.
- No client-side crash; form progresses normally.

### 3. No-match — `e2e/enrichment-no-match.spec.ts`

**Preconditions.** `street1 = __NOMATCH__`.

**Steps.**
1. Fill address with `__NOMATCH__`, `Phoenix`, `85001`.
2. Assert badge reads "We couldn't find this address in public records —
   that's OK, you can keep going" with `data-enrichment-status="no-match"`.
3. Advance; manually enter property facts.
4. Submit; assert redirect.

### 4. Listed — `e2e/enrichment-listed.spec.ts`

**Preconditions.** `street1 = __LISTED__`.

**Steps.**
1. Fill address with `__LISTED__`, `Phoenix`, `85001`.
2. Assert badge reads "✓ Found your home".
3. Assert `<ListedNotice>` renders with three chips.
4. Click "Ready to switch"; assert `aria-checked="true"` on that chip.
5. Advance to property step; assert `<EnrichmentConfirm>` section "Is this
   your home?" renders 3 thumbnails.
6. Complete remaining steps; submit.
7. Assert redirect; assert `currentListingStatus=ready-to-switch` in the
   hidden input on the final form (captured before submit).

## Observability (manual)

Two observability assertions the specs either run or delegate to manual
review:

### `Cache-Control: private, no-store`

Each spec captures the `/api/enrich` response header and asserts the value
equals `private, no-store`. Automated.

### "Address never logged" (PII)

The expected behavior: server logs contain only the SHA-256 `addressKey`,
never the raw street address. **Playwright's `page.on('console')` captures
browser console only, not server stdout.** So this spec-level assertion is
deferred to a manual check:

```bash
# start the dev server in a terminal with stdout captured
npm run dev > /tmp/next-dev.log 2>&1 &

# run through the happy spec manually, then grep
grep -F '123 Main St' /tmp/next-dev.log   # expect: no match
grep -Eo '[0-9a-f]{64}' /tmp/next-dev.log | head -1   # expect: a SHA-256 hex
```

A CI hardening story (owned by E8) will wire server-log capture into the
Playwright job so this becomes automated.

## CI

`.github/workflows/e2e.yml` stubs the Playwright run. Full CI wiring —
secrets, branch protection, shard matrix, artifact upload — is owned by E8.

## Out of scope

- Real-MLS smoke in staging (E8 launch readiness).
- `track()` observability events validation (S10).
- Performance / Lighthouse budget enforcement (E8).
