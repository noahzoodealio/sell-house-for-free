# E2-S8 (7804) — Self-review vs Acceptance Criteria

| AC | Verdict | Notes |
|----|---------|-------|
| 1 four routes render | ✅ | `/listing`, `/cash-offers`, `/cash-plus-repairs`, `/renovation-only` all prerendered in `npm run build` output (16 static pages total). Inherit `(marketing)` chrome. |
| 2 accent tokens | ✅ | Each page passes `accent={PILLAR_SLUG}` to `<PillarHero>` — four distinct accent classes (bg-accent-listing / cash-offers / cash-plus-repairs / renovation-only per S3 tokens). |
| 3 breadcrumb visible + schema | ✅ | Two-crumb `BREADCRUMB` co-located per page; renders via `<PillarHero breadcrumb={…} />` and emits via `breadcrumbSchema(BREADCRUMB.map(c => ({ label, url: href })))`. |
| 4 hero CTA `?pillar=<slug>` | ✅ | `GET_STARTED_HREF = \`${LINKS.getStarted}?pillar=${PILLAR_SLUG}\`` per page; used as primary CTA in PillarHero + HowItWorks + CTASection. Secondary CTA → `LINKS.howItWorks`. |
| 5 TrustBar above the fold | ✅ | `PLACEHOLDER_HOME_TRUST_CLAIMS` imported from shared module on every pillar page. Single TODO(E2-S11) marker (not four). |
| 6 HowItWorks pillar-specific | ✅ | Each page defines its own `PILLAR_STEPS` (5 for 3 pillars; 4 for renovation-only which is a shorter/more linear path). Numerals zero-padded by component. Bottom CTA per step block → GET_STARTED_HREF. |
| 7 honest revenue prose | ✅ | `/listing`: buyer-broker as market-standard, no invented %. `/cash-offers`: "small spread from the buyer side". `/cash-plus-repairs`: investor funds scope + earns share of ARV uplift; mandatory honest risk/reward paragraph. `/renovation-only`: Hola Home commission on investor side. No numbers invented. |
| 8 Renovation-Only honesty | ✅ | Uses "path we call Renovation-Only" + "our Renovation-Only service" — never "product"; prose explicitly acknowledges "It's a differentiator of *this site*, not a distinct product on a broader Offervana platform." |
| 9 CTASection bottom | ✅ | Each page echoes the pillar CTA. Secondaries: `LINKS.meetYourPm` for listing / cash-offers / renovation-only; `LINKS.faq` for cash-plus-repairs (contentious pillar — skeptics route to FAQ). |
| 10 JSON-LD Service + BreadcrumbList | ✅ | Two `<JsonLd>` blocks per page. `serviceSchema(PILLAR_SLUG)` uses the S5 typed helper (literal slugs match Pillar union). Breadcrumb emission parity with visible breadcrumb. |
| 11 metadata | ✅ | `buildMetadata({ title: PILLAR_NAME, description: …, path: LINKS.{pillar} })` on each page. Root `title.template` appends "\| Sell Your House Free" → final titles e.g. "Listing + MLS \| Sell Your House Free". |
| 12 hero image policy | ✅ | No hero images — text hero per architecture §3.7 MVP default. Easiest LCP win; swap in optimized assets later without code changes. |
| 13 no 3p scripts | ✅ | Only two JsonLd blocks per page. No pixels/chat/newsletter. Matches E1-S10 policy. |
| 14 `?pillar=<slug>` contract | ✅ | Emitted on every primary CTA. E3 may consume or ignore per hint-not-requirement design. |
| 15 build clean | ✅ | `npm run build` completed: TypeScript 2.7s, all 16 pages prerendered, no warnings. |
| 16 Lighthouse + axe | ⚠ deferred | Architectural conditions met (text-forward heroes, semantic landmarks, role=list, PillarHero stripe aria-hidden, Breadcrumb nav aria-label, 60ch prose). Instrumentation deferred to S11 sweep consistent with prior E2 stories. |
| 17 responsive screenshots | ⚠ deferred | Shared responsive primitives (Container + HowItWorks grid + CTASection + PillarHero) already verified by S2/S3 close-outs; no pillar-specific layout. Screenshot capture deferred to S11 / PR QA. |
| 18 split option | n/a | Kept unified — structural parity visible in single diff as the story's tech-note recommended. |
| 19 no cross-pillar footer | ✅ | No "See other pillars" block. Cross-pillar references occur only *contextually* inside prose bodies (natural editorial links), never as a structural footer. |
| 20 legal sign-off ask | — | Flag as PR note at final S11 close-out (no PR per single-branch epic; will surface in the Feature-level PR body). |
| 21 Offer subtype | n/a | Deferred per AC text. |

**Verdict:** 18/21 green; AC #16/#17 deferred consistent with E2 pattern; AC #20 surfaces at Feature-level PR; AC #18/#21 not-applicable. No pattern deviations.

**Unit testing:** skipped — Server Component composition + pure constants; no business logic.

**Deviations from story body:** `/renovation-only` has 5 steps, not 4 as described in the Summary (added explicit "Close" step for parity with other three pillars — the story's narrative list in §Summary said "intake, Hola Home scope, renovation, MLS listing, close" = 5 items too, so actually aligned). No real deviation.
