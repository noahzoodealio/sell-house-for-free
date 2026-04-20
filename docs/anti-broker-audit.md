# Anti-broker claims audit

**Purpose:** verify every anti-broker / pro-transparency claim made on the marketing surface against actual back-end behavior.
**Date:** 2026-04-20
**Author:** Noah Neighbors (E2-S11 close-out)
**Source of truth:** `src/content/anti-broker/claims.ts`

Status legend: ✅ honored today · ⏳ honored on launch (pending listed work) · ⚠️ open risk

| Claim id | Short label | Status | Verifying reference |
|----------|-------------|--------|---------------------|
| `no-fees` | No listing fees | ✅ | Marketing copy across all E2 surfaces names exactly the four buyer-side / partner revenue streams disclosed verbatim on `/why-its-free` (`src/content/revenue/streams.ts`). No seller-charge code path exists today. Pre-launch: re-verify against the E5 submission flow once architected — it must contain no seller-billing endpoint. |
| `no-data-resale` | We don't sell your data | ⏳ | Today: only Vercel first-party analytics ships in production via the dual-env gate (`NODE_ENV === 'production' && VERCEL_ENV !== 'preview'`) in `src/app/layout.tsx`. **PENDING E5:** the `/api/submit` payload must not include any `sell_lead_to_third_party_agents` flag, broker-syndication webhook, or partner-CRM mirror — verify when E5-S1 lands. **PENDING E7:** privacy policy must include an explicit clause naming no-resale + no-third-party-tracking-pixels. |
| `real-pm` | A real Project Manager | ⏳ | Today: `/meet-your-pm` surfaces the role-region structure with placeholder identities + the "PMs aren't commission-based" prose. **PENDING E6:** PM assignment must be a human-coordinated routing rule (region + pillar inputs), not an automated handoff to an external agent network. PMs must live in our Supabase, not a partner CRM. |
| `jk-realty-broker` | Licensed AZ broker | ⏳ | `SITE.broker` (`src/lib/site.ts`) carries the JK Realty + Arizona-licensure-of-record fields, surfaced via `realEstateAgentSchema` (S5) on city landers and the footer (E1-S9). **Open item:** the AZ license number is currently `LC-TBD` per a `TODO(E7)` comment in `src/lib/site.ts`; JK Realty must confirm before launch. |

## Open risks (rolled forward to launch gate)

1. **E5 submission payload audit** — verify no broker-syndication / lead-resale fields exist when E5 architecture lands. Adds an E5-S1 acceptance criterion: "submission payload schema reviewed against `claims.no-data-resale.fulfillmentAnchor`".
2. **E7 privacy policy clauses** — must include (a) no contact-info resale to real-estate lead networks, (b) no third-party ad-tracking pixels. Hard gate for E7 closeout.
3. **E6 PM routing implementation** — must remain human-coordinated, no automated outward referral. Hard gate for E6 closeout.
4. **JK Realty license number confirmation** — `SITE.broker.licenseNumber` literal currently `LC-TBD`. Confirm with JK Realty broker of record before launch; surface the real license number in the footer + `realEstateAgentSchema`.
5. **E8 launch-time smoke** — production build must emit zero third-party network requests on marketing pages. E8 owns enforcement; this audit pre-flags as expected to pass given today's analytics gate, but verification is E8's call.

## Re-review cadence

`lastVerified` dates carry the 90-day re-review window. Next sweep due **2026-07-19**. Manual sweep at planning time is acceptable for MVP; a CI lint that flags stale dates is a post-launch nice-to-have.

## How to update this audit

1. Edit `src/content/anti-broker/claims.ts` (the canonical registry).
2. Update the matching row in this memo.
3. Bump `lastVerified` to today's date.
4. If a claim's wording changes, sweep marketing copy that quotes it (`/why-its-free`, `/about`, hero subcopy in `/az/[city]`, pillar bodies) for divergence.
