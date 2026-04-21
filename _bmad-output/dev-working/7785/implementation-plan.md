# Implementation Plan — Story 7785 (E1-S1 Global scaffolding)

## Strategy

Four small file-groups, sequenced so each group is independently verifiable:

1. **Tokens first** — `globals.css` is the source of truth for ACs 3–7 and AC 10. Landing it first lets `layout.tsx` + `page.tsx` consume tokens immediately and lets `pnpm lint` catch issues.
2. **Root layout** — `layout.tsx` adds fonts (ACs 1–2, 10), `metadataBase` + title template (AC 9), and prod-only Analytics gate (AC 8).
3. **Home page shell** — `page.tsx` trimmed to a minimal, brand-tokened surface (one H1 + paragraph + brand-link). Doubles as the visual-parity sample for AC 12.
4. **Env + smoke check** — add `.env.example` documenting `NEXT_PUBLIC_SITE_URL`; run `pnpm lint`, `pnpm build` (AC 11) and manual `pnpm dev` inspection for AC 1 (network tab) + AC 7 (OS dark mode toggled).

No `package.json` changes — all needed deps (`next/font/google`, `@vercel/analytics`, Tailwind v4) are already installed. No `tailwind.config.ts` will be created (tokens live in CSS `@theme` per Tailwind v4 + architecture decision).

---

## File-group 1 — Design tokens (`globals.css`)

**Files**
- `src/app/globals.css` (rewrite)

**Changes**
- Replace the scaffold `@import "tailwindcss"` + `:root` + `@theme inline` + `@media (prefers-color-scheme: dark)` + Arial `body { font-family: ... }` block with the canonical `@theme` from architecture §4.
- Add `@layer base` block:
  - `html { font-family: var(--font-sans); color: var(--color-ink-body); }`
  - `h1, h2, h3, h4, h5, h6 { font-family: var(--font-display); color: var(--color-ink-title); font-weight: 600; }`
- Drop `prefers-color-scheme: dark` entirely.
- Drop the `:root { --background / --foreground }` vars and the `body { font-family: Arial, Helvetica, sans-serif; ... }` rule (AC 10).

**ACs covered**
- AC 3 (brand tokens), AC 4 (ink/border/surface), AC 5 (radius), AC 6 (containers), AC 7 (no dark-mode rule), AC 10 (no Arial rule)

**Verification**
- `pnpm lint` clean
- File-group self-review: `grep` for `prefers-color-scheme`, `Arial`, `--background`, `@theme inline` — all must be absent
- `pnpm build` deferred to file-group 4 (tokens need layout+page consumers before full smoke)

**Commit message**
```
feat(theme): replace scaffold globals.css with brand @theme tokens

Canonical tokens from architecture-e1-site-foundation.md §4:
Figma style-guide node 877:787 source.
Drop prefers-color-scheme dark, :root background/foreground vars, and
Arial body fallback — replaced by @layer base inheritance from
--font-sans / --font-display.

Refs ADO 7785 (E1-S1).
```

---

## File-group 2 — Root layout (`layout.tsx`)

**Files**
- `src/app/layout.tsx` (rewrite)

**Changes**
- Remove `Geist` / `Geist_Mono` imports.
- Import `Inter`, `Open_Sans` from `next/font/google`.
- Instantiate at module scope: `Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" })`, `Open_Sans({ subsets: ["latin"], variable: "--font-open-sans", display: "swap" })`.
- Apply both variable class names to `<html>` (keep `h-full antialiased`; keep `lang="en"`).
- Rewrite `export const metadata` to:
  ```ts
  {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
    title: { template: "%s | Sell Your House Free", default: "Sell Your House Free — Arizona" },
    description: "Sell your Arizona home for free — no agent, no listing fees.",
  }
  ```
  (Fallback keeps local dev working until the user adds `NEXT_PUBLIC_SITE_URL` to Vercel env and re-pulls.)
- Gate Analytics: `{process.env.NODE_ENV === "production" && <Analytics />}`.

**ACs covered**
- AC 1 (self-hosted fonts — by `next/font/google` usage)
- AC 2 (font roles — `--font-inter` + `--font-open-sans` on `<html>`, picked up by `@layer base` in file-group 1)
- AC 8 (prod-only Analytics)
- AC 9 (metadataBase + title template + brand default)

**Verification**
- `pnpm lint` clean
- Read through for: no lingering Geist refs, `--font-inter` + `--font-open-sans` both on `<html>`, `metadataBase` present, Analytics wrapped in prod check

**Commit message**
```
feat(layout): swap Geist for Inter + Open Sans, wire metadataBase, gate Analytics

- next/font/google self-hosts Inter (display) + Open Sans (body);
  no browser → Google request (no-third-party-PII posture).
- metadataBase reads NEXT_PUBLIC_SITE_URL directly; E1-S2 can
  refactor to SITE.url later.
- Title template "%s | Sell Your House Free" with brand-aligned default.
- Analytics only renders in production — NODE_ENV is statically
  replaced so DCE keeps @vercel/analytics out of dev bundle.

Refs ADO 7785 (E1-S1).
```

---

## File-group 3 — Home page shell (`page.tsx`)

**Files**
- `src/app/page.tsx` (rewrite)

**Changes**
- Remove `next/image` + Next.js logo + Vercel/Docs placeholder CTAs + dark-mode utility classes.
- Replace with a minimal shell: one H1, one paragraph, one `Link` to `/get-started` styled with brand tokens (`bg-brand text-brand-foreground rounded-lg`). No nav, no footer — those land in E1-S9. Final copy is E1-S11.
- Content acts as the AC-12 visual-parity surface (H1 + body + brand-filled button rectangle).

**Proposed body**
```tsx
import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 px-6 py-24 bg-surface-tint">
      <h1 className="text-[44px] leading-[50px] md:text-[80px] text-center max-w-[var(--container-prose)]">
        Sell your house, free.
      </h1>
      <p className="text-[18px] leading-[32px] md:text-[20px] text-ink-body text-center max-w-[var(--container-prose)]">
        Final hero copy lands in E1-S11. This shell exists so E1-S1 can verify
        brand tokens, fonts, and layout against the Figma reference.
      </p>
      <Link
        href="/get-started"
        className="inline-flex items-center justify-center rounded-lg bg-brand text-brand-foreground px-6 h-[52px] text-[18px] font-semibold"
      >
        Get started
      </Link>
    </main>
  );
}
```

**ACs covered**
- AC 11 (dev/prod clean — a page that compiles with zero warnings)
- AC 12 (visual-parity surface — provides something concrete to screenshot vs Figma)

**Verification**
- `pnpm lint` clean
- Manual: H1 renders in Inter Semibold `#17233d` at 44/80px; body in Open Sans `#212121`; button fills `#0653ab` with `8px` radius

**Commit message**
```
feat(home): trim page.tsx to minimal brand-tokened shell

Scaffold placeholder (Next.js logo + Vercel/Docs CTAs + dark-mode
classes) replaced with one H1 + paragraph + /get-started link
styled via brand tokens. Final hero copy is E1-S11; this shell
exists so E1-S1 has a concrete surface for the AC-12 visual-parity
screenshot and so dev builds cleanly on the new tokens.

Refs ADO 7785 (E1-S1).
```

---

## File-group 4 — Smoke check (no files)

**Env handling** (updated per user feedback 2026-04-20): env is managed via Vercel CLI (`vercel env pull` → `.vercel/.env.development.local`). No `.env.example` will be created. `NEXT_PUBLIC_SITE_URL` is not in the current pull, so file-group 2's layout code uses a `"http://localhost:3000"` fallback (`process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"`) so local dev doesn't crash before the user adds it via the Vercel env UI. Completion notes will flag the need to add `NEXT_PUBLIC_SITE_URL` to Vercel env before prod deploy.

**Smoke check** (run by agent; results captured in review-report.md)
- `pnpm lint` — zero errors/warnings
- `pnpm build` — must complete without font/CSS/metadata warnings (the fallback means the build succeeds without needing `NEXT_PUBLIC_SITE_URL` set).
- Manual checks deferred to PR review: `pnpm dev` network tab (AC 1), OS dark-mode toggle (AC 7), Figma vs rendered screenshot (AC 12).

**ACs covered (verification, not code)**
- AC 11 (dev + prod clean)
- AC 1 (confirmed no `fonts.googleapis.com` / `fonts.gstatic.com` requests — deferred to user PR review with screenshot, per AC 12 cadence)

No commit for this file-group — smoke check is execution-only.

---

## No EF migrations

This is a Next.js frontend-only story. No backend, no database, no EF context — no migration halt gate applies.

## Compaction gates

Between each file-group: re-read `index.md` + the next group's section of this plan; discard working context from the completed group. Files and commit history are the durable state.

## Out-of-scope reminders (explicit)

Per ADO out-of-scope list — do **not** create or touch these in this story:
- `robots.ts` / `sitemap.ts` / `manifest.ts` / `opengraph-image.tsx` / `icon.tsx` (E1-S3)
- `error.tsx` / `loading.tsx` / `not-found.tsx` (E1-S4)
- Route groups `(marketing)` / `(legal)` (E1-S5)
- UI primitives (E1-S6/S7/S8)
- `Header` / `Footer` components (E1-S9)
- `lib/site.ts` / `lib/seo.ts` / `lib/routes.ts` (E1-S2)
- CSP / security headers / Sentry (E8)
