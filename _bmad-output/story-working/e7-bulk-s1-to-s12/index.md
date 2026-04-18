---
slug: e7-bulk-s1-to-s12
parent-epic-id: 7783
parent-epic-url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7783
ado-grandparent-epic-id: 7776
ado-grandparent-epic-url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7776
mode: bulk
mode-ado: mcp
stories-planned:
  - e7-s1-site-broker-legal-route-group
  - e7-s2-footer-broker-attribution-legal-links
  - e7-s3-consent-versions-registry
  - e7-s4-finalize-consent-copy-2-checkbox-refactor
  - e7-s5-disclosures-page
  - e7-s6-privacy-page
  - e7-s7-terms-page
  - e7-s8-tcpa-consent-archive-page
  - e7-s9-do-not-sell-page
  - e7-s10-accessibility-page
  - e7-s11-cookie-policy-doc
  - e7-s12-legal-layout-chrome
stories-created:
  - id: 7846
    url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7846
    title: "E7-S1 — SITE.broker + SITE.legal config + RouteEntry.group field + legal route entries"
    size: XS
  - id: 7847
    url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7847
    title: "E7-S2 — Footer broker-attribution block + legal-link list + Equal Housing Opportunity logo"
    size: S
  - id: 7848
    url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7848
    title: "E7-S3 — src/content/consent/versions.ts append-only registry + index barrel"
    size: XS
  - id: 7849
    url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7849
    title: "E7-S4 — Finalize tcpa.ts + combined terms.ts; delete privacy.ts; refactor <ConsentBlock> to 2 checkboxes; drop privacy key from payload"
    size: M
  - id: 7856
    url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7856
    title: "E7-S5 — /disclosures page: ADRE A.R.S. § 32-2151 broker-of-record + fair-housing + RealEstateAgent JSON-LD"
    size: S
  - id: 7857
    url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7857
    title: "E7-S6 — /privacy page: binding no-sell clause + claim↔policy alignment with anti-broker/claims.ts + named share list + CCPA/COPPA"
    size: L
  - id: 7858
    url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7858
    title: "E7-S7 — /terms page: Free-claim alignment with /why-its-free + JK Realty broker-of-record + AZ-only + no class-action waiver"
    size: M
  - id: 7862
    url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7862
    title: "E7-S8 — /tcpa-consent archive page: render current + prior TCPA text from versions.ts with supersession dates"
    size: S
  - id: 7863
    url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7863
    title: "E7-S9 — /do-not-sell page: CCPA-style affirmation + privacy contact + linked from footer"
    size: XS
  - id: 7864
    url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7864
    title: "E7-S10 — /accessibility page: WCAG 2.1 AA commitment + accessibility contact email"
    size: XS
  - id: 7866
    url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7866
    title: "E7-S11 — docs/cookie-policy.md: document no-banner decision + structural constraints for future contributors"
    size: XS
  - id: 7867
    url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7867
    title: "E7-S12 — (legal)/layout.tsx chrome: effective-date banner + per-page hardcoded TOC + legal-nav strip across six pages"
    size: S
started-at: 2026-04-18T02:29:00Z
completed-at: 2026-04-18T02:42:00Z
last-completed-step: 5
---

# E7 bulk S1→S12 — PM Working Sidecar

## Plan

Twelve stories decomposing Feature **7783** per architecture §8. Sequencing:

- **S1 unblocks almost everything** — `SITE.broker`, `SITE.legal`, `SITE.privacyContact`, `RouteEntry.group` field, six legal route entries. Every other E7 story except S11 depends on S1.
- **S11 is parallelizable anytime** — pure docs, no code deps.
- **S3 unblocks S4, S8** — consent versions registry.
- **S4 unblocks S8** (real-text entries) and is the largest behavior-touching story.
- **S2 + S5–S10 run in parallel** once S1 lands.
- **S12 lands late** — the legal-nav strip looks wrong with partial page coverage; prefer landing after S5–S10.

All twelve filed as User Story children under Feature 7783 via `wit_add_child_work_items` with `areaPath` + `iterationPath` = `Offervana_SaaS`, matching siblings 7811–7821 (E3 bulk) + 7785–7807 (E1 + E2). IDs 7846–7867 (with gaps at 7850–7855, 7859–7861, 7865 — ADO allocated those to other work items between our batches).

### Filing order

Three batches, filed via MCP in sequence:

- **Batch 1 (S1–S4):** 7846 → 7847 → 7848 → 7849. Config prereq + footer + registry + consent copy.
- **Batch 2 (S5–S7):** 7856 → 7857 → 7858. The three largest content pages (disclosures, privacy, terms).
- **Batch 3a (S8–S10):** 7862 → 7863 → 7864. TCPA archive + do-not-sell + accessibility.
- **Batch 3b (S11–S12):** 7866 → 7867. Cookie policy doc + layout chrome.

Batched-per-MCP-call (not one-per-call like E3) because all 12 were drafted up-front; no compaction advantage to sequential filing. Monotonic ordering within batch preserved. Tool call response was too large for the first two batches — the filings succeeded (confirmed via WIQL query) but the echoed descriptions overflowed the tool-result size limit. Batches 3a and 3b were sized small enough for the response to fit.

## Decision captured

**Decision B' (user-confirmed this run):** consent surface moves from E3-S7's filed three-checkbox layout to **two checkboxes** — TCPA standalone + Terms/Privacy combined.

- TCPA must stand alone per FCC 2023 one-to-one rule (47 CFR § 64.1200) — this is a hard legal constraint; one-checkbox-for-all violates TCPA.
- Terms and Privacy can combine because ToS incorporates privacy by link; combined ack satisfies notice for both.
- User considered "one checkbox for all" and was redirected to B' once the TCPA constraint was explained. Captured in stories S3 (registry shape drops `privacy` key) and S4 (deletes `privacy.ts`, refactors `<ConsentBlock>` from 3→2 checkboxes, updates `SellerFormDraft.consent` payload to drop `privacy` key).
- S4 is a **cross-epic contract break** — it edits E3's already-filed `<ConsentBlock>` component and modifies the canonical `SellerFormDraft.consent` shape. E5 architecture picks up the 2-key shape as canonical (E5 arch not yet drafted per git status, so no downstream consumer to coordinate with).

## Execution log

### Filed in order

1. **7846** — E7-S1 SITE + RouteEntry.group + legal routes. 12 ACs. Three file edits + one `.env.example` line. XS. Forward-contract call-out for every downstream story.
2. **7847** — E7-S2 Footer broker-attribution + legal-link list + EHO. 12 ACs. Replaces E1-S9 placeholder. Claim-behavior symmetry (footer sentence mirrors `/privacy` binding clause) called out as load-bearing.
3. **7848** — E7-S3 `versions.ts` registry + barrel. 8 ACs. Append-only discipline documented in the AC + top-of-file comment. Shape drops `privacy` key per B'.
4. **7849** — E7-S4 Finalize copy + 2-checkbox refactor. 13 ACs. Legal-review sign-off gate. Deletes `privacy.ts`. Refactors E3 `<ConsentBlock>`. Drops `privacy` from `SellerFormDraft.consent`. TCPA text AC enumerates the 6 FCC-required substrings (auto-dial, pre-recorded, SMS, sender ID, opt-out, non-conditional). M-size due to the E3 touch.
5. **7856** — E7-S5 `/disclosures`. 13 ACs. A.R.S. § 32-2151 + ADRE SPS 2005.12 + fair-housing + EHO logo + JSON-LD `RealEstateAgent` + `Organization`. Regulatory-derived copy (no open-ended legal-review gate). S.
6. **7857** — E7-S6 `/privacy`. 19 ACs. Largest story in E7. Binding no-sell clause (word-for-word match to footer S2 AC). Claim↔policy alignment via `anti-broker/claims.ts` import. Named share list (no hedging). CCPA/COPPA. Legal-review gate. L.
7. **7858** — E7-S7 `/terms`. 16 ACs. "Free" claim alignment with E2 `/why-its-free`. JK Realty broker-of-record. AZ-only. NO class-action waiver / forced arbitration. Legal-review gate. M.
8. **7862** — E7-S8 `/tcpa-consent` archive. 13 ACs. Reads `CONSENT_VERSIONS`; renders TCPA + combined-terms versions in reverse-chronological order with per-version anchors (`#tcpa-v-<version>`, `#terms-v-<version>`). Architecture evidence-of-record. S.
9. **7863** — E7-S9 `/do-not-sell`. 10 ACs. Short affirmation page. Aligned with footer + privacy binding clause. XS.
10. **7864** — E7-S10 `/accessibility`. 10 ACs. WCAG 2.1 AA commitment + dedicated a11y inbox + reporting workflow + SLA. XS.
11. **7866** — E7-S11 `docs/cookie-policy.md`. 8 ACs. Policy artifact documenting no-banner decision + structural forcing-function for future contributors. Highest-leverage XS in E7. No code deps; can ship anytime.
12. **7867** — E7-S12 `(legal)/layout.tsx` chrome. 11 ACs. Effective-date banner + legal-nav strip + (recommendation) inline TOC for `/privacy` + `/terms`. Polish story; lands last. S.

### Content decisions (cross-story patterns)

- **Blueprint stability.** Every story follows the E1/E2/E3 cadence (banner → User story → Summary → Files touched → Acceptance criteria → Technical notes → Suggested tasks → Out of scope → References → Notes). Matches parent Feature 7783's HTML formatting.
- **AC count scales with legal-sensitivity, not story size.** S6 (19), S7 (16), S4 (13), S5 (13), S8 (13), S2 (12), S1 (12), S12 (11), S9 (10), S10 (10), S3 (8), S11 (8). S6 + S7 + S4 earn more ACs because they carry legal sign-off gates; S2 carries the claim-mirror constraint.
- **Legal-review sign-off is an explicit AC on S4, S6, S7** — PR description must contain a named, dated attorney approval. Merge blocked without it.
- **Claim-behavior symmetry is a cross-story invariant.** S2 footer sentence ↔ S6 privacy binding clause ↔ S9 do-not-sell affirmation. Each story's AC explicitly requires word-level alignment with its pair. E8 launch audit will diff these at launch.
- **Forward-contract call-outs at every layer.** S1's config shape, S3's append-only registry, S4's 2-key payload shape (replaces E3-S7's 3-key), S5/S6 JK Realty interpolation, S8's anchor naming. Every story that defines a downstream-consumed contract flags it explicitly.
- **Bleeding-edge Next.js 16 call-outs.** S5 + S6 + S7 + S8 + S9 + S10 + S12 each pin the most-likely training-data regression for their surface — `robots` in `buildMetadata`, JSON-LD pattern from E2's `schema.ts`, MDX iteration for S8, pathname access for S12 (headers() vs per-page prop — recommended per-page prop).
- **Architecture §6 deviations preserved.** No cookie banner (S11). No class-action waiver / forced arbitration (S7). No EU / GDPR (S6, S7, S9). Privacy fold into Terms (S4). Append-only registry (S3). Env-configurable broker license (S1).
- **Handrolled ethos preserved.** No `react-helmet`, no cookie-consent library, no consent-management-platform. Footer + consent-block + legal layout are plain Server Components.

### Bulk-mode execution

All 12 stories drafted up-front from architecture §8 table, then filed in 4 batches (3 MCP calls for S1–S10; 1 for S11–S12). No per-story context discarding needed — stories are content-heavy and self-contained; the architecture doc was in working memory throughout. Compaction between batches consisted of not re-fetching work-item bodies I'd already read.

### Style match to E1 + E2 + E3 siblings

- Same HTML vocabulary (`<h2>`, `<ul>`, `<ol>`, `<code>`, `<strong>`, `<em>`, `<br>`). No tables in E7 stories (none needed for the content types).
- Same area/iteration path (`Offervana_SaaS` / `Offervana_SaaS`).
- State `New`, priority `2` (ADO default).
- `Microsoft.VSTS.TCM.ReproSteps` auto-populated by ADO with the same HTML — matches E1/E2/E3 siblings.
- `format: "Html"` placed inside each item object (the E2-S1–S9 top-level-format bug is well-documented in E3's sidecar; avoided here from story 1). Confirmed: every filed story shows `"multilineFieldsFormat":{"System.Description":"html","Microsoft.VSTS.TCM.ReproSteps":"html"}`.

## Not done

- No tags assigned (matches E1/E2/E3 precedent).
- No assignees, no sprint iteration (matches siblings; sprint planning will assign).
- No `zoo-core-agent-pm/ado-history.md` append — that directory doesn't exist on disk; PM agent can initialize on first notable phrasing-pattern success. This run's pattern mirrored E3 1:1 with no new tricks.
- No inter-story `Related` links filed in ADO. Parent (hierarchy) link on each story pointing at 7783; sibling dependencies documented inside each story body under `Blocks` / `Depends on`.
- No Figma frames fetched — per architect precedent, per-page design fetches happen during individual story pickup (S2 footer; S6 privacy long-page layout; S12 chrome) not during decomposition.
- No ADO comment added on 7783 — rev history self-documents via the 12 new child links; E1/E2/E3 precedent did not add comments either.

## Next steps

1. Review the twelve rendered stories on ADO: 7846, 7847, 7848, 7849, 7856, 7857, 7858, 7862, 7863, 7864, 7866, 7867. Spot-check HTML rendering (confirm no escaped `<p>` leakage like the E2 S1–S9 bug).
2. Feature 7783 is now fully decomposed — E7 is ready for sprint planning. All 12 stories filed.
3. **Critical path for parallel work:** S1 unblocks almost everything. S11 is parallelizable anytime (docs). S3 unblocks S4/S8. S4 carries the hard legal-review gate and the cross-epic E3 touch — serialize it. S2 + S5–S10 can run in parallel once S1 lands. S12 lands last for UX coherence.
4. **Legal-review logistics.** Noah arranges AZ-licensed consumer-protection attorney review in parallel with S1–S3 implementation so S4 / S6 / S7 aren't blocked on a cold attorney start. Architecture §7 flags this as an open question; the review cycle is assumed 1–3 rounds per document.
5. **JK Realty open questions (arch §7) are not blocking E7 kick-off but gate production deploy:**
   - Real license number → `NEXT_PUBLIC_BROKER_LICENSE` in Vercel env.
   - Office address → `SITE.broker.officeAddress` string in S1 / rendered in S2/S5.
   - Website link-back + logo requirement → affects S2 footer + S5 disclosures.
6. **Cross-epic coordination** — S4 edits E3's already-filed `<ConsentBlock>` component and changes `SellerFormDraft.consent` shape. Flag this in S4 PR description; E3's sidecar does not need amendment but the E3 story descriptions on ADO (7817) reference the 3-key shape — harmless because stories-as-filed are historical records, but the E5 architect picks up the new shape as canonical.
7. **Suggested next skill:** `/zoo-core-create-architecture` for E5 (Offervana submission back-end) or continue E4 (architecture already present per git status — may be ready for `/zoo-core-create-story e4`).

## Known quirks

- Tool-response-size limit hit twice. The `wit_add_child_work_items` call succeeded both times; the MCP tool's echoed-item response exceeded the runtime's 100k-char ceiling. Filings verified via `wit_query_by_wiql`. Workaround next time: file in batches of ≤3 items, or accept the size error (filings still persist).
- ID gaps (7850–7855, 7859–7861, 7865) — other work items took those IDs between our batches. Non-issue; ADO IDs are not expected to be contiguous across PM agents.
