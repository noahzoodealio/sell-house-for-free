<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Analytics & tracking

Default posture: **no third-party tracking SDKs**. Read `docs/analytics-policy.md` before adding *any* vendor SDK (Google Analytics, Hotjar, Segment, Intercom, pixels, session replay, etc.). The analytics gate in `src/app/layout.tsx` must stay production-only with `NODE_ENV === 'production' && VERCEL_ENV !== 'preview'`.

# AI assistant

The AI assistant runs in-repo under `src/lib/ai/**` and `/api/chat` (plus `/chat` UI under `src/app/(app)/chat/**`). All provider calls go through the Vercel AI Gateway — never import a provider SDK (`@ai-sdk/anthropic`, `@ai-sdk/openai`, etc.) directly. No third-party analytics on agent traffic. Read `docs/ai-agent-policy.md` before editing any file under those paths — the posture (tech platform not brokerage, knowledgeable friend, three-part disclaimer required on every artifact) is load-bearing.
