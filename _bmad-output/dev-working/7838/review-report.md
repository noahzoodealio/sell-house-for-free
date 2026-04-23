# E4-S5 (7838) — Self-review vs Acceptance Criteria

## AC Coverage

| # | Criterion | Verdict | Notes |
|---|-----------|---------|-------|
| 1 | Hook signature discriminated union | ✅ | `EnrichmentHookResult`: idle/loading/ok+slot/no-match/out-of-area/timeout/error+code |
| 2 | Null input → idle, no fetch | ✅ | Effect returns early; `IDLE` constant |
| 3 | 400ms debounce | ✅ | `DEBOUNCE_MS = 400`; `setTimeout` inside effect |
| 4 | `useTransition` wraps fetch + state dispatch | ✅ | `applyEnvelope` wraps `setResult` + `setEnrichment` in `startTransition` |
| 5 | `AbortController` cancel on supersede + unmount | ✅ | `latestControllerRef` + cleanup aborts; verified by unmount test |
| 6 | sessionStorage hit short-circuits without loading flash | ✅ | Cache probed BEFORE setting LOADING; verified by cache-hit test |
| 7 | SHA-256 client hash matching server semantics | ✅ | `crypto.subtle.digest('SHA-256', utf8)`; canonical string format matches `normalize.ts` (`street1|street2|city|AZ|zip`) |
| 8 | Concurrent same-address dedupe | ✅ | `inFlightRef: Map<cacheKey, {controller, promise}>`; reuses pending promise |
| 9 | Draft write on ok | ✅ | `setEnrichment(env.slot)` (via `envelopeToSlot`) |
| 10 | Draft write on non-ok | ✅ | `{status: envelope.status, fetchedAt}` |
| 11 | AZ-zip client guard | ✅ | `isAzZip` short-circuit; verified by test |
| 12 | `setEnrichment` reducer + localStorage exclude | ✅ | `setEnrichment` exported from `draft.ts`; `stripPii` now deletes `enrichment` before persist |
| 13 | No server-side imports | ✅ | Hook imports only types + `setEnrichment`; no `service`, `mls-client`, `cache`, `normalize` |
| 14 | Unit tests | ✅ | 10 tests covering null-idle, ok, no-match, timeout, session cache hit, session cache write, debounce coalesce, abort on unmount, AZ-zip guard, referential stability |
| 15 | Return-value stability | ✅ | Discriminated union typed; React state identity preserved across unrelated re-renders |

## Spec deviations (documented in implementation-plan.md)

1. **`useSellerFormDraft` hook doesn't exist** — spec assumes it does. Added `setEnrichment` as standalone export on `draft.ts` instead. No `types.ts` edit needed.
2. **`enrichmentSlotSchema.status` enum extended** — added `"no-match"` and `"out-of-area"` to satisfy AC 10. Backward compatible (additive only).

## Test results

- `use-address-enrichment.test.ts`: 10/10 pass
- Full suite: 97/97 pass (no regressions across 8 test files)
- `tsc --noEmit`: clean
- `eslint`: no new errors (5 pre-existing lint issues in unrelated files: faq.tsx, header.tsx, renovation-only page, actions.ts)

## Non-obvious notes

- **Cache hit doesn't flash loading.** Re-ordered the effect so the sessionStorage probe happens before `setResult(LOADING)`, at the cost of a microtask-sized delay for the async SHA-256. Acceptable.
- **`cancelled` local + ref cleanup.** Two layers of cancellation: a closure-local `cancelled` flag ensures we don't `setState` after unmount, and `latestControllerRef.current.abort()` tears down the in-flight fetch.
- **`setEnrichment` is effectively a no-op on persisted storage.** It merges enrichment into the draft, then `stripPii` drops it before `localStorage.setItem`. The call still satisfies AC 12 (reducer action runs; write path strips); the live slot lives in hook state + sessionStorage per AC 6.

## Verdict

Ready for code-review + commit.
