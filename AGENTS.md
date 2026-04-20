<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Analytics & tracking

Default posture: **no third-party tracking SDKs**. Read `docs/analytics-policy.md` before adding *any* vendor SDK (Google Analytics, Hotjar, Segment, Intercom, pixels, session replay, etc.). The analytics gate in `src/app/layout.tsx` must stay production-only with `NODE_ENV === 'production' && VERCEL_ENV !== 'preview'`.
