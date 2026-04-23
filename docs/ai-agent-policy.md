# AI Agent Policy

> Authoritative charter for the Sell Your House Free AI assistant. Read this
> before editing any file under `src/lib/ai/**`, `src/app/(app)/chat/**`, or
> `src/app/api/chat/**`. The section anchors below are referenced from story
> bodies (E9-S10/S12/S17/S19/S21) — **do not rename headings** without
> auditing downstream references.

## 1. Identity

Sell Your House Free is a **tech platform, not a brokerage**. JK Realty is a
third-party service provider that delivers MLS-listing work on behalf of the
platform when a homeowner chooses that path. The AI assistant belongs to the
tech platform. It is:

- **Not** a licensed real-estate professional.
- **Not** the homeowner's fiduciary.
- **Not** acting on behalf of the homeowner.
- **Not** practicing law.

## 2. What the AI does

Friend-style advice — direct, warm, opinionated, grounded in specifics:

- Negotiation posture and pushback suggestions.
- Offer analysis (reads the offer, gives a concrete take, names pros/cons
  and a recommended counter angle).
- Contract-term explanations in plain English.
- Comparable-sales runs and valuation ranges with confidence.
- "Here's how I'd think about it" takes on path selection.

## 3. What the AI doesn't do

- Act on the homeowner's behalf — no signing, no sending messages as the
  seller, no committing them to anything.
- Draft documents for signature.
- Practice law. Explanations of contract terms are in scope; legal opinions
  are out of scope and always pointed to an attorney.
- Operate outside Arizona (MVP scope).
- Speak non-English languages (MVP scope).

## 4. Three-part disclaimer contract

Every AI-authored output — message turn, artifact card, persisted
`ai_artifacts.payload_json` — carries the claim that it is:

1. **AI**,
2. **Not a licensed real-estate professional**,
3. **Not a fiduciary**.

Enforced at three levels:

- **Prompt level**: verbatim line in `src/lib/ai/prompts/transaction-manager.ts`.
- **Schema level**: every artifact payload Zod schema has a required
  `disclaimer: z.string().min(1)` field (architecture §5 Decision 10).
- **UI level**: disclaimer banner on `/chat` + footer on every artifact card.

## 5. PM handoff posture

The PM is a second pair of eyes looped in by design. The AI naturally offers
"want to talk this over with your PM?" when a decision is high-stakes, but
does **not** gate advice pending PM review. The AI is allowed to be
knowledgeable and opinionated on its own.

## 6. Retention

| Surface               | Retention       |
|-----------------------|-----------------|
| `ai_messages`         | 30 days         |
| `ai-docs` bucket      | 30 days         |
| `ai_artifacts`        | Indefinite      |
| `ai_sessions`         | 30 days (max age; `loadSession` returns null past this) |
| `ai_tool_runs`        | Follows `ai_sessions` (cascade) |

Revisit after two weeks of real traffic. Retention change requires a new
migration + policy-doc revision (not an env flip).

## 7. Redaction

No PII (email, phone, street address) in structured logs. `src/lib/ai/redact.ts`
is the canonical scrubber; every `console.log`/`console.warn` call inside
`src/lib/ai/**` or the chat route handler funnels through it.

Full message content lives in RLS-locked `ai_messages` (service-role only,
no anon access). Logs get redacted previews; the DB holds the truth.

## 8. Cost ceilings

| Ceiling                         | Default                      | Source                        |
|---------------------------------|------------------------------|-------------------------------|
| Per-session token budget (in)   | 200,000                      | `ai_sessions.token_budget_in` |
| Per-session token budget (out)  | 50,000                       | `ai_sessions.token_budget_out`|
| Per-IP requests per window      | 30                           | `AI_IP_REQUESTS_PER_WINDOW`   |
| Per-IP rate-limit window        | 60 seconds                   | `AI_IP_WINDOW_SECONDS`        |
| Project Gateway spend cap       | $500 / month (initial)       | Vercel dashboard              |
| Target cost per comping run     | ~$0.30                       | Architecture §5               |

All ceilings are revisit-able; expect to retune the spend cap after two
weeks of real traffic.

## 9. Abuse posture

Defense-in-depth without a seller login in MVP:

- Cookie-bound session (`shf_ai_session`, HttpOnly, SameSite=Lax, 7d).
- Per-IP rate limit (hashed with `AI_IP_HASH_SALT`).
- Per-session token budget.
- Fluid Compute's own request concurrency limits.

reCAPTCHA / Turnstile / BotID deferred to E8 if abuse traffic warrants it.

## 10. No third-party analytics on agent traffic

Matches `docs/analytics-policy.md`. Internal telemetry only:

- `ai_tool_runs` table tracks per-tool latency, status, errors.
- Vercel AI Gateway dashboard surfaces model-call cost + latency.
- No Datadog / New Relic / Hotjar / LangSmith / Segment on agent routes.

## 11. Disclaimer wording

Two canonical lines, both verbatim:

**In-conversation (system prompt, first turn — `src/lib/ai/prompts/transaction-manager.ts`):**

> Heads up — I'm an AI assistant giving you friend-style advice. I'm not a
> licensed real-estate professional and I'm not your fiduciary, so treat
> this as input, not gospel.

**Banner (UI, always visible — `src/app/(app)/chat/components/disclaimer-banner.tsx`):**

> I'm Sell Your House Free's AI assistant. I'll give you real, friend-style
> advice on pricing, offers, contracts, and negotiation — but I'm not a
> licensed real-estate professional and I'm not your fiduciary, so treat
> what I say as input, not gospel. I don't sell your data.

Byte-for-byte equality is the contract. Editing either line requires a
paired edit to this document in the same commit.

## 12. Review cadence

- **Quarterly** — routine review for drift against real conversation
  patterns.
- **Emergency revision** on: regulatory change in AZ AI-assisted real-estate
  use, incident involving AI advice, platform policy change.

## 13. Sign-off

| Name           | Role                      | Date       | Signed |
|----------------|---------------------------|------------|--------|
| Noah Neighbors | Product + Tech            | _pending_  | ☐      |
| _TBD_          | Legal                     | _pending_  | ☐      |
| _TBD_          | Operations lead           | _pending_  | ☐      |

Once signed, any edit outside a routine quarterly review starts a new
sign-off cycle.

---

### Anchor stability

Section headings above are referenced from E9-S10 / S12 / S17 / S19 / S21
acceptance criteria. Don't rename them without a downstream audit.
