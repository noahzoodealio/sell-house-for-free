---
slug: e10-s4-seller-rls-and-portal-hydration
ado-story-id: 7926
ado-url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7926
parent-epic-id: 7919
branch: feature/e10-passwordless-auth
status: implemented
started-at: 2026-04-24T01:15:00Z
---

# E10-S4 — Seller RLS + portal hydration from Supabase

## Scope delivered

1. **RLS migration** — `supabase/migrations/20260424180100_e10_s4_seller_rls_policies.sql`
   - `profiles_select_own` + `profiles_update_own` — `id = auth.uid()`.
   - `submissions_select_own` — `seller_id = auth.uid()`.
   - `submission_offers_select_own` — transitive via `exists(select 1 from submissions …)`.
   - No insert/delete policies — service-role writes remain the sole mutation path (E6-S3 is still the only `profiles`/`submissions` writer).
2. **`getPortalSnapshot`** — `src/lib/portal/queries.ts`
   - Pulls `{ profile, submission, offers }` for the authenticated seller via `auth.getUser()` + three RLS-gated queries.
   - Service-only (`import 'server-only'`).
3. **Snapshot → PortalData adapter** — `src/lib/portal/adapter.ts`
   - Maps Supabase rows to the client `PortalData` shape.
   - User + property fields are live (from `profiles` + `submissions`).
   - Offer tiles map `submission_offers.path` → display name/tone; `low_cents`/`high_cents` → dollars.
   - Sections not yet wired (plan, team, listing, todos, docs, guides, pricingRationale) render empty/neutral placeholders — **NO demo-seller copy** from `seedPortal()` leaks into the authed portal.
4. **Server Component `/portal/page.tsx`**
   - `createServerAuthClient()` → `auth.getUser()` gate.
   - No session → server-rendered "Sign in to continue" pane with CTA to `/portal/login` (the real guard lands in S5's middleware).
   - Session present → `getPortalSnapshot` → `snapshotToPortalData` → `<PortalApp initialData={…}>`.
   - Fail-safe: try/catch collapses fetch errors to the no-session pane rather than 500ing.
5. **`PortalApp` prop support** — `src/components/portal/portal-app.tsx`
   - Accepts optional `initialData?: PortalData`.
   - When `initialData` is provided, skips the localStorage hydrate/save loop.
   - Renders a "Setting up your portal…" pane if `data === null` (prod-without-snapshot edge case the Server Component normally prevents).
6. **`seedPortal()` prod-skip** — `src/components/portal/portal-data.ts`
   - Returns `null` in `NODE_ENV === 'production'` per AC 8.
   - `savePortal` is null-safe.
   - `loadPortal` gained a `@deprecated` JSDoc block explaining it's a dev-only localStorage read now.
7. **Setup page ownership check** — `src/app/portal/setup/page.tsx`
   - When `?sid=` is present and no authenticated seller owns it (RLS filters the row), renders the existing `FallbackMessage` pane instead of leaking submission existence.
   - `ref=`-based flow (E6-S6 polling island entry) untouched.

## Acceptance criteria mapping

| AC | Status | Evidence |
|---|---|---|
| 1 | ✅ | Migration file adds five policies (profiles × 2, submissions, submission_offers, update on profiles). |
| 2 | ⏸ | Two-seller cross-read smoke pending manual migration apply + test accounts. |
| 3 | ⏸ | Anon-JWT smoke pending migration apply. |
| 4 | ✅ | Service-role writes unchanged — `getSupabaseAdmin()` untouched; E6-S3 orchestrator continues to insert. |
| 5 | ✅ | `getPortalSnapshot(supabase)` exports + types in `src/lib/portal/queries.ts`; `server-only`. |
| 6 | ✅ | `/portal/page.tsx` is an async Server Component; session-less branch renders the sign-in pane with CTA. |
| 7 | ✅ | `/portal/setup/page.tsx` gains the `sid` ownership check with fallback pane. |
| 8 | ✅ | `seedPortal()` first line returns null in prod. |
| 9 | ✅ | `loadPortal` has `@deprecated` JSDoc. No production code path calls it after this story (Server Component hydrates everything). |
| 10 | ⏸ | Smoke with two sellers pending migration apply. |
| 11 | ⏸ | psql RLS smoke pending migration apply. |
| 12 | ✅ | `next build` passes; `/portal` now dynamic (session cookies). Service-role grep check carries over from E6. |
| 13 | ⏸ | `/portal/setup` polling regression test pending — the `ref` flow is preserved but a smoke against E6-S6 polling is recommended before merging. |

## Deviations from story AC

- **`/portal/page.tsx` snapshot-driven render (AC 6):** Rather than convert the full `PortalData` shape from snapshot, the adapter populates only the Supabase-backed fields (user, property, offers) and leaves non-backed sections (team, plan, docs, guides, listing) as neutral empty placeholders. This is a more honest read of "render from snapshot" — the portal no longer renders `seedPortal()`'s demo copy for authenticated sellers. Follow-up stories (E11 team, E12 plan, etc.) wire the remaining sections live.
- **ACs 2, 3, 10, 11 (SQL smokes):** Depend on manual `supabase db push` applying the migration + a pair of test seller accounts. Those smokes stay pending until the user confirms the migration has been applied to dev.
- **AC 13 (E6-S6 polling regression):** `/portal/setup`'s `ref`-based flow is preserved; the new `sid` ownership branch only runs when `sid` query param is present. Not formally re-smoked in this story — recommend a manual run before merging the epic.

## Files touched

- `supabase/migrations/20260424180100_e10_s4_seller_rls_policies.sql` (new)
- `src/lib/portal/queries.ts` (new)
- `src/lib/portal/adapter.ts` (new)
- `src/app/portal/page.tsx` (rewrite — async Server Component)
- `src/app/portal/setup/page.tsx` (edit — `sid` ownership branch)
- `src/components/portal/portal-app.tsx` (edit — `initialData` prop, null-safe state)
- `src/components/portal/portal-data.ts` (edit — prod-skip on `seedPortal`; null-safe `savePortal`; `loadPortal` deprecation JSDoc)

## Manual steps required

- [ ] Apply migration: `supabase db push` (dev project). **Blocks AC 2/3/10/11 smoke.**
- [ ] Provision two test seller accounts (E6 submit flow) and verify cross-read denial per AC 2 + 3.

## Out of scope

- Middleware redirect (S5)
- Sentry wiring (S6)
- Team-member / messages / documents RLS (E11)
- Write-side RLS (service-role-only stays the pattern)
