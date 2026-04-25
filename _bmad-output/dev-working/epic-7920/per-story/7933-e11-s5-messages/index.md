---
work-item-id: 7933
work-item-type: User Story
work-item-code: E11-S5
parent-feature: 7920
parent-epic: 7776
repo: sell-house-for-free
branch: feature/e11-team-member-portal
last-completed-step: 5
file-groups:
  - migration
  - email-template
  - send-helper
  - webhooks
  - thread-ui
  - env-runbook
started-at: 2026-04-24T23:15:00Z
---

# E11-S5 — Messages thread sidecar

## Files added

- `supabase/migrations/20260424192000_e11_s5_messages_delivery.sql` — delivery_status/delivery_updated_at on messages; messages_dead_letter table; resend_message_id partial index.
- `src/lib/email/templates/team-to-seller.tsx` — React Email template with disclaimer footer.
- `src/lib/team/messages.ts` — `sendMessageFromTeam`, `markThreadRead`, `listThread`, `routeInboundEmail`.
- `src/lib/team/webhook-signature.ts` — HMAC-SHA256 verifier.
- `src/app/api/team/messages/resend-inbound/route.ts` — inbound parse webhook.
- `src/app/api/team/messages/resend-delivery/route.ts` — delivery reconcile webhook.
- `src/app/team/submissions/[id]/messages/page.tsx` — thread view with mark-as-read.
- `src/app/team/submissions/[id]/messages/actions.ts` — `sendTeamMessage` server action.
- `src/components/team/messages/Thread.tsx` — read-only thread renderer.
- `src/components/team/messages/Composer.tsx` — client-side composer.

## Files modified

- `.env.example` — adds RESEND_INBOUND_WEBHOOK_SECRET, RESEND_DELIVERY_WEBHOOK_SECRET, RESEND_INBOUND_DOMAIN, TEAM_PORTAL_URL, plus a note on EMAIL_REPLY_TO scope.
- `docs/pm-ops-runbook.md` — §20 messaging ops (Resend setup, troubleshooting, dead-letter replay).
- `src/lib/pm-service/observability.ts` — extends SentryEventName with team-portal events.

## Engineering decisions

### EDR-1: HMAC-SHA256, not Svix

The AC literally says "verifies Resend's webhook signature (HMAC of raw body against `RESEND_INBOUND_WEBHOOK_SECRET`)." Resend's production scheme uses Svix (more elaborate, includes timestamp + replay protection); we ship the simpler raw-HMAC variant. `webhook-signature.ts` is one helper — swap to Svix when we adopt their full scheme; downstream callers don't change.

### EDR-2: Idempotency on inbound `messages.resend_message_id`

S1 added the column without a unique constraint because inbound + outbound message IDs come from different pools (inbound = sender's Message-ID; outbound = Resend's response.id). Inbound idempotency is enforced via a `select 1 ... where direction = 'inbound'` pre-check before insert. Resend can retry a delivered webhook within minutes — duplicate insert would surface as a phantom unread badge.

### EDR-3: Per-submission Reply-To via `reply-<submission_id>@<domain>`

Routing inbound replies by recipient address is the simplest unambiguous scheme. Falling back to `In-Reply-To` covers clients that strip Reply-To (some webmail clients). Both fail → dead-letter table + Sentry event for ops triage.

### EDR-4: Dead-letter returns 200, not retry

Resend retries on non-2xx. We've durably captured the payload in `messages_dead_letter` so a retry would just create dupes. 200 stops the retry chain; ops uses the runbook to replay manually.

### EDR-5: Markdown-lite body (newlines preserved, no rich text)

Per AC #20 + epic out-of-scope: full rich-text editor is a yak shave. Newlines render as `<Text>` blocks; empty lines become `&nbsp;` spacers. Bold-by-asterisk etc. is future.

### EDR-6: Outbound row + activity audit insert separately, not in a single transaction

PostgREST doesn't support multi-table transactions in a single call. Failure modes: (a) Resend send succeeds, messages insert fails — caught by try/catch, logged via Sentry `team_message_insert_failed`. (b) Resend send + messages insert succeed, activity insert fails — silent loss of one audit row, but the messages row is the durable record. Not worth a saga pattern at MVP volume.

### EDR-7: Sender-user resolution via lower-cased email

For inbound rows we attempt `select id from profiles where lower(email) = lower($from)` to populate `sender_user_id`. Fallback NULL is fine — `sender_email` is always set. Index on `lower(email)` already exists from E6-S1.

### EDR-8: `markThreadRead` is service-role, not RLS

Called from the page Server Component before render. Marking-as-read should not silently fail under a stale RLS context (e.g. team member just lost assignment but is viewing a stale URL). We use admin client; the page's authorization check above (assignee or admin) is the gate.

## Halt expected

After commit: pause for user to apply `20260424192000_e11_s5_messages_delivery.sql` to dev Supabase.

## Manual smoke (AC #27)

After migration + .env additions:

1. Insert an outbound test row manually:
   ```sql
   insert into messages (submission_id, direction, sender_user_id, sender_email, subject, body, resend_message_id, delivery_status)
   values ('<sub-uuid>', 'outbound', '<team-auth-user-uuid>', 'team@sellfree.xyz', 'test', 'hello', 'fake-id', 'pending');
   ```
2. Hit `/team/submissions/<sub-uuid>/messages`. Expected: thread renders with the row + delivery badge "Sending…".
3. Use the composer to send a real message to a personal email address.
4. Reply from that email. Expected: within ~30s, refresh `/team/submissions/<sub-uuid>/messages` shows the inbound row.
5. Inspect `messages_dead_letter` — should be empty if routing succeeded.

## Open follow-ups

- Unit tests for `sendMessageFromTeam`, webhook signature, routing. Deferred to `zoo-core-unit-testing` after S10.
- Resend dashboard config + DNS verification — runbook captures the steps.
- Real Svix-based signature verification when we move to that scheme; helper swap is local to `webhook-signature.ts`.

## References

- Story: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7933
- Resend Inbound: https://resend.com/docs/api-reference/inbound-emails
- Resend Webhooks: https://resend.com/docs/webhooks
- E6-S4 send pattern: `src/lib/email/send.ts`
