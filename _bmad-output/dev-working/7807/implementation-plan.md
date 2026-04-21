# E2-S11 (7807) — Implementation Plan

## Design decision: registry vs presentation split

The story-spec'd shape for `AntiBrokerClaim` is pure data (`id`, `shortLabel`, `fullStatement`, `fulfillmentAnchor`, `lastVerified`), no `icon`. But `<TrustBar>` requires `claims: TrustBarClaim[]` where `icon: ReactNode` is mandatory.

Resolution: keep `claims.ts` pure data (canonical registry, audit-able). Refactor the existing `src/content/anti-broker/placeholder-claims.tsx` into `src/content/anti-broker/trust-bar-claims.tsx` — the presentation adapter that imports from `claims.ts` and joins icons by `id` to produce `TRUST_BAR_CLAIMS: readonly TrustBarClaim[]`. Consumers import the adapter (unchanged: `@/content/anti-broker/...`). This preserves the AC #6 intent (registry-sourced) while keeping JSX out of the audit registry.

## File-group 1 — registry + adapter + consumer redirects

1. **Create `src/content/anti-broker/claims.ts`** — pure-data registry. Type `AntiBrokerClaim` with story-spec shape + optional `subLabel`. 4 entries: `no-fees`, `no-data-resale`, `real-pm`, `jk-realty-broker`. Each `lastVerified: '2026-04-20'`. Each `fulfillmentAnchor` honestly written with E5/E6/E7 pending status surfaced.

2. **Replace `src/content/anti-broker/placeholder-claims.tsx`** with `src/content/anti-broker/trust-bar-claims.tsx` — same icons (extracted from existing file), exports `TRUST_BAR_CLAIMS: readonly TrustBarClaim[]` derived from `claims` (by id-join with icons + label fallback). Drops the `TODO(E2-S11)` comment.

3. **Update 6 consumers** — home, 4 pillar pages, [city] dynamic route. Replace `import { PLACEHOLDER_HOME_TRUST_CLAIMS } from "@/content/anti-broker/placeholder-claims"` with `import { TRUST_BAR_CLAIMS } from "@/content/anti-broker/trust-bar-claims"` and the `claims={PLACEHOLDER_HOME_TRUST_CLAIMS}` prop site.

4. **Delete `src/content/anti-broker/placeholder-claims.tsx`** after the rename + redirect.

5. **Grep verify** `TODO(E2-S11` → 0 matches.

Commit: `e2-s11(7807): anti-broker claims registry + trust-bar adapter (replaces placeholder-claims)`.

## File-group 2 — /az index + audit memo

1. **Create `src/app/(marketing)/az/page.tsx`** — minimal AZ index resolving the S10 documented follow-up. Lists all 7 cities with link cards (uses `cities` registry + `LINKS.city`). PageHeader + grid of city cards + CTASection + JsonLd (CollectionPage or WebPage). Resolves the breadcrumb `/az` 404.

2. **Create `docs/anti-broker-audit.md`** — one-page memo. Header (purpose, date, author). Table of 4 claims with status tags + verifying-references. Closing section enumerates open risks and verifying epics (E5 / E6 / E7 / E8).

Commit: `e2-s11(7807): /az city index + anti-broker audit memo (E2 closeout)`.

## AC mapping

| AC | Group | Notes |
|----|-------|-------|
| 1 typed registry | 1 | claims.ts; ≥4 entries |
| 2 fulfillmentAnchor non-empty | 1 | honest 1–3 sentences each, pending flagged |
| 3 lastVerified ISO | 1 | 2026-04-20 across the board |
| 4 audit memo exists | 2 | docs/anti-broker-audit.md ≤100 lines |
| 5 audit honest about pending | 2 | E5/E6/E7 marked PENDING when arch-not-yet-written |
| 6 consumers import registry | 1 | 6 sites swap to TRUST_BAR_CLAIMS adapter |
| 7 TrustBar renders 4 | 1 | adapter exposes 4; consumers pass full array |
| 8 shortLabel ≤24 chars | 1 | verified per entry |
| 9 fullStatement 1–2 sentences | 1 | per entry |
| 10 audit cross-check E5 | 2 | flagged PENDING; verification deferred to E5-S1 |
| 11 audit cross-check E6 | 2 | flagged PENDING |
| 12 audit cross-check E7 | 2 | flagged PENDING |
| 13 audit cross-check E8 | 2 | flagged as E8's gate |
| 14 no copy-claim drift | 1,2 | reviewed during audit |
| 15 build clean + grep clean | — | npm run build + grep |
| 16 visual QA | ⚠ deferred | structural parity assured by adapter; manual screenshots optional for PR |
| 17 registry growth-friendly | 1 | TRUST_BAR_CLAIMS slices first 4 if registry grows |
