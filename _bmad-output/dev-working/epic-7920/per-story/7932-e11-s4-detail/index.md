---
work-item-id: 7932
work-item-type: User Story
work-item-code: E11-S4
parent-feature: 7920
parent-epic: 7776
repo: sell-house-for-free
branch: feature/e11-team-member-portal
last-completed-step: 5
file-groups:
  - migration
  - lib-actions
  - components-page
started-at: 2026-04-25T00:05:00Z
---

# E11-S4 — Submission detail sidecar

## Files added

- `supabase/migrations/20260424194000_e11_s4_submission_offers_team_note.sql` — adds `team_note text` to `submission_offers`.
- `src/lib/team/submissions.ts` — `loadSubmissionDetail`, `loadSubmissionOffers`, `loadActivityTimeline` (unified merge of team_activity_events + messages + assignment_events with actor-name resolution), STATUS_ADVANCE_MAP, STATUS_LABELS, `labelSellerPath`.
- `src/app/team/submissions/[id]/actions.ts` — `advanceStatus`, `addNote`, `updateOfferOverride`.
- `src/components/team/submission/PropertySnapshot.tsx`
- `src/components/team/submission/SellerPathCard.tsx`
- `src/components/team/submission/OfferOverrideRow.tsx`
- `src/components/team/submission/StatusControls.tsx`
- `src/components/team/submission/NoteComposer.tsx`
- `src/components/team/submission/ActivityTimeline.tsx`
- `src/components/team/submission/ActionRail.tsx`
- `src/app/team/submissions/[id]/page.tsx` — Server Component cockpit.

## Engineering decisions

### EDR-1: Server-side merge of three tables, not SQL view

`loadActivityTimeline` runs three parallel reads (`team_activity_events` / `messages` / `assignment_events`) and merges client-side. A single SQL view would push complexity into the DB, fragmenting RLS coverage. Keeping the merge in TypeScript means the RLS-respecting helpers stay in their own table contexts.

### EDR-2: Actor-name resolution via two batch lookups

The activity timeline needs sender names. Sender ids may live in either `profiles` (sellers) or `team_members.auth_user_id` (team). We do two `IN` lookups against the unique-id list, build a map, and patch each event before render. Avoids an N+1 across small datasets and avoids a brittle multi-table OR join.

### EDR-3: `team_note` lives on `submission_offers`, not a new `offer_notes` table

Per AC #6 the override is exactly one note per offer; a separate table is overkill. Single column, nullable. Updates audited via `team_activity_events` `event_type = 'note_added'` with `event_data.target = 'offer'`.

### EDR-4: STATUS_ADVANCE_MAP enforces forward-only transitions

`new → assigned → active → closed_won|closed_lost`. No back-transitions in the UI. If ops needs to back out, manual SQL via runbook §1 — keeps the audit trail clean.

### EDR-5: ActionRail is server-rendered links, not modal opens

S7 (handoff) and S8 (AI context) use their own routes; S5 (messages) and S6 (documents) already do too. Keeping the ActionRail as a `<nav>` of `Link`s lets each surface own its scroll position + back-stack.

### EDR-6: Detail page lives at `/team/submissions/[id]` (no nested `/detail` segment)

The AC lists `/team/submissions/[id]/page.tsx` as the default surface, with sub-routes for messages / documents / handoff / ai-context layered alongside. We honor that — the sub-routes already shipped in S5/S6 sit beside this default.

### EDR-7: Forbidden-but-existing access bounces to /team

Per AC #2: redirect to `/team` on access denial — different posture from S6's `notFound()`. We respect both: S4's redirect tells the user "you tried to view someone else's submission", S6's notFound() avoids leaking the existence of a tab. The detail surface is the higher-trust signal; redirecting is cleaner than 404 for a top-level entity.

### EDR-8: UUID validation on `params.id` before querying

Cheap regex guard so a malformed URL doesn't reach Postgres. Prevents both noise in logs and the "what does Supabase do with a bad uuid" question.

## Halt expected

After commit: pause for user to apply `20260424194000_e11_s4_submission_offers_team_note.sql` (single ALTER TABLE).

## Open follow-ups

- Skeleton loading states (currently relying on Next.js streaming defaults).
- Status-change reasons UI (the action accepts an optional reason; the StatusControls component doesn't yet collect one — quick follow-up).
- Per-event-type icons in the timeline are emoji placeholders; replace with proper iconset when/if we add one.

## References

- Story: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7932
- E6-S1 submissions/offers shape: `supabase/migrations/20260424170200_e6_s1_submissions.sql`
