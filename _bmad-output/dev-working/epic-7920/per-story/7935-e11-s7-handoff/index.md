---
work-item-id: 7935
work-item-type: User Story
work-item-code: E11-S7
parent-feature: 7920
parent-epic: 7776
repo: sell-house-for-free
branch: feature/e11-team-member-portal
last-completed-step: 5
file-groups:
  - migration
  - lib-emails
  - action
  - page-form
started-at: 2026-04-25T00:50:00Z
---

# E11-S7 — Handoff sidecar

## Files added

- `supabase/migrations/20260424195000_e11_s7_handoff.sql` — capacity columns + capacity-sync trigger + `team_handoff` RPC.
- `src/lib/email/templates/handoff-emails.tsx` — HandoffOutgoing + HandoffIncoming React Email templates.
- `src/lib/team/handoff.ts` — `listHandoffCandidates`, `callHandoffRpc`, `sendHandoffEmails`, HANDOFF_REASONS.
- `src/app/team/submissions/[id]/handoff/actions.ts` — `initiateHandoff` server action chains RPC + emails + optional seller re-intro via `sendMessageFromTeam`.
- `src/components/team/handoff/HandoffForm.tsx` — single-page form (vs. modal — see EDR-1).
- `src/app/team/submissions/[id]/handoff/page.tsx` — Server Component page.

## Engineering decisions

### EDR-1: Page, not modal

S4's ActionRail wires `/team/submissions/[id]/handoff` as a sub-route. Implementing as a page (vs. a modal) keeps S7 consistent with S5/S6/S8 and avoids importing a focus-trap modal library we don't currently use. Cancellation routes via `router.back()`.

### EDR-2: `team_handoff` SECURITY DEFINER RPC for atomicity

Per AC #14, all DB writes (assignment_events insert, submissions update, team_activity_events insert) must commit atomically. PostgREST doesn't expose multi-statement transactions on table writes. Solution: SECURITY DEFINER plpgsql RPC. Caller is service-role; the function runs the writes inside the implicit RPC transaction. Rolls back on any error.

### EDR-3: Capacity trigger covers all three cases

`team_members_capacity_sync` handles insert (new submission), update (pm_user_id or status change), delete. Backfilled current values from existing submissions. The trigger uses `greatest(0, current - 1)` so under-counting is impossible if the schema state ever drifts.

### EDR-4: Reason validation in two places (RPC + action)

The RPC `check (p_reason in (...))` is the durable safety net; the server action's `HANDOFF_REASONS.includes(reason)` is the fast-fail before round-trip. Belt + suspenders.

### EDR-5: `handoff_completed` is implicit, not auto-written

Per AC #5 decision: `handoff_initiated` is written immediately; `handoff_completed` would be a stale flag if the new assignee never picks up. The first `team_activity_events` row from the new assignee IS the implicit completion signal.

### EDR-6: Reset `assigned_at` on handoff

Per AC #9. SLA clock measures "time assigned to the current team member", not original submit time. Implemented inside the RPC.

### EDR-7: Seller re-intro reuses `sendMessageFromTeam`

If the team member opts to send a re-intro, the action calls S5's `sendMessageFromTeam` with a canned subject/body. Reuses the full outbound stack (Resend + retry + audit + delivery webhook reconciliation). No new template needed.

### EDR-8: Email failures don't block the DB write

Per AC #6. `sendHandoffEmails` swallows + logs errors via Sentry stub. The DB transaction is the source of truth; the audit row in `assignment_events` exists even if both notification emails fail. Ops can re-send manually if needed.

## Halt expected

After commit: pause for user to apply `20260424195000_e11_s7_handoff.sql` (adds two columns + trigger + RPC).

## Manual smoke

1. Seed two active team_members + one submission assigned to A.
2. Visit `/team/submissions/<id>/handoff` as A.
3. Pick B, reason vacation, no note, no seller re-intro. Submit.
4. Verify: `submissions.pm_user_id` = B; `submissions.assigned_at` ≈ now; `assignment_events` has a `reassigned` row; `team_activity_events` has a `handoff_initiated` row.
5. Capacity counters: A's `capacity_active_current` decremented, B's incremented.
6. Both A and B receive emails (visible in Resend dashboard if configured).
7. Toggle seller re-intro → verify `messages` outbound row appears + delivery to seller.

## References

- Story: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7935
- E6-S1 `assign_next_pm` precedent for SECURITY DEFINER RPC: `supabase/migrations/20260424170400_e6_s1_assign_next_pm.sql`
