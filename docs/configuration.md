# Configuration — environment variables

All env vars for `sell-house-for-free`. Start from `.env.example` in the
repo root.

```bash
cp .env.example .env.local
# or pull from Vercel (preferred — matches prod shape)
vercel env pull .env.local --environment=development --yes
```

`.env.local` is gitignored. `.env.example` is the source of truth for the
list and the comments.

## Property enrichment (E4)

Five vars, all **server-only** — no `NEXT_PUBLIC_` prefix, no reference
from client components.

| Var | Required? | Default | Notes |
|---|---|---|---|
| `MLS_API_BASE_URL` | required (prod/preview) | — | Base URL for `Zoodealio.MLS`. Unset is allowed in dev with `ENRICHMENT_DEV_MOCK=true`. |
| `MLS_API_TOKEN` | optional | — | Forward-compat Bearer. MLS endpoints are currently network-gated, not token-gated. |
| `ENRICHMENT_TIMEOUT_MS` | optional | `4000` | Per-call timeout. Applies to each of the three MLS hops individually. |
| `ENRICHMENT_CACHE_TTL_SECONDS` | optional | `86400` | `unstable_cache` TTL for successful responses. `no-match` responses use a 1h TTL internally. |
| `ENRICHMENT_DEV_MOCK` | optional | `false` | When `true`, returns canned fixtures from `src/lib/enrichment/fixtures.ts` without calling MLS. Used by Playwright (E4-S9) + local dev without MLS access. |

Related runbooks:
- [`docs/e4-operations.md`](./e4-operations.md) — one-page ops guide (endpoints, error signatures, cache drain, escalation).
- [`docs/operations/sas-rotation.md`](./operations/sas-rotation.md) — MLS photo SAS rotation procedure + calendar reminder (2027-02-11 expiry).
- [`docs/e4-qa-plan.md`](./e4-qa-plan.md) — QA scenarios the Playwright specs enforce.
