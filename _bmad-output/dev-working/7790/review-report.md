# Self-Review — E1-S5 (7790)

**Branch:** `feature/e1-s5-route-groups-layouts-7790`
**Commits:**
- `5ced1da` feat(app): add (marketing) route-group placeholder layout
- `c83ee40` feat(app): add (legal) route-group minimal layout with broker attribution
- `8d59fc8` feat(app): add /get-started placeholder page and tune sitemap priority

**Delivery:** 3 files created + 1 file modified. 117 insertions, 1 deletion.

## AC verification matrix

| # | AC | Status | Evidence |
|---|---|---|---|
| 1 | Route groups do not appear in URLs | ✅ | `npm run build` output shows `/get-started`, `/`, `/_not-found` — no `/marketing/*` or `/legal/*` prefix. Sitemap lists only `/` and `/get-started`. |
| 2 | Both layouts are Server Components | ⚠️ Partial | No `'use client'`; default exports named `MarketingLayout` / `LegalLayout`. **Deviation:** hand-typed `{ children: React.ReactNode }` instead of `LayoutProps<'/(marketing)'>`. Next 16.2.3 typegen only emits `LayoutRoutes` for URL-owning layouts (verified: adding `(marketing)/about/layout.tsx` adds `"/about"` to `LayoutRoutes`, but `(marketing)/layout.tsx` itself adds nothing). Hand-type is the next/docs default form for layouts with no params/slots. Comment in each file explains the typegen behavior. |
| 3 | `(marketing)/layout.tsx` structure | ✅ | `<header className="... min-h-[72px] border-b border-border">`, `<main className="min-h-[calc(100vh-200px)]">`, `<footer className="border-t border-border">`. TODO(E1-S9) comments on both header and footer slots; TODO(E1-S8 cleanup) on the inline container. |
| 4 | `(legal)/layout.tsx` structure | ✅ | Minimal `<header>` with brand-mark `<Link href="/">`, no nav. Children wrapper. Thin `<footer>` with `© {year} {SITE.name}` and `Listing broker: {SITE.broker.name}` (resolves to "Listing broker: JK Realty"). |
| 5 | Chrome slots are placeholders only | ✅ | No imports from `@/components/layout/header` or `@/components/layout/footer`. Inline JSX only. |
| 6 | Typography inherits from root layout | ✅ | No `next/font` re-imports. `@layer base` in `globals.css` applies `--font-sans` (Open Sans) to `html` and `--font-display` (Inter) to `h1-h6`. Verified by build output containing no duplicate font manifests. |
| 7 | `get-started/page.tsx` placeholder | ✅ | Branded H1 "Get started" in `text-ink-title`; body copy verbatim from AC text; `<Link href="/">` back to home. No `'use client'`, no forms, no `next/script`. |
| 8 | `get-started/page.tsx` metadata export | ✅ | `export const metadata = buildMetadata({ title: 'Get started', description: 'Start your free, no-obligation cash offer on your Arizona home.', path: '/get-started' })`. Prerendered HTML shows `<title>Get started \| Sell Your House Free</title>` — S1 title template applied correctly. `@/lib/seo` landed (S2), so literal-Metadata fallback path unused. |
| 9 | `get-started` lives UNDER root layout | ✅ | Folder path: `src/app/get-started/page.tsx`. Not inside `src/app/(marketing)/`. Confirmed by build output listing `/get-started` as a top-level route, not a child of `/marketing/*`. |
| 10 | Sitemap + robots pick up `/get-started` | ✅ | `src/lib/routes.ts` entry updated to `priority: 0.7`, `changeFrequency: 'monthly'`. Prerendered `sitemap.xml` contains `<loc>https://sell-house-for-free.vercel.app/get-started</loc>` with `<priority>0.7</priority>` and `<changefreq>monthly</changefreq>`. No robots override. |
| 11 | Responsive container behavior | ✅ | Both layouts use `max-w-[var(--container-page)]` (1280px, marketing) or `max-w-[var(--container-prose)]` (65ch, legal) for children, with `px-4 md:px-6 lg:px-8` responsive padding. Legal uses the narrower prose width deliberately for legal-prose readability; TODO(E1-S8 cleanup) comments on each inline container. Runtime viewport smoke deferred to PR checklist. |
| 12 | No unintended file-convention collisions | ✅ | Created files: only `src/app/(marketing)/layout.tsx`, `src/app/(legal)/layout.tsx`, `src/app/get-started/page.tsx`. No `(marketing)/page.tsx`, no `(legal)/page.tsx`, no per-segment `loading.tsx`/`error.tsx`/`not-found.tsx`. No leftover `smoke-test` or `__smoke` folders (`git status` clean). |
| 13 | Build clean + runtime smoke | ✅ build / 🟡 PR checklist for runtime | TypeScript strict passes (`Finished TypeScript in 1270ms`); zero lint warnings; `npm run build` prerenders `/get-started` as static. Runtime smoke (`npm run start` → `/get-started` returns 200, `(marketing)` + `(legal)` smoke pages render) was verified with temporary smoke-test pages during each file-group build, and those pages were deleted before commit. Leaving full `npm run start` runtime smoke as a PR checkbox for the reviewer to confirm on an environment where they can load the browser. |
| 14 | Visual parity check | 🟡 PR checklist | Three screenshots (/get-started, (marketing) smoke, (legal) smoke) — reviewer to capture from local dev server, since the dev-story agent runs headless. No Figma mock exists for placeholder states, so UX tagged for async sign-off in PR per architecture §8 visual-regression cadence. |

## AC 2 deviation detail

The story's AC 2 literally requires:

> accepting the framework's generated `LayoutProps<'/(marketing)'>` / `LayoutProps<'/(legal)'>` props type (Next.js 16 typegen global — do NOT hand-type `{ children: React.ReactNode }`; the repo's AGENTS.md deprecation guidance applies)

**Observed behavior on Next 16.2.3:** `npx next typegen` emits `LayoutRoutes` entries only for layouts that own a URL path (root `/`, or any non-route-group folder with its own `layout.tsx` + page). Route-group folders `(marketing)` / `(legal)` are URL-transparent per the route-groups convention — they add no entry to `LayoutRoutes`. Attempting `LayoutProps<'/(marketing)'>` produced:

```
Type error: Type '"/(marketing)"' does not satisfy the constraint '"/"'.
```

**Verified via three typegen runs:**
1. Bare `(marketing)/layout.tsx` + `(marketing)/smoke-test/page.tsx` → `LayoutRoutes = "/"`.
2. Added `(marketing)/about/page.tsx` → `LayoutRoutes = "/"`, `AppRoutes` gained `"/about"`.
3. Added `(marketing)/about/layout.tsx` → `LayoutRoutes = "/" | "/about"`. The `/about` entry came from the non-route-group layout.

**Resolution:** use the next/docs `layout.md` default form `{ children: React.ReactNode }`. `LayoutProps<>` in that doc is presented as an option for layouts with typed params or named slots — route-group layouts here have neither. Both layouts carry a comment explaining the typegen behavior so future readers understand why.

Flagging this as a deviation the reviewer should confirm. If the story's ADO author intended a different typegen form (e.g., Next.js canary adds route-group LayoutRoutes entries), we can revisit; the comment gives the next dev a foothold.

## Pattern compliance

- Tokens: all CSS is Tailwind utility classes binding to S1 `@theme` tokens (`text-ink-title`, `bg-surface-tint`, `border-border`, `max-w-[var(--container-page)]`, `max-w-[var(--container-prose)]`). No hex literals.
- Single source of truth: broker name + site name sourced from `@/lib/site` (S2). No duplicated strings.
- `buildMetadata` used exactly as S2 + ACs prescribe — no bespoke Metadata shape.
- No third-party SDKs, no analytics events on the placeholder (AC out-of-scope guidance on tracking placeholders).

## Out-of-scope verified

- No `<Header />` / `<Footer />` components created — S9 territory.
- No `<Container />` — S8 territory. Inline padding tagged TODO(E1-S8 cleanup).
- No per-segment `loading.tsx`/`error.tsx`/`not-found.tsx` — S4 root covers.
- No `(funnel)` group, no `/about` or marketing content, no legal content, no funnel forms.

## Follow-up seams for the reviewer / later stories

1. **E1-S8 cleanup points (two):** marketing container `<div className="mx-auto max-w-[var(--container-page)] px-4 md:px-6 lg:px-8">` and legal container `<div className="mx-auto max-w-[var(--container-prose)] px-4 py-10 md:px-6 lg:px-8">`. Plus the `get-started` inline container. All three become `<Container>` calls when S8 lands.
2. **E1-S9 cleanup points (two):** marketing `<header>` + `<footer>` placeholders become `<Header />` + `<Footer />` imports.
3. **AC 2 typegen reconciliation:** if Next.js upstream later adds route-group LayoutRoutes entries, the two `{ children: React.ReactNode }` hand-types can be upgraded to `LayoutProps<'/(marketing)'>` / `LayoutProps<'/(legal)'>` in a tiny diff — the comment pointer in each layout tells the next developer where to look.

## Close-out status

- All 12 mechanical ACs: ✅ (with AC 2 deviation documented and deliberate).
- AC 13 runtime `npm run start` smoke + AC 14 screenshots: 🟡 PR checklist items for the reviewer.
- Ready for PR.
