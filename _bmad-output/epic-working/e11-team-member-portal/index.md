---
slug: e11-team-member-portal
ado-epic-id: 7920
ado-url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7920
ado-parent-epic-id: 7776
ado-parent-epic-url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7776
work-item-type: Feature
mode: mcp
action: create-new
status: filed
created-at: 2026-04-23T00:00:00Z
filed-at: 2026-04-23T21:32:06Z
---

# E11 — Team-Member Portal (Unified TC / PM / Agent) — Epic Brief

Filed as ADO Feature **7920** under Epic 7776 on 2026-04-23 via `/zoo-core-create-epic`. Full architecture doc to follow via `/zoo-core-create-architecture e11` before story decomposition is locked.

## Summary

A single internal-facing portal at `/team` where **one unified role** — called Team Member — covers what existing copy variously names Transaction Coordinator, Project Manager, and On-Demand Agent. Role distinctions are permission badges on the `team_members` row, not separate schemas or portals.

Team members sign in with the same Supabase Auth instance as sellers (E10), but via `/team/login` and with a `team_members.is_active = true` check gating access.

## Why

- Current public copy + portal seed (`src/components/portal/portal-data.ts:81–96`) models `team.tc` + `team.agent` as two roles per submission. Users see "your Project Manager" on `/thanks` and "your Transaction Coordinator" + "your On-Demand Agent" in the portal. Three role labels, one actual human in practice for this AZ-only operation.
- Per `project_core_positioning.md`: "PMs aren't commission-based" and the wedge is fiduciary rep on every path. Role separation is marketing flavor, not an operational reality that requires distinct schemas, permissions, or portals.
- No team-facing portal exists today. Every PM action is ops-console / email / manual Supabase queries. This won't scale past ~5 concurrent active submissions.
- The AI agent's context summaries (E9) are most valuable to the human handling the submission — the team member should see what the seller's been asking the AI before they pick up the phone.

## Dependencies

- **E6-S1** (revised) — `team_members`, `submissions`, `assignment_events` tables; `profiles`, `submission_offers` tables
- **E6-S3** (revised) — initial assignment writes to `assignment_events`
- **E10-S1 / E10-S4** — Supabase Auth provider + RLS policies; team auth reuses the same provider config
- **E9** — AI chat tables + session summaries (for the AI-context panel)
- **Resend** (from revised E6-S4) — outbound seller emails from team members reuse the same React Email template infra

## Proposed stories (rough — 10 stories, subject to architecture refinement)

- **E11-S1** — Schema additions: `messages` (two-way seller ↔ team thread, inbound + outbound, per-submission), `documents` (listing agreement, T-47 disclosure, HOA, title — Supabase Storage-backed), `team_activity_events` (audit: email sent, note added, handoff initiated, AI-context viewed). RLS: team members read rows scoped to submissions they're assigned.
- **E11-S2** — `/team/login/page.tsx` + `/team/auth/callback/route.ts` — magic-link auth for team members. Rejects emails not in `team_members`. No phone OTP for team (email-only keeps it simple; team-member emails are work addresses).
- **E11-S3** — `/team/page.tsx` (work queue home): list of submissions where `pm_user_id = auth.uid()`, sorted by oldest unreviewed. SLA indicator (green < 4h since assignment, amber < 24h, red > 24h — matches the `< 4 hrs` response-time promise in the portal seed). Unread seller-messages badge.
- **E11-S4** — `/team/submissions/[id]/page.tsx` detail view: seller contact + property snapshot, path selection, Offervana results + override/notes, doc vault summary, activity timeline, handoff button.
- **E11-S5** — `/team/submissions/[id]/messages` — two-way thread: inbound Resend parse webhook populates `messages` rows; outbound send uses the same React Email templates + a new `TeamToSeller` free-form template.
- **E11-S6** — `/team/submissions/[id]/documents` — upload/download via Supabase Storage. Two new buckets: `seller-docs` (private, signed URLs, long retention) and `seller-photos` (private, signed URLs, can mint public-read URLs per photo after seller approves listing). RLS policy scoped to the assigned team member + the seller (via E10's `seller_id = auth.uid()` rule).
- **E11-S7** — Handoff flow: reassign submission to another team member with reason + audit row in `assignment_events`. Email both parties. Seller does NOT get a "you've been reassigned" email — handled silently unless the new team member opts into a re-introduction.
- **E11-S8** — AI-context panel: read the seller's recent chat summaries from the E9 AI tables and render them in the submission detail view. Required disclaimers from `ai-agent-policy.md` (tech platform, not broker, not fiduciary).
- **E11-S9** — `/team/admin/roster/page.tsx` — team-only admin page (gated by `team_members.role = 'admin'` permission badge): add/deactivate team members, adjust `coverage_regions` and `capacity_active_max`, seed from migrations or edit in-place. Writes to `team_members`.
- **E11-S10** — Ops + observability: Sentry events (`team_login_failed`, `team_handoff_executed`, `team_doc_upload_failed`), runbook section, training doc for new team members, first-week feedback-collection plan.

## Role = permission badges (not separate tables)

Instead of `pm_members` / `tc_members` / `agent_members` or similar splits, `team_members.role text[]` carries `['pm', 'tc', 'agent', 'admin']` or subsets. Examples:

- A fully licensed ADRE agent: `role = ['pm', 'agent']` (both coordinates transactions *and* holds licensed authority for showings/negotiations)
- A transaction coordinator who isn't licensed: `role = ['tc']`
- A manager who routes assignments: `role = ['pm', 'admin']`

`assign_next_pm` RPC (E6) only filters on `is_active = true` and `coverage_regions`. Role-filtered routing (e.g. "only agents can take a listing-path submission") is a future refinement behind a feature flag, not MVP.

## Out of scope for E11 v1

- Cross-team-member dashboards (manager views over everyone's queue) — admin role can pull Supabase directly for MVP; real dashboard later
- Commission / payout tracking — PMs are salaried per positioning; none exists to track
- Calendar / scheduling integrations — click-to-dial + manual notes first; Calendly/etc. later
- Mobile app — responsive web only for v1; team members use laptops
- Real-time notifications — polling + browser tab indicator for v1; push notifications later
- Seller-initiated handoff request — sellers have no UI to request a different team member; ops-side only

## Key decisions to lock at architecture time

- Does `/team/*` live in this repo or become its own Vercel project? **This repo.** Shared schema + auth + Resend; splitting costs more than it buys for a single team of <10 people.
- SSR vs client-side hydration for the work queue? **SSR by default** matching the `/portal` patterns. Client islands for interactive bits (handoff modal, message composer).
- Public vs private for `seller-photos` bucket? **Private with signed URLs** even after listing approval. Public-read URLs mintable per-request if we ever surface on an MLS feed we don't control. Default private is the right safety posture.
- `team_members.id` = `auth.users.id` (1:1), matching `profiles.id` pattern? **Yes.** One auth identity per team member; the `team_members` row is the profile + permissions extension.
- Should team members see seller's raw `localStorage` draft if the submission failed halfway? **No.** Only `submissions` + `offervana_submission_failures` rows. If ops needs the draft, it's in the failure row's `draft_json`.

## Supabase Storage buckets (stays one vendor)

Confirmed: staying on Supabase Storage. No Vercel Blob introduction. New buckets added by E11:

- `seller-docs` — signed listing agreements, disclosures, contracts. Private. Seller + assigned team member read. Long retention.
- `seller-photos` — seller-uploaded property photos. Private with signed URLs. Team members read/write; seller reads own submission's photos.
- `team-uploads` — any attachment a team member puts on a submission that isn't a seller doc. Private. Team-only.
- (Existing: `ai-docs` — keep scoped to E9 AI chat uploads.)

Each with RLS via the `storage.objects` policies keyed on path prefix (`<submission_id>/...`). E11-S6 ACs spell out the exact SQL.

## References

- `src/components/portal/portal-data.ts:81` — current two-role seed shape to collapse
- `project_core_positioning.md` — "PMs aren't commission-based" + fiduciary-rep wedge
- `docs/anti-broker-audit.md:14` — PM assignment must be human-coordinated, PMs in our Supabase, not partner CRM
- `docs/ai-agent-policy.md` — disclaimer posture applies to the AI-context panel
- Supabase RLS on storage: https://supabase.com/docs/guides/storage/security/access-control
