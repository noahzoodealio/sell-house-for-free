# Runbook: AI MLS tool outage

**Filed by:** E13-S7 (ADO 7986). **Last reviewed:** 2026-04-25.

## Detection signal

- Sentry event `ai_tool_failed` with `cause` ∈ {`upstream_unavailable`, `auth_failed`} and `tool_name` ∈ {`searchListingsByAddress`, `getListingDetails`, `getListingHistory`}.
- Admin dashboard `v_ai_tool_metrics_7d`: MLS family `error_rate_pct` > 25% sustained.
- Direct probe: hit Zoodealio.MLS `/api/Listings/search` with a JWT.

## Immediate impact

- Sellers asking "is my house listed" / "what's on my street" → `tool-error` envelope.
- The comping pipeline (`start_comp_job`) **also depends on MLS**. If MLS is down, that pipeline degrades — the agent should surface "thin comps / low confidence" per E9-S21 dead-letter UX.

## Mitigation — kill switch

`AI_TOOLS_MLS_DISABLED=true` in Vercel env. The 3 MLS tools return `disabled_by_ops`. The comping workflow has its own retry/degrade path (E9-S23 chaos coverage); flip this kill switch only if the workflow's dead-letter handling can't keep up.

## Comms template

> Property-listing lookups are temporarily unavailable. Submitting a new property and viewing your offers continues to work normally. — Sell Your House Free

## Recovery

1. Verify Zoodealio.MLS responding.
2. Unset `AI_TOOLS_MLS_DISABLED` and redeploy.
3. Watch error rate; chase any orphaned `comp_run` workflow runs.
4. Resolve Sentry alert.

## How this was tested

E9-S23 chaos suite covers slow MLS / hanging hydrate / zero-comp fallback. E13-S7 unit tests verify the kill switch short-circuits the 3 tools.
