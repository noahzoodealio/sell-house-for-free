---
feature: e7-az-compliance-anti-broker-disclosure
services-in-scope: [sell-house-for-free]
upstream-research: _bmad-output/planning-artifacts/project-plan-sell-house-for-free.md
started-at: 2026-04-17T00:00:00Z
last-completed-step: 5
---

# E7 — AZ Compliance & Anti-Broker Disclosure — Architecture Working Sidecar

## Step 1 — Scope (complete)

**Source:** `_bmad-output/planning-artifacts/project-plan-sell-house-for-free.md` §4 E7, plus plan §3 non-functionals ("we don't sell your data" is binding), Q2 (broker = JK Realty), Q10 (TCPA separately-worded opt-in), Q12 (analytics PII audit).

**In-scope services (single-repo):** `sell-house-for-free` only. No cross-service integration.

**E7 scope (paraphrased from plan):**
- Privacy Policy with binding "we do not sell or share with agents / brokers / lead aggregators" clause
- Terms of Service
- TCPA consent text — **separately-worded from ToS** (non-trivial per Q10), version-controlled
- AZ brokerage footer attribution naming **JK Realty** with license number
- CCPA-style "Do Not Sell My Info" link (affirming we never sold)
- Cookie banner if analytics requires it (decision in Step 3)
- Parallel with E2; gated by E1 only

**Constraints inherited:**
- E1 created the `(legal)` route group; E7 fills it.
- E3 committed to `src/content/consent/{tcpa,terms,privacy}.ts` constants and asked E7 (open question line 334) whether to keep that pattern vs MDX. **Answer: keep constants** — they must be importable by the form. MDX cannot provide a string to the `<ConsentBlock>` at runtime without custom plumbing.
- E2 installed the MDX pipeline (`@next/mdx`, `src/mdx-components.tsx`, `pageExtensions` wired). E7 consumes it for prose pages.
- E1's handrolled ethos applies: no cookie-consent library unless a cookie banner is actually needed.

## Step 2 — Pattern survey (complete)

**Project-internal patterns to reuse:**

| Pattern | Source | Use |
|---|---|---|
| `buildMetadata({ title, description, path, image? })` | E1 `src/lib/seo.ts` | Every legal page |
| `ROUTES` registry | E1 `src/lib/routes.ts` | Legal pages appear in sitemap via registration |
| `(legal)` layout | E1 `src/app/(legal)/layout.tsx` | Shared chrome for legal pages |
| `SITE` config | E1 `src/lib/site.ts` | Extend with `broker`, `legal`, `privacyContact` |
| MDX route pages | E2 `src/app/(marketing)/why-its-free/page.mdx` | Long-form prose |
| `src/mdx-components.tsx` mapping | E2 | Types/links/accessibility of MDX output |
| JSON-LD typed helpers | E2 `src/lib/schema.ts` | `WebPage` schema.org for legal pages |
| Consent copy constants | E3 `src/content/consent/{tcpa,terms,privacy}.ts` | E7 replaces placeholder `text`; introduces `versions.ts` registry |
| Anti-broker claims registry | E2 `src/content/anti-broker/claims.ts` | Cross-referenced from privacy policy to keep marketing and legal aligned |
| Handrolled discipline | E1 §6 | No cookie-consent library (none of our cookies need consent under MVP config) |

**External regulatory references (for content drafting, not code):**

- **TCPA** — 47 U.S.C. § 227 + FCC's 2023 one-to-one written consent rule. Separately-worded, not buried in ToS. Keeps auto-dialed and pre-recorded voice / SMS consent distinct from general terms acceptance. Retention of consent record (version + timestamp) is a legal requirement, not a nice-to-have.
- **Arizona Department of Real Estate (ADRE)** — A.R.S. § 32-2151 and ADRE Substantive Policy Statement SPS 2005.12: every real estate advertising surface must include the broker of record's legal name + license number. JK Realty must appear in the footer and in the page `<head>` structured data.
- **CAN-SPAM Act** — transactional emails covered by E6; E7 writes the privacy copy about email handling + unsubscribe posture.
- **FTC Guides Concerning the Use of Endorsements** + FTC "Free!" claim guidance — plan §3 says revenue model must be disclosed plainly; the `/why-its-free` page lives in E2 but its claims are mirrored in privacy/ToS so claim and practice are consistent.
- **CCPA** — strictly applies to California residents; AZ-only launch means limited exposure, but we expose a "Do Not Sell" link and affirm the no-sell posture for good practice (and for east-coast visitors who arrive regardless of the AZ gate).
- **WCAG 2.1 AA** — plan §3 non-functional. `/accessibility` page commits to the standard and provides a contact.
- **COPPA** — we do not knowingly collect from under-13; stated in privacy policy.

**Next.js 16 references consulted** (`node_modules/next/dist/docs/`):
- `02-guides/mdx.md` — MDX pipeline (installed by E2, reused here).
- `03-api-reference/04-functions/generate-metadata.md` — per-page metadata.
- `03-api-reference/03-file-conventions/01-metadata/*` — we do **not** add a separate robots.ts for legal pages; E1's env-aware robots.ts is authoritative.
- `02-guides/json-ld.md` — JSON-LD inline `<script>` emission (E2 pattern, reused).

## Step 3 — Design decisions (complete)

**Pages delivered under `(legal)/`:**

| Route | Format | JSON-LD | Notes |
|---|---|---|---|
| `/privacy` | MDX | `WebPage` + `publisher: Organization` | Includes binding no-sell clause; cross-references `src/content/anti-broker/claims.ts` to keep claim↔behavior aligned. |
| `/terms` | MDX | `WebPage` | Arbitration clause minimal (no class-action waiver — keeps AZ AG risk lower for MVP). |
| `/tcpa-consent` | MDX | `WebPage` | Archive of current + prior TCPA consent text, rendered from `src/content/consent/versions.ts`. |
| `/do-not-sell` | MDX | `WebPage` | CCPA-style link target; affirms we never sold. |
| `/accessibility` | MDX | `WebPage` | WCAG 2.1 AA commitment + contact email. |
| `/disclosures` | MDX | `WebPage` + `RealEstateAgent` | AZ ADRE mandatory broker-of-record disclosure; fair-housing notice. |

**Consent copy authoring pattern (resolves E3 open question line 334):**

TS constants in `src/content/consent/`, **not MDX**. Reason: the form must import the raw string at runtime to render inline next to the checkbox. MDX routes compile to React components, not strings, and piping MDX → string would require custom compilation. Keep:

- `tcpa.ts` — `{ version: 'YYYY-MM-DD', text: '…separately-worded SMS/voice consent…' }`
- `terms.ts` — `{ version: 'YYYY-MM-DD', text: '…terms + privacy acknowledgment…' }`
- `privacy.ts` — `{ version: 'YYYY-MM-DD', text: '…privacy-only acknowledgment…' }` (exported but E3 decides whether to render a third checkbox or fold into terms.ts)
- `versions.ts` — **new in E7.** History log: `{ tcpa: [...versions], terms: [...versions], privacy: [...versions] }`. Each entry: `{ version, effectiveDate, supersededBy?, text }`. The `/tcpa-consent` archive page renders from this registry.
- `index.ts` — barrel exports.

**Version governance:**
- Bumping a `version` is a deliberate act — every change to `text` requires a simultaneous `versions.ts` entry and a CHANGELOG line.
- ESLint rule (custom, later): fail CI if `text` changes without `version` bumping. *Deferred — manual review is fine for MVP.*

**Cookie banner decision:**

**No banner in MVP.** Reasoning:
- `@vercel/analytics` (E1) is cookie-less and does not identify users — it respects DNT and uses hashed fingerprints, not persistent tracking cookies.
- No third-party marketing pixels (plan §3 non-functional).
- Supabase session cookies (E6) are first-party functional cookies, categorically exempt under GDPR/CCPA.
- No login / authentication surface on the consumer site.

If E8 or post-launch introduces anything in the "non-strictly-necessary" bucket (remarketing pixel, analytics with persistent IDs, etc.), we add a banner then. Document the current posture in `docs/cookie-policy.md` so future contributors see the structural constraint.

**Footer broker attribution (extends E1-S9):**

E1's footer shipped a placeholder broker line. E7 replaces with a structured block:

```
Sell Your House Free is a marketing service operated in Arizona by [parent entity].
Arizona real estate services provided through JK Realty, AZ broker of record.
License: AZ BR#{SITE.broker.licenseNumber}.
[office address line]
Equal Housing Opportunity logo.
```

`SITE.broker` lives in `src/lib/site.ts` (extending E1). License number is an env var (`NEXT_PUBLIC_BROKER_LICENSE`) so it can be updated without a code deploy if JK Realty's number changes. **Open question:** current license number placeholder until Noah confirms.

**Consent version handoff to E5:**

E3's Server Action already stamps `acceptedAt` when each consent checkbox is checked. E7 defines the *payload contract* E5 carries forward into Offervana:

```ts
// Part of SellerFormDraft, already in E3's canonical shape
consent: {
  tcpa:    { accepted: boolean, version: string, acceptedAt: string }
  terms:   { accepted: boolean, version: string, acceptedAt: string }
  privacy: { accepted: boolean, version: string, acceptedAt: string }
}
```

E5 maps this into Offervana `NewClientDto.SurveyData` JSON (already a flexible string). Concrete key names: `tcpa_consent_version`, `tcpa_consent_at`, etc. Offervana schema change: none.

**Pattern decisions:**

| Decision | Cited pattern | Deviation? |
|---|---|---|
| MDX for prose pages | E2 MDX pipeline | No |
| TS constants for consent text | E3 contract | No |
| JSON-LD `WebPage` on every legal page | E2 schema.ts | No |
| Env-configurable broker license number | — | Minor; justified below |
| No cookie banner | — | Justified below |
| Version registry in `versions.ts` instead of separate per-version files | — | Small-repo pragmatism; can split later |
| Separate `/tcpa-consent` archive page | TCPA record-retention implication | Justified below |
| `(legal)` pages are indexable (`robots: allow`) | E1 robots.ts is env-aware, not per-route | Legal pages must be crawlable for ADA findability + Google compliance |

## Step 4 — Integration contracts (complete)

See final doc §5. Key seams:

- **E1:** `(legal)/layout.tsx`, `buildMetadata`, `ROUTES`, `SITE`, handrolled primitives.
- **E2:** MDX pipeline, `src/mdx-components.tsx`, `src/lib/schema.ts`, `src/content/anti-broker/claims.ts` (privacy policy cross-references this so claim↔behavior can be audited at launch per plan §E8).
- **E3:** `src/content/consent/{tcpa,terms,privacy}.ts` — E7 authors production `text` + `version`; E3 `<ConsentBlock/>` renders as-is.
- **E5:** consent payload keys in Offervana `SurveyData`; E5 maps `consent.tcpa.version` etc.
- **E6:** transactional email templates reference `/privacy` and `/terms` by absolute URL (from `SITE.url`). E6 owns the templates; E7 owns the destination URLs being stable.
- **E8:** launch audit verifies every marketing claim in E2 has a matching privacy/ToS statement (and vice versa); CSP must allow inline JSON-LD (`script-src 'self' 'unsafe-inline'` — or preferably nonce-based); no third-party PII pixels present.

## Step 5 — Assembly (complete)

Final architecture document drafted at `_bmad-output/planning-artifacts/architecture-e7-az-compliance-anti-broker-disclosure.md`. Sidecar archived.
