# Analytics & tracking policy

**Default posture: no third-party tracking SDKs.**

Sellers share sensitive personal information (address, financial situation, timeline) through the funnel. The brand promise is "sell for free — no agent, no listing fees" and, implicitly, no data brokering. Every third-party SDK is a data-leak surface we're choosing not to accept.

## Allowed SDKs

| SDK | Environment | Hosted by | Data collected |
|-----|-------------|-----------|----------------|
| Vercel Analytics (`@vercel/analytics`) | Production only | Vercel (first-party beacon) | Pageviews, web vitals; cookieless; no PII |

That's it. One vendor, one environment, no cookies.

## Why not more?

- **No Google Analytics / GA4.** Data goes to Google's ad pipeline; cookie consent required outside the US; high configuration surface that's easy to misconfigure into a PII leak.
- **No Hotjar / FullStory / LogRocket / Microsoft Clarity.** Session replay tools capture form field contents by default — the worst-case data-leak posture for a funnel that collects addresses and phone numbers.
- **No Segment / RudderStack / CDP SDKs.** A router that fans events out to arbitrary downstream vendors is the opposite of the policy posture.
- **No Facebook / TikTok / LinkedIn pixels.** Ad-network pixels are third-party cookies first and analytics second.
- **No HubSpot / Intercom / Drift / Mailchimp client SDKs.** Server-side API usage for transactional email is fine; client-side tracking scripts are not.
- **No PostHog / Mixpanel / Amplitude client SDK.** If we ever need product analytics, a proposal lands first (see process below).

## How the production-only gate works

In `src/app/layout.tsx` the Analytics component is wrapped:

```tsx
{process.env.NODE_ENV === "production" &&
  process.env.VERCEL_ENV !== "preview" && <Analytics />}
```

Both checks are required. Vercel preview deploys set `NODE_ENV=production`, so `NODE_ENV` alone would emit the beacon on every PR's preview URL — not what we want. `VERCEL_ENV !== "preview"` explicitly excludes those. Same posture as `src/app/robots.ts` for the preview-indexing gate.

Dev (`npm run dev`): no beacon. Preview (`VERCEL_ENV=preview`): no beacon. Production (Vercel production deploy): beacon renders.

## Process for adding a new SDK

If you (or a future contributor) think we need a new tracking / analytics / vendor SDK:

1. **File an ADR-style proposal** — a short markdown file under `docs/` explaining what, why, and which alternatives you considered.
2. **Enumerate the data the SDK collects** — not the marketing claim, the actual network payload. Inspect it in dev tools.
3. **Name two approvers** — one on the product side (current epic owner) and one on the legal / broker-compliance side (JK Realty contact or whoever is listed in `SITE.broker`).
4. **Document the gating strategy** — production-only, consent-gated, or server-side-only. No blanket "just add it to `layout.tsx`" paths.
5. **Update this doc** — add a row to the Allowed SDKs table with the environment and a one-line rationale. Proof that the policy survives the addition.

If the proposal can't clear all five steps, the answer is no.

## Approval signoff

- **Product**: current epic owner for E1 (foundation) / E8 (observability) when they land.
- **Compliance**: broker of record listed in `SITE.broker` (currently JK Realty) — escalated through the responsible team.
- **Engineering**: anyone on the team can veto; takes two approvers to add.

## Related

- Non-functional requirements: project plan §3 ("no PII to third parties" posture).
- Gating pattern: same dual-env check as `src/app/robots.ts` (E1-S3) — single idiom, two uses.
