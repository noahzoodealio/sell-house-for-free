# Implementation plan — Story 7786 (E1-S2)

**Branch:** `feature/e1-s2-src-lib-foundations-7786` (off `main` @ `731232a`)
**Approach:** 4 file-groups, 1 commit each, compaction between groups. Smoke check (lint + build in both states) at the end.

---

## File-group 1 — `src/lib/site.ts` (create)

**Purpose:** `SITE` constant + import-time env validation (ACs 1, 2, 3, 8).

**Shape:**
```ts
const raw = process.env.NEXT_PUBLIC_SITE_URL;
if (!raw) {
  throw new Error("Missing NEXT_PUBLIC_SITE_URL — set it in .vercel/.env.development.local or Vercel env UI.");
}
try {
  new URL(raw);
} catch {
  throw new Error(`Invalid NEXT_PUBLIC_SITE_URL: ${raw}`);
}

export const SITE = {
  name: "Sell Your House Free",
  shortName: "SYHF",
  url: raw.replace(/\/$/, ""),
  description: "Sell your Arizona home for free — no agent, no listing fees.",
  locale: "en_US",
  region: "AZ",
  broker: {
    name: "JK Realty",
    licenseNumber: "LC-TBD", // TODO(E7): confirm AZ license number with JK Realty
    stateOfRecord: "AZ",
  },
} as const;
```

**Key decisions:**
- `description` reuses the exact string already hardcoded in `src/app/layout.tsx:26` so the refactor in group 4 can point `description` at `SITE.description` without content drift. (Optional — keep the layout's inline description if we want SEO owner to be layout only; confirm in plan review.)
- Separate `if (!raw)` from `try/catch` so error messages tell you *which* failure happened.
- No export of the validation error — it throws at import.

**Commit:** `feat(lib): add SITE constant with import-time env validation`

---

## File-group 2 — `src/lib/seo.ts` (create)

**Purpose:** `buildMetadata()` helper (ACs 4, 5, 8).

**Shape:**
```ts
import type { Metadata } from "next";
import { SITE } from "./site";

type BuildMetadataArgs = {
  title: string;
  description: string;
  path: string;
  image?: string;
};

export function buildMetadata({ title, description, path, image }: BuildMetadataArgs): Metadata {
  const base: Metadata = {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      url: path,
      type: "website",
      locale: SITE.locale,
      siteName: SITE.name,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };

  if (image) {
    base.openGraph = { ...base.openGraph, images: [image] };
    base.twitter = { ...base.twitter, images: [image] };
  }

  return base;
}
```

**Key decisions:**
- `title` is bare; root layout's `title.template` wraps it (AC 4).
- `alternates.canonical: path` — relative; Next resolves against `metadataBase` (AC 4).
- Image-omitted → `openGraph.images` / `twitter.images` keys absent (AC 5 — E1-S3 file-based `opengraph-image.tsx` owns fallback).
- No hardcoded default image URL.

**Commit:** `feat(lib): add buildMetadata helper`

---

## File-group 3 — `src/lib/routes.ts` (create)

**Purpose:** `RouteEntry` type + seeded `ROUTES` registry (AC 6).

**Shape:**
```ts
import type { MetadataRoute } from "next";

export type RouteEntry = {
  path: string;
  title: string;
  showInNav: boolean;
  showInSitemap: boolean;
  changeFrequency?: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority?: number;
};

export const ROUTES = [
  {
    path: "/",
    title: "Home",
    showInNav: true,
    showInSitemap: true,
    changeFrequency: "weekly",
    priority: 1,
  },
  {
    path: "/get-started",
    title: "Get started",
    showInNav: true,
    showInSitemap: true,
    changeFrequency: "monthly",
    priority: 0.9,
  },
] as const satisfies readonly RouteEntry[];
```

**Key decisions:**
- `as const satisfies readonly RouteEntry[]` — literal inference + shape enforcement (AC 6 technical note).
- Seeds with `/` and `/get-started` — the two routes E1 actually creates. E2/E7 stories will append entries as each page lands.
- `changeFrequency` typed from Next's `MetadataRoute.Sitemap` — no local drift.

**Commit:** `feat(lib): add RouteEntry type and ROUTES registry`

---

## File-group 4 — `src/app/layout.tsx` refactor + smoke check

**Purpose:** Layout consumes `SITE.url` (AC 7) and build-clean verification (AC 9).

**Diff:**
```diff
-import type { Metadata } from "next";
-import { Inter, Open_Sans } from "next/font/google";
+import type { Metadata } from "next";
+import { Inter, Open_Sans } from "next/font/google";
 import { Analytics } from "@vercel/analytics/next";
+import { SITE } from "@/lib/site";
 import "./globals.css";
@@
 export const metadata: Metadata = {
-  metadataBase: new URL(
-    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
-  ),
+  metadataBase: new URL(SITE.url),
   title: {
     template: "%s | Sell Your House Free",
     default: "Sell Your House Free — Arizona",
   },
   description:
     "Sell your Arizona home for free — no agent, no listing fees.",
 };
```

**Note on fallback removal** — the `?? "http://localhost:3000"` goes away. AC 2 demands the build fail loudly without `NEXT_PUBLIC_SITE_URL`; the fallback was the exact behavior S2 is meant to kill. The user's `.vercel/.env.development.local` already carries `NEXT_PUBLIC_SITE_URL` from `vercel env pull` (per user memory), so local dev keeps working.

**Smoke check (run after commit, before self-review):**
1. `pnpm lint` — must be clean.
2. `pnpm build` with `NEXT_PUBLIC_SITE_URL` set — must pass, no warnings reference the 3 new modules (AC 9).
3. `NEXT_PUBLIC_SITE_URL= pnpm build` — must fail with our error message (AC 2).

**Commit:** `refactor(layout): read metadataBase from SITE.url`

---

## Order of operations

1. Group 1 → lint → commit → compact
2. Group 2 → lint → commit → compact
3. Group 3 → lint → commit → compact
4. Group 4 → lint → `pnpm build` (happy + unset) → commit → self-review

No EF migrations. No package installs.

## Open item for plan review

- **Should `layout.tsx`'s `description` also read `SITE.description`?** The story ACs don't require it (AC 7 only names `metadataBase`), but it's a natural symmetry and the only reason to leave `description` hardcoded is story-scope-purity. **Recommendation: defer to E1-S3** (which owns real metadata authoring) rather than expanding this story. The S2 diff stays one line per AC 7.
