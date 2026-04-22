# Zoo-Core Service Index Staleness

Tracks when each service was last indexed (via `zoo-core-full-index` or `zoo-core-diff-update`). Agents check here before trusting service knowledge that affects load-bearing decisions.

**Classification:**
- `fresh` — indexed within 30 days
- `aging` — 30–90 days
- `stale` — > 90 days (banner surfaces in `index.md`)

---

## Services

<!-- service-entries:start -->
<!-- Per-service entries populated by zoo-core-full-index and zoo-core-diff-update. Format:
offervana-saas:
  last-indexed: {ISO timestamp}
  commit-sha: {40-char SHA}
  indexed-by: zoo-core-full-index|zoo-core-diff-update
  branch: main
  status: fresh|aging|stale
-->
investor-portal:
  last-indexed: 2026-04-15T00:00:00Z
  commit-sha: fa73b99cc3cccda1c404ea03329df9b99c3469f1
  indexed-by: zoo-core-full-index
  branch: dev
  status: fresh
offervana-saas:
  last-indexed: 2026-04-16T00:00:00Z
  commit-sha: 61581dc184777cb7293ae594294d917556a35ca4
  indexed-by: zoo-core-full-index
  branch: dev
  status: fresh
zoodealio-chat:
  last-indexed: 2026-04-16T00:00:00Z
  commit-sha: 8aa135f2b2cba743d335905ae794181bb658bb22
  indexed-by: zoo-core-full-index
  branch: dev
  status: fresh
zoodealio-infrastructure:
  last-indexed: 2026-04-16T00:00:00Z
  commit-sha: fe5b090b5f7cbeeedeb92501724d875ba5923539
  indexed-by: zoo-core-full-index
  branch: main
  status: fresh
zoodealio-mls:
  last-indexed: 2026-04-16T00:00:00Z
  commit-sha: d42572f923c06d9445403b4a9716adeaeab8c6db
  indexed-by: zoo-core-full-index
  branch: main
  status: fresh
zoodealio-shared:
  last-indexed: 2026-04-15T00:00:00Z
  commit-sha: 5f042c74c8ce9495bada0705ab902bbf3e71c5da
  indexed-by: zoo-core-full-index
  branch: main
  status: fresh
zoodealio-strapi:
  last-indexed: 2026-04-16T00:00:00Z
  commit-sha: 09496f9dcc58e52d710e04cdf6e0770741bcc3fb
  indexed-by: zoo-core-full-index
  branch: main
  status: fresh
zoodealio-trade-in-holdings:
  last-indexed: 2026-04-16T00:00:00Z
  commit-sha: 29a8d56facd353a71227ec0107ba88b321a7bc3a
  indexed-by: zoo-core-full-index
  branch: dev
  status: fresh
<!-- service-entries:end -->
