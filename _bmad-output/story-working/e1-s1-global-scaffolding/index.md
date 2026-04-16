---
slug: e1-s1-global-scaffolding
parent-epic-id: 7777
parent-epic-url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7777
mode: single
mode-ado: mcp
stories-planned: [e1-s1-global-scaffolding]
stories-created:
  - id: 7785
    url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7785
    title: "E1-S1 — Global scaffolding: root layout, fonts, theme tokens"
started-at: 2026-04-16T23:29:00Z
completed-at: 2026-04-16T23:29:20Z
last-completed-step: 5
---

# E1-S1 — Global scaffolding — PM Working Sidecar

## Action taken

Filed User Story **7785** as a child of Feature **7777** via `wit_add_child_work_items` (single call — no stale parent-link pass needed).

## Story shape

- **Title:** `E1-S1 — Global scaffolding: root layout, fonts, theme tokens`
- **Work item type:** User Story
- **Area / Iteration:** `Offervana_SaaS` / `Offervana_SaaS` (matched parent)
- **State:** New

## Content decisions

- **AC count:** 12 Gherkin-style criteria. Weighted toward *observable runtime behavior* (computed styles, network panel, DOM output) rather than implementation detail — so reviewers can verify with a browser, not a code grep.
- **Pinned exact hex / px values in ACs** (brand `#0653ab`, surface-tint `#fafafa`, ink `#17233d`/`#212121`/`#9e9e9e`/`#bdbdbd`, shadow-elevated spec, radius `4/6/8/12`). Rationale: if the Figma source drifts, we want the PR to fail the AC rather than silently inherit a drift.
- **`metadataBase` landed in S1** (not deferred to S2/S3). Reads `process.env.NEXT_PUBLIC_SITE_URL` directly with a scoped note that S2 can refactor to `SITE.url` once `lib/site.ts` lands. Avoids a chicken-and-egg between S1 and S2.
- **Analytics gating AC split dev vs. prod** (ACs 8) — catches the common mistake of rendering `<Analytics />` unconditionally and only trusting docs to say it no-ops in dev.
- **Visual parity AC** (AC 12) matches the architecture's per-story visual-regression cadence requirement (architecture §8, "Acceptance criteria cadence").
- **Out-of-scope list is explicit** — S1 is small but sits next to 10 sibling stories; listing the deferrals by story ID prevents scope drift in PR review.

## Style match to parent Feature 7777

- HTML-formatted body with `<h2>`/`<ul>`/`<ol>`/`<code>`/`<strong>` — same vocabulary the parent Feature uses, so ADO renders consistently.
- Parent/build-order/scope banner at top (matches parent's banner style).
- "Notes" tail with the bleeding-edge Next.js 16 reminder (parent uses the same tail).

## Not done

- ReproSteps field was auto-populated by ADO with the same description HTML (User Story work item template behavior in this project). Left as-is — not harmful. If downstream tooling keys off ReproSteps, this is free.
- No tags assigned (parent has none either).
- No assignee, no target iteration sprint — left for sprint planning.

## Next steps

1. Review rendered Story at https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7785
2. File E1-S2 (`lib/site.ts` + `lib/seo.ts` + `lib/routes.ts`) — run `/zoo-core-create-story E1` again and pick "Single" → E1-S2. S2 is XS and unblocks S3's file-based metadata.
3. Alternative: flip to bulk mode for the remaining 10 stories if confidence in the E1-S1 shape holds.
