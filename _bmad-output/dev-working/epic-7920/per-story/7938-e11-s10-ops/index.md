---
work-item-id: 7938
work-item-type: User Story
work-item-code: E11-S10
parent-feature: 7920
parent-epic: 7776
repo: sell-house-for-free
branch: feature/e11-team-member-portal
last-completed-step: 5
file-groups:
  - telemetry-helper
  - missing-emits
  - cron-vercel
  - docs
started-at: 2026-04-25T01:55:00Z
---

# E11-S10 — Ops + observability sidecar

## Files added / modified

- `src/lib/team/telemetry.ts` — `emitTeamPortalEvent` helper with PII redaction (recursive — emails + 10-digit phone numbers).
- `src/lib/team/__tests__/telemetry.test.ts` — 4 vitest cases (email redaction, phone redaction, non-PII passthrough, nested arrays/objects).
- `src/lib/pm-service/observability.ts` — extends `SentryEventName` with the seven new team-portal events.
- `src/app/team/auth/callback/route.ts` — emits `team_login_rejected_inactive` on roster mismatch.
- `src/app/team/submissions/[id]/handoff/actions.ts` — emits `team_handoff_executed` on successful handoff.
- `src/app/team/submissions/[id]/documents/actions.ts` — replaces the `team_message_insert_failed` placeholder with proper `team_doc_upload_failed` emits at `mintUploadUrl` + `finalizeUpload`.
- `src/app/team/admin/roster/actions.ts` — emits `team_admin_last_admin_protection_tripped` on both deactivate and remove-admin-role paths.
- `src/app/api/cron/team-portal/cleanup-orphan-storage/route.ts` — weekly cron handler with `CRON_SECRET` bearer auth + per-bucket recursive list + age filter + diff against `documents` table + batched delete.
- `vercel.json` — schedules the cron at `0 2 * * 1` (Monday 02:00 UTC).
- `.env.example` — adds `CRON_SECRET`.
- `docs/pm-ops-runbook.md` §21 — Sentry events table, alert-rule configuration, cron docs, common-incident playbook, 7-day dry-run gate.
- `docs/team-portal-onboarding.md` — full new-member training doc with day 1/2/3 plans, glossary, troubleshooting, first-week feedback plan.

## Engineering decisions

### EDR-1: Single `emitTeamPortalEvent` helper, not raw `captureException`

Compile-time guard against typoed event names (TypeScript's `Extract<SentryEventName, "team_${string}">` constrains the input). PII redaction runs before the underlying capture call; callers just pass `tags`.

### EDR-2: Recursive redaction of strings only

`redactValue` walks the payload tree and replaces emails / 10-digit phone matches inside string values; numbers / booleans pass through. Object keys aren't inspected — keys like `email` or `phone` are fine to identify the *kind* of field; the *value* is the part that must be redacted. Tested in 4 vitest cases.

### EDR-3: Storage list via `storage.from(bucket).list()` two-pass, not `storage.objects` table

Initial implementation queried `storage.objects` directly via PostgREST + a `.schema('storage')` call. Supabase JS v2 doesn't expose `.schema()` on the standard query builder (it's protected). Workaround: use the storage client's `.list()` for top-level submission folders and recurse one level into each. Slightly more network traffic; orphan sweep runs weekly so the cost is negligible. The created_at comparison happens client-side after both lists are complete.

### EDR-4: Cron auth via `CRON_SECRET` bearer header

Vercel's documented pattern. Secret lives in `vercel env`; `vercel.json` doesn't reference it (the bearer is sent automatically by the cron runner). Manual cURL invocations need the same header — captured in the runbook.

### EDR-5: Onboarding doc covers "disclaimer culture" explicitly

Per AC #6. The tech-platform-vs-broker posture isn't intuitive for new team members coming from real-estate jobs at brokerages. The doc has concrete ❌ / ✅ examples to internalize the language.

### EDR-6: First-week feedback plan committed in docs/, not tracked in a sidecar

Survey questions + Slack channel + cadence live in `docs/team-portal-onboarding.md`. The plan is a contract with the team, not an internal ops artifact.

### EDR-7: 7-day dry-run gate

S10 stays in Code Review for 7 days after S1–S9 land in production. Alert thresholds (3 / 1h, 5 / 1h) are first guesses — they need real-traffic data. Documented in the runbook; no automation enforces the wait.

## Halt expected

No new migration. The migration list for E11 is closed at S9.

## Manual smoke

1. Run `npx vitest run src/lib/team/__tests__/telemetry.test.ts` — passes 4 cases.
2. Trigger a team_login_rejected_inactive — deactivate self, sign back in, see Sentry event in the JSON breadcrumb console output.
3. Trigger a successful handoff — see `team_handoff_executed` emit.
4. Trigger an admin-roster last-admin protection (with one admin only, attempt to remove admin role) — see emit.
5. Manually invoke the cron (with `CRON_SECRET` set):
   ```sh
   curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/team-portal/cleanup-orphan-storage
   ```
   Response shows per-bucket summary with `totalDeleted: 0` on a clean dev DB.
6. Read `docs/team-portal-onboarding.md` end-to-end.
7. Confirm `vercel.json` cron config is valid (Vercel dashboard picks it up on next deploy).

## Open follow-ups

- Sentry alert rules — created via dashboard, not in code. Document the actual rule IDs in the runbook once configured.
- Real Sentry SDK swap — `captureException` is currently a `console.error` JSON stub. E8 ships the real SDK; this story's emits become real captures with no code changes.
- Per-event-type dashboard views — future, when ops wants metrics over time.

## References

- Story: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7938
- E6-S8 ops runbook precedent: `docs/pm-ops-runbook.md`
- AI agent policy (training-doc disclaimer culture): `docs/ai-agent-policy.md`
- Existing `captureException` stub: `src/lib/pm-service/observability.ts`
