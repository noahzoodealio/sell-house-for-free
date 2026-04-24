---
slug: e11-bulk-s1-to-s10
parent-feature-id: 7920
parent-feature-url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7920
ado-grandparent-epic-id: 7776
ado-grandparent-epic-url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7776
mode: bulk
mode-ado: mcp
architecture-doc: null  # epic brief called for /zoo-core-create-architecture e11 but story decomposition proceeded directly from the epic brief; architecture doc can still be added before Dev picks this up
stories-planned:
  - e11-s1-schema-messages-documents-activity-storage
  - e11-s2-team-magic-link-auth
  - e11-s3-team-work-queue
  - e11-s4-submission-detail-view
  - e11-s5-two-way-messaging-resend-inbound
  - e11-s6-documents-vault-supabase-storage
  - e11-s7-handoff-flow
  - e11-s8-ai-context-panel
  - e11-s9-admin-roster
  - e11-s10-ops-observability-training
stories-created:
  - id: 7929
    url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7929
    title: "E11-S1 — Schema: messages + documents + team_activity_events tables + seller-docs/seller-photos/team-uploads Storage buckets + RLS scoped to assigned team member"
    size: M
    parent-linked: true
  - id: 7930
    url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7930
    title: "E11-S2 — /team/login + /team/auth/callback: email-only magic-link auth gated on team_members.is_active, rejects non-roster emails, reuses @supabase/ssr"
    size: M
    parent-linked: true
  - id: 7931
    url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7931
    title: "E11-S3 — /team work queue: submissions where pm_user_id = auth.uid(), sorted oldest unreviewed, SLA badge (green/amber/red per 4h/24h), unread-message count"
    size: M
    parent-linked: true
  - id: 7932
    url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7932
    title: "E11-S4 — /team/submissions/[id] detail view: seller snapshot, path selection, offervana results + override, doc vault summary, activity timeline, action rail"
    size: L
    parent-linked: true
  - id: 7933
    url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7933
    title: "E11-S5 — /team/submissions/[id]/messages two-way thread: Resend inbound parse webhook populates messages, outbound TeamToSeller React Email template + delivery webhook reconcile"
    size: L
    parent-linked: true
  - id: 7934
    url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7934
    title: "E11-S6 — /team/submissions/[id]/documents vault: upload/download via Supabase Storage (seller-docs/seller-photos/team-uploads), doc_kind taxonomy, signed-URL lifecycle"
    size: M
    parent-linked: true
  - id: 7935
    url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7935
    title: "E11-S7 — Handoff flow: reassign submission to another team member with reason + assignment_events audit + dual-email; seller silent unless re-intro opted in"
    size: M
    parent-linked: true
  - id: 7936
    url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7936
    title: "E11-S8 — /team/submissions/[id]/ai-context panel: render seller's recent ai_sessions + ai_messages summaries with required tech-platform/not-fiduciary disclaimers"
    size: M
    parent-linked: true
  - id: 7937
    url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7937
    title: "E11-S9 — /team/admin/roster: add/deactivate team members, edit coverage_regions + capacity_active_max, role-badge toggles; gated by team_members.role @> '{admin}'"
    size: M
    parent-linked: true
  - id: 7938
    url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7938
    title: "E11-S10 — Ops + observability: Sentry events, alert rules, ops runbook, training doc, first-week feedback plan + orphan-storage cron"
    size: M
    parent-linked: true
started-at: 2026-04-23T22:30:00Z
completed-at: 2026-04-23T22:45:30Z
last-completed-step: 5
---

# E11 — Team-Member Portal — Story Decomposition

Filed 10 User Stories under Feature 7920 via `/zoo-core-create-story E11` on 2026-04-23.

## Suggested implementation order

1. **S1 (7929)** — schema + Storage buckets + RLS. Unblocks everything; blocks S3/S4/S5/S6/S7/S9.
2. **S2 (7930)** — team magic-link auth. Depends on S1; gates S3+ login.
3. **S3 (7931)** — work queue. Depends on S1 + S2.
4. **S4 (7932)** — submission detail shell with tabs. Depends on S1/S2/S3.
5. **S5 (7933)** — messages (inbound webhook, outbound template, delivery webhook, thread UI). Depends on S1/S4 + E6-S4 Resend singleton.
6. **S6 (7934)** — documents vault (upload/download/RLS). Depends on S1/S4. Parallel with S5.
7. **S7 (7935)** — handoff flow. Depends on S1/S4 (and S5 for optional seller re-intro). Can ship after S4 lands.
8. **S8 (7936)** — AI-context panel. Depends on E9 (ai tables already shipped) + S1/S4. Parallel with S5/S6/S7.
9. **S9 (7937)** — admin roster. Depends on S1/S2 + E6-S1 team_members. Can ship early (right after S2).
10. **S10 (7938)** — ops + observability + training + feedback + cron. Lands LAST; 7-day dry-run gate after S1-S9 are in prod.

## Dependency chain

```
S1 ── S2 ─┬─ S3 ── S4 ─┬── S5 ──┐
          │             │        ├── S10
          │             ├── S6 ──┤
          │             │        │
          │             ├── S7 ──┤
          │             │        │
          │             └── S8 ──┘
          │
          └── S9 ─────────────────┘
                                   
  (S10 instruments all prior surfaces + 7-day dry-run)
```

## Key architectural decisions locked in the stories

- **Unified role = permission badges.** `team_members.role text[]` carries `pm | tc | agent | admin`. No separate PM/TC/Agent tables. MVP `assign_next_pm` doesn't filter on role; role-based routing is a future flag.
- **Storage = Supabase-only (3 new buckets).** `seller-docs`, `seller-photos`, `team-uploads`. All private with signed URLs. Path prefix = `<submission_id>/`. RLS via `is_submission_assignee(sub_id)` security-definer helper to avoid policy recursion.
- **Auth = email magic link only.** No phone OTP for team. Anti-enumeration in login server action. Defense-in-depth `is_active` re-check in callback.
- **`/team/*` middleware + noindex** added in S2. Mirrors E10-S5 with a different path prefix.
- **Activity timeline is unified.** `team_activity_events` + `messages` + `assignment_events` merged chronologically in S4's detail view. Team thinks narrative, not entity-type.
- **Handoff resets `assigned_at`.** New assignee gets a fresh SLA clock.
- **`capacity_active_current` via DB trigger**, not read-modify-write from app code.
- **Per-submission reply address** for inbound email routing (`reply-<sid>@mail.sellfree.xyz`), with In-Reply-To header fallback.
- **AI-context panel is read-only + disclaimer-banner required.** Team cannot start sessions; PII not redacted at display (team is authorized). Three-part disclaimer per `ai-agent-policy.md` verbatim.
- **Admin deactivation = soft.** FK from `submissions.pm_user_id` prevents delete. `auth.admin.signOut` called to shorten access-token window; S2's `is_active` re-check covers the rest.
- **Last-admin protection** at the server-action layer. Prevents unrecoverable 'no admins' state.
- **Ops = 7-day dry-run** before S10 closes, so alert thresholds reflect real traffic.
- **`vercel.ts` (not vercel.json)** for the orphan-storage cron (S10) per 2026 knowledge-update.

## Micro-migrations threaded through stories (track during implementation)

- **S1**: primary migration — 3 tables + 3 buckets + 2 helper functions.
- **S2**: relax `team_activity_events.submission_id` NOT NULL; add `login`, `login_rejected_inactive` to event_type.
- **S4**: `alter table submission_offers add column team_note text`.
- **S5**: `messages.delivery_status` + `messages.delivery_updated_at`; `messages_dead_letter` table.
- **S6**: add `document_deleted` to `team_activity_events.event_type`.
- **S7**: `capacity_active_current` trigger on `team_members` (keyed on `submissions` writes).
- **S9**: add `team_member_added`, `team_member_deactivated`, `team_member_reactivated`, `team_member_role_changed`, `team_member_coverage_changed`, `team_member_capacity_changed` to event_type.

Consolidate into one or two follow-up migrations at Dev time rather than eight separate ones — but the decision is Dev's.

## New env vars (delta)

- `RESEND_INBOUND_WEBHOOK_SECRET` — S5 inbound signature verify.
- `RESEND_DELIVERY_WEBHOOK_SECRET` — S5 delivery webhook signature verify.
- `RESEND_INBOUND_DOMAIN` — e.g. `mail.sellfree.xyz`.
- `CRON_SECRET` — S10 orphan-storage cron auth (if not already present from earlier crons; audit at Dev time).

## Coordination with other epics

- **E6** supplies `profiles`, `submissions`, `submission_offers`, `team_members`, `assignment_events`, `assign_next_pm`, and the Resend singleton + notification_log infra. E11 consumes + extends.
- **E9** supplies `ai_sessions`, `ai_messages`, `ai_artifacts`, `extractText` helper, chat UI primitives, `<AiDisclaimerBanner>`. E11-S8 is read-only consumer.
- **E10** supplies `@supabase/ssr`, `/portal/auth/callback` pattern, middleware template, `auth_resend_attempts` rate-limit table. E11-S2 mirrors it with a different prefix + email-only surface.
- **E12** (property enrichments durable cache) independent; no interaction.

## Flagged for Noah before Dev picks this up

1. **No architecture doc exists.** Epic brief called for `/zoo-core-create-architecture e11` before decomposition. Stories ground in the epic brief + real code research, so Dev has enough to implement — but if you want a formal arch doc, file it before S1 starts. Stories remain valid.
2. **S1 + S2 are prerequisites for almost everything.** If you're sequencing sprints, land S1 + S2 in the first block, then S3/S4 shell, then the parallel S5/S6/S7/S8 surfaces, then S9 + S10.
3. **Resend inbound + per-submission reply addresses** require a DNS change (`mail.sellfree.xyz` subdomain MX + DKIM). S5 AC 23 confirms this; confirm your DNS ownership posture before S5 implementation.
4. **`vercel.ts` migration** — S10 assumes we're on `vercel.ts` (knowledge-update says this is the modern config). If we're still on `vercel.json`, Dev can place the cron config there and flag the migration as a separate follow-up.
5. **Storage-Supabase-only memory is load-bearing.** S6 intentionally does NOT introduce Vercel Blob or any alternative. If that ever changes, revisit S6 + S10 orphan cron.
6. **7-day dry-run on S10.** Intentional. S10 stays in Code Review for a week after S1-S9 ship, then tunes thresholds against real traffic. Adjust if you want to close the epic faster.

## References

- Epic brief: `_bmad-output/epic-working/e11-team-member-portal/index.md`
- E6-S1 schema (profiles, submissions, submission_offers, team_members, assignment_events): `_bmad-output/story-working/e6-bulk-s1-to-s8/scope-revision-2026-04-23.md`
- E9 session lib (AI tables + extractText): `src/lib/ai/session.ts`
- E10-S4 RLS policy patterns: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7926
- AI policy (disclaimer copy + redaction posture): `docs/ai-agent-policy.md`
- Analytics policy (no third-party on `/team/*`): `docs/analytics-policy.md`
- Memory — Storage Supabase-only: `C:\Users\Noah\.claude\projects\C--Users-Noah-sell-house-for-free\memory\project_storage_supabase_only.md`
- Memory — Unified team role: `C:\Users\Noah\.claude\projects\C--Users-Noah-sell-house-for-free\memory\project_unified_team_role.md`
- Memory — React 19 ref-as-prop: `C:\Users\Noah\.claude\projects\C--Users-Noah-sell-house-for-free\memory\feedback_react19_ref_as_prop.md`
- Memory — AI disclaimer posture: `C:\Users\Noah\.claude\projects\C--Users-Noah-sell-house-for-free\memory\feedback_ai_disclaimer_posture.md`
