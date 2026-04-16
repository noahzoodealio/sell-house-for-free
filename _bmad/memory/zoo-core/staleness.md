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
<!-- service-entries:end -->
