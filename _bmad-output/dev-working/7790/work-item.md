# E1-S5 — Route groups + placeholder layouts: (marketing), (legal), get-started shell

- **ADO ID:** 7790
- **Type:** User Story
- **State:** New
- **Parent Epic:** 7777 (E1 Site Foundation & Design System)
- **URL:** https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7790
- **Order:** 5 of 11 in E1
- **Size:** S

## Scope

`sell-house-for-free` repo only. Three new files under `src/app/`:

- `src/app/(marketing)/layout.tsx` — Server Component route-group layout; placeholder chrome (`<header>` + `<main>` + `<footer>`) with `TODO(E1-S9)` markers. Inherits root fonts/metadata.
- `src/app/(legal)/layout.tsx` — Server Component route-group layout; minimal brand bar + children + thin footer carrying "Listing broker: JK Realty" attribution.
- `src/app/get-started/page.tsx` — Server Component placeholder page; H1 + paragraph + return-home link; metadata export (prefer `buildMetadata` from S2 if present, literal otherwise).

Plus: register `/get-started` in `src/lib/routes.ts` if not already listed (for S3's sitemap).

## Not touched

- `src/app/layout.tsx` — unchanged (nested layouts inherit).
- `src/app/page.tsx` — unchanged (S11 owns home content).
- No `(marketing)/page.tsx` or `(legal)/page.tsx` (route groups have no index).
- No per-segment `loading.tsx` / `error.tsx` / `not-found.tsx` (S4 root covers).

## Acceptance criteria (13)

1. Route groups do NOT appear in URLs — `(marketing)` / `(legal)` parentheses wrapping excludes folder from URL per Next.js 16 route-groups convention.
2. Both layouts are Server Components — no `'use client'`; default export named `MarketingLayout` / `LegalLayout`; use `LayoutProps<'/(marketing)'>` / `LayoutProps<'/(legal)'>` typegen globals (do NOT hand-type `{ children: React.ReactNode }`).
3. `(marketing)/layout.tsx` structure — `<header>` placeholder `min-h-[72px] border-b border-border`; `<main className="min-h-[calc(100vh-200px)]">{children}</main>`; `<footer>` `border-t border-border`; clear `TODO(E1-S9)` JSX comments on each slot.
4. `(legal)/layout.tsx` structure — minimal `<header>` with brand-mark link to `/` (no nav); children wrapper; thin `<footer>` with copyright + broker attribution lines.
5. Chrome slots are placeholders only — no imports from `@/components/layout/header` / `footer` (S9 owns those). Inline JSX acceptable.
6. Typography inherits from root — do NOT re-import `next/font`. Body gets `var(--font-open-sans)`, headings get `var(--font-inter)` via cascade from `src/app/layout.tsx`.
7. `get-started/page.tsx` placeholder — H1 "Get started" (`text-ink-title`, Inter semibold, type-ramp size); single paragraph body copy ("This is where the short-form submission flow will live. It will ask a few questions about your property and request a no-obligation all-cash offer.") in `text-ink-body`; secondary `<Link href="/">` to home. No forms, no `'use client'`, no `next/script`.
8. `get-started/page.tsx` metadata export — use `buildMetadata({ title: 'Get started', description: 'Start your free, no-obligation cash offer on your Arizona home.', path: '/get-started' })` if `@/lib/seo` present; else literal `Metadata` object with `TODO(E1-S2 cleanup)`. Must produce `<title>` ending in `… | Sell Your House Free` via S1 title template.
9. `get-started/` lives at `src/app/get-started/` — NOT inside `(marketing)`. Rationale: E3 funnel wants chrome-free canvas.
10. Sitemap picks up `/get-started` — registered in `src/lib/routes.ts` with `changeFrequency: 'monthly'`, `priority: 0.7`. No robots override.
11. Responsive container — inner children wrapper respects `max-w-[var(--container-page)]` (1280px) + `px-4 md:px-6 lg:px-8`. Use `<Container>` if S8 landed else inline + `TODO(E1-S8 cleanup)`. No horizontal scroll at 360/768/1024/1440.
12. No unintended file-convention collisions — no `(marketing)/page.tsx`, `(legal)/page.tsx`, `(marketing)/loading.tsx`, `(marketing)/error.tsx`, etc.
13. Build clean + runtime smoke — TS strict passes, no lint warnings, `/get-started` returns 200, no hydration warnings. Dev-only smoke routes under `__smoke/` must be DELETED before merge.
14. Visual parity — three screenshots in PR: `/get-started`, `(marketing)` smoke, `(legal)` smoke. Tag UX for async sign-off (no Figma mock for placeholder states).

## Soft deps

- **S1 (7785):** root `layout.tsx` supplies font vars + `metadataBase` + Analytics; these layouts inherit.
- **S2 (7786):** `buildMetadata` + `ROUTES` registry — use if present.
- **S3 (7787):** sitemap reads `src/lib/routes.ts` — register `/get-started` there.
- **S4 (7788):** root `error.tsx` / `loading.tsx` / `not-found.tsx` cover the whole tree — no per-segment overrides.
- **S9 (forward):** real `Header` / `Footer` replace placeholder JSX later.
- **S8 (forward):** `Container` replaces inline padding later.

## Out of scope

Real Header/Footer (S9), Container (S8), per-segment error boundaries, marketing content (E2), legal content (E7), funnel state (E3), home migration, `(funnel)` group.
