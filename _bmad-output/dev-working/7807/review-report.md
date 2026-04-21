# E2-S11 (7807) — Self-review

| AC | Verdict | Notes |
|----|---------|-------|
| 1 typed registry | ✅ | `src/content/anti-broker/claims.ts` — `AntiBrokerClaim` type + `claims: readonly AntiBrokerClaim[]` (4 entries). Strict TS; no `any`. |
| 2 fulfillmentAnchor non-empty | ✅ | Each entry has 1–3 sentence anchor naming the implementation (today) or the verifying epic + criterion (PENDING). |
| 3 lastVerified ISO | ✅ | `2026-04-20` across all 4 entries. |
| 4 audit memo exists | ✅ | `docs/anti-broker-audit.md` — under 100 lines, header + table + risks + cadence + how-to-update. |
| 5 audit honest about pending | ✅ | E5 / E6 / E7 marked PENDING with verifying-stories named; only `no-fees` is ✅ today. |
| 6 consumers import registry | ✅ | 6 sites swapped: home + 4 pillar pages + `[city]` dynamic route. `grep TODO(E2-S11` → 0; `grep PLACEHOLDER_HOME_TRUST_CLAIMS` → 0. Adapter (`trust-bar-claims.tsx`) pulls from registry by id. |
| 7 TrustBar 4 claims | ✅ | Adapter `.slice(0, 4)` guards against future registry growth. |
| 8 shortLabel ≤24 chars | ✅ | "No listing fees" (15), "We don't sell your data" (22), "A real Project Manager" (22), "Licensed AZ broker" (18). |
| 9 fullStatement 1–2 sentences | ✅ | Each fits the tooltip / `/why-its-free` consumer pattern. |
| 10 audit cross-check E5 | ✅ | Memo flags PENDING + adds an E5-S1 acceptance criterion. |
| 11 audit cross-check E6 | ✅ | PENDING; PM routing rule + Supabase isolation. |
| 12 audit cross-check E7 | ✅ | PENDING; privacy clauses + JK Realty license number confirmation. |
| 13 audit cross-check E8 | ✅ | Pre-flagged as E8 launch-time third-party-network-requests smoke. |
| 14 no copy-claim drift | ✅ | Reviewed visible copy across home / pillars / city landers / `/why-its-free` / `/about` / `/meet-your-pm`. Every anti-broker claim maps to a registry entry. |
| 15 build clean + grep clean | ✅ | `npm run build` completes (29 pages); `grep TODO(E2-S11` returns zero. |
| 16 visual QA | ⚠ deferred | TrustBar shape unchanged — same icons + labels. Manual screenshots optional for the Feature-level PR. |
| 17 registry growth-friendly | ✅ | Adapter `.slice(0, 4)`; consumers stay on `TRUST_BAR_CLAIMS` regardless of registry length. |

**Bonus deliverable:** `/az` index page (resolves the S10 documented follow-up — the 3-level breadcrumb's `/az` link no longer 404s). Appended `/az` to `routes.ts` (sitemap yes, nav no).

**Verdict:** 16/17 green; 1 deferred. No deviations.

**Unit testing:** skipped — pure data + adapter; no business logic.
