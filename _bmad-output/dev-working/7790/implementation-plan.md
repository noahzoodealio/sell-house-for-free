# Implementation Plan — E1-S5 (7790)

**Branch:** `feature/e1-s5-route-groups-layouts-7790` (off `main @ dc94d49`)

**Strategy:** four sequential file-groups. Each group builds + commits before moving to the next. A dev-only smoke verification happens mid-flight and is discarded before the corresponding commit.

---

## File-group 1 — `(marketing)/layout.tsx`

**Files:**
- `src/app/(marketing)/layout.tsx` (create)

**Content shape:**
```tsx
import Link from "next/link";

export default function MarketingLayout({ children }: LayoutProps<"/(marketing)">) {
  return (
    <>
      {/* TODO(E1-S9): replace placeholder with <Header /> */}
      <header className="min-h-[72px] border-b border-border">
        <div className="mx-auto flex h-[72px] max-w-[var(--container-page)] items-center px-4 md:px-6 lg:px-8">
          <Link href="/" className="text-ink-title text-[18px] font-semibold">
            Sell Your House Free
          </Link>
        </div>
      </header>
      <main className="min-h-[calc(100vh-200px)]">
        {/* TODO(E1-S8 cleanup): replace inline container with <Container> */}
        <div className="mx-auto max-w-[var(--container-page)] px-4 md:px-6 lg:px-8">
          {children}
        </div>
      </main>
      {/* TODO(E1-S9): replace placeholder with <Footer /> */}
      <footer className="border-t border-border">
        <div className="mx-auto max-w-[var(--container-page)] px-4 py-6 text-[14px] text-ink-muted md:px-6 lg:px-8">
          Placeholder footer.
        </div>
      </footer>
    </>
  );
}
```

**Verify before commit:**
1. Create dev-only `src/app/(marketing)/__smoke/page.tsx` returning a trivial H1.
2. `npm run build` → clean TS + no lint warnings (proves `LayoutProps<'/(marketing)'>` resolves post-typegen).
3. Delete `__smoke/` folder.

**Commit:** `feat(app): add (marketing) route-group placeholder layout`

---

## File-group 2 — `(legal)/layout.tsx`

**Files:**
- `src/app/(legal)/layout.tsx` (create)

**Content shape:**
```tsx
import Link from "next/link";
import { SITE } from "@/lib/site";

export default function LegalLayout({ children }: LayoutProps<"/(legal)">) {
  const year = new Date().getFullYear();
  return (
    <>
      <header className="border-b border-border">
        <div className="mx-auto max-w-[var(--container-page)] px-4 py-4 md:px-6 lg:px-8">
          <Link href="/" className="text-ink-title text-[16px] font-semibold">
            {SITE.name}
          </Link>
        </div>
      </header>
      <main className="min-h-[calc(100vh-160px)]">
        {/* TODO(E1-S8 cleanup): replace inline container with <Container> */}
        <div className="mx-auto max-w-[var(--container-prose)] px-4 py-10 md:px-6 lg:px-8">
          {children}
        </div>
      </main>
      <footer className="border-t border-border">
        <div className="mx-auto max-w-[var(--container-page)] px-4 py-6 text-[14px] text-ink-muted md:px-6 lg:px-8">
          <p>© {year} {SITE.name}</p>
          <p>Listing broker: {SITE.broker.name}</p>
        </div>
      </footer>
    </>
  );
}
```

**Notes:**
- Legal uses `max-w-[var(--container-prose)]` (65ch) for readability; marketing uses `--container-page` (1280px) because marketing content often needs the wider canvas.
- Broker attribution is pulled from `SITE.broker.name` (single source of truth — S9 won't drift).

**Verify before commit:**
1. Create dev-only `src/app/(legal)/__smoke/page.tsx`.
2. `npm run build` clean.
3. Delete `__smoke/`.

**Commit:** `feat(app): add (legal) route-group minimal layout with broker attribution`

---

## File-group 3 — `get-started/page.tsx` + `routes.ts` priority correction

**Files:**
- `src/lib/routes.ts` (edit — `/get-started` priority `0.9 → 0.7` per AC 10)
- `src/app/get-started/page.tsx` (create)

**Content shape:**
```tsx
// src/app/get-started/page.tsx
import Link from "next/link";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Get started",
  description: "Start your free, no-obligation cash offer on your Arizona home.",
  path: "/get-started",
});

export default function GetStartedPage() {
  return (
    <main className="flex min-h-screen flex-col bg-surface-tint">
      {/* TODO(E1-S8 cleanup): replace inline container with <Container> */}
      <div className="mx-auto flex w-full max-w-[var(--container-page)] flex-1 flex-col gap-6 px-4 py-24 md:px-6 lg:px-8">
        <h1 className="text-ink-title text-[36px] leading-[44px] md:text-[48px] md:leading-[56px]">
          Get started
        </h1>
        <p className="text-ink-body max-w-[var(--container-prose)] text-[18px] leading-[28px]">
          This is where the short-form submission flow will live. It will ask a
          few questions about your property and request a no-obligation
          all-cash offer.
        </p>
        <Link href="/" className="text-brand text-[16px] underline underline-offset-4">
          ← Back to home
        </Link>
      </div>
    </main>
  );
}
```

**Verify before commit:**
1. `npm run build` clean.
2. `npm run dev` → GET `/get-started` returns 200 with branded H1 + body copy + back link.
3. Page `<title>` ends in `| Sell Your House Free` (inherited from S1 root title template).
4. `/sitemap.xml` (dev) includes `${SITE.url}/get-started`.

**Commit:** `feat(app): add /get-started placeholder page and tune sitemap priority`

---

## File-group 4 — final whole-branch verification (no file changes)

This is a verification-only gate before self-review, not a commit.

**Steps:**
1. `npm run lint` → clean.
2. `npm run build` → clean (typegen runs, confirms all three LayoutProps route keys resolve).
3. `npm run start` smoke:
   - `/` renders home (regression check — `page.tsx` unchanged).
   - `/get-started` returns 200.
   - Re-add a temporary `src/app/(marketing)/__smoke/page.tsx` → visit → confirm marketing placeholder chrome renders → delete.
   - Re-add a temporary `src/app/(legal)/__smoke/page.tsx` → visit → confirm legal minimal chrome renders → delete.
4. Capture screenshots (3) for PR description per AC 14.
5. Confirm `git status` shows no `__smoke/` leftovers.

**No commit** — just the gate into self-review.

---

## Compaction gates

Between groups 1/2, 2/3, 3/4 — re-read this plan + `index.md` sidecar from context to resume. No state held in working memory across group boundaries.

## EF migrations

None. S5 is pure UI scaffolding — no DB, no Prisma, no EF. No migration halt needed.

## Risks / open items

- **`LayoutProps<'/(marketing)'>` typegen form** — verified only after first `npm run build` emits typegen. If Next.js actually strips route-group parens from the typegen key (unlikely but possible — the docs example uses `/dashboard`), the build will surface a clear TS error like "Type 'LayoutProps<'/(marketing)'>' is not assignable…" with the expected route keys listed. Fallback plan: use the generated form. _Will confirm after group 1 build._
- **Screenshots for AC 14** — captured during file-group 4 smoke; attached to PR description. Reviewer/UX signs off async if no Figma mock exists (likely — placeholder states have none).
