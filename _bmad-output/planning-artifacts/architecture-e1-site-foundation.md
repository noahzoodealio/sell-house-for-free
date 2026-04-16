# Architecture — E1 Site Foundation & Design System

- **Feature slug:** `e1-site-foundation`
- **Repo:** `sell-house-for-free` (Next.js 16.2.3, React 19.2.4, Tailwind v4)
- **Upstream:** `_bmad-output/planning-artifacts/project-plan-sell-house-for-free.md` §4 E1
- **Author:** Noah (Architect) · 2026-04-16
- **Status:** draft — ready for PM decomposition

---

## 1. Summary

E1 replaces the `create-next-app` + Tailwind scaffold with a production-grade foundation for the **Sell Your House Free** marketing site: routing skeleton, design-token system rooted in Zoodealio's Figma style guide, a small set of accessible component primitives, and SEO defaults (metadata, sitemap, robots, OG image, manifest). It also installs the anti-third-party-analytics constraint as structural code policy, not just footer copy.

**Affected services:** `sell-house-for-free` only. No cross-service integration.

**Pattern adherence snapshot**

| Area | Choice | Pattern source |
|---|---|---|
| Router | App Router (`src/app`) | Next.js 16 default; scaffold already uses it |
| Styling | Tailwind v4 + `@theme` in CSS | Next.js 16 `css.md` + Tailwind v4 convention |
| Fonts | `next/font/google` (self-hosted) | Next.js 16 `fonts.md` + no-PII posture |
| Metadata | File conventions (`sitemap.ts`, `robots.ts`, `opengraph-image.tsx`, `manifest.ts`) | Next.js 16 metadata conventions |
| Design tokens | Zoodealio Figma style guide (`vjeoDtWUcnEtJdmZ0b7Okh`, node `877:787`) | Brand source of truth |
| Primitives | Handrolled typed wrappers, no Radix/shadcn | Intentional — adopt Radix later per-control if needed |

**Deviations from scaffold**
- Drop dark mode (scaffold had `prefers-color-scheme: dark`)
- Drop Geist fonts (replace with Inter + Open Sans per brand)
- Add route groups `(marketing)`, `(legal)`; add `get-started` funnel route
- Add `lib/site.ts`, `lib/seo.ts`, `lib/routes.ts` helpers
- Gate `<Analytics />` to production only

---

## 2. Component diagram

```
                            ┌───────────────────────────────┐
                            │  src/app/layout.tsx  (root)   │
                            │  • html/body                  │
                            │  • next/font Inter + Open Sans│
                            │  • metadataBase + OG defaults │
                            │  • <Analytics /> (prod only)  │
                            └───────────────┬───────────────┘
                                            │ children
              ┌─────────────────────────────┼─────────────────────────────┐
              ▼                             ▼                             ▼
  ┌─────────────────────────┐   ┌─────────────────────────┐   ┌─────────────────────────┐
  │ (marketing)/layout.tsx  │   │  get-started/page.tsx   │   │  (legal)/layout.tsx     │
  │ • Header + Footer       │   │  • funnel shell         │   │  • minimal chrome       │
  │ • CTA cadence           │   │  (E3 fills multi-step)  │   │  (E7 fills content)     │
  │ (E2 fills pages)        │   │                         │   │                         │
  └─────────────────────────┘   └─────────────────────────┘   └─────────────────────────┘

                                   ┌───────────────────────────────────────┐
                                   │  File-based metadata (app/ root)      │
                                   │  • robots.ts  (env-aware index gate)  │
                                   │  • sitemap.ts (reads routes.ts)       │
                                   │  • opengraph-image.tsx (ImageResponse)│
                                   │  • manifest.ts                        │
                                   │  • icon.tsx / favicon.ico             │
                                   │  • not-found.tsx / error.tsx /        │
                                   │    loading.tsx                        │
                                   └───────────────────────────────────────┘

                 ┌───────────────────────────────┐       ┌───────────────────────┐
                 │ src/components/ui             │       │ src/components/layout │
                 │ Button, Input, Field, Label,  │◀──────┤ Header, Footer,       │
                 │ Fieldset, Checkbox, Radio,    │       │ Container             │
                 │ Select, Textarea, Card,       │       └───────────────────────┘
                 │ FormStep                      │
                 └───────────────────────────────┘

                              src/lib
                              ├── site.ts    (SITE config — brand, URL, broker)
                              ├── seo.ts     (buildMetadata helper)
                              ├── routes.ts  (canonical route registry)
                              └── cn.ts      (className merge utility)
```

---

## 3. Per-service changes

This epic lives entirely inside `sell-house-for-free`. Changes:

### 3.1 `src/app/` — root scaffolding

| File | Action | Notes |
|---|---|---|
| `src/app/layout.tsx` | Rewrite | Replace Geist with Inter + Open Sans via `next/font/google`; set `metadataBase`; install title template `%s \| Sell Your House Free`; gate `<Analytics />` to production. |
| `src/app/page.tsx` | Replace | Scaffold placeholder page out — lightweight hero + `/get-started` CTA. Full content lands in E2. |
| `src/app/globals.css` | Rewrite | Tailwind v4 `@theme` block carrying brand tokens (see §4). Remove `prefers-color-scheme: dark`. Remove `Arial, Helvetica, sans-serif` font-family override on `body` — inherited from `--font-sans`. |
| `src/app/not-found.tsx` | Create | Branded 404. |
| `src/app/error.tsx` | Create | Branded error boundary. `"use client"`. |
| `src/app/loading.tsx` | Create | Skeleton fallback. |
| `src/app/icon.tsx` | Create | Programmatic favicon (brand blue tile). |
| `src/app/opengraph-image.tsx` | Create | `ImageResponse`-generated default OG card. |
| `src/app/robots.ts` | Create | Env-aware: allow in production, disallow everywhere else. References `${SITE.url}/sitemap.xml`. |
| `src/app/sitemap.ts` | Create | Iterates `src/lib/routes.ts`. No I/O — static at build time. |
| `src/app/manifest.ts` | Create | `MetadataRoute.Manifest` — name, short name, theme color `#0653ab`, background `#ffffff`, icons. |
| `src/app/(marketing)/layout.tsx` | Create | Route group; shared header + footer for E2 pages. |
| `src/app/(legal)/layout.tsx` | Create | Route group; minimal chrome for E7 pages. |
| `src/app/get-started/page.tsx` | Create placeholder | Shell for E3. |

### 3.2 `src/components/ui/` — primitives

Create, all as small typed wrappers:
- `button.tsx` — variants `primary` (brand fill) / `secondary` (brand outline); sizes `xs` (42px), `sm`/`md`/`lg`/`xl` (48 mobile, 52 desktop). Label: Inter semibold 18px. Radius 8.
- `input.tsx` — native `<input>` with token-derived border, focus ring `outline-brand`.
- `label.tsx`, `field.tsx`, `fieldset.tsx` — form-control wrappers. `Field` owns label↔input association, error text, `aria-invalid`, `aria-describedby`.
- `checkbox.tsx`, `radio.tsx` — native inputs with accent color `--color-brand`.
- `select.tsx` — native `<select>`; deliberately not Radix.
- `textarea.tsx`
- `card.tsx` — `rounded-lg`, `bg-surface`, optional `shadow-elevated`.
- `form-step.tsx` — progress indicator + step container shell consumed by E3.

### 3.3 `src/components/layout/`

- `container.tsx` — `max-w-[var(--container-page)]` constrainer with responsive padding.
- `header.tsx` — brand mark + primary nav. Wiring-only in E1 (logo + CTA "Get started"); nav populated in E2.
- `footer.tsx` — brand + broker attribution (**JK Realty** per plan Q2) + placeholder legal links (E7 fills).

### 3.4 `src/lib/`

- `site.ts` — `SITE` constant (name, URL, description, locale, region, broker).
- `seo.ts` — `buildMetadata({ title, description, path, image? }): Metadata`. Consumed by every page in E2 + E7.
- `routes.ts` — `ROUTES: RouteEntry[]` registry. Sitemap + nav read from this.
- `cn.ts` — `cn(...classes)` helper.

### 3.5 Config

- `next.config.ts` — **no changes in E1** beyond an explicit `experimental: {}` stub. Security headers + CSP are E8.
- `tsconfig.json` — **no changes**; `@/*` alias already configured.
- `eslint.config.mjs` — **no changes** (scaffold config is current).
- `postcss.config.mjs` — **no changes** (Tailwind v4 plugin already configured).

### 3.6 Environment variables (new)

| Var | Required | Used by |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | yes (all envs) | `metadataBase`, sitemap, OG URLs |
| `SITE_ENV` (or Vercel's `VERCEL_ENV`) | inferred | `robots.ts` to noindex preview |

---

## 4. Design tokens — canonical spec

Source: Zoodealio Figma style guide, node `877:787` (pulled 2026-04-16 via MCP `get_variable_defs` + `get_design_context`).

**Tailwind v4 `@theme` (in `src/app/globals.css`)**

```css
@import "tailwindcss";

@theme {
  /* Brand */
  --color-brand: #0653ab;
  --color-brand-foreground: #fdfdfd;

  /* Ink */
  --color-ink-title: #17233d;
  --color-ink-body: #212121;
  --color-ink-muted: #9e9e9e;
  --color-ink-disabled: #bdbdbd;

  /* Surfaces */
  --color-surface: #ffffff;
  --color-surface-tint: #fafafa;
  --color-surface-dark: #1f1f1f;

  /* Borders */
  --color-border: #bdbdbd;
  --color-border-strong: #0653ab;

  /* Radius */
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;
  --radius-xl: 12px;

  /* Shadow — Figma Light/Shadow-6 */
  --shadow-elevated: 0 8px 16px 0 #60617029, 0 2px 4px 0 #28293d0a;

  /* Fonts */
  --font-sans: var(--font-open-sans), system-ui, sans-serif;
  --font-display: var(--font-inter), system-ui, sans-serif;

  /* Containers */
  --container-prose: 65ch;
  --container-form: 560px;
  --container-page: 1280px;
}

@layer base {
  html { font-family: var(--font-sans); color: var(--color-ink-body); }
  h1, h2, h3, h4, h5, h6 {
    font-family: var(--font-display);
    color: var(--color-ink-title);
    font-weight: 600;
  }
}
```

**Naming convention — semantic, not scale.** `--color-ink-title` (role) rather than `--color-navy-700` (value). A palette refresh later touches this file only.

**Type ramp — utilities, not tokens.** The Figma spec has breakpoint-dependent sizes (H1 is 44 mobile / 80 desktop). Rather than invent `--text-h1` tokens that hide that, write the utilities inline at the heading:

| Role | Mobile | Desktop |
|---|---|---|
| H1 | `text-[44px] leading-[50px]` | `md:text-[80px]` |
| H2 | `text-[40px] leading-[48px]` | `md:text-[44px]` |
| H3 | `text-[36px] leading-[40px]` | `md:text-[40px] md:leading-[48px]` |
| H4 | `text-[24px] leading-[44px]` | `md:text-[28px]` |
| H5 | `text-[20px]` | `md:text-[22px]` |
| Primary body | `text-[18px] leading-[32px]` | `md:text-[20px]` |
| Secondary body | `text-[16px] leading-[24px]` | `md:text-[18px]` |
| Small | `text-[12px]` or `text-[14px]` | — |

All headings — Inter Semibold. Body / small — Open Sans.

---

## 5. Integration contracts (E1 → downstream epics)

E1 writes no cross-service calls. "Integration contracts" here = the extension points later epics plug into.

| Consumer | Hook | Contract |
|---|---|---|
| **E2** Marketing pages | `src/app/(marketing)/<slug>/page.tsx` | Each page exports `metadata` built via `buildMetadata()`. Register `{ path, changeFrequency, priority }` in `src/lib/routes.ts` so sitemap + nav pick it up. |
| **E3** Submission flow | `src/app/get-started/page.tsx` + `FormStep`, `Field`, `Input`, `Select`, `Checkbox`, `Textarea` primitives | E3 replaces placeholder page. **E1 provides no form-state library** — E3 selects (likely React Hook Form or native form state) and brings it. |
| **E4** Property enrichment BFF | `src/app/api/enrich/route.ts` (E4 creates) | E1 does not scaffold `app/api/`. E4 creates the route handler and any MLS client code under `src/lib/mls/`. |
| **E5** Offervana submission | `src/app/api/submit/route.ts` (E5 creates) | Same. E5 adds the Offervana client under `src/lib/offervana/`. |
| **E6** PM confirmation | `src/app/confirmation/[referralCode]/page.tsx` + `src/lib/supabase.ts` (E6 creates) | **E1 does not install `@supabase/supabase-js`.** E6 owns that dep. |
| **E7** Compliance | `src/app/(legal)/<slug>/page.tsx` | Use `(legal)` layout. Use `buildMetadata()`. Legal copy is version-stamped in-file per plan §E7. |
| **E8** Launch | `next.config.ts` `headers()`, Sentry instrumentation, `robots.ts` prod gating (already wired) | E8 hardens security headers + CSP + error tracking. E1 leaves the seams. |

**Shared env vars going forward** — when downstream epics introduce secrets (ATTOM, Offervana credentials, Supabase keys, SendGrid), they land in `.env.local` + Vercel env UI. E1 does not pre-register those names.

---

## 6. Pattern decisions + deviations

### Decisions (with citations)

1. **App Router with `src/app/`** — Next.js 16 default; scaffold already uses it. Docs: `01-app/01-getting-started/02-project-structure.md`, `…/03-file-conventions/src-folder.md`.
2. **Tailwind v4 `@theme` in CSS, not `tailwind.config.ts`** — Tailwind v4 + Next.js 16 `01-app/01-getting-started/11-css.md` §Tailwind.
3. **`next/font/google` self-hosted** — Next.js 16 `…/13-fonts.md`. No runtime request to Google. Required for our no-PII-to-third-parties posture (plan §3 non-functionals).
4. **Route groups for `(marketing)` and `(legal)`** — Next.js 16 `…/03-file-conventions/route-groups.md`. Lets E2 and E7 have distinct layouts without URL pollution.
5. **File-based metadata conventions** — `sitemap.ts`, `robots.ts`, `manifest.ts`, `opengraph-image.tsx`. Next.js 16 `…/14-metadata-and-og-images.md` + `…/03-file-conventions/01-metadata/*`.
6. **Global `PageProps<'/…'>` / `LayoutProps<'/…'>`** — Next.js 16 adds these as typegen-driven globals. Use them; don't hand-type `params`.
7. **Params / searchParams as `Promise<…>`** — breaking change in Next.js 16 vs 14. Every page/layout that reads them awaits.

### Deviations (with justification)

| Deviation | From | Why | Who accepts the risk |
|---|---|---|---|
| Drop dark mode | Scaffold `globals.css` had `prefers-color-scheme: dark` | Plan doesn't require it. Brand tokens designed for light surfaces. Cuts E2/E7 design + QA surface in half. | Noah — if we need dark mode for a PR reason later, it's a separable epic on top of semantic tokens. |
| Drop Geist fonts | Scaffold default | Consumer-real-estate trust posture needs a warmer stack; Zoodealio brand uses Inter + Open Sans. | Noah / design source: Figma style guide. |
| Handrolled primitives (no Radix, no shadcn/ui) | Industry default | E3's form controls are simple: text input, select, checkbox, radio, textarea. Native elements are accessible by default; Radix adds ~15 deps + styling-override burden for zero MVP benefit. | Noah — Radix can land per-control when a real need appears (e.g. E3's AZ address autocomplete, which likely wants a Combobox). |
| No `unstable_instant` / Cache Components | Next.js 16 docs hint this is preferred | Cache Components changes data-fetching semantics across the whole app. Too invasive for E1 and the rest of the plan assumes default fetching. | Noah — revisit after E4/E5 land. |
| No CSP in E1 | `02-guides/data-security.md` | CSP work interacts awkwardly with fonts / analytics / OG images during iteration. Defer to E8 when surface is stable. | Noah — E8 covers it. |
| Semantic token names (`--color-ink-title`) over scale names (`--color-navy-700`) | Common design-system pattern uses scales | Palette refreshes later should not force a global rename. Semantic names are cheaper to maintain for a single-brand site. | Noah. |

---

## 7. Open questions

None blocking. Items to revisit in downstream architecture:

- **CSP posture** — exact `Content-Security-Policy` header (E8). Must allow `va.vercel-scripts.com` for Analytics and Next.js inline style nonce for font preloads.
- **Type ramp tokens** — if E2/E3 start repeating `text-[44px] md:text-[80px]` at every H1, extract utility classes (`.text-display-1` etc.) into a `@layer components` block. Don't pre-extract — wait for repetition signal.
- **Cache Components adoption** — revisit after E5 lands and we can measure navigation perf.
- **Radix per-control** — likely E3 (combobox for AZ address autocomplete).

---

## 8. Handoff notes for PM (suggested story boundaries)

Proposed decomposition into ADO User Stories. PM should validate sequencing against team capacity.

| # | Story | Size | Notes |
|---|---|---|---|
| E1-S1 | **Global scaffolding** — root `layout.tsx`, fonts, `globals.css` with `@theme`, drop dark mode | S | Unblocks every other story. |
| E1-S2 | **`lib/site.ts` + `lib/seo.ts` + `lib/routes.ts`** | XS | Prereq for metadata stories. |
| E1-S3 | **File-based metadata** — `robots.ts` (env-aware), `sitemap.ts`, `manifest.ts`, `opengraph-image.tsx`, `icon.tsx` | S | One story — all wired together. |
| E1-S4 | **Error / loading / not-found** — `error.tsx`, `loading.tsx`, `not-found.tsx` | XS | |
| E1-S5 | **Route groups + placeholder layouts** — `(marketing)/layout.tsx`, `(legal)/layout.tsx`, `get-started/page.tsx` shell | S | Header + footer chrome; E2/E7 fill content. |
| E1-S6 | **UI primitives — Button + Input + Label + Field + Fieldset** | M | Tests per primitive; focus-visible on every interactive element. |
| E1-S7 | **UI primitives — Checkbox + Radio + Select + Textarea** | S | |
| E1-S8 | **UI primitives — Card + FormStep + Container** | S | |
| E1-S9 | **Layout chrome — Header + Footer** | S | Footer includes JK Realty attribution (plan Q2). |
| E1-S10 | **Analytics gating + anti-third-party-SDK policy doc** | XS | `<Analytics />` guarded; short `docs/analytics-policy.md` so the constraint survives contributor rotation. |
| E1-S11 | **Placeholder home page** | XS | Hero + CTA to `/get-started`. Final copy in E2. |

**Acceptance criteria cadence** — every story must include a visual-regression check against the Figma reference for its touched component or page, even if informal (side-by-side screenshot in the PR description). A11y quick checks (`pnpm dlx @axe-core/cli` on the running dev server) land in S6/S7/S8 / S9.

**Not in E1 scope** (for PM planning clarity): `next.config.ts` hardening, CSP, Sentry, Supabase client, any `src/app/api/*` routes, any cross-service code, content, legal copy. Those all live in later epics.
