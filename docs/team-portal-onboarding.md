# Team Portal — Onboarding Guide

This is the new-team-member guide for the `/team` portal. Read it on day 1; ping the admin who invited you with anything that's missing or wrong.

## The portal in one paragraph

Sell Free is a tech platform — we're not a brokerage. The `/team` portal is your cockpit for working a seller's submission end-to-end: see the queue of homeowners assigned to you, open a submission to view their property and the offers Offervana returned, send and receive emails with the seller, upload signed contracts, see what they've been asking our AI agent, hand off to a teammate when needed.

Everything you do in the portal is logged to `team_activity_events`. That's intentional — the audit trail is part of how we keep the seller's trust.

## Day 1 — first login

1. **You should have a magic-link email** from `team@<sender-domain>` with a button to sign in. Click it.
2. The link drops you on `/team` — your work queue. If something looks wrong (wrong queue, "account inactive" message, etc.), DM the admin who invited you.
3. **Tour the queue.** Each row is one submission. The colored dot on the left is the SLA band:
   - Green = under 4 hours since you were assigned, no unread seller messages.
   - Amber = 4–24 hours, OR unread messages older than 4h.
   - Red = over 24h with no team activity from you.
4. **Use j/k to navigate**, Enter to open a submission. The keyboard shortcuts are there because triaging the queue should feel fast.
5. **Open the oldest red row first.** Reds are how the SLA promise to sellers gets broken; clear those before greens.

### Your first seller email

1. Open a submission.
2. Click the "Messages" link in the right-hand action rail.
3. Read whatever's already there.
4. Compose a short note in the textbox. Be plainspoken — talk to the seller like a person, not a brochure. Avoid claims about being their broker; we are *a tech platform connecting them with* a licensed third-party broker (JK Realty).
5. Click Send. The outbound message lands in the thread with delivery status (pending → delivered or bounced).

### What to do at the end of day 1

Add a note to one of the submissions you opened. Click "Save note" in the right-hand panel. That note shows up in the activity timeline + on the queue's "last activity" column. It's a good first reflex.

## Day 2 — handoff and documents

### Handoff

When you take time off, get sick, or realize a submission needs someone with different expertise:

1. Open the submission's detail page.
2. Click "Handoff" in the action rail.
3. Pick a teammate (capacity numbers like `3/10` are visible).
4. Pick a reason from the dropdown. Reasons drive Slack alerts + ops summaries — pick honestly.
5. Add a note if it's "Other" or if the next person needs context.
6. Decide whether to send the seller a re-introduction. **Default off** is fine — most handoffs are invisible internal churn.
7. Submit. The teammate gets an email; you get a confirmation; the SLA clock resets for them.

### Documents

The vault under "Documents" has three sections:

- **Seller Docs** — listing agreement, T-47, HOA paperwork, title commitments. Long retention. Sellers can also see these.
- **Seller Photos** — property photos. Sellers can see + add to these.
- **Team Uploads** — internal. Sellers cannot see these. Use for handoff context, draft contracts, internal comments with attachments.

Upload by drag-and-drop or the "Choose file" button. PDF / JPG / PNG / DOC / DOCX, 25 MB max. Downloads mint a 10-min signed URL — share it carefully; expired URLs require a fresh download.

Hard-deletes are real. Recovery requires a Supabase backup restore. Pause before clicking delete.

## Day 3 — AI context and disclaimer culture

### AI context

If a seller has talked to our AI agent at `/portal/chat`, the "AI context" tab on a submission shows you:

- Recent sessions (5 most recent).
- First user question + most-recent answer per session.
- Artifacts the AI generated (doc summaries, offer analyses, valuations).
- Full transcript on demand.

Read this before calling a seller for the first time. Two reasons: (1) you don't waste their time by repeating ground they covered with the bot, (2) you can catch any confusion the AI might have seeded so you can correct it gently.

### Disclaimer culture

The amber banner on the AI-context page is the same disclaimer copy that's everywhere else:

> Sell Free is a tech-platform feature, not legal, financial, or fiduciary advice. JK Realty is a third-party licensed broker. AI outputs are not licensed professional opinions.

This isn't theater. We genuinely are a platform, not their broker. JK Realty is who's licensed to represent them.

Practical translations:

- ❌ "I'll handle the listing for you." → ✅ "I can connect you with our partner broker who'll handle the listing."
- ❌ "Your home is worth $X." → ✅ "Offervana's range came back at $X–$Y. The licensed agent will give you a real CMA."
- ❌ "Sign this as your buyer's contract." → ✅ "This is the listing agreement from the broker."

The litmus test: if a regulator read this email, would they think we were practicing brokerage? If yes, rephrase.

## Troubleshooting

### "I can't see submission X"

Either you're not assigned to it, or there's a stale assignment. Ask an admin to check `submissions.pm_user_id` in Supabase, OR ask the previous assignee to handoff to you.

### "Magic-link email never arrived"

Check spam first. If it's truly missing, ask the admin to re-send via the roster page (deactivate + reactivate works as a workaround, but don't do that to yourself if you're the only admin).

### "Outbound email bounced"

The seller's email is bad. Don't keep retrying — bounces compound spam reputation damage. Phone them with their alternate contact, or log the bad email and pause until you can confirm a working one.

### "Inbound seller reply isn't showing up"

Check `messages_dead_letter` in Supabase (admin) or ask an admin. Could be a Resend webhook hiccup, or the seller's email client stripped the per-submission Reply-To. The runbook section §20 has replay SQL.

## First-week feedback plan

We're collecting feedback intentionally for the first two weeks. Three channels:

1. **Daily async standup** in `#team-portal-feedback` Slack channel: anything the portal slowed you down on today, anything that surprised you, anything you wished worked differently.
2. **End-of-week-1 survey** sent via Slack DM by Noah on day 7. Five questions — quickest win, biggest friction, missing feature, bug rate, would-you-recommend score. Takes ~3 minutes.
3. **Async channel** `#team-portal-feedback` is open all the time. Drop screenshots, error messages, opinions whenever they hit.

Week 2 is review-and-prioritize. The survey + daily standups feed a follow-up backlog filed as new ADO Stories.

### Survey questions (week 1)

When the survey lands, you'll see these:

1. **Quickest win:** what one thing in the portal saved you the most time / friction this week?
2. **Biggest friction:** what's the single most painful thing about the portal as it exists?
3. **Missing feature:** what's something you assumed would be there but isn't?
4. **Bug rate:** how many bugs / weird states did you encounter (rough count)?
5. **Would-you-recommend:** 1–10, how would you rate the portal to a peer joining the team?

There's no wrong answer. Negative feedback during week 1 is the most valuable feedback we'll get.

## Glossary

- **Submission** — a homeowner's application to Sell Free. Has a `submissions.id` (uuid) + `submission_id` (the Offervana correlation key, text).
- **Path** — one of `cash` / `cash_plus` / `snml` / `list`. Marketing labels for the different routes a seller can take.
- **PM (Project Manager)** — historically one of three roles. In our unified-role world, just a permission badge on `team_members.role`.
- **TC (Transaction Coordinator)**, **Agent** — same: permission badges, not separate roles.
- **Handoff** — reassigning a submission from one team member to another. Always documented + audited.
- **AI agent** — the seller-facing bot at `/portal/chat`. Tech-platform feature, not a fiduciary.

## When in doubt

Ping `#team-portal-feedback`, or DM whoever invited you. The portal is small + the team is small; a question is rarely a dumb question.
