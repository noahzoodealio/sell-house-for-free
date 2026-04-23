# Architecture — E9/E10/E11 AI Agent Suite (Transaction Manager + Comping Agent)

- **Feature slug:** `e9-ai-agent-suite` (spans three sibling epics E9, E10, E11)
- **Repo:** `sell-house-for-free` (Next.js 16.2.3, React 19.2.4, Tailwind v4)
- **Upstream:** direct user input via `/zoo-core-create-architecture` (2026-04-23). No prior research doc.
- **Depends on:** E1 (primitives), E3 (`SellerFormDraft.submissionId` correlation), E4 (`EnrichmentSlot` — `attomId`, `mlsRecordId`, photos), E5 (Supabase infra, `src/lib/supabase/server.ts`, server-only guard convention, Offervana host-admin handoff if the agent needs to write a note)
- **Feeds:** E6 (PM can see conversation transcript / valuation report when assigned), E8 (launch-readiness includes AI-specific abuse/cost guardrails)
- **Companion changes:** none on Offervana or MLS — both are read-only consumers. No platform-side schema changes.
- **Author:** Noah (Architect) · 2026-04-23
- **Status:** draft — ready for PM decomposition into three epics

---

## 1. Summary

E9/E10/E11 stand up an **in-repo AI agent suite** that runs inside the Next.js app, not as a separate Python service. The suite is modeled as one **orchestrator persona** (Transaction Manager) whose tool belt exposes specialist **sub-agents and skills** (Comping Agent, PDF review, offer analyzer, image review, valuation aggregator). The orchestrator streams conversation tokens to the browser while sub-skills fan out in parallel underneath.

**Why in-repo instead of calling Zoodealio.Chat:** Zoodealio.Chat is Python + Chainlit + OpenAI + Temporal, tightly coupled to its own UI and hosted elsewhere. Bringing its behavior into the Next.js runtime avoids cross-service auth, latency, and the platform-drift risk of two parallel agent codebases diverging. The tool shapes we build here can be published as reusable contracts later if the ecosystem decides to converge.

**Provider:** Anthropic Claude, invoked via the **Vercel AI Gateway** (`"anthropic/claude-..."` strings through AI SDK v6) so we get observability, provider failover (OpenAI as backup model), and zero-data-retention routing without custom code. Matches the Vercel session-context recommendation; does not couple us to the OpenAI choice Zoodealio.Chat made.

**Runtime:** Vercel Functions (Fluid Compute, Node.js). Streaming chat over SSE via AI SDK's `streamText`. Long-running comping work (>60s wall clock, multiple MLS calls + photo reviews fanned out in parallel) runs as a **Vercel Workflow** durable step graph so a cold deploy mid-run doesn't lose state; the client polls workflow status and merges the result back into the chat when ready.

**Persistence:** Four new Supabase tables — `ai_sessions`, `ai_messages`, `ai_tool_runs`, `ai_artifacts` — all RLS-locked, service-role-only. Plus one Supabase Storage bucket `ai-docs` (private) for user-uploaded PDFs.

**Trust posture (critical):** Sell Your House Free is a **tech platform**, not a brokerage. JK Realty is a **third-party service provider** that delivers the MLS-listing service on behalf of the platform; they're a vendor, not the business. The AI assistant belongs to the tech platform and behaves like **a knowledgeable friend** helping the seller think through their sale. That means it *can* advise on negotiations ("if it were me, I'd counter at $X because Y"), explain contract terms, analyze offers substantively, and walk through trade-offs — the same way a friend with real-estate experience would. It is **not a licensed real-estate professional**, not a fiduciary, and not acting on the seller's behalf. Every AI-authored output carries a disclaimer spelling that out, and every valuation/comp report also includes a confidence score and a provenance list of data sources used.

**Affected services**

| Service | Change kind | Scope |
|---|---|---|
| `sell-house-for-free` | primary implementation | ~25 new files across three epics, new `/chat` route, 4 Supabase tables + 1 Storage bucket, ~5 new env vars |
| `Zoodealio.MLS` | read-only consumer | Same endpoints E4 already uses + `/api/properties/{mlsRecordId}/history` (new to this repo, existing upstream) |
| `Offervana_SaaS` | read-only consumer | ATTOM snapshot via `/api/properties/attom/{attomId}` reached through MLS proxy — same anonymous path E4 uses |

**Pattern adherence snapshot**

| Area | Choice | Pattern source |
|---|---|---|
| AI provider | Anthropic Claude via Vercel AI Gateway (`"anthropic/claude-sonnet-4-6"` default; escalate to `"anthropic/claude-opus-4-7"` for comping judgement + doc review) | Vercel knowledge-update 2026-02-27 — prefer gateway strings over direct `@ai-sdk/anthropic` import |
| Agent SDK | AI SDK v6 (`ai` package), `streamText` + `generateObject` + `tool({...})` helpers | Vercel AI SDK v6; aligns with Next.js App Router streaming |
| Orchestration | Orchestrator-with-tools: Transaction Manager system prompt + tools that themselves invoke sub-agents | AI SDK tool-calling; simpler than a dedicated router graph for MVP scope |
| Long-running work | Vercel Workflow (WDK) for comping runs that may exceed 60s | Vercel knowledge-update — `vercel:workflow` skill; Fluid Compute functions cap is 300s but comping is step-heavy |
| Streaming | SSE via AI SDK `result.toDataStreamResponse()` | AI SDK v6 standard; works with App Router Route Handlers |
| Runtime | `export const runtime = 'nodejs'`, `export const maxDuration = 300` on `/api/chat`; comping workflow is durable so no cap concern | Fluid Compute default 300s (knowledge-update) |
| Persistence | Supabase (matches E5) — conversation, tool runs, artifacts | E5 arch §3.1.7 pattern |
| File upload | Supabase Storage private bucket + signed URL → pass URL to Claude as `document` content block | AI SDK multimodal; Supabase Storage docs |
| Input validation | Zod on every tool schema + Route Handler body | E3/E4/E5 precedent |
| Server-only guard | `import 'server-only'` in every `src/lib/ai/**` module that holds the Gateway key | Next.js 16 data-security guide |
| Secrets | `AI_GATEWAY_API_KEY`, `SUPABASE_*` already present, no `NEXT_PUBLIC_*` leakage | E5 convention |
| Observability | AI SDK telemetry → Vercel AI Gateway dashboard + `ai_tool_runs` audit table | Vercel AI Gateway + our own audit trail |
| Cost guardrail | `ai_sessions.token_budget` (default 200k input / 50k output per session), enforced at orchestrator entry | Vercel AI Gateway per-key spend limit as backstop |
| Rate limiting | Per-session + per-IP Supabase counter; 429 on exceed | Same lightweight pattern as E8 plans for `/api/enrich` |
| Telemetry PII | Redact phone / email / street address before any `console.log`; keep full payloads only in `ai_messages` (RLS-locked) | Plan §3 non-negotiable "we don't sell your data" |
| Advice disclaimer | Every AI-authored output (message, artifact, card) carries a three-part disclaimer: "I'm an AI assistant giving you friend-style advice — not a licensed real-estate professional and not a fiduciary." Enforced at schema level (every artifact payload has a required `disclaimer` field) and in system prompt. | Posture — see §5 Decisions |
| Fiduciary boundary | The platform isn't the seller's fiduciary; the AI isn't either. The AI doesn't *act on behalf of* the seller (doesn't send messages to buyers/agents as the seller, doesn't sign anything, doesn't commit them to anything). It *advises*, and is free to give direct opinions the way a friend would — including on negotiation posture, counteroffer amounts, and term pushback. | Posture |
| Analytics | **No third-party SDKs** — matches `docs/analytics-policy.md`. Agent events go to internal `ai_tool_runs` only. | AGENTS.md |

**Three-epic split (detailed in §7)**

| Epic | Title | Deliverable bar |
|---|---|---|
| E9 | AI Agent Foundation | `/chat` route + streaming orchestrator + Supabase tables + auth/session + observability. No domain skills yet. Ships as "empty chat that can have a small talk but says 'I can't do that yet' when asked for comps / doc review." |
| E10 | Transaction Manager capabilities | `review_pdf`, `explain_terms`, `analyze_offer`, inline doc upload, conversation memory of the seller's submission context (pre-filled from `SellerFormDraft`). |
| E11 | Comping Agent capabilities | `find_comps`, `rate_comps`, `apply_deviations`, `review_photos`, `aggregate_valuation` (Vercel Workflow), comp-review card UI + confidence chip. |

---

## 2. Component diagram

```
                              Browser
                                │
                                │ /chat page + <Chat> client component
                                │ (AI SDK 'useChat' hook, SSE stream)
                                ▼
    ┌─────────────────────────────────────────────────────────────────┐
    │ src/app/(app)/chat/page.tsx                                     │
    │   • loads session from cookie OR mints new via Server Action    │
    │   • hydrates initial context (SellerFormDraft if present)       │
    │   • renders <Chat sessionId=... bootstrap=... />                │
    └──────────────────┬──────────────────────────────────────────────┘
                       │ POST /api/chat  { sessionId, messages, attachments? }
                       ▼
┌─────────────────────────────────────────────────────────────────────┐
│ src/app/api/chat/route.ts    'nodejs' runtime   maxDuration: 300   │
│   POST:                                                             │
│     1. zod-validate body                                           │
│     2. loadSession(sessionId) or deny with 401                     │
│     3. enforceBudget(session)   ── token ceiling + per-IP rate     │
│     4. persistUserMessage(sessionId, text, attachments)            │
│     5. const result = streamText({                                 │
│          model: gateway('anthropic/claude-sonnet-4-6'),            │
│          system: transactionManagerPrompt(session.context),        │
│          messages: session.history,                                │
│          tools: {                                                   │
│            review_pdf, explain_terms, analyze_offer,               │
│            find_comps, rate_comps, apply_deviations,               │
│            review_photos, aggregate_valuation, start_comp_job      │
│          },                                                         │
│          maxSteps: 8,                                              │
│          experimental_telemetry: { isEnabled: true },              │
│          onFinish: ({text, usage, toolCalls}) =>                   │
│            persistAssistantMessage(sessionId, ...),                │
│        })                                                           │
│     6. return result.toDataStreamResponse() ── SSE back to client  │
└──────────────────┬──────────────────────────────────────────────────┘
                   │
   ┌───────────────┼────────────────────────────────┬────────────────┐
   ▼               ▼                                ▼                ▼
┌──────────┐ ┌───────────────┐              ┌──────────────┐ ┌──────────────┐
│ review_  │ │ analyze_offer │              │ start_comp_  │ │ explain_     │
│ pdf      │ │ (fast path:   │              │ job          │ │ terms        │
│ (direct  │ │  <60s)        │              │ (long-       │ │ (model-only) │
│  Claude  │ │               │              │  running →   │ │              │
│  call)   │ │               │              │  workflow)   │ │              │
└────┬─────┘ └──────┬────────┘              └──────┬───────┘ └──────────────┘
     │              │                              │
     ▼              ▼                              ▼
  Supabase       Claude + MLS                 Vercel Workflow
  Storage        (no MLS, just                (WDK) — "comp-run"
  (PDF URL)      explaining)                  durable steps:
                                                1. find candidates
                                                2. hydrate each (parallel)
                                                3. review photos (parallel)
                                                4. apply deviations
                                                5. aggregate + confidence
                                                6. persist ai_artifact
                                                Client polls /api/chat/jobs/{id}
                                                OR merges on SSE 'job.done' event

                    All tool runs logged → ai_tool_runs
                    All artifacts (reports, valuations) → ai_artifacts
                    All assistant/user messages → ai_messages

  New lib modules in sell-house-for-free:
    src/lib/ai/
      ├── gateway.ts            ── AI SDK client factory (gateway key)
      ├── prompts/
      │   ├── transaction-manager.ts   ── orchestrator system prompt
      │   ├── comping.ts               ── comping sub-agent prompt
      │   ├── pdf-reviewer.ts          ── PDF sub-agent prompt
      │   ├── offer-analyzer.ts        ── offer review sub-agent prompt
      │   ├── photo-reviewer.ts        ── image-review sub-agent prompt
      │   └── disclaimers.ts           ── non-fiduciary footer + redaction
      ├── tools/
      │   ├── review-pdf.ts            ── fast PDF tool (single Claude call)
      │   ├── explain-terms.ts         ── fast orchestrator-only tool
      │   ├── analyze-offer.ts         ── fast tool; may fan out to price-check
      │   ├── start-comp-job.ts        ── enqueue Vercel Workflow
      │   ├── find-comps.ts            ── internal step; MLS search + filter
      │   ├── rate-comps.ts            ── internal step; LLM comp-judge
      │   ├── apply-deviations.ts      ── internal step; pure math
      │   ├── review-photos.ts         ── internal step; Claude vision
      │   └── aggregate-valuation.ts   ── internal step; compose final
      ├── workflows/
      │   └── comp-run.ts              ── WDK workflow definition
      ├── session.ts                   ── load/save session from Supabase
      ├── budget.ts                    ── token + rate-limit enforcement
      ├── redact.ts                    ── PII redaction for logs
      └── artifacts.ts                 ── persist comp reports, doc summaries
    src/lib/supabase/storage.ts        ── private bucket helpers (server-only)
    src/app/(app)/chat/
      ├── page.tsx                     ── session bootstrap page
      └── components/
          ├── chat.tsx                 ── client, AI SDK useChat
          ├── message.tsx              ── markdown + tool-call render
          ├── comp-card.tsx            ── per-comp card
          ├── valuation-panel.tsx      ── confidence chip + breakdown
          ├── doc-upload.tsx           ── PDF drop + thumbnail
          └── disclaimer-banner.tsx    ── always-visible AI disclaimer
    src/app/api/chat/
      ├── route.ts                     ── main streaming endpoint
      ├── sessions/route.ts            ── POST to mint a session
      ├── upload/route.ts              ── PDF ingress → Supabase Storage
      └── jobs/[id]/route.ts           ── workflow status (poll + SSE)
```

---

## 3. Per-service changes

### 3.1 `sell-house-for-free` (all three epics live here)

#### 3.1.1 Supabase schema additions (E9-owned; all epics extend)

```sql
-- AI session — one per homeowner conversation
create table public.ai_sessions (
  id              uuid primary key default gen_random_uuid(),
  submission_id   text null,                   -- correlated to SellerFormDraft when present
  context_json    jsonb not null default '{}', -- seeded from SellerFormDraft / EnrichmentSlot
  token_budget_in  integer not null default 200000,
  token_budget_out integer not null default 50000,
  tokens_used_in   integer not null default 0,
  tokens_used_out  integer not null default 0,
  ip_hash         text null,                    -- sha256(ip + salt), for rate limiting
  created_at      timestamptz not null default now(),
  last_active_at  timestamptz not null default now(),
  ended_at        timestamptz null
);
create index on public.ai_sessions (submission_id);
create index on public.ai_sessions (last_active_at desc);

-- Every message in a session (user + assistant + tool results)
create type public.ai_message_role as enum ('user', 'assistant', 'tool', 'system');
create table public.ai_messages (
  id            bigserial primary key,
  session_id    uuid not null references public.ai_sessions(id) on delete cascade,
  role          public.ai_message_role not null,
  content_json  jsonb not null,   -- AI SDK 'UIMessage' shape (parts[])
  token_in      integer null,
  token_out     integer null,
  created_at    timestamptz not null default now()
);
create index on public.ai_messages (session_id, created_at);

-- One row per tool invocation. The sub-agent audit trail.
create type public.ai_tool_status as enum ('pending', 'running', 'ok', 'error', 'timeout');
create table public.ai_tool_runs (
  id            uuid primary key default gen_random_uuid(),
  session_id    uuid not null references public.ai_sessions(id) on delete cascade,
  message_id    bigint null references public.ai_messages(id) on delete set null,
  tool_name     text not null,          -- 'find_comps' | 'review_pdf' | ...
  status        public.ai_tool_status not null default 'pending',
  input_json    jsonb not null,
  output_json   jsonb null,
  error_detail  text null,
  latency_ms    integer null,
  workflow_run_id text null,            -- set when tool delegated to Vercel Workflow
  created_at    timestamptz not null default now(),
  completed_at  timestamptz null
);
create index on public.ai_tool_runs (session_id, created_at desc);
create index on public.ai_tool_runs (tool_name, status);

-- Durable artifacts the agent produced (valuations, comp reports, PDF summaries)
create type public.ai_artifact_kind as enum (
  'comp_report',
  'doc_summary',
  'offer_analysis',
  'valuation'
);
create table public.ai_artifacts (
  id           uuid primary key default gen_random_uuid(),
  session_id   uuid not null references public.ai_sessions(id) on delete cascade,
  kind         public.ai_artifact_kind not null,
  payload_json jsonb not null,     -- shape depends on kind (see §4.4)
  created_at   timestamptz not null default now()
);
create index on public.ai_artifacts (session_id, kind, created_at desc);
```

RLS: enabled, **no** public policies — only the service-role key reads/writes. Schema migrations live under `supabase/migrations/`, versioned in git (E5 precedent).

Supabase **Storage bucket**: `ai-docs` — private, service-role writes only; signed URLs minted per-use with 60-minute TTL. PDF MIME allow-list (`application/pdf`, optional `image/*` for photo attachments the user adds). Per-file cap: 10 MB. Auto-delete lifecycle rule: 30 days.

#### 3.1.2 `src/lib/ai/gateway.ts` (new — E9)

```ts
import 'server-only'
import { createGateway } from 'ai'

export const gateway = createGateway({
  apiKey: process.env.AI_GATEWAY_API_KEY!,
  baseURL: process.env.AI_GATEWAY_BASE_URL, // optional override
})

// Default model profiles — referenced by tool name, not hard-coded at callsites.
export const models = {
  orchestrator: 'anthropic/claude-sonnet-4-6',   // fast, good-enough conversational
  judge:        'anthropic/claude-opus-4-7',     // comp rating + doc review (needs depth)
  vision:       'anthropic/claude-sonnet-4-6',   // photo review; multimodal
} as const
```

The models are referenced through the gateway helper so that swapping providers (e.g. OpenAI fallback via `"openai/gpt-5"`) is a one-line change with no product-code edit.

#### 3.1.3 `src/app/api/chat/route.ts` (new — E9 skeleton, E10/E11 fill tool belt)

```ts
'use server'
import { after } from 'next/server'
import { streamText } from 'ai'
import { gateway, models } from '@/lib/ai/gateway'
import { loadSession, persistUserMessage, persistAssistantMessage } from '@/lib/ai/session'
import { enforceBudget } from '@/lib/ai/budget'
import { transactionManagerPrompt } from '@/lib/ai/prompts/transaction-manager'
import { reviewPdfTool, explainTermsTool, analyzeOfferTool,
         startCompJobTool, reviewPhotosTool, aggregateValuationTool,
         findCompsTool, rateCompsTool, applyDeviationsTool } from '@/lib/ai/tools'

export const runtime = 'nodejs'
export const maxDuration = 300

const bodySchema = z.object({
  sessionId: z.string().uuid(),
  messages: z.array(/* AI SDK UIMessage shape */),
})

export async function POST(req: Request) {
  const body = bodySchema.parse(await req.json())
  const session = await loadSession(body.sessionId)
  if (!session) return new Response('Unknown session', { status: 401 })
  const gate = await enforceBudget(session, req)
  if (!gate.ok) return new Response(gate.reason, { status: 429 })

  await persistUserMessage(session.id, body.messages.at(-1)!)

  const result = streamText({
    model: gateway(models.orchestrator),
    system: transactionManagerPrompt(session.context),
    messages: body.messages,
    tools: {
      review_pdf: reviewPdfTool(session),
      explain_terms: explainTermsTool(session),
      analyze_offer: analyzeOfferTool(session),
      start_comp_job: startCompJobTool(session),
      // internal fast tools exposed to the model only when it has enough context:
      find_comps: findCompsTool(session),
      rate_comps: rateCompsTool(session),
      apply_deviations: applyDeviationsTool(session),
      review_photos: reviewPhotosTool(session),
      aggregate_valuation: aggregateValuationTool(session),
    },
    maxSteps: 8,
    experimental_telemetry: { isEnabled: true, functionId: 'sell-house-for-free/chat' },
    onFinish: async ({ text, usage, toolCalls, toolResults }) => {
      await persistAssistantMessage(session.id, { text, usage, toolCalls, toolResults })
    },
  })

  after(async () => {
    await bumpSessionActivity(session.id, /* token usage will have been written by onFinish */)
  })

  return result.toDataStreamResponse()
}
```

Observations:
- `maxSteps: 8` caps tool-calling depth — matches AI SDK safety default; prevents runaway loops.
- `onFinish` is where we book token usage against the budget and persist the assistant turn. If the stream is cut short by the client (abort), AI SDK still fires `onFinish` with partial usage — we charge what was streamed.
- `experimental_telemetry` enables Vercel AI Gateway observability. `functionId` surfaces runs grouped by this endpoint.
- `after()` handles non-blocking session housekeeping (same E5 pattern).

#### 3.1.4 `src/lib/ai/session.ts` (new — E9)

- `createSession({ submissionId?, seed? })` — inserts `ai_sessions` row, seeds `context_json` from `SellerFormDraft` + `EnrichmentSlot` if provided (gives the agent the subject property up-front, no cold-start guessing).
- `loadSession(id)` — joins `ai_sessions` + last N `ai_messages` (configurable, default 24 — enough for orchestrator recall; older messages are summarized to a single system message by a small "memory compaction" job at the edge of the window).
- `persistUserMessage(sessionId, uiMessage)`, `persistAssistantMessage(sessionId, result)`.
- Cookie: `shf_ai_session=<uuid>` — HttpOnly, SameSite=Lax, 7-day max-age.

#### 3.1.5 `src/lib/ai/prompts/transaction-manager.ts` (new — E9 default, E10 expanded)

Orchestrator system prompt. Structured sections:

1. **Identity:** "You are an AI assistant built into Sell Your House Free, a tech platform that helps Arizona homeowners sell their home. Sell Your House Free is a platform, not a brokerage — a third-party broker partner (JK Realty) handles the licensed MLS-listing work when needed. You are *not* a licensed real-estate professional, not an attorney, and not the seller's fiduciary. Think of yourself as **a knowledgeable friend** the seller can ask anything — negotiation strategy, contract terms, offer analysis, what they should push back on. Give real opinions. Don't hedge every sentence into uselessness."
2. **Grounding:** the seller's current `SellerFormDraft` fields (address, pillar hint, condition, timeline, enrichment AVM range) are inlined at session start, and later turns reference the same by id.
3. **What you do and don't do:** *You advise.* You give direct takes on negotiation posture ("if it were me, I'd counter at X because Y"), flag unusual contract terms and suggest pushbacks, produce comps and valuations, read offer docs and walk the seller through what matters. *You don't act on their behalf* — you don't send messages to buyers or their agents as the seller, don't sign or commit to anything, don't present yourself as representing them. The Project Manager is the human the seller can loop in when they want a second pair of eyes — not a gatekeeper for every thought.
4. **Tool usage heuristics:** when to call `start_comp_job` (user asks "what's my home worth" or needs pricing strategy), when to call `review_pdf` (attachment present and user asks about it), when to hand off to PM vs. answer (almost always → answer; refer to PM for things that require acting on behalf of the seller or that benefit from a licensed human's second opinion).
5. **Style:** plain-English, short paragraphs, no bullet-dumping unless user asks for a list. Talk like a friend — direct, warm, not hedged. Give the real answer, then close with the disclaimer once at the end, not sprinkled through.
6. **Disclaimer line (use this verbatim unless the user-facing copy team overrides it):** *"Heads up — I'm an AI assistant giving you friend-style advice. I'm not a licensed real-estate professional and I'm not your fiduciary, so treat this as input, not gospel."* Every advice-bearing message ends with this (or a close variant that keeps all three claims: AI, not licensed, not fiduciary).
7. **Data handling:** never echo back phone / email; never expose `customer_id` / `user_id` from upstream systems.

#### 3.1.6 Tool implementations (new)

Each tool is defined via AI SDK's `tool({ description, inputSchema, execute })` and registered in `src/lib/ai/tools/index.ts`. Implementations summarized below; full schemas in §4.

**`review_pdf` (E10).** Input: `{ documentId: string }` — references a row in `ai_artifacts` that was created by `/api/chat/upload` when the user dropped the file. Execute:
1. Fetch PDF bytes via signed Supabase Storage URL.
2. Call `generateObject({ model: gateway(models.judge), schema: PdfSummarySchema, messages: [{ role:'user', content:[{ type:'document', data: signedUrl }, { type:'text', text: 'Extract key terms...' }] }] })`.
3. Persist resulting structured summary as a new `ai_artifact` of kind `doc_summary`.
4. Return a compact `{ summaryId, headline, concerns[], citations[] }` so the orchestrator can render it inline.
Claude's native document support means no external PDF parser is needed.

**`explain_terms` (E10).** Input: `{ term: string, contextDocId?: string }`. Execute: small generation with optional doc context; no persistence beyond conversation.

**`analyze_offer` (E10).** Input: `{ offerSummary: string, propertyContext?: SubjectPropertyContext }`. Execute: structured output (`OfferAnalysisSchema`) with a friend-style take — pros, cons, net-to-seller estimate, market-position call (below / within / above AVM range), and a `friendlyTake` free-text field where the AI gives an opinionated read ("this looks strong but the 7-day inspection window is unusually tight — I'd push back on that before signing"). Persist as `offer_analysis` artifact. The output carries the three-part disclaimer (AI / not licensed / not fiduciary) and offers the seller the option to loop in their PM for a licensed second opinion — but it doesn't gatekeep behind the PM.

**`start_comp_job` (E11 — the big one).** Input: `{}` (uses `session.context.subject_property`). Execute:
1. Create `ai_tool_run` row with `status: 'pending'`.
2. `workflow.trigger('comp-run', { sessionId, subjectProperty })` via WDK.
3. Return `{ jobId, status: 'queued', pollUrl: '/api/chat/jobs/{id}' }` to the orchestrator so it can stream "I'm pulling comps now — this usually takes about 30 seconds." back to the user.
4. The workflow's final step writes a `comp_report` artifact + flips the tool run to `ok`; the client's `useChat` (or a small SSE subscriber) sees the artifact and renders `<ValuationPanel>`.

**`find_comps` / `rate_comps` / `apply_deviations` / `review_photos` / `aggregate_valuation` (E11).** These are the five durable workflow steps (§3.1.7). They are **also** exposed to the orchestrator as individual tools so a follow-up like "review just this one comp's photos again" doesn't require restarting the workflow — the orchestrator can call `review_photos({ mlsRecordId })` standalone.

#### 3.1.7 Vercel Workflow `comp-run` (E11)

Five steps, each idempotent + retryable:

```ts
// src/lib/ai/workflows/comp-run.ts
import { workflow, step } from '@vercel/workflow'

export const compRun = workflow('comp-run', {
  input: z.object({
    sessionId: z.string().uuid(),
    subjectProperty: SubjectPropertySchema,
  }),
}, async (ctx, { sessionId, subjectProperty }) => {
  // Step 1 — MLS search + post-filter by haversine + bed/bath tolerance
  const candidates = await step(ctx, 'find_comps', () =>
    findCompsImpl(subjectProperty, { radiusMi: 0.5, bedTol: 1, bathTol: 1, sqftPct: 0.2 })
  )

  // Step 2 — Hydrate each candidate in parallel (MLS details + images + history).
  // Step-level parallelism: we invoke step() inside Promise.all so each hydration
  // is independently retryable.
  const hydrated = await Promise.all(candidates.map(c =>
    step(ctx, `hydrate:${c.mlsRecordId}`, () => hydrateComp(c))
  ))

  // Step 3 — Photo review per comp in parallel (Claude vision)
  const photoScored = await Promise.all(hydrated.map(c =>
    c.photoUrls?.length
      ? step(ctx, `photos:${c.mlsRecordId}`, () => reviewPhotosImpl(c))
      : Promise.resolve({ ...c, conditionScore: null })
  ))

  // Step 4 — Apply deviations (pure math, no LLM)
  const deviated = await step(ctx, 'apply_deviations', () =>
    applyDeviationsImpl(subjectProperty, photoScored)
  )

  // Step 5 — Aggregate + confidence (Claude Opus as the judge)
  const valuation = await step(ctx, 'aggregate_valuation', () =>
    aggregateValuationImpl(subjectProperty, deviated)
  )

  // Step 6 — Persist artifact + mark tool run ok
  await step(ctx, 'persist', () =>
    persistCompReport(sessionId, valuation)
  )

  return { artifactId: valuation.artifactId }
})
```

Workflow cap: default 10 minutes (more than enough; budget is ~45s wall clock in practice). Each `step()` call has retry=3 default with exponential backoff. Memoized across retries — re-running the whole workflow after a crash skips already-completed steps.

Per the Vercel `vercel:workflow` skill: steps are the durability unit. Keep LLM calls inside a single step each (so cost is only paid once per step even on workflow retries).

#### 3.1.8 Per-step implementation notes

- **`findCompsImpl(subject, constraints)`** — calls MLS `GET /api/properties/search?city={c}&state=AZ&pageSize=50` (MLS currently filters by city+state — §2 survey confirmed no radius param). Post-filter in BFF:
  - Haversine distance ≤ `radiusMi` (using `subject.gpsCoordinates`)
  - Bed within ±`bedTol`
  - Bath within ±`bathTol`
  - SqFt within ±`sqftPct` %
  - `listingStatus` ∈ {Closed, Pending, Active, Expired, Cancelled} (we want all to talk about DOM)
  - Sold within last 12 months (when status = Closed)
  - Top 8 by a composite score `(1/distance + sqft_closeness + bed_match + bath_match)`
- **`hydrateComp(candidate)`** — calls `/api/properties/attom/{attomId}` for ATTOM facts, `/api/properties/{mlsRecordId}/images` if listed (status ∈ Active, Pending, ComingSoon), `/api/properties/{mlsRecordId}/history` for DOM and cancellation markers. Missing legs degrade confidence.
- **`reviewPhotosImpl(comp)`** — single Claude vision call, `generateObject({ schema: PhotoAssessmentSchema })` with `content: [{ type:'image', source: { type:'url', url } }, ...]`. Up to 6 photos per comp (cost cap). Output: `{ conditionScore: 1..5, notableFeatures: string[], redFlags: string[] }`.
- **`applyDeviationsImpl(subject, comps)`** — **no LLM.** Pure deterministic math: `adjustedSoldPrice = c.soldPrice + (subject.sqft - c.sqft) * regionalPerSqft(subject.zip) + (subject.beds - c.beds) * BED_DELTA + (subject.baths - c.baths) * BATH_DELTA + conditionDelta(subject, c)`. `regionalPerSqft()` reads from a small static AZ lookup table (seeded from current Phoenix/Tucson medians; editable in code without a deploy). `BED_DELTA = $15k`, `BATH_DELTA = $8k` as opening values; revisited post-launch. This tool being pure math is a deliberate design call: we don't want the LLM hallucinating adjustment numbers.
- **`aggregateValuationImpl(subject, deviated)`** — Claude Opus judge. `generateObject({ schema: ValuationSchema })` given the full deviated comp table + subject property + condition signal. Asked to produce: `{ low, mid, high, confidence ∈ [0,1], rationale, pickedComps: { mlsRecordId, weight, note }[], discardedComps: { mlsRecordId, reason }[] }`. Confidence rubric (inlined in the prompt): `+0.2` per comp with complete data (up to 4 comps), `+0.1` for sub-0.3mi avg distance, `+0.1` for ≤ 6mo median sold date, `−0.2` if more than half the comps are still active (price is noisier), `−0.1` per missing photo set. Floor 0, ceil 1.

#### 3.1.9 `/api/chat/upload` (new — E10)

- `POST` multipart form with PDF (or image). Validate mime + size. Stream to `ai-docs/{sessionId}/{uuid}.pdf` via Supabase admin client. Insert `ai_artifacts` row of kind `doc_summary` with `payload_json: { stage: 'uploaded', storagePath, originalName }`. Return `{ documentId, previewUrl }` (preview URL is a short-lived signed URL, not the persistent reference).
- Runs on Node runtime; max duration 30s is plenty — we don't process the doc here, just store it. The `review_pdf` tool does the work.

#### 3.1.10 `/api/chat/jobs/[id]` (new — E11)

- `GET` returns the current state of an `ai_tool_run` + the resolved `ai_artifact` if `completed_at` is set. Also supports `?stream=1` → SSE events as the workflow progresses (subscribes to Postgres listen/notify on `ai_tool_runs`). Optional; the client can fall back to 5-second polling.

#### 3.1.11 Chat UI (new — E9 skeleton, E10/E11 enrich)

- `/chat` route under a new `(app)` route group so it inherits a different layout than `(marketing)`. No breadcrumbs, full-height flex layout, disclaimer banner pinned top.
- Uses **AI SDK's `useChat` hook** (not a custom reducer) to keep the code path boring.
- `<Message>` component renders markdown + rich tool-call cards:
  - `<CompCard>` per comp in a `comp_report` artifact.
  - `<ValuationPanel>` — one per report, shows `low/mid/high`, confidence chip, "why these comps" expandable list.
  - `<DocSummaryCard>` — headline + bullet concerns with citations.
  - `<OfferAnalysisCard>` — pros/cons + "talk to your PM" CTA.
- `<DocUpload>` — drag-and-drop, triggers `/api/chat/upload`.
- `<DisclaimerBanner>` — pinned to top of session; copy: *"I'm Sell Your House Free's AI assistant. I'll give you real, friend-style advice on pricing, offers, contracts, and negotiation — but I'm not a licensed real-estate professional and I'm not your fiduciary, so treat what I say as input, not gospel. I don't sell your data."* Every AI-authored artifact (comp report card, doc summary card, offer-analysis card) also renders the three-part disclaimer line in its footer.

#### 3.1.12 Environment variables (new)

| Var | Scope | Purpose |
|---|---|---|
| `AI_GATEWAY_API_KEY` | server | Vercel AI Gateway API key |
| `AI_GATEWAY_BASE_URL` | server, optional | Override for gateway base URL (default: auto) |
| `AI_FALLBACK_MODEL` | server, optional | `"openai/gpt-5"` backup when Anthropic is unavailable |
| `AI_WORKFLOW_QUEUE_KEY` | server | WDK queue auth (issued by `vercel` CLI when workflow is enabled) |
| `MLS_API_BASE_URL` | server | already added by E4 — reused here |
| `SUPABASE_*` | server | already added by E5 — reused here; new bucket within same project |

Add to `.env.example`. Documented note: the gateway key is a single hot credential — revoke-and-rotate on any suspected leak; Vercel's per-key spend cap is our cost backstop.

#### 3.1.13 Packages added

| Package | Version target | Purpose |
|---|---|---|
| `ai` | `^6` | Vercel AI SDK core — `streamText`, `generateObject`, `tool`, `createGateway` |
| `@vercel/workflow` | latest | Workflow DevKit for durable comping runs |
| `zod` | already `^4` | tool schemas |

**Not added:** no `@ai-sdk/anthropic` direct import (we go through the gateway), no `openai` SDK, no PDF parser (Claude handles PDFs natively as document content).

#### 3.1.14 Edits to existing files

| File | Edit |
|---|---|
| `src/app/layout.tsx` | No change — the `(app)` route group defines its own chat layout. Analytics gate stays production-only, untouched. |
| `src/app/get-started/thanks/page.tsx` | Add a CTA: "Talk to your AI assistant now while your PM is assigned" → links to `/chat?bootstrap={submissionId}`. Optional feature — gated by `AI_CHAT_ENABLED` env flag so this can ship dark. |
| `next.config.ts` | Add Supabase Storage host (`*.supabase.co`) to `images.remotePatterns` for inline doc/photo previews. Already has MLS Azure Blob from E4. |
| `supabase/migrations/` | New migrations: `0003_ai_tables.sql`, `0004_ai_storage_bucket.sql`. |
| `docs/ai-agent-policy.md` | **new** — sibling to `docs/analytics-policy.md`. Codifies non-fiduciary rail, retention, redaction, cost ceilings. |
| `AGENTS.md` | Appended paragraph: "AI assistant runs in-repo under `src/lib/ai/**` and `/api/chat`. All provider calls go through the Vercel AI Gateway. No third-party analytics on agent traffic — same policy as marketing pages." |

### 3.2 `Zoodealio.MLS` — read-only consumer

No platform changes. The comping agent calls the same endpoints E4 already exercises (`/api/properties/search`, `/api/properties/attom/{attomId}`, `/api/properties/{mlsRecordId}/images`) plus adds `/api/properties/{mlsRecordId}/history` — which already exists upstream per §2 survey; it's new to this repo, not to MLS.

### 3.3 `Offervana_SaaS` — read-only consumer

No direct calls. ATTOM data travels via MLS's cached snapshot, so we inherit the auth posture MLS already ships.

---

## 4. Integration contracts

### 4.1 `sell-house-for-free` → Vercel AI Gateway → Anthropic

**Endpoint (logical):** AI SDK handles the transport; conceptually `POST https://gateway.vercel.sh/v1/chat/completions` or the equivalent streaming endpoint. We never construct the request directly.

**Auth:** `Authorization: Bearer ${AI_GATEWAY_API_KEY}` — injected by `createGateway` client.

**Models used:**
- `anthropic/claude-sonnet-4-6` — orchestrator + vision + fast tools (default)
- `anthropic/claude-opus-4-7` — comp judge (`aggregate_valuation`), PDF review (`review_pdf`), offer analysis (`analyze_offer`)
- Fallback: `openai/gpt-5` if `AI_FALLBACK_MODEL` is set; gateway handles the switch transparently when Anthropic returns 5xx / rate-limit.

**Streaming contract:** AI SDK's data-stream protocol. Browser consumes via `useChat`. Server side uses `result.toDataStreamResponse()`.

**Cost caps:** Vercel AI Gateway has a dashboard spend cap we set at project-level (outside this doc); in-app we enforce `ai_sessions.token_budget_*` at session entry.

### 4.2 `sell-house-for-free` → `Zoodealio.MLS`

Same endpoints E4 uses — see `architecture-e4-property-data-enrichment.md` §4.2 for the full shape. E11 adds:

- `GET {MLS_BASE}/api/properties/{mlsRecordId}/history?pageNumber=1&pageSize=20`
  - Response: `PaginatedResult<PropertyHistoricalChangeDto>` — price/status change records used for DOM + cancellation markers.
  - Auth: anonymous (confirmed by E4 §7 investigation).
  - Retry: same `AbortSignal.timeout(4000)` + 1-retry-on-5xx pattern as E4's MLS client — in fact E11 reuses `src/lib/enrichment/mls-client.ts` directly rather than re-implementing.

### 4.3 `sell-house-for-free` → Supabase

Four new tables (§3.1.1). All access via `src/lib/supabase/server.ts` (E5-introduced). Service-role key; no RLS policies for public access. `ai-docs` bucket access via a new `src/lib/supabase/storage.ts` helper that wraps `storage.from('ai-docs').createSignedUrl(path, 3600)`.

### 4.4 Internal — artifact payload shapes (`ai_artifacts.payload_json`)

```ts
// kind: 'doc_summary'
type DocSummaryPayload = {
  documentId: string           // reference into ai-docs storage
  originalName: string
  headline: string             // "Purchase agreement from Acme Buyer Group, $385k, 30-day close"
  keyTerms: Array<{ label: string; value: string; pageRef?: number }>
  concerns: Array<{ severity: 'info' | 'caution' | 'warn'; note: string; pageRef?: number }>
  citations: Array<{ pageRef: number; excerpt: string }>
  disclaimer: string           // canned non-fiduciary line; stored so it survives copy-paste
}

// kind: 'offer_analysis'
type OfferAnalysisPayload = {
  offerSource: string          // "Buyer A cash offer, $380k" — free text from user
  prosList: string[]
  consList: string[]
  netToSellerEstimate?: { low: number; mid: number; high: number; assumptions: string[] }
  vsAvm?: { avmLow: number; avmHigh: number; offerPosition: 'below' | 'within' | 'above' }
  friendlyTake: string         // opinionated plain-English read ("if it were me, I'd counter at X
                               // because the inspection window is unusually tight")
  suggestedPushbacks?: string[] // concrete things the seller could push back on
  disclaimer: string           // required — three-part: AI / not licensed / not fiduciary
}

// kind: 'comp_report' (E11 main output)
type CompReportPayload = {
  subjectProperty: {
    address: string
    beds: number
    baths: number
    sqft: number
    yearBuilt: number | null
    attomId: string | null
    mlsRecordId: string | null
  }
  comps: Array<{
    mlsRecordId: string
    address: string
    status: 'Closed' | 'Pending' | 'Active' | 'Expired' | 'Cancelled'
    closedDate: string | null
    daysOnMarket: number | null
    listPrice: number | null
    soldPrice: number | null
    adjustedSoldPrice: number | null  // after deviations
    distanceMi: number
    beds: number
    baths: number
    sqft: number
    conditionScore: 1 | 2 | 3 | 4 | 5 | null
    weight: number                    // 0..1, assigned by judge
    note: string                      // why this comp was picked
    photoUrls: string[]               // SAS-signed Azure Blob URLs
  }>
  discardedComps: Array<{ mlsRecordId: string; reason: string }>
  valuation: { low: number; mid: number; high: number; confidence: number }
  methodology: {
    deviationsUsed: { bedDelta: number; bathDelta: number; perSqftByZip: Record<string, number> }
    modelsUsed: { judge: string; vision: string }
  }
  disclaimer: string
}

// kind: 'valuation' (ad-hoc; lighter than a full comp_report)
type ValuationPayload = {
  low: number
  mid: number
  high: number
  confidence: number
  sourceSummary: string
}
```

### 4.5 Seller-form ← AI agent bootstrap

- The chat page accepts `?bootstrap={submissionId}`. If present, the server component looks up the `submissions` row (E6 table) to get the `SellerFormDraft`, then seeds `ai_sessions.context_json` with: address, beds/baths/sqft, condition, timeline, motivation, pillarHint, `EnrichmentSlot.attomId`, `EnrichmentSlot.mlsRecordId`. That way the Transaction Manager opens with "Hey — I see you're considering a cash offer for your 3-bed in Mesa; what would be most helpful?" rather than "Hi, how can I help?"
- If no bootstrap is provided, the agent greets generically and asks for address first.

### 4.6 Companion change to E6 (optional, not blocking)

If E6 has shipped by the time E10/E11 land, add a link on the PM's submission view (`/ops/submissions/{id}`) to the associated `ai_sessions` row so PMs can read the transcript before calling the seller. E6 owns this UI surface; E11 owns the data. No coupling beyond `submission_id` on `ai_sessions`.

---

## 5. Pattern decisions + deviations

### Decisions

1. **AI SDK v6 over raw provider SDK.** AI SDK gives us streaming, tool-calling, structured output, provider-swap, and telemetry for free. Alternative (`@anthropic-ai/sdk` direct) would mean re-implementing all five of those. Source: Vercel AI SDK docs; session knowledge-update.
2. **Vercel AI Gateway routing.** Matches the Vercel session-context recommendation; gives failover + observability without app-side code. Fallback to `"openai/gpt-5"` configured via env var, not by importing a different SDK.
3. **Orchestrator-with-tools over a router graph.** Simpler mental model; AI SDK's `maxSteps` gives us bounded depth. If we outgrow this (e.g. tool belt > 15 tools, or the orchestrator starts mis-routing) we revisit. Not a premature abstraction today.
4. **Sub-agents = tools.** Each specialist agent (PDF reviewer, photo reviewer, comp judge) is a tool with its own `generateObject`-backed system prompt, not a peer in a graph. Gives us a single place to enforce schemas + audit every invocation. Aligns with the user's stated model ("sub-agents/skills that can run in parallel").
5. **Parallel sub-skills via `Promise.all`.** Inside composite tools we fan out with `Promise.all`; inside the comping workflow, step-level parallelism gives us both parallelism and durability. Same idiom across fast path and durable path.
6. **Vercel Workflow for long-running comping.** Comping is ~8 MLS calls + ~8 vision calls + 1 judge call. 45s typical, bursty to 90s on cold cache. Fluid Compute handles 300s but durability beats wall-clock — if we deploy mid-run or the function OOMs, we don't re-pay for hydrated comps. Source: `vercel:workflow` skill.
7. **Supabase for everything stateful.** Matches E5/E6 infra. No new backing store. Postgres handles the transactional bits (sessions, messages, runs); Storage handles the PDFs.
8. **Claude native PDF support.** We pass signed Storage URLs as `document` content blocks; no `pdf-parse` / `pdfjs` in the server bundle. Removes a whole class of lib vulnerabilities.
9. **Deviation math is deterministic.** `applyDeviationsImpl` is a pure function, not an LLM call. Prevents hallucinated dollar adjustments. The LLM is used only where judgement adds value (comp rating, condition assessment, final valuation rationale).
10. **Posture encoded in prompt AND schemas.** The AI is a knowledgeable friend — it gives real advice (negotiation takes, contract pushbacks, offer reads, comps, valuations) without hedging. The schema backstop is the **required `disclaimer` field on every artifact payload** — the three-part claim (AI / not licensed / not fiduciary) can never be omitted by a prompt mistake or a tool-output drift. `OfferAnalysisPayload.friendlyTake` is also required so offer analyses always contain an opinionated read, not just a neutral summary — the product value is in having a take.
11. **No PII in logs.** `src/lib/ai/redact.ts` runs over every log line. `ai_messages` carries the full content but lives behind RLS + service-role; logs are structured JSON with redacted fields. Matches plan §3 non-negotiable.
12. **Session cookie, not auth.** No seller accounts in MVP. Cookie-bound `ai_sessions.id` is enough for conversation continuity. An abuser pinning a session gets throttled by `token_budget` + IP rate limit.
13. **`maxSteps: 8`, `maxDuration: 300`.** Orchestrator can do up to 8 tool rounds; route handler runtime is within Fluid Compute's default. Long work is off-loaded to WDK, not stretched at the edge.
14. **Prefer streaming for orchestrator; blocking for tools.** User sees tokens immediately; tools that take ≤60s complete and return a tool-result; tools that take longer return a job id + poll. Matches the Vercel AI SDK "tool result + artifact" pattern.

### Deviations

| Deviation | From | Why | Who accepts the risk |
|---|---|---|---|
| Provider differs from Zoodealio.Chat (Anthropic vs OpenAI) | Platform consistency | Claude's PDF + vision are stronger for this feature set; Gateway gives us OpenAI fallback anyway. Zoodealio.Chat lives in a different repo, serves different users (logged-in seller portal vs. public marketing site), and isn't an operational dependency. | Noah — revisit if/when platform introduces an "AI provider standard." |
| Agents live in Next.js, not behind Temporal | Zoodealio.Chat uses Temporal for durable exec | WDK is the Vercel-native answer; bringing Temporal into this repo adds a large operational surface (worker, queue, UI) for one feature. WDK gives us the same durability guarantees inside the Vercel runtime. | Noah. |
| No seller auth guarding `/chat` | Typical SaaS pattern | Matches rest of the site — submission is anonymous, chat is continuous of that. Session cookies + rate limits + token caps are the defense. | Noah — reconsider if abuse > 1% of sessions post-launch. |
| Conversation transcripts retained 30 days, not indefinitely | Bigger-is-safer default | Minimizes blast radius on any future breach; 30 days covers PM follow-up window. Summaries persist via `ai_artifacts` which are retained indefinitely (no PII beyond address). | Noah + Legal — encoded in `docs/ai-agent-policy.md`. |
| Comp report is generated once per "comping run," not continuously refreshed | Typical "live valuation" UX | Each run is ~$0.30 of LLM + MLS calls. Refreshing on every address tweak is wasteful. The user can request a new run; the artifact history in the session shows the delta. | Noah. |
| PDF review calls Claude Opus even when Sonnet would suffice | Cost efficiency | Doc review is the single most consequential AI output in this feature — a misread term can cascade. Opus cost premium (~3× Sonnet) is justified. Revisit if Sonnet-level quality becomes competitive for doc review. | Noah. |
| `maxSteps: 8` (not higher) | "Let the agent run" | Anything deeper than 8 steps means the orchestrator is lost; we'd rather hit the cap and return a graceful "let me hand you to your PM" response than silently incinerate budget. | Noah. |
| Comping confidence is a rubric, not a Bayesian posterior | Statistical rigor | An interpretable rubric beats an opaque score for a user-facing product — especially when we're telling the seller "here's how confident we are and why." If pricing science matures, we upgrade. | Noah. |
| **`review_photos` runs on Claude vision, not on a dedicated CV model** | Specialized vision pipelines | Claude's image understanding is good enough for "condition 1-5 + red flags." A bespoke CV model would need labeled training data we don't have and a GPU inference path we don't want to operate. | Noah — upgrade post-launch if the scoring proves noisy on real AZ housing stock. |
| BFF-side comp filtering instead of server-side MLS filters | Push compute to the source | MLS doesn't offer radius/tolerance filters today (survey §1). Adding them is a platform-side epic; not worth blocking on. | Noah — platform-side upgrade is a future optimization. |
| Same Supabase project as E5/E6 (not a separate AI project) | Blast-radius isolation | Two projects = two billing lines + two migration paths for one app. One project with tight RLS is fine; we already segregate the service-role key to a single server-only module. | Noah. |
| No human-review-before-send on agent outputs | "AI + human-in-loop" patterns | A friend doesn't need a lawyer reviewing every sentence before they give advice. The AI's identity is "knowledgeable friend," not "representative"; its outputs are input for the seller's own decisions, not legally binding acts. The PM can be looped in via the E6 surface when the seller wants a licensed second opinion. Artifact retention gives a clean audit trail either way. | Noah + Legal — documented in `docs/ai-agent-policy.md`. |

---

## 6. Open questions

None blocking. Items to resolve during implementation:

- **Gateway cost cap value** — start at $500/month project-wide; revise after two weeks of real traffic. Owned by Noah; configured outside this doc.
- **Per-zip `regionalPerSqft` table** — source for seed values: Offervana's historical sale data for AZ zips. Pull once, bake into code. Revisit quarterly. E11-S5 owns.
- **Fallback model choice** — `openai/gpt-5` assumed; if Gemini-equivalent or another is preferred at the Gateway level, change is a one-line env swap.
- **Does `analyze_offer` trigger a PM alert for below-AVM offers?** — E10 default: no, the seller stays in control of the conversation. E6 may later add a soft signal in the PM dashboard. Deferred.
- **Memory compaction trigger threshold** — start at 24-message window; compact-to-summary when exceeded. Needs to survive agent self-test; refine post-launch.
- **SSE over long-poll** — `/api/chat/jobs/{id}?stream=1` is "nice to have." MVP fine with 5s polling; SSE is a follow-up optimization.
- **Multi-turn photo review** — if the user asks "re-review photo 3 with an eye for plumbing," should `review_photos` accept a natural-language focus parameter? MVP: no, `{ mlsRecordId, focus?: string }` with `focus` unused until proven useful.
- **WDK queue region pinning** — ensure the workflow runs in the same region as the MLS calls for latency + deterministic retry. E11-S6 owns the region check.
- **Zoodealio.Chat re-use** — if the platform later mandates AI convergence, the tool schemas we build here should be shippable as a public contract. Defer.

---

## 7. Handoff notes for PM (three epics, suggested story boundaries)

### Epic E9 — AI Agent Foundation

Goal: ship the empty chat. No domain skills yet. By end of E9, a user can open `/chat`, send "hi," get a streamed response from Claude via the Gateway, and see the disclaimer banner. Token/IP budgets enforced. All four Supabase tables + the storage bucket exist and are used.

| # | Story | Size | Notes |
|---|---|---|---|
| E9-S1 | Supabase migrations — `ai_sessions`, `ai_messages`, `ai_tool_runs`, `ai_artifacts` + `ai-docs` bucket | S | Shared infra. RLS locked. Unit-test against local Supabase. |
| E9-S2 | `src/lib/ai/gateway.ts` + env vars + package install (`ai`, `@vercel/workflow`) | S | Smoke test: `generateText` round-trip in a script. |
| E9-S3 | `src/lib/ai/session.ts` + `/api/chat/sessions` Route Handler | S | Create + load + cookie. Integration test against Supabase. |
| E9-S4 | `src/lib/ai/budget.ts` + `src/lib/ai/redact.ts` | S | Token budget check; IP hash; PII redactor with tests on emails/phones/addresses. |
| E9-S5 | `/api/chat/route.ts` streaming endpoint (no tools yet) + orchestrator system prompt v0 | M | AI SDK `streamText` + SSE response. E2E test sending a message and asserting a streamed response + a new `ai_messages` row. |
| E9-S6 | `/chat` page + `<Chat>` component (useChat) + `<DisclaimerBanner>` | M | UI-only; markdown render; mobile-responsive. Accessibility pass. |
| E9-S7 | `docs/ai-agent-policy.md` + AGENTS.md append | S | Posture codified: tech-platform identity (not a brokerage), friend-style advice permitted (negotiation, contracts, offers), required three-part disclaimer wording (AI / not licensed / not fiduciary), what the AI doesn't do (act on the seller's behalf). Reviewed with Noah. |

**Critical sequencing:** S1 unblocks S3–S5. S2 unblocks S5. S3 + S5 unblock S6. S7 can be drafted any time — must merge before E10.

**Parallelism:** S2 and S4 are independent. S6 can start once S3 exposes a stub session.

### Epic E10 — Transaction Manager capabilities

Goal: the agent can review PDFs, explain contract terms, and analyze offers. No comping yet. Adds doc upload UI and inline artifact rendering.

| # | Story | Size | Notes |
|---|---|---|---|
| E10-S1 | `/api/chat/upload` + `src/lib/supabase/storage.ts` | S | MIME + size validation; 10 MB cap; signed-URL TTL. |
| E10-S2 | `<DocUpload>` component + inline preview | S | AI SDK `useChat` supports experimental attachments. |
| E10-S3 | `review_pdf` tool + `DocSummarySchema` + prompt in `src/lib/ai/prompts/pdf-reviewer.ts` | M | Claude Opus via gateway; integration test with a fixture PDF (a sample AZ contract — anonymized). |
| E10-S4 | `explain_terms` tool | S | Model-only; no tool-of-a-tool. |
| E10-S5 | `analyze_offer` tool + `OfferAnalysisSchema` + prompt | M | Structured output; test that `recommendation` is always `null`. |
| E10-S6 | `<DocSummaryCard>` + `<OfferAnalysisCard>` render components | M | Accessibility; mobile; citation link-through to PDF. |
| E10-S7 | Transaction Manager prompt v1 — expand with tool usage heuristics | S | Prompt-review with Noah; add golden tests of representative conversations. |
| E10-S8 | Thanks-page "Talk to your AI assistant" CTA (feature-flagged) | S | One link edit. Gated by `AI_CHAT_ENABLED`. |

**Critical sequencing:** S1 → S2 → S3 → S6. S4 + S5 parallel to S3. S7 after S3/S4/S5. S8 last.

**Parallelism:** S1/S4/S5 are three tracks.

### Epic E11 — Comping Agent capabilities

Goal: given a subject property (from form bootstrap or chat), the agent produces a comp-backed valuation with confidence. Introduces Vercel Workflow; comp-review UI cards; photo review tool.

| # | Story | Size | Notes |
|---|---|---|---|
| E11-S1 | WDK bootstrap: `comp-run` workflow skeleton + queue key env + first two steps (`find_comps`, hydrate) | M | Uses existing `src/lib/enrichment/mls-client.ts` — no new MLS client. |
| E11-S2 | `review_photos` tool + `PhotoAssessmentSchema` + prompt | M | Claude vision; test with 3 real SAS URLs from MLS UAT. |
| E11-S3 | `apply_deviations` pure function + `regionalPerSqft` AZ zip seed table + unit tests | M | Pure math; 95%+ coverage; table in code, not DB. |
| E11-S4 | `aggregate_valuation` judge tool + `ValuationSchema` + prompt (with confidence rubric inlined) | M | Claude Opus; golden-test on 3 known AZ properties. |
| E11-S5 | `start_comp_job` orchestrator tool + `/api/chat/jobs/[id]` poll endpoint + SSE (optional) | M | Wires workflow trigger to the conversation. |
| E11-S6 | `<CompCard>` + `<ValuationPanel>` render components | M | Confidence chip with hover tooltip explaining rubric; comp photo thumbnails; "why this comp" expandable. |
| E11-S7 | Bootstrap from `submission_id` — chat opens with context-aware greeting | S | Server component reads `submissions` table (E6) + seeds session. |
| E11-S8 | Chaos + smoke test suite — intentionally slow MLS, timeouts, missing-photo comps, zero-comp result path, judge retry | M | Runs against UAT; dead-letter written to `ai_tool_runs.error_detail` when rubric hits floor confidence. |

**Critical sequencing:** S1 unblocks all other workflow steps. S2/S3 parallel. S4 after S2/S3. S5 after S4. S6 after S5 has a working end-to-end run. S7 independent once session seed is defined (E9-S3). S8 after S6.

**Parallelism:** S1 + S2 + S3 can be three contributors once E10 is done.

### Acceptance-criteria cadence (all three epics)

Every story must include:

- `next build` passes with `runtime = 'nodejs'` on `/api/chat/**`.
- No client bundle contains `AI_GATEWAY_API_KEY` or `SUPABASE_SERVICE_ROLE_KEY` (grep `.next/static/**` — zero hits).
- Tool schemas are Zod-defined; runtime failures return a `{ kind: 'tool-error', safe: true }` envelope to the orchestrator, not an exception.
- PII redactor has unit tests covering email, phone, street address, and common name/number collisions (e.g. "5 bedrooms" must not be redacted as a phone partial).
- Every new persisted row carries a `session_id` FK — no orphan tool runs.
- Disclaimer banner is visible from the first message; three-part disclaimer (AI / not licensed / not fiduciary) present on the banner AND in the footer of every AI-authored artifact card (doc summary, comp report, offer analysis, valuation). Copy reviewed against `docs/ai-agent-policy.md`.
- No third-party analytics are added. Vercel Analytics is already present; no new SDK ships to the client.
- For E11 only: comping golden tests include three real AZ addresses with known recent comps; valuation must fall within ±10% of the Offervana PM's manual CMA for the same address (measured in CI against a fixture set).

### Not in scope (for PM clarity)

- Seller login / accounts / saved sessions across devices (future).
- Agent-initiated outbound (email, SMS the seller) — deferred; E6 owns seller-facing transactional messages.
- Acting on the seller's behalf — the AI doesn't draft a counteroffer *for signature*, doesn't message buyers or their agents as the seller, doesn't sign or commit to anything. Strategy advice ("here's how I'd counter, and why") is explicitly in-scope; sending/signing it is not.
- Formal legal advice — the AI can explain contract terms and flag issues, but doesn't draft legal opinions; points to an attorney for anything that calls for one.
- Multi-language support — English-only MVP.
- Voice input/output.
- Admin dashboard for conversations — E6 optional follow-up.
- Custom fine-tuned models — Gateway + prompts only.
- Full Zoodealio.Chat co-existence / handoff — future platform-side decision.

---

## 8. References

- Project plan: `_bmad-output/planning-artifacts/project-plan-sell-house-for-free.md`
- E4 enrichment architecture: `_bmad-output/planning-artifacts/architecture-e4-property-data-enrichment.md` (MLS client, `EnrichmentSlot`, photo URL lifetimes)
- E5 Offervana integration architecture: `_bmad-output/planning-artifacts/architecture-e5-offervana-host-admin-submission.md` (Supabase conventions, server-only guard, `src/lib/supabase/server.ts`, `docs/` policy-doc pattern)
- E6 PM service + confirmation architecture: `_bmad-output/planning-artifacts/architecture-e6-pm-service-and-confirmation.md` (`submissions` table, bootstrap correlation)
- Analytics & anti-broker policy: `docs/analytics-policy.md`, `docs/anti-broker-audit.md`
- Zoodealio.MLS DTOs: `Zoodealio.MLS/Zoodealio.MLS.Application/Properties/Models/PropertySearchResultDto.cs`, `PropertyDetailsDto.cs`, `PropertyImagesDto.cs`, `PropertyHistoricalChangeDto.cs`
- Zoodealio.MLS endpoints: `Zoodealio.MLS/Zoodealio.MLS.Api/Controllers/PropertiesController.cs`
- Offervana ATTOM client (read-reference only): `Offervana_SaaS/aspnet-core/src/Offervana.Core/Net/Attom/AttomClient.cs`, `Offervana_SaaS/aspnet-core/src/Offervana.Core.Shared/Attom/AttomAvmResponseModel.cs`
- Zoodealio.Chat (behavioral reference, not a dependency): `Zoodealio.Chat/temporal_workflows/agent_tools.py`, `Zoodealio.Chat/functions/function_implementations.py`, `Zoodealio.Chat/config/instructions.txt`
- Vercel AI SDK v6: `vercel:ai-sdk` skill + platform docs
- Vercel AI Gateway: `vercel:ai-gateway` skill + platform docs
- Vercel Workflow DevKit: `vercel:workflow` skill + platform docs
- Vercel Functions (Fluid Compute): `vercel:vercel-functions` skill
- Vercel Knowledge Update 2026-02-27: session-start hook (Node 24, Fluid Compute, 300s default, Gateway GA)
- Anthropic native PDF/document support: Claude Sonnet/Opus 4.x
- Ecosystem map: `_bmad/zoo-core-CLAUDE.md`
- Curated patterns: `_bmad/memory/zoo-core/curated/patterns.md`
