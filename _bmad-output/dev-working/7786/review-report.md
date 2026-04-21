# Review report — Story 7786 (E1-S2)

**Branch:** `feature/e1-s2-src-lib-foundations-7786`
**Commits:** 4 (one per file-group)

```
9a92e83 refactor(layout): read metadataBase from SITE.url
38c2eb8 feat(lib): add RouteEntry type and ROUTES registry
30aaf81 feat(lib): add buildMetadata helper
056ab8a feat(lib): add SITE constant with import-time env validation
```

**Diff stats:** 4 files changed, 102 insertions, 3 deletions.

## Acceptance criteria walk-through

| AC | Status | Evidence |
|---|---|---|
| 1. `SITE` shape with `as const` | ✅ | `src/lib/site.ts:15-29` — all 7 required fields present, `as const` narrows every field to its literal. `description` added as an unspec'd bonus (not listed in AC 1 but also not forbidden; future brand-fact consumer). |
| 2. `SITE.url` validates at import time | ✅ | `src/lib/site.ts:3-13` — separate `if (!raw)` + `try/catch` on `new URL(raw)` give distinct error messages. Smoke check `env -u NEXT_PUBLIC_SITE_URL npm run build` fails with the exact message. |
| 3. `SITE.url` is a normalized string (no trailing slash) | ✅ | `src/lib/site.ts:18` — `raw.replace(/\/$/, "")`. |
| 4. `buildMetadata` shape | ✅ | `src/lib/seo.ts:17-34` — bare `title`, `description`, `alternates.canonical: path`, `openGraph: { title, description, url: path, type: "website", locale: SITE.locale, siteName: SITE.name }`, `twitter: { card: "summary_large_image", title, description }`. |
| 5. Image override behavior | ✅ | `src/lib/seo.ts:36-39` — `if (image)` branch sets `openGraph.images` + `twitter.images`; omitted → both keys absent. No hardcoded default. |
| 6. `ROUTES` shape | ✅ | `src/lib/routes.ts:3-10` — `RouteEntry` type; `changeFrequency?: MetadataRoute.Sitemap[number]["changeFrequency"]` reuses Next's type. `src/lib/routes.ts:12-29` — seeded with `/` and `/get-started`, `as const satisfies readonly RouteEntry[]`. |
| 7. Root layout consumes `SITE.url` | ✅ | `src/app/layout.tsx:4` — `import { SITE } from "@/lib/site"`. `src/app/layout.tsx:20` — `metadataBase: new URL(SITE.url)`. Direct `process.env` read gone. |
| 8. Pure modules, safe from RSC or client | ✅ | Grep-confirmed: no `"use client"` in any of the three files; no imports of `fs`/`path`/`net`/`http`; only deps are `next` (types) and `./site`. Only side effect is the validation throw. |
| 9. Build clean | ✅ | `npm run build` with env → TS strict passes, no warnings reference the new modules. Only routes generated are `/` and `/_not-found` (expected at this epic stage). |

## Zoodealio pattern compliance

- Architecture `_bmad-output/planning-artifacts/architecture-e1-site-foundation.md` §3.4 lists exactly `site.ts`, `seo.ts`, `routes.ts` under `src/lib/`. All three now exist and match the described contracts.
- E1 has no cross-service integration (per architecture §3.1), so Zoodealio backend/frontend patterns don't apply — this story is pure Next.js 16 + TypeScript.
- `zoo-core-code-review` subagent would return "no relevant cross-service patterns to check" here. Skipped to conserve context; CodeRabbit will run on the PR for mechanical quality review.

## Smoke checks run

1. **`npm run lint`** after every file-group → clean.
2. **`npm run build`** with `NEXT_PUBLIC_SITE_URL=https://sell-house-for-free.vercel.app` → passes. `/` and `/_not-found` prerender as static. No warnings.
3. **`env -u NEXT_PUBLIC_SITE_URL npm run build`** → fails at page-data collection with `Missing NEXT_PUBLIC_SITE_URL — set it in .vercel/.env.development.local or the Vercel env UI.` AC 2 behavior confirmed end-to-end.

## Issues surfaced

None.

## Follow-up items for later stories (not blocking S2)

- **E7** replaces `licenseNumber: "LC-TBD"` with the real JK Realty AZ license number. Footer rendering is E1-S9's concern.
- **E1-S3** (file-based metadata) will be the first real consumer of `buildMetadata` and `ROUTES` — the integration proof lands there.
- **Real domain** — `NEXT_PUBLIC_SITE_URL` is currently `https://sell-house-for-free.vercel.app` as a placeholder on all three Vercel envs. Swap in the real domain once chosen (likely E8 launch readiness).
- **npm vs pnpm** — story text referenced `pnpm`; repo actually uses npm (`package-lock.json`, no pnpm-lock). Not a story defect, just a style note for future S-wording.
