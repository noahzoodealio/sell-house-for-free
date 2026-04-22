---
work-item-id: 7883
work-item-type: user-story
tag: E4-S12
parent-epic: 7780
repo: sell-house-for-free
branch: feature/e4-property-enrichment-7780
file-groups:
  - 1-normalize-types-schema  # displayListingStatus + EnrichmentSlot fields + zod schema + mergeToEnrichmentSlot + unit tests
  - 2-rename-notice-component  # listed-notice.tsx → mls-status-notice.tsx + gate + chip split + caller imports
  - 3-dev-mock-fixture         # fixtures.ts LISTED slot gets rawListingStatus/listingStatusDisplay so E2E passes
  - 4-tests                    # rename + extend listed-notice.test → mls-status-notice.test
last-completed-step: 7
last-completed-file-group: 4
started-at: 2026-04-22T15:15:00Z
completed-at: 2026-04-22T15:35:00Z
outcome: closed
---

# E4-S12 — Plain-English MLS listing-status display + active-status gating

**ADO:** https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7883
**Title:** displayListingStatus() + rename listed-notice → mls-status-notice + gate to Active/ActiveUnderContract/ComingSoon/Pending

Standalone (no dep on S11). Blocks S13 (shared gate + component file).

## One-liner

Replace the coarse "currently-listed" three-bucket banner with plain-English, status-specific copy (Active/ActiveUnderContract/ComingSoon/Pending only; everything else → no banner). Keep the three reason-chips gated to Active/ActiveUnderContract.
