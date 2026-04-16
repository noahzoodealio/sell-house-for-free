---
slug: e1-s3-file-based-metadata
parent-epic-id: 7777
parent-epic-url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7777
mode: single
mode-ado: mcp
stories-planned: [e1-s3-file-based-metadata]
stories-created:
  - id: 7787
    url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7787
    title: "E1-S3 — File-based metadata: robots, sitemap, manifest, OG image, icon"
started-at: 2026-04-16T23:45:00Z
completed-at: 2026-04-16T23:45:30Z
last-completed-step: 5
---

# E1-S3 — File-based metadata — PM Working Sidecar

## Action taken

Filed User Story **7787** as a child of Feature **7777** via `wit_add_child_work_items` (single call). Parent link confirmed on the returned `relations` array.

## Story shape

- **Title:** `E1-S3 — File-based metadata: robots, sitemap, manifest, OG image, icon`
- **Work item type:** User Story
- **Area / Iteration:** `Offervana_SaaS` / `Offervana_SaaS` (matched parent + siblings 7785 / 7786)
- **State:** New

## Content decisions

- **AC count:** 13 Gherkin-style criteria. S1 had 12 (rewrite of 3 files), S2 had 9 (three XS pure modules); S3 ships **five** file-convention modules and each has at least one correctness-sensitive aspect, so 13 is the natural floor not a ceiling.
- **Preview-indexing gate is the headline risk, pinned as AC 2 + 3.** If `VERCEL_ENV` is ignored and `NODE_ENV === 'production'` is used instead, every Vercel preview URL gets indexed — Vercel preview deploys run `NODE_ENV=production`. This is the single most common file-based-metadata footgun; calling it out twice (once positive / once negative) is cheap insurance for PR review.
- **OG image hex values must be literal, not token aliases.** AC 8 pins this because `ImageResponse` is rendered in build-time isolation — CSS custom properties from `globals.css` do not cascade in. Dev would write `var(--color-brand)`, ship, and the OG would be transparent/black. Architecture §4 gives the hex directly, so the story calls out "use the hex" to short-circuit the mistake.
- **`sitemap.ts` absolute URLs via template literal, not `new URL(path, base)`.** Technical notes call this out explicitly. S2's normalization contract strips trailing slashes from `SITE.url`, and `new URL('/about', 'https://example.com')` (no trailing slash on base) resolves as `https://example.com/about` fine — BUT `new URL('/about', 'https://example.com/en')` drops `/en`. Template literal side-steps the WHATWG URL base-resolution rules entirely and reads as intent. Pinned so Dev doesn't over-engineer.
- **Single `BUILT_AT` at module scope (AC 5).** Per-entry `new Date()` would produce non-deterministic sitemap XML across requests within a deploy — low-priority but easy to get right the first time. Crawlers don't care but cache validators might.
- **No `twitter-image.tsx`, no `apple-icon.tsx`, no scaffold-favicon replacement.** Three common-scope-creep traps that are trivial to add and waste review time. Out-of-scope list calls them out with the reason for each deferral so the reviewer doesn't re-litigate.
- **Explicit AC on "no `openGraph.images` override in `layout.tsx`" (technical notes).** Adding an override there would double-emit (or suppress) the file convention. Not a strict AC because it's a "don't do this" rather than "verify this" — kept as a technical note.
- **`<head>` integration AC (AC 10) is browser-verifiable, not source-grep.** Specifies exact tag names and attributes so review can paste them into devtools, not dig into `.next/server`. Matches S1's observable-runtime-behavior preference.
- **Visual parity carved out for OG + icon only (AC 13).** Architecture §8 requires visual-regression per story. For S3, the visual surface is the OG card and the favicon — no page UI to regress. Two side-by-side screenshots match the cadence without forcing a full-page Figma comparison that doesn't apply.

## Style match to parent Feature 7777 and sibling Stories 7785 / 7786

- Same HTML vocabulary (`<h2>`, `<ul>`, `<ol>`, `<code>`, `<strong>`, `<em>`).
- Same banner shape (Parent / Story order / Size / Blocks / Depends on / Scope).
- Same section cadence: User story → Summary → Files touched → Acceptance criteria → Technical notes → Suggested tasks → Out of scope → References → Notes.
- Same bleeding-edge Next.js 16 reminder in the Notes tail.
- "Depends on" language matches S2's soft/hard distinction. S3 has a hard dep on S2 (needs `SITE` + `ROUTES`) and a soft dep on S1 (metadataBase wires OG resolution at render time); banner + body both say so.

## Not done

- `Microsoft.VSTS.TCM.ReproSteps` auto-populated by ADO with the same description HTML (User Story template behavior in this project). Left as-is — matches S1 / S2 treatment.
- No tags, no assignee, no sprint iteration — matches S1 / S2. Sprint planning will assign.
- Did not append a pattern to `zoo-core-agent-pm/ado-history.md` — no such file exists yet in this repo; skipping until the PM agent memory directory is seeded (matches S2 treatment).

## Next steps

1. Review rendered Story at https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7787
2. Either continue single-mode for E1-S4 (`error.tsx` / `loading.tsx` / `not-found.tsx` — XS, no cross-dependencies) or flip to bulk mode for the remaining 8 E1 stories now that S1/S2/S3 have set a stable story-shape template.
3. S1 / S2 / S3 can all proceed to implementation in parallel — S1 ↔ S2 soft dep already documented, S3 depends on S2's public API surface only (not the layout refactor), so three PRs can land in any order with minimal rebase.
