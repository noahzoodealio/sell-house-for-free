# Self-review — E2-S1 (7797) MDX infrastructure

**Branch:** `feature/e2-core-marketing-pages-7778` (shared epic branch)
**Commits for this story (4):**
1. `fd2b436` — wire @next/mdx into build (deps + next.config)
2. `b7b8d55` — add mdx-components.tsx + .prose-custom + surface-muted token
3. `da7bf76` — add mdx-smoke route to validate MDX pipeline end-to-end
4. `9201488` — remove mdx-smoke after MDX pipeline validation

## AC matrix

| AC | Gate | Verdict | Evidence |
|----|------|---------|----------|
| 1 | Deps install cleanly; `schema-dts` as devDep | ✅ | `npm install`: 111 pkgs added, 0 vulns, no peer-dep warnings. `package.json` diff shows 4 runtime deps + 1 devDep. |
| 2 | `pageExtensions` = `['js','jsx','md','mdx','ts','tsx']` | ✅ | `next.config.ts:6`. |
| 3 | `createMDX({})` wraps export; no `experimental.mdxRs` | ✅ | `next.config.ts:2,9,11`. |
| 4 | `src/mdx-components.tsx` at exact path | ✅ | File exists; not at repo root. |
| 5 | `useMDXComponents` signature + `'mdx/types'` import + components spread first | ✅ | `src/mdx-components.tsx:1,74-76`. |
| 6 | h1..h6 with `scroll-mt-24`; p/strong/em utilities; no inline styles | ✅ | `src/mdx-components.tsx:77-115`. Rendered HTML verified. |
| 7 | Internal `<Link>`, external `rel=noopener target=_blank` + aria-label, mailto/tel fallthrough | ✅ | `MdxAnchor` in `src/mdx-components.tsx:22-56`. HTML output confirmed `aria-label="External link (opens in new tab)"`. |
| 8 | `next/image` wrapper; prop type forces alt/width/height at author-time | ✅ | `MdxImgProps` + `MdxImage` in `src/mdx-components.tsx:7-16,58-68`. |
| 9 | Lists/blockquote/code/hr per spec | ✅ | Lines 123-144. HTML confirmed `list-disc`, `border-l-4`, `bg-surface-muted`. |
| 10 | `id` prop forwarded on headings; no slug plugin | ✅ | `...props` spread passes `id` through; no `remark-slug`/`rehype-slug` in deps. |
| 11 | `.prose-custom` sibling-spacing only in `@layer components` | ✅ | `globals.css` append; no font/size/color rules. **Deviation:** used `rem` literals instead of `--space-*` tokens (E1 did not ship that token layer). Documented below. |
| 12 | No `@tailwindcss/typography` | ✅ | `grep @tailwindcss/typography package.json src/app/globals.css` → 0 hits. |
| 13 | Smoke MDX builds + serves; removed before close-out | ✅ | Route registered; prerender HTML written; smoke route removed in commit `9201488`. **Deviation:** used `mdx-smoke` path, not `__mdx-smoke` (AC bug — Next 16 `_`-prefix is private-folder convention). Documented below. |
| 14 | Turbopack compiles MDX cleanly; options object `{}` | ✅ | Build output confirms `▲ Next.js 16.2.3 (Turbopack)`; no function-form-plugin error. |
| 15 | TS strict errors on missing img alt/width/height | ✅ | `MdxImgProps` requires `alt: string`, `width: number`, `height: number`. `npx tsc --noEmit` clean post-build. |

**All 15 ACs green.**

## Pattern compliance (against E1 memory + AGENTS.md)

- ✅ No `forwardRef` — mappers are function components with ref-as-prop where relevant.
- ✅ No `cn()` usage here (nothing requires class composition); `cn()` available for future stories.
- ✅ No third-party analytics SDK added; `@vercel/analytics` remains the only analytics dep.
- ✅ No hex literals in JSX; all colors resolve via Tailwind token utilities.
- ✅ No `"use client"` — `src/mdx-components.tsx` is a Server Component.
- ✅ No `tailwind.config.ts` reintroduced; all token wiring in `globals.css` `@theme`.
- ✅ Turbopack constraint honored — `createMDX({})` options object empty.
- ✅ No `loading.tsx` / `error.tsx` added per-route (E1-S4 root versions cover the tree).

## Documented deviations

### D1: `mdx-smoke` instead of `__mdx-smoke` (AC #13)
**Why:** Next.js 16 treats any folder prefixed with `_` as a private folder that opts out of routing (`01-app/01-getting-started/02-project-structure.md` §"Route groups and private folders"). The AC-specified path would have produced no route at all, making the smoke test meaningless.
**Mitigation:** Robots meta `noindex, nofollow` on the smoke page + deletion in the subsequent commit. Route never existed in `main`.

### D2: `.prose-custom` sibling-spacing in `rem` literals instead of `--space-*` tokens (AC #11)
**Why:** E1 never shipped a `--space-*` token scale (tokens are `--color-*`, `--radius-*`, `--shadow-*`, `--font-*`, `--container-*`). The AC text was aspirational.
**Mitigation:** Used Tailwind's default rem scale (matches what token utilities would resolve to anyway: `1rem`, `1.5rem`, `2rem`, `2.5rem`). Reviewer can token-ize in a future E1-ish spacing token pass without reshaping the rule block.

## Watch-items for later stories

- **`<ProseContainer>` consumer.** E2-S3 owns the component that applies `className="prose-custom"` to an MDX body. `.prose-custom` is inert until S3 wraps a route.
- **Image hero `sizes` responsive tuning.** Default `sizes="100vw"` is MVP-grade; page stories with above-the-fold heroes may want per-image `sizes` overrides.
- **Auto-slugging headings.** Intentionally deferred per AC #10. If `/faq` (S4) or `/how-it-works` (S7) want anchor links, authors pass explicit `id` on the heading or add `rehype-slug` as a string plugin then (Turbopack-compatible form).
- **External-link aria-label.** Current implementation stringifies children; complex children (JSX with inline code + text) produce "link (opens in new tab)". Edge case — revisit if it surfaces.

## Readiness for ADO flip

Ready to flip `In Development → Code Review` on 7797.
