# Research — E1-S4 (7788)

## Next.js 16.2.3 docs — authoritative findings

Read per AGENTS.md — training data is NOT trustworthy on these APIs.

### `error.md` (v16.2.0 API)

**Props (line 27–31 of docs):**
```ts
{ error: Error & { digest?: string }, unstable_retry: () => void }
```

**Canonical example (docs lines 123–140):**
```tsx
'use client'

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  return (
    <div>
      <h2>Something went wrong!</h2>
      <button onClick={() => unstable_retry()}>Try again</button>
    </div>
  )
}
```

**Key confirmations:**
- `'use client'` required — error boundaries MUST be Client Components.
- `unstable_retry` is the recommended API (line 118–121): "An error component can use the `unstable_retry()` function to prompt the user to attempt to recover from the error. When executed, the function will try to re-fetch and re-render the error boundary's children."
- `reset` still exists but the docs explicitly say (line 156–157): "In most cases, you should use `unstable_retry()` instead."
- `error.message` leak caveat (line 106): dev serializes original message, **production does not**, so printing `error.message` gives worse UX than clean copy — AC 4 is correct.
- `error.digest` is a server-side correlation hash — OK to show in a muted "Ref:" line.
- `error.tsx` does NOT wrap the `layout.js` in the same segment (line 96) — root-layout errors bypass it. `global-error.tsx` is the E8 home.
- Version history confirms: `v16.2.0 — unstable_retry prop added.`

### `loading.md`

**Canonical example (lines 18–23):**
```tsx
export default function Loading() {
  return <p>Loading...</p>
}
```

**Key confirmations:**
- Server Component by default (line 34). No `'use client'`.
- Accepts NO parameters (line 40).
- Fallback is **prefetched on `<Link>` hover** (line 46) — keep it tiny.
- Streaming on `<Suspense>` boundary produces 200 status even for 404 responses, but Next auto-injects `<meta name="robots" content="noindex">` in the streamed HTML (line 109). **Do not paper over — framework behavior.**
- Wraps `not-found.js`, `page.js`, and nested `layout.js` in `<Suspense>`. Does NOT wrap `layout.js`, `template.js`, or `error.js` in the same segment (line 88).

### `not-found.md`

**Canonical example (lines 15–27):**
```tsx
import Link from 'next/link'

export default function NotFound() {
  return (
    <div>
      <h2>Not Found</h2>
      <p>Could not find requested resource</p>
      <Link href="/">Return Home</Link>
    </div>
  )
}
```

**Key confirmations:**
- Server Component by default. No props (line 129).
- Root `app/not-found.js` handles BOTH `notFound()` calls AND unmatched URLs for the whole app (line 131 — "Good to know: … also handle any unmatched URLs for your whole application").
- Next auto-injects `<meta name="robots" content="noindex">` for 404 responses (line 185).
- Non-streamed → status 404; streamed → 200 (the `<Suspense>` that renders `loading.tsx` streams first, sending headers). Both cases ship noindex meta.
- `global-not-found.js` requires `experimental.globalNotFound` + must redefine `<html>`/`<body>` + must re-import global CSS + fonts. **NOT the right choice for this single-root-layout site** — confirmed out-of-scope.
- `metadata` export works on `not-found.tsx` (it's a Server Component). Cheap tab-title win.

## S1 token inventory (`src/app/globals.css`)

Tailwind v4 `@theme` block defines these utilities (via `@color-*` / `@font-*` / etc.):

| Token | Value | Utility |
|---|---|---|
| `--color-brand` | `#0653ab` | `bg-brand`, `text-brand`, `outline-brand`, `border-brand` |
| `--color-brand-foreground` | `#fdfdfd` | `text-brand-foreground` |
| `--color-ink-title` | `#17233d` | `text-ink-title` |
| `--color-ink-body` | `#212121` | `text-ink-body` |
| `--color-ink-muted` | `#9e9e9e` | `text-ink-muted` |
| `--color-ink-disabled` | `#bdbdbd` | `text-ink-disabled` |
| `--color-surface` | `#ffffff` | `bg-surface` |
| `--color-surface-tint` | `#fafafa` | `bg-surface-tint` |
| `--radius-lg` | `8px` | `rounded-lg` |
| `--container-prose` | `65ch` | `max-w-prose` (or explicit var) |

All three target files render in the DOM (unlike S3 ImageResponse) — these utilities cascade normally.

Base styles (globals.css lines 45–61):
- `html` → `font-family: var(--font-sans)`, `color: var(--color-ink-body)`
- `h1`–`h6` → `font-family: var(--font-display)`, `color: var(--color-ink-title)`, `font-weight: 600`

So `text-ink-title` on an `<h1>` is redundant but harmless; the AC asks for it explicitly for pattern parity.

## Root-layout contract (`src/app/layout.tsx`)

What it provides to all three new files automatically:
- `<html>` with `inter.variable` + `openSans.variable` + `h-full antialiased`
- `<body>` with `min-h-full flex flex-col`
- `metadataBase` = `new URL(SITE.url)`
- Title template: `"%s | Sell Your House Free"`, default `"Sell Your House Free — Arizona"`
- `<Analytics />` gated on `NODE_ENV === "production"`

Implications for S4:
- None of the three files may redefine `<html>` or `<body>` (AC 11) — would break font + Analytics + metadataBase cascade.
- Tab titles: `not-found.tsx` gets `metadata: { title: "Not found" }` → rendered as `"Not found | Sell Your House Free"` via the template. Confirmed.
- `<body>` already has `flex flex-col min-h-full`, so a direct child `<main className="flex-1 ...">` gets vertical centering via flex semantics.

## Existing-UI pattern from `src/app/page.tsx`

Reference for primary-CTA styling in absence of S6 `<Button>` primitive:
```tsx
<Link
  href="/get-started"
  className="inline-flex h-[52px] items-center justify-center rounded-lg bg-brand px-6 text-[18px] font-semibold text-brand-foreground"
>
  Get started
</Link>
```

Observations:
- 52px height ✓ (AC 5 says 48–52px)
- `rounded-lg` = 8px ✓
- `bg-brand` + `text-brand-foreground` ✓
- No `focus-visible:` classes — page.tsx predates the S4 focus AC. **Not a pattern to copy wholesale.** S4 adds `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand` per AC 12.
- Font-size `text-[18px]` font-weight `font-semibold` — apply consistently.

## Package + tooling

- Package manager: **npm** (there's a `package-lock.json`, no pnpm lock). Story says `pnpm build` / `pnpm start` — we run `npm run build` / `npm run start`. Note for AC 13.
- Next 16.2.3, React 19.2.4, Tailwind v4, TypeScript strict.
- ESLint: `eslint-config-next` + `eslint-config-next/typescript`. The `no-unused-vars` rule applies to `error` prop — we must reference it (AC 3 + AC 4's `Ref:` optional digest both use it).
- Build env note from memory: `npm run build` needs `set -a && . .vercel/.env.development.local && set +a` first (SITE throws at import if `NEXT_PUBLIC_SITE_URL` missing). Not triggered by these three files directly but will be hit by the smoke test.

## Risks + mitigations

1. **`unstable_retry` vs `reset`** — pinned in AC 2; research confirms `unstable_retry` is current. Write it first, read back once to verify.
2. **Streaming 404 returns 200** — AC 10 explicitly accepts this. Do not attempt a workaround.
3. **`<body>` already `flex flex-col`** — wrapping content in `<main className="flex-1">` gives proper vertical centering; don't re-set `<html>` or `<body>`.
4. **Focus rings on `<Link>`** — `focus-visible:` works on anchor tags. Tailwind v4 `outline-brand` = `outline: 2px solid var(--color-brand)` when paired with `outline-2`.
5. **Token-utility spelling** — `text-ink-title` (not `text-title`), `bg-brand` (not `bg-primary`). Verified against globals.css inventory above.
6. **Smoke test for error boundary** — triggering an error in a disposable throw route is the cleanest path. React DevTools toggle is optional. Must delete the test route before merge.
