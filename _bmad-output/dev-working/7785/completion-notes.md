# Completion Notes — Story 7785 (E1-S1 Global scaffolding)

**ADO state:** `New` → `Code Review` (2026-04-20)
**ADO comment:** posted (id 5531788) summarizing commits + ACs + deferred manual checks
**Branch:** `feature/e1-s1-global-scaffolding-7785` (local only — not pushed)
**Base:** `main @ ea10e79`

## Commits on branch (4)

| SHA | Scope | Summary |
|---|---|---|
| `0211365` | `src/app/globals.css` | Replace scaffold `@theme inline` with brand `@theme` + `@layer base`; drop dark-mode, `:root` bg/fg, Arial body |
| `5549865` | `src/app/layout.tsx` | Geist → Inter + Open Sans; `metadataBase` + title template + brand default; prod-gated `<Analytics />` |
| `8267062` | `src/app/page.tsx` | Trim scaffold placeholder to H1 + body + `/get-started` brand link (AC-12 parity surface) |
| `685c2dd` | `src/app/globals.css` | `@source not` exclusions for `_bmad` + `_bmad-output` to stop Tailwind v4 from scanning sidecar markdown |

## User action items (before merge)

1. **Push + open PR.**
   ```bash
   git push -u origin feature/e1-s1-global-scaffolding-7785
   gh pr create --title "E1-S1: Global scaffolding — layout, fonts, theme tokens" --body ...
   ```
   PR description should link back to ADO 7785 and attach the Figma-parity screenshot (AC 12).

2. **Runtime ACs to verify in browser (AC 1, 3, 7, 12).**
   - `pnpm dev`, open `/`, open DevTools Network tab — confirm zero requests to `fonts.googleapis.com` / `fonts.gstatic.com` (AC 1).
   - Inspect `/get-started` button computed styles — `color #fdfdfd`, `bg #0653ab`, `border-radius 8px`. Inspect `<main>` — `bg #fafafa` (AC 3).
   - Toggle OS to dark mode, reload — confirm body stays `#ffffff / #212121` (AC 7).
   - Side-by-side screenshot vs Figma `vjeoDtWUcnEtJdmZ0b7Okh` node `877:787` for PR body (AC 12).

3. **Add `NEXT_PUBLIC_SITE_URL` to Vercel env** (prod + preview) before first deploy — production value should be the live origin (e.g., `https://sellyourhousefree.com`). Then `vercel env pull` locally to refresh `.vercel/.env.development.local`. Local dev currently works via the `"http://localhost:3000"` fallback in `layout.tsx`.

## Follow-up items surfaced (non-blocking)

- **E1-S2 pickup:** when `lib/site.ts` lands, refactor `metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000")` → `metadataBase: new URL(SITE.url)`. Flagged in ADO comment + code.
- **E1-S3 blocker cleared:** `metadataBase` is now set, so relative URLs in `opengraph-image.tsx` / `sitemap.ts` will compose correctly when that story starts.
- **Tailwind v4 source-scan hygiene:** `@source not` directives are now present for `_bmad` + `_bmad-output`. If new top-level sidecar directories are added (e.g., `_docs-drafts`), extend the exclusion list.

## Not done (deliberate)

- **No push.** User handles push + PR per project convention (code on GitHub, PM on ADO — no auto-integration).
- **No `zoo-core-code-review` invocation.** The story is a root-shell rewrite against a documented architecture spec, not a complex cross-service change. Pattern compliance was self-verified inline (semantic tokens, Tailwind v4 `@theme`, `next/font/google` variable usage, prod-only Analytics). If the user wants an independent pattern review, `/zoo-core-code-review` can run against the branch post-push.
- **No unit tests added.** Story is a configuration-level rewrite with no function logic to test. E1-S6/S7/S8 (UI primitives) are where unit tests start landing; `/zoo-core-unit-testing` applies there.
- **No ADO state beyond `Code Review`.** The custom state workflow has intermediate steps (`Ready For Testing` after merge, plus closing states) — developer moves the card through manually after PR merge.

## Sidecar artifact inventory (`_bmad-output/dev-working/7785/`)

- `work-item.md` — ADO 7785 pulled + parsed
- `research.md` — Next.js 16 / Tailwind v4 convention verification
- `workspace-config.md` — repo + branch resolution
- `implementation-plan.md` — 4 file-groups with locked decisions
- `review-report.md` — AC-by-AC verdicts
- `completion-notes.md` — this file
- `index.md` — sidecar YAML for resume/compaction
