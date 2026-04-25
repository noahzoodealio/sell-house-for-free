# Runbook: AI Offervana tool outage

**Filed by:** E13-S7 (ADO 7986). **Last reviewed:** 2026-04-25.

## Detection signal

- Sentry event `ai_tool_failed` with `cause` ∈ {`upstream_unavailable`, `auth_failed`} and `tool_name` ∈ {`getMyOffervanaProperty`, `listMyOffers`, `listMyOffersV2`, `getOfferHistory`, `getMyCustomerRecord`}.
- **Sentry event `ai_tool_scope_violation`** — page-grade. ANY occurrence indicates either an attack attempt or an E10/E11/S4 plumbing bug. Wake oncall.
- Admin dashboard `v_ai_tool_metrics_7d`: Offervana family `error_rate_pct` > 15% sustained.
- Direct probe: `curl -H "ApiKey: $ZOODEALIO_API_KEY" https://sellfreeai.zoodealio.net/openapi/Properties?address=...` — confirm 5xx / 401 / DNS.

## Immediate impact

Sellers asking about their offers (V2) hit `tool-error`. The local mirror (`listMySubmissionOffers`, S5) is the documented fallback in the orchestrator prompt — orchestrator should automatically fall back when V2 returns `upstream_unavailable`.

**Critical:** `scope_violation` is NOT a normal failure mode. If fired, freeze the affected session immediately and audit the seller-scope plumbing (see "Scope-violation response" below).

## Mitigation — kill switch

`AI_TOOLS_OFFERVANA_DISABLED=true` in Vercel env. All Offervana tools return `disabled_by_ops`. Orchestrator falls back to local-mirror reads.

## Scope-violation response

1. Capture the offending `session_id` and `tool_name` from the Sentry event.
2. Query `ai_tool_runs` for that session:
   ```
   SELECT * FROM ai_tool_runs
   WHERE session_id = '<session>'
     AND metadata->>'scope_violation' = 'true';
   ```
3. Verify `submissions.seller_id` matches the seller's actual auth identity.
4. Verify `offervana_idempotency.customer_id` matches what the seller's submission flow created.
5. If the mismatch is real (not a sync lag), terminate the session via admin tooling and rotate the `ZOODEALIO_API_KEY` if any cross-tenant leak is suspected.
6. File a post-mortem.

## Comms template

> Heads up — if you've been asking about your offer status, our system was briefly unable to reach the offer service. Local data shows the most recent state we have on file; if you need real-time confirmation please ping your PM directly. — Sell Your House Free

## Recovery

1. Verify Offervana OuterApi responding.
2. Unset `AI_TOOLS_OFFERVANA_DISABLED` and redeploy.
3. Watch error rate.
4. Resolve Sentry alert.

## How this was tested

E13-S4 unit tests (`outer-api-client.test.ts`, `seller-scope.test.ts`) verify scope violation paths. E13-S7 unit tests verify `AI_TOOLS_OFFERVANA_DISABLED=true` short-circuits.
