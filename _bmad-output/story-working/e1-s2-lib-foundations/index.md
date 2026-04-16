---
slug: e1-s2-lib-foundations
parent-epic-id: 7777
parent-epic-url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7777
mode: single
mode-ado: mcp
stories-planned: [e1-s2-lib-foundations]
stories-created:
  - id: 7786
    url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7786
    title: "E1-S2 — src/lib/ foundations: site config, buildMetadata, routes registry"
started-at: 2026-04-16T23:38:00Z
completed-at: 2026-04-16T23:39:00Z
last-completed-step: 5
---

# E1-S2 — src/lib/ foundations — PM Working Sidecar

## Action taken

Filed User Story **7786** as a child of Feature **7777** via `wit_add_child_work_items` (single call). Parent link confirmed on the returned `relations` array.

## Story shape

- **Title:** `E1-S2 — src/lib/ foundations: site config, buildMetadata, routes registry`
- **Work item type:** User Story
- **Area / Iteration:** `Offervana_SaaS` / `Offervana_SaaS` (matched parent)
- **State:** New

## Content decisions

- **AC count:** 9 Gherkin-style criteria. Trimmed from S1's 12 because this is XS — three pure modules + one layout line. Focused on observable runtime behavior (`SITE` shape, throw-on-missing-env, normalized URL, `buildMetadata` return shape, image-override contract, `ROUTES` typing, layout consumes SITE, no Node-only imports, clean build).
- **Env-validation AC is explicit about the failure mode** (throw, not silent undefined). This is the single biggest correctness risk for this story — an unthrown empty `NEXT_PUBLIC_SITE_URL` would silently poison `metadataBase` and every canonical tag / OG URL downstream. Pinned as AC 2.
- **URL normalization AC** (AC 3) explicitly shows trailing-slash stripping so callers can template without double slashes. Cheap to verify, easy to regress.
- **Image default deliberately NOT hard-coded in `buildMetadata`** (AC 5, technical notes). E1-S3's `opengraph-image.tsx` file-based convention owns the default — surfacing that here prevents a drift where `buildMetadata` hard-codes `/default-og.png` and S3's programmatic OG silently stops working.
- **`changeFrequency` typed via `MetadataRoute.Sitemap[number]['changeFrequency']`** (technical notes) — reuse Next's own type so the registry can't drift from the Sitemap API.
- **Broker license placeholder** (technical notes) — acknowledges that the real JK Realty license number is an E7 (Compliance) deliverable, not an E1 one. S2 provides the field slot; E7 fills the value. Prevents S2 from blocking on an unrelated information gap.
- **S1 dependency is soft, not hard** (banner + AC 7). Either ordering works — if S1 merges first, S2's AC 7 is a one-line diff; if S2 merges first, S1's eventual PR writes `metadataBase` this way from the start. Called out in both places so the reviewer doesn't flag the apparent cycle.

## Style match to parent Feature 7777 and sibling Story 7785

- Same HTML vocabulary (`<h2>`, `<ul>`, `<ol>`, `<code>`, `<strong>`, `<em>`).
- Same banner shape (Parent / Story order / Size / Blocks / Depends on / Scope).
- Same section cadence: User story → Summary → Files touched → Acceptance criteria → Technical notes → Suggested tasks → Out of scope → References → Notes.
- Same bleeding-edge Next.js 16 reminder in the Notes tail.

## Not done

- `Microsoft.VSTS.TCM.ReproSteps` auto-populated by ADO with the same description HTML (User Story template behavior in this project). Left as-is.
- No tags, no assignee, no sprint iteration — matches S1's treatment. Sprint planning will assign.
- Did not append a pattern to `zoo-core-agent-pm/ado-history.md` — no such file exists yet in this repo; skipping until the PM agent memory directory is seeded.

## Next steps

1. Review rendered Story at https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7786
2. Either continue single-mode for E1-S3 (file-based metadata — `robots.ts` / `sitemap.ts` / `manifest.ts` / `opengraph-image.tsx` / `icon.tsx`) which directly consumes S2's `SITE` + `ROUTES`, or flip to bulk mode for the remaining 9 E1 stories if the shape of S1 + S2 has stabilized.
3. S1 and S2 can proceed to implementation in parallel — the soft dependency means either merge order works.
