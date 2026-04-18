---
slug: e1-bulk-s5-to-s11
parent-epic-id: 7777
parent-epic-url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7777
mode: bulk
mode-ado: mcp
stories-planned:
  - e1-s5-route-groups
  - e1-s6-ui-primitives-text-inputs
  - e1-s7-ui-primitives-choices
  - e1-s8-ui-primitives-structure
  - e1-s9-layout-chrome
  - e1-s10-analytics-gating
  - e1-s11-placeholder-home
stories-created:
  - id: 7790
    url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7790
    title: "E1-S5 — Route groups + placeholder layouts: (marketing), (legal), get-started shell"
  - id: 7791
    url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7791
    title: "E1-S6 — UI primitives: Button, Input, Label, Field, Fieldset"
  - id: 7792
    url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7792
    title: "E1-S7 — UI primitives: Checkbox, Radio, Select, Textarea"
  - id: 7793
    url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7793
    title: "E1-S8 — UI primitives: Card, FormStep, Container"
  - id: 7794
    url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7794
    title: "E1-S9 — Layout chrome: Header + Footer (JK Realty attribution)"
  - id: 7795
    url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7795
    title: "E1-S10 — Analytics gating + anti-third-party-SDK policy doc"
  - id: 7796
    url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7796
    title: "E1-S11 — Placeholder home page (hero + Get started CTA)"
started-at: 2026-04-17T20:00:00Z
completed-at: 2026-04-17T20:16:00Z
last-completed-step: 5
---

# E1 bulk S5→S11 — PM Working Sidecar

## Plan

Seven stories remain to complete the 11-story decomposition of Feature 7777. Prior runs filed S1 (7785), S2 (7786), S3 (7787), S4 (7788) in single mode. Template is stable — switching to bulk mode per S3/S4 sidecar recommendations.

### Dependency map

- **S5** — soft dep on S1 (root layout inherits fonts). `get-started/page.tsx` placeholder replaced by E3.
- **S6** — soft dep on S1 (token CSS vars). No sibling deps. Unblocks S4 retry button swap (optional), S7, S8, E3 form.
- **S7** — soft dep on S6 for consistency, but primitives are independent; S6/S7/S8 can land in any order.
- **S8** — soft dep on S6 (`Card` used by `Header`/`Footer` in S9 optional; `Container` is standalone; `FormStep` consumed by E3).
- **S9** — soft dep on S2 (`SITE.broker`) and S8 (`Container`). Header nav populated in E2.
- **S10** — soft dep on S1 (Analytics gating already shipped in S1); S10 formalizes it + writes the policy doc. Mostly documentation.
- **S11** — soft dep on S2 (`buildMetadata`, `ROUTES`), S6 (Button/Link), S9 (Header/Footer inherit via `(marketing)` layout from S5).

### Filing order

S5 → S6 → S7 → S8 → S9 → S10 → S11. Rationale: S5 unlocks the `(marketing)` layout that S11 needs; S6 unlocks primitives consumed by S9 + S11; S9 closes layout chrome before S11 places the home page inside it.

All seven ship to ADO under Feature 7777 via `wit_add_child_work_items` with the same area/iteration path (`Offervana_SaaS`) as siblings 7785–7788.

## Execution log

### Filed in order

1. **7790** — E1-S5 Route groups + placeholder layouts. 13 Gherkin ACs. Key risks pinned: route-group URL invariance (AC 1); `LayoutProps<'/(marketing)'>` typegen usage (AC 2); deliberate decision to keep `/get-started` at the app root — outside `(marketing)` — so E3 has a chrome-free funnel canvas (AC 9).
2. **7791** — E1-S6 UI primitives first wave (Button + Input + Label + Field + Fieldset). 18 ACs. Highest-risk items: React 19 ref-as-prop vs. `forwardRef` (technical notes — training data assumes `forwardRef` is required; it isn't in React 19); no polymorphic `as` prop; no CVA/clsx/tailwind-merge — architecture §6 deviation is explicit. Adds `--color-error: #c62828` as a backfill token.
3. **7792** — E1-S7 UI primitives second wave (Checkbox + Radio + Select + Textarea). 15 ACs. Highest-risk item: native `accent-color` for Checkbox/Radio (AC 2) — training data reaches for hidden-input-plus-styled-span pattern; architecture §6 deviation rejects it. `<Select>` uses `appearance: none` + CSS background-image chevron (AC 5).
4. **7793** — E1-S8 structural primitives (Card + FormStep + Container). 16 ACs. `<Container>` lives under `src/components/layout/` not `ui/` per architecture §3.3. Explicit rejection of Tailwind's built-in `container` utility (technical notes) because it conflicts with the locked 1280px `--container-page` token. Progress bar as styled `<div>` + ARIA, not native `<progress>` (technical notes).
5. **7794** — E1-S9 layout chrome (Header + Footer). 17 ACs. Edits `(marketing)/layout.tsx` to swap S5's placeholder chrome for real components. JK Realty broker attribution sourced from `SITE.broker` (S2); Header nav region `ROUTES`-driven (S2); skip link for a11y; explicit no-hamburger decision for E1 (mobile nav deferred to E2 when items exist).
6. **7795** — E1-S10 Analytics gating + policy doc (XS). 12 ACs. Upgrades S1's gating conditional to the dual `NODE_ENV === 'production' && VERCEL_ENV !== 'preview'` form (AC 2) — same S3-style preview-leak footgun. Creates `docs/analytics-policy.md` with five sections; adds pointer in `AGENTS.md`; inline comment in `layout.tsx` next to the `<Analytics />` render. Optional ESLint `no-restricted-imports` pattern-list for common tracking SDKs (AC 11 — skip if it blows up scope).
7. **7796** — E1-S11 Placeholder home page (XS). 17 ACs. File MOVES from `src/app/page.tsx` to `src/app/(marketing)/page.tsx` (AC 1) so the home inherits marketing chrome via S9; otherwise S9's header/footer lives in two places. `title: { absolute: '…' }` metadata pattern on home only to suppress the S1 title template appending (technical notes — a Next.js 16 nuance not in most training data). Meets Feature 7777's Lighthouse LCP < 2.5s / Performance ≥ 90 gate (AC 13).

### Content decisions (cross-story patterns)

- **Blueprint stability.** Every story follows the same section cadence as S4 / S3 / S2 / S1 (User story → Summary → Files touched → Acceptance criteria → Technical notes → Suggested tasks → Out of scope → References → Notes). Banner shape matches parent Feature 7777 and siblings 7785-7788.
- **AC count scales with correctness-sensitive surface, not story size.** S5 (13), S6 (18), S7 (15), S8 (16), S9 (17), S10 (12), S11 (17). S10 is XS by LOC but ships a policy document + hardens a production/preview env-var conditional — ACs earn their place.
- **Soft-dep forgiveness.** Every story with upstream story deps includes an explicit "if upstream hasn't landed, inline the equivalent + add a TODO" escape clause in the banner. No hard blocks within E1 — stories can be picked up in any order by capacity, not dependency graph.
- **Bleeding-edge Next.js 16 call-outs.** Every Notes tail pins the ONE training-data regression risk most likely for that specific story: S5 `LayoutProps` typegen; S6 React 19 ref-as-prop; S7 native `accent-color` vs. custom checkbox; S8 Tailwind v4 @theme auto-generated utilities; S9 `<Link>` vs raw `<a>`; S10 `VERCEL_ENV` preview leak; S11 `title.absolute` on home.
- **Architecture §6 "handrolled primitives" discipline.** Explicit in S6 (no Radix / shadcn / CVA), S7 (no Radix listbox, no custom checkbox widgets), S8 (no CardHeader/Body/Footer accretion trap).

### Bulk-mode compaction

Each story was drafted individually and filed via `wit_add_child_work_items` immediately (not batched). Per-story context was discarded between draftings to keep the working set lean. The Feature 7777 body + S4 sibling template were re-referenced by memory rather than re-fetched.

### Style match to siblings 7785 / 7786 / 7787 / 7788

- Same HTML vocabulary (`<h2>`, `<ul>`, `<ol>`, `<code>`, `<strong>`, `<em>`).
- Same parent/story-order/size/blocks/depends-on/scope banner.
- Same area/iteration path (`Offervana_SaaS` / `Offervana_SaaS`).
- State `New`.
- Priority `2` (ADO default for User Story in this project).
- `Microsoft.VSTS.TCM.ReproSteps` auto-populated by ADO with the same HTML — matches siblings.

## Not done

- No tags assigned (matches S1-S4).
- No assignees, no sprint iteration (matches S1-S4; sprint planning will assign).
- Did not append patterns to `zoo-core-agent-pm/ado-history.md` — directory doesn't exist yet (matches S2-S4 treatment).
- No inter-story `Related` links filed in ADO. Hierarchy (Parent) link is on each story pointing at 7777; sibling-to-sibling relationships are documented in each story body under `Depends on` / `Blocks`. Explicit ADO `Related` links could be added in a follow-up if the team's velocity tool wants them.

## Next steps

1. Review the seven rendered stories. Spot-check for ADO HTML rendering quirks on S8 / S9 (largest ACs tables).
2. Feature 7777 is now fully decomposed — E1 is ready for sprint planning. All 11 stories filed: 7785, 7786, 7787, 7788, 7790, 7791, 7792, 7793, 7794, 7795, 7796.
3. Critical path for parallel work: S1/S2/S3/S4/S5/S6/S7 can all start simultaneously (no hard deps). S8 needs S1 tokens; S9 needs S2 + S5 + S8; S10 needs S1; S11 is the capstone and consumes the most.
4. Suggested next skill: `/zoo-core-create-architecture` for the next critical-path Feature in E2 or E3, OR `/zoo-core-dev-epic` on 7777 to autopilot implementation of E1 stories.
