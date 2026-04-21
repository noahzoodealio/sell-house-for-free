# Implementation Plan — E1-S4 (7788)

## Strategy

Three tiny, independent files — no shared state, no shared lib. Natural file-groups = one per file. Commit each individually so history reads cleanly (matches S3's commit cadence).

Compaction between groups is optional (no lib state to preserve), but I'll mark gates anyway per skill convention.

## File-groups

### Group 1 — `src/app/error.tsx` (Client Component)

**Why first:** Highest-risk AC (AC 2 — `unstable_retry` vs `reset`). Nailing this up front validates the pattern before the simpler two. Smallest blast radius if I'm wrong.

**Content:**
```tsx
"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  // E8: swap console.error for Sentry.captureException(error) — no refactor needed.
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-24 text-center">
      <h1 className="text-ink-title text-[36px] leading-[44px] md:text-[48px] md:leading-[56px]">
        Something went wrong
      </h1>
      <p className="text-ink-body max-w-[var(--container-prose)] text-[18px] leading-[28px]">
        An unexpected error interrupted this page. You can try again, or head back home.
      </p>
      <div className="flex flex-col items-center gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => unstable_retry()}
          className="bg-brand text-brand-foreground focus-visible:outline-brand inline-flex h-[52px] items-center justify-center rounded-lg px-6 text-[18px] font-semibold focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          Try again
        </button>
        <Link
          href="/"
          className="text-ink-body focus-visible:outline-brand inline-flex h-[52px] items-center justify-center rounded-lg px-6 text-[18px] font-medium underline decoration-1 underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          Return home
        </Link>
      </div>
      {error.digest && (
        <p className="text-ink-muted text-[14px]">Ref: {error.digest}</p>
      )}
    </main>
  );
}
```

**Checks before commit:**
- `"use client"` is the first line (AC 1)
- Props destructured as `{ error, unstable_retry }` with the exact AC 2 type signature
- `useEffect` deps = `[error]` and the comment names E8 (AC 3)
- No `error.message` printed — only `error.digest` (AC 4)
- H1 in `text-ink-title`, body in `text-ink-body`, button with brand tokens + radius + focus ring (AC 5 + 12)
- No `metadata` export (doc note)
- No `next/font` import (doc note)

**Commit:** `feat(app): add error.tsx client boundary with unstable_retry`

---

### Group 2 — `src/app/not-found.tsx` (Server Component)

**Why second:** Same server-component shape as `loading.tsx` and reuses the primary/secondary-link pattern from `error.tsx`. Logical progression.

**Content:**
```tsx
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Not found",
};

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-24 text-center">
      <h1 className="text-ink-title text-[36px] leading-[44px] md:text-[48px] md:leading-[56px]">
        404 — Page not found
      </h1>
      <p className="text-ink-body max-w-[var(--container-prose)] text-[18px] leading-[28px]">
        The page you&apos;re looking for doesn&apos;t exist or has moved.
      </p>
      <div className="flex flex-col items-center gap-3 sm:flex-row">
        <Link
          href="/"
          className="bg-brand text-brand-foreground focus-visible:outline-brand inline-flex h-[52px] items-center justify-center rounded-lg px-6 text-[18px] font-semibold focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          Return home
        </Link>
        <Link
          href="/get-started"
          className="text-ink-body focus-visible:outline-brand inline-flex h-[52px] items-center justify-center rounded-lg px-6 text-[18px] font-medium underline decoration-1 underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          Get started
        </Link>
      </div>
    </main>
  );
}
```

**Checks before commit:**
- No `"use client"` (AC 8)
- No `headers()` / `cookies()` / data fetching (AC 8)
- H1 exact copy "404 — Page not found" (AC 8 — em-dash spacing)
- Body copy exact from AC 8 (apostrophe handled via `&apos;` to dodge ESLint `react/no-unescaped-entities`)
- Primary `/` link + secondary `/get-started` link, both with focus rings (AC 8 + 12)
- `metadata.title = "Not found"` — inherits template → `"Not found | Sell Your House Free"` (optional, doc note)

**Commit:** `feat(app): add not-found.tsx with branded 404 and noindex`

---

### Group 3 — `src/app/loading.tsx` (Server Component)

**Why last:** Simplest file; no interaction, no links. Isolating it means the smoke test for the loading fallback (AC 13b) runs cleanly with the other two already committed.

**Content:**
```tsx
export default function Loading() {
  return (
    <main
      className="flex min-h-[50vh] flex-1 flex-col items-center justify-center gap-3 px-6"
      role="status"
      aria-label="Loading"
    >
      <span
        aria-hidden="true"
        className="border-border border-t-brand inline-block h-10 w-10 animate-spin rounded-full border-4"
      />
      <span className="text-ink-muted text-[14px]">Loading…</span>
    </main>
  );
}
```

**Checks before commit:**
- No `"use client"` (AC 6)
- No imports from `@/lib/*`, no external UI lib (AC 7)
- Container has `min-h-[50vh]` (AC 6)
- "Loading…" in `text-ink-muted` (AC 6)
- Pure-CSS spinner via Tailwind `animate-spin` (AC 6 — "pure-CSS spinner or inline SVG")
- Under ~30 lines (AC 7)
- `role="status"` + `aria-label="Loading"` + `aria-hidden` on the decorative spinner — a11y belt-and-braces; the story doesn't explicitly require it but it's a cheap correctness win matching the S1 WCAG posture

**Commit:** `feat(app): add loading.tsx suspense fallback with brand spinner`

---

## Compaction gates

- After group 1: sidecar carries `{ error.tsx: committed <sha>, unstable_retry confirmed working }`. Discard doc-read context.
- After group 2: sidecar carries both + `{ not-found.tsx: committed <sha> }`.
- After group 3: proceed to self-review.

No EF migrations in this story — no user-halt gates.

## Per-group ritual

1. Write file via `Write` tool
2. `npm run lint` on the one file (or whole project if fast enough)
3. Stage + commit the single file
4. Update sidecar with commit SHA
5. Move to next group

## Out-of-plan items (explicit)

- **No `src/lib/` additions.** Story consumes root-layout cascade only; no consumers of `SITE` / `ROUTES`.
- **No `global-error.tsx` / `global-not-found.tsx`.** Deferred to E8 per story scope.
- **No disposable `/throw` route.** Smoke-test the error boundary via a temporary throw in `page.tsx` during `npm run start`, then revert before PR. Alternative: React DevTools toggle.
- **No screenshot generation in this plan.** AC 13 screenshots happen at PR-draft time (step 7).

## Open questions

None — all ACs are concrete and the docs confirm every high-risk call. Ready to implement on approval.
