---
slug: e1-s4-global-ux-boundaries
parent-epic-id: 7777
parent-epic-url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7777
mode: single
mode-ado: mcp
stories-planned: [e1-s4-global-ux-boundaries]
stories-created:
  - id: 7788
    url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7788
    title: "E1-S4 — Global UX boundaries: error, loading, not-found"
started-at: 2026-04-16T23:50:00Z
completed-at: 2026-04-16T23:51:30Z
last-completed-step: 5
---

# E1-S4 — Global UX boundaries — PM Working Sidecar

## Action taken

Filed User Story **7788** as a child of Feature **7777** via `wit_add_child_work_items` (single call). Parent link confirmed on the returned `relations` array (`System.LinkTypes.Hierarchy-Reverse` → 7777).

## Story shape

- **Title:** `E1-S4 — Global UX boundaries: error, loading, not-found`
- **Work item type:** User Story
- **Area / Iteration:** `Offervana_SaaS` / `Offervana_SaaS` (matched parent + siblings 7785 / 7786 / 7787)
- **State:** New

## Content decisions

- **AC count: 14 Gherkin-style criteria.** S1 had 12, S2 had 9, S3 had 13. S4 is XS by LOC (three files, ~30–60 lines each) but the surface has disproportionate risk: the `unstable_retry` vs. `reset` footgun alone warrants two pinned ACs (1 + 2). Final count settled at 14 because each of the three files has a correctness-sensitive aspect AND the trio shares two cross-cutting gates (root-layout inheritance, focus rings).
- **Highest-risk AC is AC 2: `unstable_retry` not `reset`.** Claude's training data pre-dates Next 16.2.0 (the release that added `unstable_retry`), and every canned Next error-boundary snippet on the internet ships `reset`. Pinned as an AC AND called out in the technical notes AND echoed in the tail Notes section — three-layer defense against the most likely single-line regression in this story.
- **`error.md` docs directly confirm the API change.** Lines 25–31 of `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/error.md` show the `{ error, unstable_retry }` signature; Version History at line 329 confirms `v16.2.0 — unstable_retry prop added`. This repo is on Next 16.2.3, so the API is available.
- **AC 3 names the Sentry hookup seam explicitly.** Making `error.tsx`'s `useEffect` + `console.error` the named future-Sentry injection point means E8 is a one-line diff, not a refactor. Linking stories forward (E8 mentions E1-S4) would be nicer but E8 doesn't exist yet as a Feature; the note in this story is the forward pointer.
- **AC 4 (don't leak `error.message`) is the quiet correctness item.** Rendering `{error.message}` in the branded copy is tempting and feels helpful, but per Next docs server-thrown errors forward a generic message in production and the raw `Error` may contain sensitive stack context in dev. Static copy is safer and reads better. `digest` may be rendered in a muted "Ref:" line — kept as optional, not an AC, since support-correlation is a nice-to-have and could be added later.
- **Streaming-200-on-404 is framework-correct.** AC 10 explicitly says "do not attempt to force 404 via `headers()` or middleware." Reviewers unfamiliar with the streaming semantics will otherwise flag it as a bug. Per `loading.md` §Status Codes, the `noindex` meta is auto-injected regardless — Google respects that over the HTTP status. Pinning the "don't fix this" is cheap insurance against a misguided PR suggestion.
- **`global-error.tsx` and `global-not-found.tsx` deferred with reasons.** Both are technically in-reach for E1 but add scope without payoff:
  - `global-error.tsx` — only catches root-layout failures; blast radius tiny; natural home for Sentry in E8.
  - `global-not-found.tsx` — requires `experimental.globalNotFound` flag, bypasses root layout (losing fonts + Analytics), applies to multi-root-layout apps we're not building.
  Calling both out in Out of Scope with the reason prevents re-litigation in PR review.
- **Visual parity AC (14) acknowledges Figma may lack mocks.** Unlike S1/S3 where token values were directly in the style guide, there's no explicit 404 / error / loading screen in the Figma file yet. AC 14 provides an escape hatch — screenshots only + @-mention UX for async sign-off — so the story doesn't block on UX availability.
- **No `global-error` + no "handle root layout errors" scope creep.** A reviewer might push to add `global-error.tsx` "while we're here." The story pre-empts this in both Files Touched (`global-error.tsx` — not touched) and Out of Scope.
- **Token utility AC (implicit in 5/6/8).** Unlike S3's `ImageResponse` warning (hex literals required because CSS vars don't cascade into `ImageResponse`), S4 components render in the DOM where Tailwind utilities and CSS vars work normally. Technical notes explicitly contrast with S3 so Dev doesn't copy-paste the "inline hex" pattern from S3 into S4.
- **S6 primitive soft-dep handled gracefully.** AC 5 says "if `<Button>` hasn't landed, inline utilities matching the S1 token spec are acceptable." Avoids a hard block between S4 and S6 — either can land first.

## Style match to parent Feature 7777 and sibling Stories 7785 / 7786 / 7787

- Same HTML vocabulary (`<h2>`, `<ul>`, `<ol>`, `<code>`, `<strong>`, `<em>`).
- Same banner shape (Parent / Story order / Size / Blocks / Depends on / Scope).
- Same section cadence: User story → Summary → Files touched → Acceptance criteria → Technical notes → Suggested tasks → Out of scope → References → Notes.
- Same bleeding-edge Next.js 16 reminder in the Notes tail, with an added specific pointer about `unstable_retry` vs. `reset` — matches S3's pattern of putting the single most likely regression in the tail.
- "Depends on" language matches S2/S3's soft/hard distinction. S4 has only a soft dep on S1 (root layout inheritance) and no hard deps — banner + body both say so.

## Not done

- `Microsoft.VSTS.TCM.ReproSteps` auto-populated by ADO with the same description HTML (User Story template behavior in this project). Left as-is — matches S1 / S2 / S3 treatment.
- No tags, no assignee, no sprint iteration — matches S1 / S2 / S3. Sprint planning will assign.
- Did not append a pattern to `zoo-core-agent-pm/ado-history.md` — no such file exists yet in this repo; skipping until the PM agent memory directory is seeded (matches S2 / S3 treatment).

## Next steps

1. Review rendered Story at https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7788
2. Either continue single-mode for E1-S5 (route groups + placeholder layouts — `(marketing)`, `(legal)`, `get-started` shell) or flip to bulk mode for the remaining 7 E1 stories now that S1 / S2 / S3 / S4 have set a very stable story-shape template.
3. S1 / S2 / S3 / S4 can all proceed to implementation in parallel — S4's only soft dep is on S1's root layout, which is the mildest coupling in the set.
