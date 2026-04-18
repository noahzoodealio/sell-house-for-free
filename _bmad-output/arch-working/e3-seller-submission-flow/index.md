---
feature: e3-seller-submission-flow
services-in-scope:
  - sell-house-for-free
upstream-research: _bmad-output/planning-artifacts/project-plan-sell-house-for-free.md §4 E3
started-at: 2026-04-17T00:00:00Z
last-completed-step: 5
---

# E3 Architecture — Working Sidecar

**Scope recap (plan §4 E3):**
Multi-step seller submission form living at `/get-started`. Steps: address → property facts → condition + timeline → contact + consent. AZ-only address validation (FE + stub server), draft persistence in `localStorage`, client validation, a11y, abandonment analytics.

**Boundary:**
- **No live network calls to external services in E3.** The epic ends with a canonical payload POSTed to a stub server route.
- **The "address entered" event is the hook E4 will consume** — E3 defines the contract shape but does not call MLS/ATTOM.
- **E5 consumes the canonical payload** — E3 defines the TS contract that E5 will map to Offervana's `NewClientDto`.

**Services in scope:** `sell-house-for-free` only.

**Dependency on E1:** consumes `(marketing)`-style layout is N/A here; E3 lives at the top-level route `/get-started` per E1-S5's placeholder. Uses E1 primitives (Button, Field, Input, Select, Checkbox, Textarea, FormStep), `SITE`, `ROUTES`, `buildMetadata`, tokens.

**Survey targets (step 2):**
- Next.js 16 Server Actions + `useActionState` (forms.md)
- React 19 `useFormStatus`, `useOptimistic`, `useActionState`
- `<Form>` vs native `<form>` — when to use which
- `next/navigation` for step routing alternatives
- Draft-mode isn't relevant (`draft-mode.md` is for CMS preview, not form drafts)
- Instrumentation / abandonment analytics via `useReportWebVitals` + custom events
- `instrumentation-client.ts` for early listeners

**Open questions still carrying:**
- Address autocomplete library — scaffold MVP with typed-in address + AZ state guard, defer Combobox to E4 when enrichment lights up (noted in E1 arch §7).
- Draft-persistence key scheme — per-browser, not per-user. Do we gate on consent? (proposed: persist non-sensitive fields immediately; hold phone/email until user passes that step).
- Idempotency key generation — client-side UUID, persisted across retries within the same session.

**Handoff pointers:**
- Feeds: `zoo-core-create-epic` for E3, then `zoo-core-create-story` for each story in §7 handoff.
- `get-started` stub from E1-S5 is the entry point.
