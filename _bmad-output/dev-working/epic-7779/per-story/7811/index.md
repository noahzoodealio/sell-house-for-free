---
work-item-id: 7811
work-item-type: story
parent-epic: 7779
parent-feature: 7779
grand-parent-epic: 7776
repo: sell-house-for-free
worktree: C:\Users\Noah\sell-house-for-free-e3-7779
branch: feature/e3-seller-submission-7779
file-groups:
  - id: shell
    description: "Funnel shell + routing + metadata — 6 new files + 2 edits"
    files:
      - src/lib/seo.ts (edit)
      - src/lib/routes.ts (edit)
      - src/components/get-started/seller-form.tsx (new)
      - src/app/get-started/layout.tsx (new)
      - src/app/get-started/page.tsx (rewrite)
      - src/app/get-started/loading.tsx (new)
      - src/app/get-started/error.tsx (new, "use client")
      - src/app/get-started/thanks/page.tsx (new)
last-completed-step: 7
last-completed-file-group: shell
commit-sha: 16603cf
ado-state: "Ready For Testing"
closed-at: 2026-04-21
started-at: 2026-04-21
---

# S1 (7811) — Funnel shell + routing + metadata

## Scope

Lands the static `/get-started` funnel shell that S2–S11 fill in. No interactivity yet. Single file-group (small story).

## Key decisions baked into the code

- **Async `searchParams`**: `searchParams: Promise<{…}>` per Next.js 16; always awaited.
- **Allowlist coercion**: unknown `?pillar` / `?city` / `?step` → `undefined` / `'address'`, never throw.
- **`noindex` option** centralized in `buildMetadata()` — future noindex routes are a one-line flip.
- **Suspense boundary** around `<SellerForm>` in `page.tsx` (S3 uses `useSearchParams` which requires it per Next.js 16 §Prerendering). Plus `loading.tsx` for initial hydration.
- **Routes registry**: using existing `showInSitemap: boolean` schema (positive phrasing). Flipping `/get-started` to `showInSitemap: false, showInNav: false`; appending `/get-started/thanks` with same flags.
- **Header nav filter**: already excludes `/get-started` via hardcoded `path !== "/get-started"`; safe to flip `showInNav` without breaking nav.
- **Placeholder `<SellerForm>`** lives at `src/components/get-started/seller-form.tsx` with its types; S3 replaces the body.
- **Placeholder phone** `(480) 555-0100` in layout sliver, flagged `TODO(E7)`.

## Acceptance criteria status

All 16 ACs from ADO 7811 covered by this file-group. Verification via `pnpm build && pnpm typecheck` after write.

## Not touched (out of scope)

- `src/components/get-started/seller-form.tsx` body beyond placeholder (S3 owns)
- `src/lib/seller-form/*` (S2 owns)
- `src/app/get-started/actions.ts` (S8 owns)
- `src/app/api/submit/route.ts` (S8 owns)
- Root layout / `(marketing)/layout.tsx` (funnel is top-level, outside that group)
