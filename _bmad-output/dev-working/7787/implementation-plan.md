# Implementation plan — Story 7787 (E1-S3)

Five new files in `src/app/`. Grouped into **four file-groups**, each a single-file commit with a focused scope. `/opengraph-image` and `/icon` kept separate because they ship independently verifiable visual artifacts and the AC 13 parity check evaluates each separately.

Order is deliberate: robots first (largest correctness risk), then sitemap (reads ROUTES), manifest (cross-refs icon path), icon + OG last (visual parity work).

## File-group 1 — `src/app/robots.ts`

**Scope:** env-aware robots.txt generator with `VERCEL_ENV` gate + absolute sitemap URL.

**ACs covered:** 1, 2, 3, 11 (partial), 12 (partial).

**Sketch:**

```ts
import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  const isProd =
    process.env.VERCEL_ENV === "production" ||
    (!process.env.VERCEL_ENV && process.env.NODE_ENV === "production");

  return {
    rules: isProd
      ? { userAgent: "*", allow: "/" }
      : { userAgent: "*", disallow: "/" },
    sitemap: `${SITE.url}/sitemap.xml`,
  };
}
```

**Verification:**
- `npm run lint` clean.
- Manual env-flip: `npm run build && npm run start`, curl `/robots.txt` under default env → `Disallow: /`; re-launch with `$env:VERCEL_ENV='production'` → `Allow: /`.
- AC 3 verified by code inspection: `VERCEL_ENV` check is first; `NODE_ENV` only matters when `VERCEL_ENV` is undefined.

**Commit:** `feat(app): add env-aware robots.ts with production indexing gate`

## File-group 2 — `src/app/sitemap.ts`

**Scope:** static sitemap generator reading `ROUTES` + `SITE`. Module-scope `BUILT_AT`.

**ACs covered:** 4, 5, 11 (partial), 12 (partial).

**Sketch:**

```ts
import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";
import { ROUTES } from "@/lib/routes";

const BUILT_AT = new Date();

export default function sitemap(): MetadataRoute.Sitemap {
  return ROUTES.filter((r) => r.showInSitemap).map((r) => ({
    url: `${SITE.url}${r.path}`,
    lastModified: BUILT_AT,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));
}
```

**Verification:**
- Type check: `MetadataRoute.Sitemap`'s `changeFrequency` enum matches `RouteEntry.changeFrequency` (already constrained via `MetadataRoute.Sitemap[number]["changeFrequency"]` in `routes.ts`).
- Runtime curl `/sitemap.xml` → `<loc>https://.../</loc>` + `<loc>https://.../get-started</loc>`; entries reflect `changeFrequency` + `priority` from routes; `lastModified` identical across entries within a single deploy.
- Static-cache confirmation: no async, no Request-time API, no dynamic config.

**Commit:** `feat(app): add sitemap.ts reading ROUTES registry`

## File-group 3 — `src/app/manifest.ts`

**Scope:** PWA manifest with brand theme + icon refs.

**ACs covered:** 6, 10 (partial), 11 (partial), 12 (partial).

**Sketch:**

```ts
import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE.name,
    short_name: SITE.shortName,
    description: SITE.description,
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0653ab",
    icons: [
      { src: "/favicon.ico", sizes: "any", type: "image/x-icon" },
      { src: "/icon", sizes: "32x32", type: "image/png" },
    ],
  };
}
```

**Verification:**
- Curl `/manifest.webmanifest` → JSON matches shape. `SITE.shortName` is `"SYHF"`, `SITE.name` is `"Sell Your House Free"`, `SITE.description` is set per S2.
- `<head>` check: `<link rel="manifest" href="/manifest.webmanifest">` present on `/`.

**Commit:** `feat(app): add PWA manifest with brand theme and icon references`

## File-group 4 — `src/app/icon.tsx` + `src/app/opengraph-image.tsx`

**Scope:** both ImageResponse route handlers. Kept together because they share the `next/og` import, the brand-hex constants, and a single lint/build pass verifies both. Separate commits within the group keep the history clean for the AC 13 side-by-side review.

**ACs covered:** 7, 8, 9, 10 (full), 11 (full), 12 (full), 13.

### `icon.tsx` sketch:

```tsx
import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0653ab",
          color: "#ffffff",
          fontSize: 24,
          fontWeight: 700,
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
        }}
      >
        S
      </div>
    ),
    { ...size },
  );
}
```

### `opengraph-image.tsx` sketch:

```tsx
import { ImageResponse } from "next/og";

export const alt =
  "Sell Your House Free — keep 100% of your sale proceeds";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#0653ab",
          color: "#ffffff",
          padding: "80px",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
        }}
      >
        <div
          style={{
            fontSize: 88,
            fontWeight: 700,
            lineHeight: 1.1,
            letterSpacing: "-0.02em",
            textAlign: "center",
          }}
        >
          Sell Your House Free
        </div>
        <div
          style={{
            marginTop: 32,
            fontSize: 32,
            fontWeight: 500,
            opacity: 0.9,
            textAlign: "center",
          }}
        >
          Keep 100% of your sale proceeds — Arizona
        </div>
      </div>
    ),
    { ...size },
  );
}
```

**Design choices flagged for review:**
- Icon glyph = single "S" (not "SYHF" — `shortName`). Four letters at 32×32 is illegible. AC 9 says "single glyph filling most of the tile" — "S" is the obvious pick.
- OG headline = 88px (AC 8 requires ≥80px). Inter isn't loaded; Satori falls back to system bold — visually close.
- Subtitle "Keep 100% of your sale proceeds — Arizona" reinforces the alt text narrative + locale marker. Optional — if you'd rather keep the card minimal (wordmark-only), I can strip it before commit.
- No logo mark, no gradient, no illustrations. V1 per story scope; V2 can iterate against Figma parity.

**Verification:**
- Curl `/icon` → 32×32 PNG, `Content-Type: image/png`.
- Curl `/opengraph-image` → 1200×630 PNG, < 8 MB.
- `<head>` on `/`: `<link rel="icon" href="/icon?…" type="image/png" sizes="32x32">`, `<link rel="icon" href="/favicon.ico" sizes="any">`, `<meta property="og:image" …>` with absolute URL, `og:image:width=1200`, `og:image:height=630`, `og:image:alt=…`, `og:image:type=image/png`, plus `twitter:image` reusing OG (no `twitter-image.tsx` authored).
- Save screenshots of `/opengraph-image` and `/icon` for PR AC 13 attachment.

**Commits (two):**
1. `feat(app): add 32x32 brand icon via ImageResponse`
2. `feat(app): add 1200x630 brand OG image via ImageResponse`

## Close-out steps (not file-group work)

- `npm run lint` + `npm run build` full pass on branch head
- `npm run start` → curl all five routes + `/` `<head>` inspection
- `VERCEL_ENV=preview` flip test for `/robots.txt`
- Capture OG + icon PNGs for PR body
- `zoo-core-code-review` on the branch
- Write `review-report.md`, `completion-notes.md`, update ADO state
- Push branch, open PR, link to work item 7787

## Compaction gates

Four file-groups, four commits (or five with the split in group 4). Between each group: re-read sidecar + this plan to resume. State preserved in `index.md`.

## Rollback guards

No EF migrations. No DB changes. No package adds. Rollback = `git reset --hard origin/main`. Zero state outside these five new files + commits.

## Confirm before step 5

Does this plan look right? Specifically flagging for review:
1. The OG card subtitle — keep or strip?
2. The "S" monogram vs "SYHF" for the icon — agree on "S"?
3. Splitting file-group 4 into two commits (icon + OG) vs one combined — I'd prefer two for AC 13 traceability.
