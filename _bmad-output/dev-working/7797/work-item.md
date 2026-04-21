# Work Item 7797 — E2-S1 MDX infrastructure

**Type:** User Story · **State:** `In Development` (flipped from `New` at autopilot start, 2026-04-20) · **Parent:** Feature 7778 (E2 Core Marketing Pages + Trust Surface)

## Scope (4 files)

- `package.json` — add 4 runtime deps (`@next/mdx`, `@mdx-js/loader`, `@mdx-js/react`, `@types/mdx`) + 1 devDep (`schema-dts`). Run install.
- `next.config.ts` — add `pageExtensions: ['js','jsx','md','mdx','ts','tsx']`, wrap default export in `createMDX({})`. Current file is an empty stub (`const nextConfig: NextConfig = {}`), so "preserve E1's experimental/images blocks byte-for-byte" is a no-op — there's nothing to preserve. Intentionally leave options object empty per Turbopack string-plugin constraint.
- `src/mdx-components.tsx` — exact path per Next.js file convention. Export `useMDXComponents(components): MDXComponents` spreading `components` first then applying overrides for `h1..h6`, `p`, `ul`, `ol`, `li`, `a`, `img`, `blockquote`, `code`, `pre`, `hr`, `strong`, `em`.
- `src/app/globals.css` — append `@layer components { .prose-custom { … } }` with sibling-spacing rules. Also add missing `--color-surface-muted` token to `@theme` (referenced by AC #9 mapper for `bg-surface-muted`).

## 14 acceptance criteria (condensed)

1. Deps install cleanly; `schema-dts` under `devDependencies`.
2. `pageExtensions` exactly `['js','jsx','md','mdx','ts','tsx']` in that order.
3. `createMDX({})` wraps default export; no `experimental.mdxRs`.
4. `src/mdx-components.tsx` at exact path (under `src/`, not repo root).
5. `useMDXComponents(components: MDXComponents): MDXComponents` — `components` spread first, `MDXComponents` from `'mdx/types'`.
6. Typography: h1..h6 → Inter semibold + `scroll-mt-24`; p → Open Sans at body scale; strong → `font-semibold`; em → `italic`. Utilities only, no inline styles.
7. Links: internal (`/…`) → `next/link <Link>`; external (`https?://`) → `<a rel="noopener noreferrer" target="_blank">` + "(opens in new tab)" aria-label suffix; `mailto:`/`tel:` → plain `<a>`.
8. Images: `next/image <Image>`; mapper prop type requires `alt`+`width`+`height` (missing → TS error). Default `sizes="100vw"`.
9. Lists/blockquote/code/hr mapping per AC text.
10. Heading-anchor `id` prop forwarded; no slug plugin shipped.
11. `.prose-custom` = sibling-spacing only in `--space-*` tokens; no font/size/color. ~30 lines.
12. No `@tailwindcss/typography` import or `@plugin` directive.
13. Smoke `page.mdx` under `src/app/(marketing)/__mdx-smoke/` builds + serves; **deleted before close-out**.
14. Turbopack `npm run dev` HMRs cleanly; options object stays `{}`.
15. (Numbered 14 in ADO but is "Type safety") `@types/mdx` resolves `MDXComponents`; TS strict errors on img missing `alt`/`width`/`height`.

## Watch-items

- Repo uses **npm** (package-lock.json). Story says `pnpm` — use `npm install` / `npm run build|dev|start`.
- `next.config.ts` is currently a stub; nothing to preserve. AC #3's "byte-for-byte preserve" collapses to "only add the two MDX-related bits."
- Token `--color-surface-muted` not yet present; must be added in Group B to satisfy AC #9 mapper for inline `code`/block `pre`.
- Token `--color-border` already present → `border-border` works. `--color-brand` present → `border-brand` works.
- Smoke route directory name `__mdx-smoke` has leading underscores; Next treats this as a regular segment (no `_` prefix rule in App Router). `(marketing)` route group does not affect URL. Final URL: `/__mdx-smoke`.
- `@source not "../../_bmad"` already present in `globals.css`; no need to add exclusions.
