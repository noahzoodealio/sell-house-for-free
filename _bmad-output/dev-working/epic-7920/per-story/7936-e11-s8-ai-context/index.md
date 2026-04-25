---
work-item-id: 7936
work-item-type: User Story
work-item-code: E11-S8
parent-feature: 7920
parent-epic: 7776
repo: sell-house-for-free
branch: feature/e11-team-member-portal
last-completed-step: 5
file-groups:
  - lib
  - component
  - page
started-at: 2026-04-25T01:10:00Z
---

# E11-S8 — AI-context sidecar

## Files added

- `src/lib/team/ai-context.ts` — `loadAiContextForSubmission`, `loadAiArtifacts`, `extractText`, `buildAiContextBrief`, `recordAiContextViews` (per-day debounce).
- `src/components/team/ai-context/SessionCard.tsx` — collapsible card with copy-brief.
- `src/app/team/submissions/[id]/ai-context/page.tsx` — read-only page with mandatory disclaimer banner.

## Engineering decisions

### EDR-1: Read-only by design

Per AC #13. The page makes zero outbound AI calls. Pure display of `ai_sessions` / `ai_messages` / `ai_artifacts`. Teams cannot start an AI session as the seller — would violate the tech-platform-not-broker posture.

### EDR-2: Per-day audit debounce via `event_data` containment

`recordAiContextViews` looks up the last 24h's audit rows by `submission_id + team_user_id + event_type = 'ai_context_viewed'` AND `event_data @> '{"session_id": ...}'` (PostgREST `.contains`). One audit row per (member, session, day). Refreshes within the same day are silent.

### EDR-3: Disclaimer copy verbatim from `ai-agent-policy.md`

Three-part disclaimer surfaces in an `aside role="note" aria-label="AI disclaimer"`. Copy is not negotiable per project memory. The amber styling matches the policy doc's intent (informational warning, not error).

### EDR-4: No display-time PII redaction

Per AC #7. Team members are authorized to see seller PII. Display-time redaction would obstruct the job. Documented intentional choice.

### EDR-5: Inline `extractText` rather than reusing `src/lib/ai/session.ts`

The E9 helper is bundled with chat-runtime imports we don't need on the team-portal page. A small local copy keeps S8's bundle footprint minimal. If E9's shape evolves, we update one helper file in `src/lib/team/ai-context.ts` — same logical contract.

### EDR-6: `ai_sessions.submission_id` is text, joined to `submissions.submission_id`

Per the E9 schema, `ai_sessions.submission_id text` is a soft reference to `submissions.submission_id text` (the Offervana correlation key), NOT the uuid. The page passes `submission.submission_id` (text) to `loadAiContextForSubmission`. Mistake-resistance: column name is the same, but uuid would yield zero matches.

### EDR-7: Copy-brief uses `navigator.clipboard.writeText`

Falls back to silent no-op on insecure contexts (http://). Production runs over HTTPS; dev runs over http://localhost which Chrome treats as secure. Tested locally.

## Open follow-ups

- Pagination beyond 5 sessions / 50 messages — UI shows the most recent slice; full transcript pagination is a future refinement.
- Reuse E9 chat message components (the AC suggests it but they're tightly bound to seller chat state). Inlining the renderer is simpler for v1.

## References

- Story: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7936
- E9 schema: `supabase/migrations/20260423190000_e9_s1_ai_tables.sql`
- AI policy: `docs/ai-agent-policy.md`
