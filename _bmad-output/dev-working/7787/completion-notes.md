# Completion notes — Story 7787 (E1-S3)

## Outcome

Shipped. 5 new files, 5 commits, 1 PR. All 12 code-verifiable ACs pass; AC 13 is a user-side Figma side-by-side review (PNGs attached).

## Deliverables

- Branch: `feature/e1-s3-file-based-metadata-7787`
- PR: https://github.com/noahzoodealio/sell-house-for-free/pull/3
- Artifacts for AC 13 review: `_bmad-output/dev-working/7787/artifacts/{opengraph-image.png, icon.png}`
- Commits:
  1. `67482ca` — `src/app/robots.ts`
  2. `7d64fa7` — `src/app/sitemap.ts`
  3. `2c0d533` — `src/app/manifest.ts`
  4. `e480441` — `src/app/icon.tsx`
  5. `f0cb384` — `src/app/opengraph-image.tsx`

## ADO state update — action required by user

**The Azure DevOps MCP server disconnected mid-session** (dropped all `mcp__azure-devops__*` tools after the preview-env build test). I was unable to:

- Transition work item 7787 from `New` → `In Development` → `Code Review`
- Link PR #3 to work item 7787
- Post a close-out comment summarizing the implementation

Please do these manually, or re-auth ADO MCP and I can run them in a follow-up session. The ADO item is at: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7787

Suggested ADO state: `Code Review` (matches E1-S2's close-out state per user memory on custom ADO workflow).

Suggested ADO comment body:

```
PR #3 opened: https://github.com/noahzoodealio/sell-house-for-free/pull/3

5 commits, 5 new files in src/app/ (robots.ts, sitemap.ts, manifest.ts,
icon.tsx, opengraph-image.tsx). All 12 code-verifiable ACs pass;
AC 13 visual parity is a reviewer task with PNGs attached in the PR.

Key risk (AC 2/3) mitigated: rebuilt with VERCEL_ENV=preview and
confirmed /robots.txt flips to Disallow. Preview deploys on Vercel
will inherit this gate automatically.
```

## Surprises / follow-up items

1. **Vercel preview URL flips correctly on the built output.** Because robots.ts is a statically-cached route handler, the `VERCEL_ENV` check evaluates at build time. Vercel preview builds run with `VERCEL_ENV=preview` → `Disallow: /` baked into the preview-deploy static asset. Production builds run with `VERCEL_ENV=production` → `Allow: /`. The `!VERCEL_ENV && NODE_ENV === 'production'` fallback matters for self-hosted / non-Vercel production runtimes. No action required — this is the intended behavior documented in the story's tech notes.

2. **Build-time env requirement.** `next build` will fail if `NEXT_PUBLIC_SITE_URL` is not in the shell env at build time (SITE module throws per E1-S1/S2). Local devs running `npm run build` need to source `.vercel/.env.development.local` first:

   ```bash
   set -a && . .vercel/.env.development.local && set +a
   npm run build
   ```

   Vercel's own builds read env vars from the project settings, so no action needed for deployment pipelines. Could add a `predev` / `prebuild` npm script or a dotenv loader to streamline local builds — **out of scope for this story**; flag for future E1 polish or E8 pre-launch work.

3. **`favicon.ico` emits with `sizes="256x256"` not `sizes="any"`.** The Next 16 docs example shows `sizes="any"` for the scaffold favicon, but at runtime Next inspected our 256×256 `favicon.ico` and emitted `sizes="256x256"`. Still passes AC 10 spirit (the manifest references `sizes: "any"` for the PWA-install path, and the `<link>` tag uses whatever Next detected). If reviewers flag this, we can swap the scaffold `favicon.ico` for a multi-res .ico in E1-S-later or drop the `manifest.ts` favicon entry's `sizes: "any"` to match. No blocker.

4. **Satori system-sans fallback.** The OG wordmark renders in Satori's default sans (close to Inter Semibold at a glance). If AC 13 visual parity fails, switch to the `readFile(join(process.cwd(), 'assets/Inter-SemiBold.ttf'))` pattern documented in `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/01-metadata/opengraph-image.md`. Would require bundling the TTF under `assets/` — a 40–80KB addition. Only act on this if review feedback demands stricter parity.

5. **`_bmad-output/dev-working/7787/artifacts/` is currently gitignored** via the `_bmad-output/dev-working/` rule. The PNG links in the PR body reference the raw file path on the feature branch, so the images won't render inline in the PR until either (a) the artifact dir is un-gitignored or (b) the user re-uploads the PNGs through the GitHub PR web UI as attachments. Cheapest fix for review: drag-drop the two PNGs into the PR description. Flagged — doesn't change the implementation.

## Pre-existing dirty state (not touched by this story)

These were dirty on `main` when the branch cut — not story-7787 work:

- `M .claude/settings.local.json`
- `M .gitignore`

Leaving for the user to handle separately; they carry across stories per the sidecar convention.

## Memory candidates

Worth saving to memory for future work:
- Build-time env gotcha (`NEXT_PUBLIC_SITE_URL` must be sourced for local `npm run build`) — this will bite on every future `src/lib/site`-consuming story. Candidate feedback memory.

## Next story

E1-S4 per epic backlog — queue in ADO. Epic 7777 has 11 stories total; 3 of 11 done.

---

## Reconciliation addendum — 2026-04-20 under /zoo-core-dev-epic

Autopilot run re-entered 7787 from `/zoo-core-dev-epic` on Feature 7777 and found:

**Verification re-run:**
- `npm run build` (default env) — clean, all 5 routes prerendered static, TS strict passes.
- Smoke: `/robots.txt` → `Allow: /` (prod fallback path on current env); `/sitemap.xml` → both routes with shared `BUILT_AT`; `/manifest.webmanifest` → exact shape; `/opengraph-image` + `/icon` → 200 `image/png` with `x-nextjs-cache: HIT` (AC 11 ✓).
- `<head>` on `/` — manifest link, two `<link rel="icon">` entries (favicon.ico @ 256x256 scaffold-detected + `/icon` @ 32x32), full `og:image*` suite + `twitter:image` reusing OG card. AC 10 ✓.
- `VERCEL_ENV=preview npm run build` → prerendered `/robots.txt` flips to `Disallow: /` (verified via `.next/server/app/robots.txt.body`). AC 2/3 re-verified ✓.
- OG + icon PNGs re-captured at `_bmad-output/dev-working/7787/{opengraph-image.png, icon.png}` for AC 13 visual parity.

**Follow-up item #2 (env sourcing) is resolved** per user memory `feedback_build_env_sourcing.md` — `npm run dev` / `npm run build` now auto-load root `.env.local` after `vercel env pull`. No workaround needed.

**ADO state flip still pending.** ADO MCP disconnected again during this run (system notification dropped all `mcp__azure-devops__*` tools after the preview-env build). Flip to `Code Review` needs to happen either on MCP reconnect or manually.

