# Architecture — E7 AZ Compliance & Anti-Broker Disclosure

- **Feature slug:** `e7-az-compliance-anti-broker-disclosure`
- **Repo:** `sell-house-for-free` (Next.js 16.2.3, React 19.2.4, Tailwind v4)
- **Upstream:** `_bmad-output/planning-artifacts/project-plan-sell-house-for-free.md` §4 E7 (plus §3 non-functionals, §7 Q2, Q10, Q12)
- **Depends on:** E1 (Site Foundation) — `(legal)` layout, `SITE`/`ROUTES`/`buildMetadata`, primitives. E2 (MDX pipeline, `src/mdx-components.tsx`, `src/lib/schema.ts`). E3 (consent constants contract).
- **Feeds:** E5 (consent payload keys in Offervana `SurveyData`), E6 (stable legal URLs in email templates), E8 (launch claim-vs-behavior audit)
- **Runs in parallel with:** E2
- **Author:** Noah (Architect) · 2026-04-17
- **Status:** draft — ready for PM decomposition

---

## 1. Summary

E7 makes the trust posture legally binding. It ships six legal pages under `(legal)/` (privacy, terms, TCPA-consent archive, do-not-sell, accessibility, AZ disclosures), finalizes the production copy for the three consent checkboxes E3 renders on the submission form, installs the **consent version registry** that proves which text a seller agreed to, and replaces E1's placeholder broker footer with the JK Realty attribution required by Arizona Department of Real Estate rules.

The guiding principle is **claim-behavior symmetry**: every promise made in marketing copy (E2), every consent string on the form (E3), and every privacy/ToS paragraph written here has to describe the same system. E7 cross-references E2's anti-broker claim registry and E3's consent payload contract so the three surfaces can be audited against each other at launch (E8).

**Affected services:** `sell-house-for-free` only. No cross-service integration.

**Pattern adherence snapshot**

| Area | Choice | Pattern source |
|---|---|---|
| Page format | MDX for prose-heavy pages; TSX shell routes `(legal)/<slug>/page.mdx` | E2 MDX pipeline (`@next/mdx`) |
| MDX type mapping | Reuse E2's `src/mdx-components.tsx` (no changes) | E2 arch §3.1 |
| Metadata | `buildMetadata()` from E1 `lib/seo.ts`; `robots: { index: true, follow: true }` on legal pages | E1 arch §3.4 |
| Sitemap | Register each legal route in `src/lib/routes.ts`; E1's `sitemap.ts` picks them up | E1 arch §5 |
| Structured data | `<JsonLd>` helper with `schema-dts` types (`WebPage`, `Organization`, `RealEstateAgent`) | E2 `src/lib/schema.ts` |
| Consent copy | TS constants in `src/content/consent/*.ts` — importable by the form | E3 arch §3.4 (resolves E3 line 334 open question) |
| Consent version log | `src/content/consent/versions.ts` — history registry keyed by constant id | New in E7 |
| Broker attribution | `SITE.broker` in `src/lib/site.ts` + env-driven license number | Extends E1 §3.4 |
| Cookie banner | **None.** Vercel Analytics is cookie-less; no third-party marketing pixels; Supabase cookies are first-party functional | Plan §3 non-functional; documented in `docs/cookie-policy.md` |
| Anti-broker claim alignment | Privacy policy cross-references `src/content/anti-broker/claims.ts` | E2 arch §3.3 |

**Pages delivered**

| Route | Type | Schema.org | Indexed? |
|---|---|---|---|
| `/privacy` | MDX | `WebPage` + `Organization.publisher` | Yes |
| `/terms` | MDX | `WebPage` | Yes |
| `/tcpa-consent` | MDX | `WebPage` | Yes (TCPA record of record) |
| `/do-not-sell` | MDX | `WebPage` | Yes |
| `/accessibility` | MDX | `WebPage` | Yes |
| `/disclosures` | MDX | `WebPage` + `RealEstateAgent` | Yes |

---

## 2. Component diagram

```
                src/app/(legal)/layout.tsx        (from E1-S5; E7 extends chrome)
                            │  minimal legal chrome: brand mark + container + footer
                            │
       ┌────────────────────┼──────────────────────────────────────────┐
       ▼                    ▼                    ▼                     ▼
┌─────────────┐    ┌─────────────┐     ┌──────────────────┐    ┌──────────────┐
│ /privacy    │    │ /terms      │     │ /tcpa-consent    │    │ /do-not-sell │
│ page.mdx    │    │ page.mdx    │     │ page.mdx         │    │ page.mdx     │
└──────┬──────┘    └──────┬──────┘     └────────┬─────────┘    └──────┬───────┘
       │                  │                     │                      │
       │                  │                     ▼                      │
       │                  │        reads `versions.ts` registry        │
       │                  │        renders current + prior TCPA text   │
       │                  │                                            │
       ▼                  ▼                                            ▼
  cross-refs         cross-refs                               cross-refs
  anti-broker        anti-broker                              anti-broker
  claims             claims                                   claims

                   ┌──────────────────┐     ┌──────────────────┐
                   │ /accessibility   │     │ /disclosures     │
                   │ page.mdx         │     │ page.mdx         │
                   │ (WCAG 2.1 AA)    │     │ (AZ ADRE + fair  │
                   │                  │     │  housing notice) │
                   └──────────────────┘     └──────────────────┘


 Shared authoring surface (TS, not MDX — must be importable by E3 form):

 src/content/consent/
 ├── tcpa.ts        ← { version, text } — CURRENT binding TCPA opt-in copy
 ├── terms.ts       ← { version, text } — CURRENT terms/privacy ack copy
 ├── privacy.ts     ← { version, text } — CURRENT privacy-only ack copy
 ├── versions.ts    ← { tcpa:[…], terms:[…], privacy:[…] } — history log
 └── index.ts       ← barrel


 Site + broker config (extends E1 src/lib/site.ts):
 SITE.broker = {
   name: 'JK Realty',
   licenseNumber: process.env.NEXT_PUBLIC_BROKER_LICENSE ?? 'AZ BR#TBD',
   licenseState: 'AZ',
   officeAddress: '…',
 }
 SITE.legal = {
   privacyEffective: '2026-04-17',
   termsEffective:   '2026-04-17',
 }
 SITE.privacyContact = 'privacy@sellyourhousefree.com'


 Footer (extends E1-S9 src/components/layout/footer.tsx):
 ├── Broker attribution block  (reads SITE.broker)
 ├── Legal link list            (reads from ROUTES where route.group === 'legal')
 ├── Equal Housing Opportunity logo (public/images/legal/eho.svg)
 └── Copyright + SITE.name


 Consent handoff to the form (no code change in E7 — just content):
 E3 <ConsentBlock/>  ──imports──▶  src/content/consent/{tcpa,terms,privacy}.ts
                                   (E7 replaces placeholder `text`;
                                    E3 renders verbatim, stamps acceptedAt)
```

---

## 3. Per-service changes

All changes live in `sell-house-for-free`.

### 3.1 Legal routes — `src/app/(legal)/`

Six page routes, each a `page.mdx`:

| File | Purpose |
|---|---|
| `src/app/(legal)/privacy/page.mdx` | Privacy Policy. Includes binding no-sell clause cross-referencing `src/content/anti-broker/claims.ts`. JSON-LD `WebPage` with `publisher: Organization` (JK Realty). |
| `src/app/(legal)/terms/page.mdx` | Terms of Service. Minimal arbitration clause (no class-action waiver in MVP — see §6 deviations). |
| `src/app/(legal)/tcpa-consent/page.mdx` | TCPA consent archive. Renders current text from `src/content/consent/tcpa.ts` plus prior versions from `src/content/consent/versions.ts`. Each version stamped with `effectiveDate` and `supersededBy`. |
| `src/app/(legal)/do-not-sell/page.mdx` | CCPA-style "Do Not Sell My Info" link target. Affirms we never sold. Provides `privacy@sellyourhousefree.com` as contact. |
| `src/app/(legal)/accessibility/page.mdx` | WCAG 2.1 AA commitment + accessibility contact email. |
| `src/app/(legal)/disclosures/page.mdx` | AZ broker-of-record disclosure (A.R.S. § 32-2151 wording), fair-housing notice, equal housing opportunity logo reference, JK Realty license number + address. JSON-LD `RealEstateAgent` + `Organization`. |

Each MDX file exports:

```tsx
export const metadata = buildMetadata({
  title: '…',
  description: '…',
  path: '/…',
});
```

No `robots` override — they are indexable (E1's env-aware `robots.ts` drives site-wide gating; legal pages should be findable in production).

### 3.2 Legal layout extensions — `src/app/(legal)/layout.tsx`

E1 stubbed this with minimal chrome. E7 adds:
- An **"Effective: YYYY-MM-DD / Last updated: YYYY-MM-DD"** banner at the top of each page body (reads a small helper `<EffectiveStamp>` sourced from the page's MDX frontmatter or an exported constant — see §3.4).
- A right-rail table of contents for `privacy` and `terms` (long pages). Implemented as a small server component that walks the MDX AST's `h2` entries — or, simpler, as hardcoded per-page based on the MDX's own headings. **MVP: hardcoded per-page.** TOC extraction is a post-launch enhancement.
- A compact legal-nav strip below the main body: cross-links to the other five legal pages.

### 3.3 Consent copy — `src/content/consent/` (finalize + extend)

E3 shipped placeholders. E7 replaces with production text and adds the version registry.

| File | Action | Notes |
|---|---|---|
| `src/content/consent/tcpa.ts` | Replace placeholder | Production TCPA one-to-one consent text. Separately-worded from `terms.ts`. Names JK Realty + "its affiliates" carefully (scoped to Zoodealio's fulfillment network — this is the counterpart of the no-resale clause in privacy). Phone + SMS opt-in is explicit; opt-out via "STOP" (SMS) / verbal (voice) is stated in the text itself. `version: '2026-MM-DD'` set at ship. |
| `src/content/consent/terms.ts` | Replace placeholder | Production copy — "I have read and agree to the Terms of Service and Privacy Policy." Short, standalone. |
| `src/content/consent/privacy.ts` | Replace placeholder or **remove** | E3 left this as an "export-but-maybe-don't-render" path. **Recommendation: fold into `terms.ts` as a combined acknowledgment** — a third checkbox adds form friction without legal value because terms reference privacy by link. If E3 disagrees, keep separate; either way, E7 authors whichever files E3 renders. |
| `src/content/consent/versions.ts` | **Create** | Version registry. Shape: `{ tcpa: VersionEntry[], terms: VersionEntry[], privacy: VersionEntry[] }` where `VersionEntry = { version, effectiveDate, supersededBy?: string, text: string }`. Append-only; never mutate a prior entry. The `/tcpa-consent` archive page is the human-readable view of this registry. |
| `src/content/consent/index.ts` | Create | Barrel: re-exports the three current constants + `versions`. |

**Invariant:** every change to `text` in `tcpa.ts` / `terms.ts` / `privacy.ts` must (a) bump the `version` string and (b) append an entry to `versions.ts` with the same `version` and the *new* text. CI enforcement is deferred — PR review is authoritative in MVP.

### 3.4 Site config extensions — `src/lib/site.ts`

E1 shipped minimal `SITE`. E7 extends:

```ts
export const SITE = {
  // …E1 fields
  broker: {
    name: 'JK Realty',
    licenseNumber: process.env.NEXT_PUBLIC_BROKER_LICENSE ?? 'AZ BR#TBD',
    licenseState: 'AZ',
    officeAddress: '…',   // supplied once confirmed; single source used in footer + /disclosures
    website: 'https://…', // if JK Realty requires a link-back per SPS 2005.12
  },
  legal: {
    privacyEffective: '2026-MM-DD',
    termsEffective:   '2026-MM-DD',
  },
  privacyContact: 'privacy@sellyourhousefree.com',
};
```

`NEXT_PUBLIC_BROKER_LICENSE` is added to `.env.example` and Vercel env UI. Placeholder `AZ BR#TBD` ships until Noah confirms the real number (see §7 open questions).

### 3.5 Footer updates — `src/components/layout/footer.tsx`

E1-S9 shipped placeholder legal links and a placeholder broker line. E7 replaces:

- **Broker attribution block** — renders `SITE.broker.name`, `SITE.broker.licenseNumber`, `SITE.broker.officeAddress`, equal housing opportunity logo.
- **Legal link list** — computed from `ROUTES` where `route.group === 'legal'`. (This requires a `group` field on `RouteEntry`; E7 adds it.)
- **Copy:** "Sell Your House Free is a marketing service. Arizona real estate services are provided through JK Realty (AZ BR#{license}), the Arizona broker of record. All sellers work with Zoodealio-employed Project Managers; we do not sell or share your information with outside agents, brokerages, or lead aggregators."

The one-line summary above is **identical in meaning** to the privacy policy's binding no-sell clause — this is the claim-behavior symmetry E8 audits.

### 3.6 Routes registry extensions — `src/lib/routes.ts`

E1 shipped `RouteEntry = { path, changeFrequency, priority }`. E7 adds `group?: 'marketing' | 'legal' | 'funnel'` so the footer can filter legal links without hardcoding paths.

Entries added:
```ts
{ path: '/privacy',        group: 'legal', changeFrequency: 'yearly',  priority: 0.4 },
{ path: '/terms',          group: 'legal', changeFrequency: 'yearly',  priority: 0.4 },
{ path: '/tcpa-consent',   group: 'legal', changeFrequency: 'monthly', priority: 0.3 },
{ path: '/do-not-sell',    group: 'legal', changeFrequency: 'yearly',  priority: 0.3 },
{ path: '/accessibility',  group: 'legal', changeFrequency: 'yearly',  priority: 0.3 },
{ path: '/disclosures',    group: 'legal', changeFrequency: 'yearly',  priority: 0.3 },
```

E2's existing entries are annotated with `group: 'marketing'` as part of E7-S1 (tiny cross-epic touch, coordinated).

### 3.7 Cookie policy doc — `docs/cookie-policy.md`

E1-S10 introduced an anti-third-party-SDK policy doc. E7 adds the sibling cookie-policy doc:

> **We do not set non-essential cookies.**
> - `@vercel/analytics` is cookie-less.
> - Supabase (E6) sets first-party functional cookies for session state only — categorically exempt from consent under GDPR/ePrivacy and not in scope for CCPA.
> - No third-party marketing pixels, remarketing tags, or cross-site tracking.
> If a future change introduces non-essential cookies (remarketing, analytics with persistent IDs, third-party embeds), a consent banner + preference center MUST land in the same PR. Until then, no banner.

This is a policy artifact, not runtime code. E8's launch audit checks `document.cookie` across a real browsing session to confirm the policy holds.

### 3.8 Environment variables (new)

| Var | Required | Used by |
|---|---|---|
| `NEXT_PUBLIC_BROKER_LICENSE` | Yes (production) | `SITE.broker.licenseNumber`; rendered in footer + `/disclosures` |

No secrets introduced — license numbers are public information.

### 3.9 Public assets (new)

| Path | Purpose |
|---|---|
| `public/images/legal/eho.svg` | Equal Housing Opportunity logo (public domain). Used in footer + `/disclosures`. |
| `public/images/legal/jk-realty-logo.svg` | JK Realty logo, if required by brokerage agreement. *Confirm before shipping.* |

---

## 4. Content authoring guidelines (not architecture, but E7-scoped)

Legal copy is a first-class deliverable. These guidelines are part of the story ACs — not separate docs, because shipping weak legal copy is a failure mode the architecture can't prevent.

**For privacy policy:**
- Must include a binding **"we do not sell or share your personal information with real estate agents, brokerages, or lead aggregators outside Zoodealio's fulfillment network"** clause. Word-for-word consistent with the footer summary (§3.5). Cross-reference `src/content/anti-broker/claims.ts` (E2) so anyone updating marketing copy sees the privacy-side implication.
- Data categories: contact (name, email, phone), property (address, facts provided by seller + enriched by ATTOM/MLS via `Zoodealio.MLS`), attribution (UTM / gclid / session ID / entry page). List each with retention + purpose.
- "Who we share with" list: JK Realty (broker of record, legally required), Zoodealio-employed Project Managers, SendGrid (email delivery, via Offervana's `Integrations/`), Supabase (PM roster storage), Vercel (hosting + anonymous analytics), ATTOM via Zoodealio.MLS (property facts enrichment). **Named, not hedged.**
- COPPA: one-sentence statement that we do not knowingly collect from under-13 + deletion process.
- Seller rights: access / correction / deletion contact is `SITE.privacyContact`; 30-day response commitment.
- CCPA-style "right to know / delete / opt-out-of-sale" — honored by existing practice (we never sold); link to `/do-not-sell`.

**For terms of service:**
- "Free" claim disclosure consistent with `/why-its-free` (E2) — seller pays zero; revenue from optional vendor products + buyer-side spread.
- JK Realty as broker of record named explicitly.
- AZ-only service area stated; submissions from outside AZ are not accepted (consistent with E3's client/server validation).
- **No class-action waiver in MVP.** Arbitration clause is limited to "non-binding mediation first" language — see §6 deviations.
- Limitation of liability clause appropriate for a marketing-funnel service; does not try to limit JK Realty's fiduciary duties (those are governed by the listing agreement signed outside this site).

**For TCPA consent text:**
- Separately-worded from terms-of-service checkbox — this is the single most important line in the entire compliance surface and is legally required to stand alone.
- Names the sender(s) in scope: "JK Realty and Zoodealio-employed Project Managers."
- Explicitly consents to auto-dialed / pre-recorded / SMS — the 2023 FCC rule requires these modalities to be named.
- Opt-out mechanics stated in the consent itself: "reply STOP to any text" + "ask any caller to remove your number."
- Consent is **not** a condition of service (TCPA compliance requirement for real-estate solicitations).
- Anchored `version` string is the consent evidence record's primary key.

**For accessibility statement:**
- WCAG 2.1 AA commitment.
- `accessibility@sellyourhousefree.com` contact.
- Workflow when a user reports a barrier (response SLA, remediation commitment).

**For AZ disclosures page:**
- A.R.S. § 32-2151 mandated language (broker of record, license number, license state).
- Fair Housing Act + ADA acknowledgment.
- ADRE SPS 2005.12 web-advertising compliance: licensee name, license number, brokerage name where applicable.

---

## 5. Integration contracts

### 5.1 E1 → E7

| From E1 | E7 consumes |
|---|---|
| `src/app/(legal)/layout.tsx` | Shared chrome; E7 extends with effective-date banner + legal nav strip |
| `src/lib/seo.ts` `buildMetadata()` | Every legal page |
| `src/lib/routes.ts` + `ROUTES` | E7 appends legal entries and adds `group` field |
| `src/lib/site.ts` `SITE` | E7 extends with `broker`, `legal`, `privacyContact` |
| `src/components/layout/footer.tsx` | E7 replaces placeholder broker + legal links |

### 5.2 E2 → E7

| From E2 | E7 consumes |
|---|---|
| `@next/mdx` pipeline + `pageExtensions` + `createMDX` | All legal pages authored as `.mdx` |
| `src/mdx-components.tsx` | Applied globally — no E7-specific overrides needed |
| `src/lib/schema.ts` JSON-LD helpers | `WebPage`, `Organization`, `RealEstateAgent` emission per page |
| `src/components/marketing/json-ld.tsx` (or equivalent) | Inline `<script type="application/ld+json">` |
| `src/content/anti-broker/claims.ts` | Privacy policy imports claims and shows the matching policy line next to each one (sections keyed by claim ID) — ensures marketing and legal don't drift |

### 5.3 E3 ↔ E7 (symmetric)

**E7 → E3:**
- `src/content/consent/tcpa.ts`, `terms.ts`, (optionally) `privacy.ts` — production text replacing E3's placeholder. E3's `<ConsentBlock>` renders whatever `text` exports without touching the form logic.
- `src/content/consent/versions.ts` — new registry; E3 does not read it, but it's the authoritative source for `/tcpa-consent`.
- Confirms E3 open question (line 334): TS constants over MDX. Rationale: the form needs a string at runtime.

**E3 → E7:**
- The payload shape E3 committed to is honored: `consent.{tcpa,terms,privacy} = { accepted, version, acceptedAt }`. E7 does not change this.

### 5.4 E7 → E5

E5 must forward the consent record into Offervana's `NewClientDto.SurveyData` JSON. Concrete keys:

```json
{
  "tcpa_consent_version": "2026-04-17",
  "tcpa_consent_at":      "2026-04-17T21:11:54.003Z",
  "terms_consent_version":"2026-04-17",
  "terms_consent_at":     "2026-04-17T21:11:54.003Z"
}
```

No Offervana schema change required — `SurveyData` is already a free-form JSON string. E5 architecture should include these fields in its payload mapper (note for E5 author).

### 5.5 E7 → E6

E6's transactional confirmation email links to `/privacy` and `/terms` by absolute URL (built from `SITE.url`). E7 commits to URL stability — these paths do not change after launch without a redirect.

### 5.6 E7 → E8 (launch audit)

E8's launch readiness checklist includes:
1. **Claim audit** — every entry in `src/content/anti-broker/claims.ts` has a matching privacy/ToS paragraph.
2. **Cookie audit** — `document.cookie` after a full user flow (home → form → thanks) contains only Supabase and Vercel Analytics (if any). No third-party names.
3. **Pixel audit** — network tab shows no third-party hosts that could carry PII.
4. **License audit** — `NEXT_PUBLIC_BROKER_LICENSE` is set in production env to the real number, not the placeholder.
5. **Version audit** — `tcpa.ts` / `terms.ts` / `privacy.ts` `version` strings match the latest entry in `versions.ts`.
6. **Legal URL audit** — `/privacy`, `/terms`, `/tcpa-consent`, `/do-not-sell`, `/accessibility`, `/disclosures` all return 200 and render with the `(legal)` layout.

---

## 6. Pattern decisions + deviations

### Decisions (with citations)

1. **MDX for prose-heavy legal pages** — E2 arch §3.1. Editorial workflow for legal copy parallels marketing copy; keep one pipeline.
2. **TS constants for consent copy** — E3 arch §3.4 (line 156). Form consumes at runtime; MDX produces components, not strings.
3. **Version registry in `versions.ts` (single file, append-only)** — small-repo pragmatism. A "one file per version" scheme is cleaner for long-running services but overkill for three consent streams expected to change <4×/year.
4. **Legal pages are indexable** — Next.js 16 `robots.ts` is env-aware; production robots allow all. Legal copy must be findable for Google compliance + ADA findability.
5. **JSON-LD `WebPage` + `publisher: Organization` on every legal page** — reuses E2's schema.ts helpers. Makes the pages eligible for knowledge-graph surfaces.
6. **Broker license number is env-configurable** — if JK Realty's license changes or the repo is forked for a second state, a code deploy is not required.
7. **Footer legal links computed from `ROUTES` registry, not hardcoded** — single source of truth; adding a legal page updates the footer automatically.
8. **Claim-behavior symmetry via `src/content/anti-broker/claims.ts` cross-reference** — privacy policy imports the claim registry and renders each claim next to its matching policy paragraph. Keeps the two surfaces in sync structurally, not just by convention.

### Deviations (with justification)

| Deviation | From | Why | Who accepts the risk |
|---|---|---|---|
| **No cookie banner** | Industry default for any EU-exposed site | Our stack is cookie-less under MVP config (Vercel Analytics is cookie-less; Supabase cookies are first-party functional; no marketing pixels). A banner would imply we set cookies we need consent for — misleading, and adds friction. E8 audits this assumption. If it holds false, a banner lands before launch. | Noah — documented in `docs/cookie-policy.md`. |
| **No class-action waiver / forced arbitration in MVP ToS** | Most consumer SaaS ToS | AZ Attorney General has pursued consumer-adhesion arbitration clauses aggressively; on a service with a "no hidden fees" trust posture, a forced arbitration clause is a values mismatch that would get flagged by the same skeptical homeowners we're trying to reach. Lightweight "non-binding mediation first" clause is the MVP posture. Can revisit if volume warrants. | Noah — trust posture trumps litigation optimization for MVP. |
| **No EU/GDPR-specific pages** | Common practice | AZ-only launch; E3 gates submissions to AZ properties. We document "service area is Arizona, USA" in privacy; EU visitors are out of scope. | Noah — plan §3 explicitly scopes to AZ. |
| **Fold `privacy.ts` into `terms.ts`** (recommendation, pending E3 confirmation) | E3's current three-constant design | A third checkbox for privacy acknowledgment adds form friction without legal value — ToS acceptance already incorporates privacy-policy acknowledgment by link. E7 authors both but recommends E3 render only TCPA + terms. | Noah — revisit with E3 implementer before shipping. |
| **`/tcpa-consent` is its own page** instead of collapsing into `/privacy` | Simpler IA | TCPA record-retention obligations are stronger than privacy-record obligations; a dedicated, permanently-URL'd archive makes "prove what version of consent this seller agreed to on 2026-04-17" trivial. | Noah. |
| **No automated CI check for `version` / `text` drift** | Defensive engineering | Manual PR review is sufficient at MVP volume. An ESLint rule comparing `text` hashes to a committed manifest is the right long-term answer; ~3 hrs to implement, deferred. | Noah — tracked in §7. |
| **Handrolled footer attribution** (no `react-helmet` / legal-library) | — | Our footer is static and token-driven; a library buys nothing. | Noah — inherits E1's handrolled ethos. |
| **Equal Housing Opportunity logo inline as SVG in `public/images/legal/`** | CDN asset | Simpler and faster than a separate asset host. License permits free redistribution. | Noah. |

---

## 7. Open questions

- **JK Realty license number** — placeholder `AZ BR#TBD` ships until Noah confirms the exact ADRE-issued number. Blocks E7-S5 (disclosures page) from going to production but does not block architecture.
- **Office address for footer / disclosures** — same: needed from JK Realty. Placeholder until confirmed.
- **Whether JK Realty brokerage agreement requires linking back to their website / logo use** — needs a one-touch ask before we ship. Affects `SITE.broker.website` and whether `jk-realty-logo.svg` is required.
- **TCPA consent wording — legal review** — we draft the text; an AZ-licensed consumer-protection attorney should review *before* `version` is stamped. Assume one review cycle; architecture accommodates a second `version` bump post-review.
- **Privacy acknowledgment — fold into ToS or keep separate?** — cross-cut with E3. Recommendation in §6 is "fold"; confirm with E3 implementer.
- **Post-MVP: consent drift CI check** — ESLint rule or simple pre-commit hook comparing `text` hash to latest `versions.ts` entry. Deferred; note for post-launch.
- **Equal Housing Opportunity logo source** — HUD provides an official SVG; confirm licensing for commercial web use (generally fine) and source the canonical version for `public/images/legal/eho.svg`.

---

## 8. Handoff notes for PM (suggested story boundaries)

Proposed decomposition into ADO User Stories. PM should validate sequencing + sizing against team capacity.

| # | Story | Size | Notes |
|---|---|---|---|
| E7-S1 | **`SITE.broker` + `SITE.legal` config, `RouteEntry.group` field, legal route entries in `ROUTES`** | XS | Prereq for every downstream E7 story. Also annotates E2's existing entries with `group: 'marketing'`. |
| E7-S2 | **Footer broker-attribution block + legal-link list** | S | Replaces E1-S9 placeholders. Reads `SITE.broker` + `ROUTES` filtered by `group === 'legal'`. Includes equal-housing logo asset. |
| E7-S3 | **`src/content/consent/versions.ts` registry + barrel** | XS | Empty registry shipped with placeholder entries; S4 populates. |
| E7-S4 | **Finalize `tcpa.ts` + `terms.ts` (+ decision on `privacy.ts`)** | M | Production legal copy. Each constant carries `version`. Every `text` change appends a `versions.ts` entry. **Legal review required before this story merges.** |
| E7-S5 | **`/disclosures` page** | S | AZ ADRE-compliant broker disclosure. `RealEstateAgent` JSON-LD. Blocked on real license number from JK Realty. Ship with placeholder if needed; re-deploy when real value lands. |
| E7-S6 | **`/privacy` page** | L | Full privacy policy including binding no-sell clause. Imports `anti-broker/claims.ts` and renders claim↔policy alignment. Largest story — substantial prose + legal review. |
| E7-S7 | **`/terms` page** | M | Full ToS. "Free" claim alignment with E2 `/why-its-free`. Legal review required. |
| E7-S8 | **`/tcpa-consent` archive page** | S | Reads `versions.ts`; renders current + prior TCPA texts with effective / superseded dates. |
| E7-S9 | **`/do-not-sell` page** | XS | Static informational page reaffirming no-sale posture. |
| E7-S10 | **`/accessibility` page** | XS | WCAG 2.1 AA commitment + contact. |
| E7-S11 | **`docs/cookie-policy.md`** | XS | Policy artifact documenting the no-banner decision + structural constraints for future contributors. |
| E7-S12 | **`(legal)/layout.tsx` chrome enhancements — effective-date banner, per-page TOC (hardcoded MVP), legal-nav strip** | S | Small UX polish that makes every legal page feel intentional rather than bare-bones. |

**Acceptance criteria cadence:**
- Every content-bearing story (S4, S5, S6, S7, S8, S9, S10) passes `pnpm dlx @axe-core/cli` against the rendered page at `pnpm dev`.
- Every content-bearing story ships with a visual-regression screenshot in the PR.
- S4, S6, S7 include an explicit "legal-review sign-off" checkbox in the AC and the PR description.
- S6 AC includes a diff of `src/content/anti-broker/claims.ts` entries versus privacy-policy sections — each claim has a matching paragraph.

**Not in E7 scope** (for PM planning clarity): CSP (E8), Sentry integration (E8), rate limiting (E8), automated claim-vs-policy CI check (deferred), cookie banner (defer unless cookie policy changes), EU/GDPR pages (AZ-only launch), vendor DPA management (handled by parent org, not this repo), any change to E3 form logic or E5 payload mapping — E7 supplies content + versions, not behavior.

---

## 9. References

- Project plan: `_bmad-output/planning-artifacts/project-plan-sell-house-for-free.md` §4 E7, §3 non-functionals, §7 Q2/Q10/Q12
- E1 architecture: `_bmad-output/planning-artifacts/architecture-e1-site-foundation.md` (`(legal)` layout, `SITE`, `ROUTES`, `buildMetadata`)
- E2 architecture: `_bmad-output/planning-artifacts/architecture-e2-marketing-pages-trust-surface.md` (MDX pipeline, `src/lib/schema.ts`, `src/content/anti-broker/claims.ts`)
- E3 architecture: `_bmad-output/planning-artifacts/architecture-e3-seller-submission-flow.md` §3.4 (consent constants contract), §4.6 (E3→E7 handoff), line 334 (open question resolved here)
- Next.js 16 docs: `02-guides/mdx.md`, `02-guides/json-ld.md`, `03-api-reference/04-functions/generate-metadata.md`
- Regulatory: TCPA 47 U.S.C. § 227 + FCC 2023 one-to-one consent rule; A.R.S. § 32-2151; ADRE SPS 2005.12; WCAG 2.1 AA; FTC "Free!" guidance
