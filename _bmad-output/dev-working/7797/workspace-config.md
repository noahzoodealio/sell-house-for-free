# Workspace config — 7797

- **Repo root:** `C:\Users\Noah\sell-house-for-free`
- **Package manager:** npm (`package-lock.json`). Story says `pnpm`; we use `npm install` / `npm run build`. Semantics of AC #1 (lockfile update, no peer-dep warnings) apply regardless.
- **Base branch:** `main` (E1 fully merged).
- **Working branch:** `feature/e2-core-marketing-pages-7778` (shared single epic branch per user directive). Already checked out. No new branch for this story.
- **Commit prefix:** `e2-s1(7797): …` for traceability inside the shared branch.
- **PR strategy:** Deferred — opened once at S11 epic close-out covering all 11 stories.
- **Next.js:** 16.2.3, React 19.2.4, Tailwind 4, TypeScript strict, Turbopack default.
- **Out-of-scope files (do not touch):** `src/app/layout.tsx` (unchanged), anything under `src/components/*` (S2/S3), any route outside the temporary smoke page.
