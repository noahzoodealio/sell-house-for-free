# Work Item 7788 — E1-S4

**Title:** E1-S4 — Global UX boundaries: error, loading, not-found
**Type:** User Story | **State:** New | **Priority:** 2 | **Size:** XS
**Parent:** Feature 7777 — E1 Site Foundation & Design System (story 4 of 11)
**URL:** https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7788
**Area / Iteration:** Offervana_SaaS
**Created:** 2026-04-16 by Noah Neighbors

## Dependencies

- **Soft dep:** E1-S1 (7785) — root layout supplies font variables + `metadataBase` + Analytics that these three files inherit automatically.
- **No hard dep on S2 / S3** — doesn't consume `SITE` / `ROUTES` / any `src/lib/*`.
- **Not a blocker for a specific story** but this is the site's first-impression-when-broken surface. E2/E3/E7 without it = raw Next dev overlay on error, blank frame on slow segments.
- **Scope:** `sell-house-for-free` only — three new files under `src/app/`. No `global-error.tsx`, no `global-not-found.tsx`, no per-segment overrides.

## User Story

As a visitor on the Sell Your House Free site, I want brand-consistent fallbacks when something breaks (runtime error), when a route is still loading (skeleton / spinner), or when I land on an unmatched URL (404 page), so that I keep trusting the brand, see a clear path to recover (retry / return home), and never get dropped into a raw browser error or a stack trace.

## Files Touched (all creates)

- `src/app/error.tsx`
- `src/app/loading.tsx`
- `src/app/not-found.tsx`

**Not touched:** `src/app/layout.tsx` (root layout wraps all three automatically); `src/app/global-error.tsx` (deferred to E8 — natural Sentry home); `src/app/global-not-found.tsx` (bypasses root layout — not applicable to single-root-layout site).

## Acceptance Criteria (verbatim summary)

1. **`error.tsx` is a Client Component.** First non-comment line is `'use client'` or `"use client"`.
2. **`error.tsx` uses `unstable_retry`, NOT `reset`.** Props typecheck as `{ error: Error & { digest?: string }, unstable_retry: () => void }`. Retry button `onClick` calls `unstable_retry()`. *Highest-risk AC — Claude's training data pre-dates Next 16.2 and defaults to `reset`.* Confirm against `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/error.md`.
3. **`error.tsx` logs via `useEffect`.** `useEffect(() => { console.error(error) }, [error])` with a sibling comment naming this as the E8 Sentry hookup seam.
4. **`error.tsx` does NOT leak `error.message`.** Visible copy is static. `error.digest` MAY appear in a small muted line prefixed "Ref:" (optional).
5. **`error.tsx` visual shape.** H1 in `text-ink-title` (#17233d); body in `text-ink-body` (#212121); primary retry button (bg #0653ab, fg #fdfdfd, radius 8px, 48–52px height, focus-visible brand ring); secondary `<Link href="/">` home. S6 `<Button>` primitive not merged yet → inline Tailwind matching S1 tokens is OK.
6. **`loading.tsx` is a Server Component.** No `'use client'`. Centered spinner + "Loading…" label in `text-ink-muted` (#9e9e9e), `min-h-[50vh]`.
7. **`loading.tsx` lightweight.** ~30 lines; no data fetching; no `@/lib/*` imports; no external UI libs.
8. **`not-found.tsx` is a Server Component.** No `'use client'`. H1 "404 — Page not found" in `text-ink-title`; body "The page you're looking for doesn't exist or has moved."; primary `<Link href="/">Return home</Link>`; secondary `<Link href="/get-started">Get started</Link>`. No `headers()` / `cookies()` / data fetching.
9. **`not-found.tsx` covers unmatched URLs AND `notFound()` calls.** Root `app/not-found.js` handles any unmatched URL for the whole app. No catch-all `[...slug]/page.tsx` added.
10. **HTTP 404 behavior.** Non-streamed: status 404 + `<meta name="robots" content="noindex">` auto-injected. Streamed: status may be 200 but noindex meta still present. Don't force 404 via `headers()` / middleware — framework-correct behavior.
11. **All three inherit root layout.** Output contains root `<html>` / `<body>`, Inter + Open Sans font classes on `<html>`, `metadataBase`-resolved `<meta>` tags, and (prod) Vercel Analytics. None redefines `<html>` / `<body>`.
12. **Keyboard focus.** Retry button in `error.tsx` + both `<Link>` in `not-found.tsx` → `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand` matching S1 WCAG 2.1 AA posture. Non-negotiable.
13. **Build clean + runtime smoke.** `pnpm build` TS strict passes, zero lint warnings. `pnpm start`: (a) `/does-not-exist` → branded 404 + noindex + 404 status; (b) slow segment → loading fallback; (c) thrown error → error UI + working retry. No hydration warnings.
14. **Visual parity.** PR description includes 3 screenshots: error, loading, not-found. If no Figma mock exists, @-mention UX for async sign-off.

## Key Technical Notes

- `error.tsx` sits BELOW root layout — errors in root layout itself bypass this file (needs `global-error.tsx`, E8).
- `loading.tsx` is prefetched on `<Link>` hover — keep it tiny.
- Root `not-found.tsx` handles unmatched URLs globally — no catch-all `[...slug]` needed.
- Do NOT use `global-not-found.tsx` (bypasses root layout; requires experimental flag).
- Token utilities cascade in these files (unlike ImageResponse in S3) — use `text-ink-title`, `bg-brand`, etc.; no hex literals.
- Do NOT import `next/font` in these files — root layout applies via `<html>`.
- No `metadata` export on `error.tsx` (Client Component ignores it).
- Optional: `metadata` export on `not-found.tsx` for tab title — cheap win, not required.
- No analytics events on error / 404 — Vercel Analytics page-view is sufficient.

## Out of Scope

- `global-error.tsx`, `global-not-found.tsx` (E8 + not applicable)
- Sentry / error-reporting SDK (E8 — the `useEffect` log is the seam)
- Per-segment error / loading / not-found under `(marketing)` / `(legal)` / `get-started`
- Skeleton-per-page loading fallbacks
- Analytics events for error / 404
- i18n (AZ-only, English-only)
- `apple-touch-icon`, bespoke illustrations

## References

- Architecture: `_bmad-output/planning-artifacts/architecture-e1-site-foundation.md` §3.1, §8 row E1-S4
- Project plan: `_bmad-output/planning-artifacts/project-plan-sell-house-for-free.md` §4 E1
- Sibling stories: 7785 (S1 tokens / focus posture), 7787 (S3 file metadata)
- Next.js 16 docs (MUST read per AGENTS.md):
  - `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/error.md`
  - `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/loading.md`
  - `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/not-found.md`
- Design reference: Figma node 877:787 (tokens); error/404/loading mocks TBD
