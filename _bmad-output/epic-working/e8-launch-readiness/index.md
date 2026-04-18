---
slug: e8-launch-readiness
ado-epic-id: 7784
ado-url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7784
ado-parent-epic-id: 7776
ado-parent-epic-url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7776
work-item-type: Feature
mode: mcp
action: update-existing
started-at: 2026-04-18T02:10:00Z
completed-at: 2026-04-18T02:14:00Z
---

# E8 — Launch Readiness — Epic Working Sidecar

## What this invocation did

**Enrichment, not creation.** ADO Feature **7784** already existed (rev 1, filed 2026-04-16 at plan-project time under parent Epic **7776**) with a plan-time skeleton description (scope bullets + 5-item DoD, Vercel-vs-ACA still posed as an open question). This run replaced the description with a post-architecture body that mirrors the shape of E1 (7777), E2 (7778), and E3 (7779):

- Parent / build-order / depends / feeds / scope header
- Summary grounded in architecture §1 (hardening + cutover, no new user-facing capability, closes every E1–E7 seam)
- **Decisions locked (12 items)** — Vercel hosting, static CSP + SRI (not nonce), `proxy.ts` rename, `@sentry/nextjs` init split with mandatory `beforeSend` PII scrub, no session replay ever, Web Vitals → first-party, Turnstile over reCAPTCHA, Playwright E2E against preview URL + post-deploy smoke, launch-gate script, two-layer anti-PII enforcement, SAS rotation tracker, zero-downtime `_V2`-suffix secret rotation, Vercel-rollback promotion over revert-commit
- Pattern anchors (10 items with Next.js 16 / Sentry / Turnstile doc citations)
- Modules & paths delivered table (19 paths, new + edited)
- Out-of-scope list (7 items — explicit deferrals)
- **16 Feature-level Gherkin DoD gates** — security headers, apex canonicalization, Turnstile gate-before-POST, Sentry PII-scrub unit-test gate, no-session-replay assertion, Web Vitals origin-allowlist, runtime third-party origin audit, build-time dep-denylist, launch-gate assertions, smoke spec full-flow, a11y spec, Lighthouse budget, DNS cutover curls, rollback runbook, SAS reminder cron
- 13-story decomposition with sizing + parallelism notes (S1 unblocks all; S13 is final pre-launch merge)
- Env vars (6 new — Sentry + Turnstile) / packages added (`@sentry/nextjs`, `@playwright/test`, `@axe-core/playwright`, `@lhci/cli`) / references / bleeding-edge Next 16 `middleware`→`proxy` note

Rev bumped **1 → 2** in place. Hierarchy preserved (parent link to 7776 intact). Title preserved (`E8 — Launch Readiness`). Work item type preserved (`Feature`).

## Intentionally NOT in the Feature body

- Per-story acceptance criteria — those land on each child Story via `/zoo-core-create-story e8`.
- Full architecture §3.2 CSP header-value block — the raw string is 600+ chars with a handful of allowed origins. Lives in architecture doc §3.2 and in `docs/security/csp.md` (delivered by S2). Replicating it in the Feature body would drift.
- Full env-matrix table (E1–E8 rollup with per-env values) — lives in architecture doc §3.12 and in `docs/launch/env-matrix.md` (delivered by S1). Feature body shows only E8-new vars.
- Open questions §6 (Vercel plan tier, sandbox Offervana tenant, OTel post-MVP, apex domain confirmation, DNS registrar, Sentry project name, CI runner) — these are architect/PM conversation notes, not work-item content. They live in the architecture doc.
- `Microsoft.VSTS.TCM.ReproSteps` — left at rev-1 skeleton content (ReproSteps is a bug-type field; unusual on a Feature; not rewritten to avoid unintended consumers). Matches the E3 precedent.

## Inputs consumed

- `_bmad-output/planning-artifacts/architecture-e8-launch-readiness.md` (full — §1 summary, §2 component diagram, §3 per-service changes, §4 integration contracts, §5 pattern decisions + deviations, §7 story decomposition, §8 references)
- `_bmad-output/arch-working/e8-launch-readiness/index.md` (architect working sidecar, through step 5)
- `_bmad-output/planning-artifacts/project-plan-sell-house-for-free.md` §4 E8 + §3 NF + §7 Q10/Q12 (via architecture cross-references)
- Current Feature 7784 body at rev 1 (for structural diff and tone preservation)
- ADO Feature 7779 (E3) — most recent structural pattern for enriched Feature descriptions (HTML format, section order, Gherkin gate phrasing, story-decomposition table shape)

## Decisions

- **Update in place, not new Epic/Feature.** Matches E1 (7777), E2 (7778), E3 (7779) precedent; umbrella hierarchy was established at `/zoo-core-plan-project` time.
- **Work item type: Feature** (per prior-run user decision propagated from E3 sidecar: "making this as a feature on ADO via MCP under the parent epic"). The `Epic` in this skill's name is the BMad-naming convention; ADO semantics are Feature-under-Epic.
- **AC style:** Feature-level Gherkin given/when/then, testable, anchored to runtime-observable signals — response headers, network-request origins, Sentry event payloads, CI script exit codes, curl outputs, Lighthouse budget numbers, GitHub Issue creation — not implementation detail. This matches E3's gate style.
- **HTML formatting:** ADO stores `System.Description` as HTML; sent explicit `<p>`/`<h2>`/`<ul>`/`<ol>`/`<table>`/`<code>`/`<strong>`/`<em>` markup. Arrows (`→`), em-dashes (`—`), and section-sign (`§`) sent as literal Unicode — renders fine per E1/E2/E3 precedent.
- **Gherkin gate count (16) is higher than E1–E3** — this is load-bearing. E8 is the launch-gate Feature; each deferred concern from E1–E7 gets its own observable assertion in the Feature body so PM + QA can trace the gate → script → doc chain without opening the architecture file.
- **E8-new env vars table in Feature body, full E1–E8 matrix in docs.** Readers of the Feature card care about what E8 introduces; ops reads the matrix out of the repo. Split avoids double-maintenance.

## Cross-service impact

**Consumer-only.** E8 is entirely in-repo (`sell-house-for-free`) except for a single one-paragraph README edit in `Zoodealio.Infrastructure` (S13) noting that this service is hosted on Vercel and has no Terraform module. Offervana_SaaS, Zoodealio.MLS, Zoodealio.Shared, and Zoodealio.Strapi all remain untouched. The smoke spec *consumes* real Offervana (sandbox tenant, pending confirmation in §6 open questions) and real Zoodealio.MLS, but ships no platform-side code.

## Parent hierarchy

```
Epic 7776 — Sell Your House Free (AZ) — Client-Facing Marketing & Submission Funnel
├── Feature 7777 — E1 Site Foundation & Design System          (enriched)
├── Feature 7778 — E2 Core Marketing Pages + Trust Surface     (enriched)
├── Feature 7779 — E3 Seller Submission Flow (front-end)       (enriched)
├── Feature 7780 — E4 Property Data Enrichment                 (per plan-project)
├── Feature 7781 — E5 Offervana Submission                     (per plan-project)
├── Feature 7782 — E6 PM Assignment + Confirmation             (per plan-project)
├── Feature 7783 — E7 AZ Compliance + Anti-Broker Disclosure   (per plan-project)
└── Feature 7784 — E8 Launch Readiness                          ← this run
    └── (Stories S1–S13 to be filed via /zoo-core-create-story e8)
```

## Next steps

1. Review rendered Feature at https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7784 — confirm wording matches house style and the pattern matches E1/E2/E3.
2. Run `/zoo-core-create-story e8` to decompose the 13 stories (S1–S13) as ADO User Stories under Feature 7784.
3. E8 implementation is gated on E2/E5/E6/E7 being code-complete (smoke test + launch gate both need real upstream seams to assert against). E8-S1 (Vercel project + DNS runbook) can start earliest — it doesn't depend on any E1–E7 code, just decisions.
4. Before E8-S13 (final DNS cutover), confirm resolution of the six architecture §6 open questions in a short PM ↔ ops sync: Vercel plan tier, Offervana sandbox tenant availability, OTel post-MVP scope, apex domain final copy, DNS registrar, Sentry project naming.

## Not done

- `Microsoft.VSTS.TCM.ReproSteps` not rewritten (see "Intentionally NOT" above).
- No child Stories created — that's `/zoo-core-create-story e8`'s job.
- No ADO comment added — description replacement is self-documenting via rev history; E1/E2/E3 precedent didn't add comments either.
- Personal memory (`_bmad/memory/zoo-core-agent-pm/ado-history.md`) not updated — directory does not yet exist; memory integration deferred to a future PM-run consolidation pass.
