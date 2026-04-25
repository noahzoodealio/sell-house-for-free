---
work-item-id: 7931
work-item-type: User Story
work-item-code: E11-S3
parent-feature: 7920
parent-epic: 7776
repo: sell-house-for-free
branch: feature/e11-team-member-portal
last-completed-step: 5
file-groups:
  - lib
  - components
  - page
started-at: 2026-04-25T00:35:00Z
---

# E11-S3 — Work queue sidecar

## Files added / modified

- `src/lib/team/sla.ts` — `computeSlaBand` + SLA_LABELS.
- `src/lib/team/queue.ts` — `loadQueue` (multi-table batched read with unread/lastMessage/lastTouched maps + sort).
- `src/components/team/queue/WorkQueueTable.tsx` — table client island with j/k/Enter keyboard nav, derived bounded cursor.
- `src/components/team/queue/WorkQueueLive.tsx` — `document.title` updater + 60s `router.refresh()` poll.
- `src/app/team/page.tsx` — replaced the S2 stub with the real queue surface (open/closed tabs, mine/all admin toggle, empty states, inactive copy).

## Engineering decisions

### EDR-1: Server-side SLA, derived cursor

`computeSlaBand` runs server-side per row so `slaBand` is part of the row payload — no client-side recomputation. The keyboard-cursor is derived (`Math.min(cursor, rows.length - 1)`) instead of synced via `useEffect(setState)`, satisfying the project's React 19 set-state-in-effect lint rule.

### EDR-2: Batched aggregation in TS, not SQL

The AC's reference SQL has correlated subqueries for `unread_count`, `last_message_at`, `last_touched_at`. Postgres handles them fine, but Supabase's PostgREST API doesn't expose subqueries elegantly. Instead we run four parallel reads (submissions + unread inbound counts + last-message-by-submission + last-touched-by-this-user) and reduce to maps in TypeScript. Cleaner under PostgREST + still one network round-trip.

### EDR-3: Sort: unread-first, then assigned-asc

Done client-side after the SQL `order by assigned_at asc` because the unread aggregation is computed in TS. With < 100 rows in the queue, this is fine.

### EDR-4: Inactive-account empty state lives on `/team`, not the login page

The middleware lets active sessions through to `/team`. If an admin deactivates a team member while their session is alive, the next page load surfaces the inactive copy + sign-in link. Avoids redirect-loop-with-error pattern.

### EDR-5: 60s polling via `router.refresh()`

Poll cadence per AC. Picked `router.refresh()` over a custom fetcher because the queue page is a Server Component — `router.refresh()` re-runs the loader. No hydration mismatch + no duplicated query layer.

### EDR-6: Admin `?view=all` filter is permissioned in the page, not the helper

The page parses `view` only after confirming `member.isAdmin`; non-admin requests never trip the all-rows branch. Defensible in either layer; putting it in the page keeps the helper purely declarative.

### EDR-7: Closed tab uses the same helper

`tab=closed` swaps in `closed_won` / `closed_lost` statuses. Same shape of row, same SLA logic (which renders red for closed-won-but-active-still — but closed rows are usually grouped chronologically anyway). Could refine with a closed-specific column set in a future pass.

## Open follow-ups

- Pagination beyond 100 rows (use search params `?page=N`).
- Saved filters (e.g. "Tucson only", "cash-path only") — future.
- Real-time push instead of 60s polling — future.

## References

- Story: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7931
- Portal seed responseTime baseline: `src/components/portal/portal-data.ts:86` ("< 4 hrs")
