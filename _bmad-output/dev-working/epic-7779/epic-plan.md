---
epic-id: 7779
epic-title: "E3 — Seller Submission Flow (front-end)"
parent-epic: 7776
target-service: sell-house-for-free
worktree-path: C:\Users\Noah\sell-house-for-free-e3-7779
branch: feature/e3-seller-submission-7779
base: origin/main (898b3158)
autopilot-status: running
started-at: 2026-04-21
approved-at: 2026-04-21
current-story: 7812 (S2)
completed-stories:
  - { id: 7811, name: "S1 Funnel shell", commit: 16603cf, closed-at: "2026-04-21" }
---

# Epic 7779 Execution Plan — E3 Seller Submission Flow

## Isolation

- **Worktree:** `C:\Users\Noah\sell-house-for-free-e3-7779`
- **Branch:** `feature/e3-seller-submission-7779` off `origin/main` (898b3158)
- **Primary tree untouched:** Noah is redesigning E2 on `feature/e2-core-marketing-pages-7778` at `C:\Users\Noah\sell-house-for-free`. Autopilot does NOT touch that path.

## Scope summary (from ADO 7779)

Multi-step seller submission form at `/get-started`: Address → Property facts → Condition & Timeline → Contact & Consent. Defines the canonical `SellerFormDraft` payload (E4 enriches, E5 maps to Offervana DTO), installs an idempotency-keyed Server Action submit boundary, and wires first-party-only abandonment analytics.

**No live cross-service calls in E3.** Submission ends in a stub Server Action that logs the validated payload and redirects to `/get-started/thanks`. `<AddressField>` seam + `EnrichmentSlot` are pre-wired extension points for E4.

**Decision confirmed 2026-04-21:** `/get-started` is the canonical entry. `/get-offer` is an alias (Next.js rewrite/redirect) routing to the same shell — not a duplicate page.

## Locked architectural decisions (from Epic description)

- React 19 Server Actions + `useActionState` + `useFormStatus` — no Route Handler for submit, no third-party form lib
- Zod — per-step sub-schemas gate client advance; full schema re-validates server-side (authoritative)
- `localStorage` draft persistence under `shf:draft:v1`, PII-stripped
- `sessionStorage` idempotency key under `shf:idk:v1` (E5 forwards as `X-Idempotency-Key`)
- `instrumentation-client.ts` attribution capture (UTM/gclid/gbraid/wbraid/gad_source/referrer) via `sessionStorage`
- `@vercel/analytics` `track()` — first-party only. NO Hotjar/FullStory/Clarity/reCAPTCHA (third-party + DOM replay with PII)
- `robots: { index: false, follow: false }` on `/get-started/*`
- No address autocomplete in E3 (E4 swaps `<AddressField>` impl without prop changes)
- Step state derived from `?step=<slug>` via `useSearchParams` in Suspense boundary

## Story topology

11 child User Stories (7811–7821). Execution order balances dependencies + risk (high-risk contracts first):

| # | ID | Story | Size | Depends on | Risk |
|---|-----|-------|------|-----------|------|
| 1 | 7811 | S1 — Funnel shell + routing + metadata | S | — | Low. Unblocks every other story. |
| 2 | 7812 | S2 — Seller-form core (types/Zod/helpers) | M | S1 | **High.** Canonical `SellerFormDraft` freezes E4/E5 contracts. Validate shape early. |
| 3 | 7813 | S3 — `<SellerForm>` orchestrator | M | S1, S2 | **High.** Server-Actions composition rules tricky; validates E2E before step UIs plug in. |
| 4 | 7814 | S4 — Address step + `<AddressField>` seam | M | S2, S3 | **High.** E4 seam props lock here. |
| 5 | 7815 | S5 — Property facts step | S | S2, S3 | Low. |
| 6 | 7816 | S6 — Condition + timeline step | S | S2, S3 | Low. |
| 7 | 7817 | S7 — Contact + consent step | M | S2, S3 | Med. Only PII step — draft persistence must strip PII correctly. |
| 8 | 7818 | S8 — Server Action + stub submit | S | S2–S7 | Med. E5 signature locks here. |
| 9 | 7819 | S9 — Analytics wiring | S | S8 | Low. DevTools verification: zero third-party origins fire. |
| 10 | 7820 | S10 — A11y + keyboard + focus + responsive QA | S | S4–S7 | Med. Axe-clean gate is a hard DoD item. |
| 11 | 7821 | S11 — Draft-recovery UX + error polish + closeout | XS | S8, S10 | Low. Closeout. |

Autopilot runs them sequentially in this order. Step stories S4–S7 could parallelize in a team setting but autopilot is a single executor, so they serialize with S4 first (riskiest contract).

## Strike counters

All stories start at strike-count = 0. 3-strike rule applies to the outer `zoo-core-code-review` loop per story. Inner `zoo-core-unit-testing` fix loop has its own 3-iteration cap.

## Halt conditions

- Any story reaches 3 review strikes → halt, surface to Noah.
- Any story emits EF migrations during dev-story → halt for migration-apply confirmation (E3 is FE-only, should not trigger; Supabase work is E6).
- Any new environment variable introduced → halt (plan says zero — `zod` is the only new dep).

## Out of scope (do not scope-creep)

- Real address autocomplete (SmartyStreets/MLS) → E4
- ATTOM/MLS enrichment → E4
- Real Offervana `CreateHostAdminCustomer` submission → E5
- Real PM assignment + SendGrid on `/thanks` → E6
- Production TCPA/terms/privacy copy → E7 (E3 ships placeholders flagged `isPlaceholder: true`)
- Rate-limit / CAPTCHA / security headers → E8

## Closeout artifacts

- Each story: `_bmad-output/dev-working/epic-7779/per-story/{story-id}/sidecar.md` + story-level artifacts (owned by `zoo-core-dev-story`)
- Epic close: `_bmad-output/dev-working/epic-7779/summary-report.md`
- ADO: every story transitions New → In Development → Code Review → Ready For Testing; Feature 7779 closed to Ready For Testing
- PR against `main` from `feature/e3-seller-submission-7779` (single PR per `[Epic autopilot = one branch]` memory rule)
