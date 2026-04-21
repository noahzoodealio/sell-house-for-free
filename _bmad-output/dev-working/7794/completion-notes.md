# Completion notes — Story 7794 (E1-S9)

## Outcome

Shipped. 2 commits, 2 new files, 1 edit, 1 PR (stacked on #8).

- Branch: `feature/e1-s9-layout-chrome-header-footer-7794`
- PR: https://github.com/noahzoodealio/sell-house-for-free/pull/9 (base: `feature/e1-s8-...` → will retarget to `main` after #8 merges)

## Deliverables

- `src/components/layout/header.tsx` — brand + nav + CTA + skip-link
- `src/components/layout/footer.tsx` — 4-block grid; JK Realty broker attribution via `SITE.broker.name`; legal stubs
- `src/app/(marketing)/layout.tsx` — swap placeholder chrome for `<Header />` / `<Footer />`; add `<main id="main">`

## Decisions

- **Stacked PR (base = PR #8 branch), not main.** `<Header />` / `<Footer />` wrap content in `<Container>` which lives on the S8 branch.
- **`navItems: readonly RouteEntry[]` widening.** Needed because `ROUTES as const satisfies readonly RouteEntry[]` narrows filter results to `never` when the predicate excludes every literal path in the tuple. Fixed with `as readonly RouteEntry[]` assertion before filter.
- **Skip-link shipped, not deferred.** One line of sr-only utility; quick a11y win.
- **Nav excludes `/` and `/get-started`.** Avoids duplicate links (logo = /, CTA = /get-started). E2 adds real nav entries with `showInNav: true`.

## Follow-ups

- When PR #8 merges → GitHub retargets PR #9 base to `main`. No rebase required if no conflicts.
- `SITE.broker.licenseNumber` has a TODO comment — E7 confirms with JK Realty.

## Memory candidate

- **`ROUTES as const satisfies readonly RouteEntry[]` tuple narrowing.** When filtering by literal-path predicates, TS narrows the result type to `never`. Widen via `as readonly RouteEntry[]` before the filter. Not obvious if you've only used this pattern with non-literal arrays.

## Verdict

Pass. Build green, pattern-compliant, 17/17 ACs addressed.
