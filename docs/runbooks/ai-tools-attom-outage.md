# Runbook: AI ATTOM tool outage

**Filed by:** E13-S7 (ADO 7986). **Last reviewed:** 2026-04-25.

## Detection signal

- Sentry event `ai_tool_failed` with `cause` ∈ {`upstream_unavailable`, `auth_failed`} and `tool_name` matching `getAttom*`, `getProperty*`, `getLastSale`, `getSalesHistory`, `getAssessmentAndTax`, `getAssessmentHistory`, `getAreaSalesTrend`, `getNearbySchools`, `getRentalAvm`, `getBuildingPermits`, `getHomeEquityEstimate`.
- Admin dashboard `v_ai_tool_metrics_7d`: ATTOM family `error_rate_pct` > 25% sustained.
- Direct probe: `curl -H "apikey: $ATTOM_API_KEY" https://api.gateway.attomdata.com/...` — confirm 5xx / timeout / DNS failure.

## Immediate impact

Sellers asking property-data questions get either:
- `tool-error` envelope ("ATTOM didn't respond cleanly. Try again in a few.")
- Empty data (`reason: 'no_data'`) → "I don't see that data" friend-style response.

The AVM-driven valuation path (`start_comp_job`) still works — it routes through MLS + the comping pipeline, not ATTOM directly. ATTOM AVM is citation-only there.

## Mitigation — kill switch

Set `AI_TOOLS_ATTOM_DISABLED=true` in Vercel env vars + redeploy (or hot-reload via `vercel env pull` if the runtime supports it). Every ATTOM tool returns `{kind: 'tool-error', cause: 'disabled_by_ops'}` immediately; orchestrator handles it gracefully per the `transaction-manager.ts` heuristics.

## Comms template

> Sellers, our property-data lookup is temporarily unavailable while we troubleshoot a vendor issue. Your existing offers and submission are unaffected. We'll reach out directly when service is restored. — Sell Your House Free

Send via email + post in any active threads (`messages` table). PM oncall handles individual escalations.

## Recovery

1. Verify ATTOM API responding (status page + direct curl).
2. Unset `AI_TOOLS_ATTOM_DISABLED` and redeploy.
3. Watch `v_ai_tool_metrics_7d` for 30 min; ATTOM family `error_rate_pct` should drop below 5%.
4. Resolve the Sentry alert.

## How this was tested

E13-S7 unit tests verify `AI_TOOLS_ATTOM_DISABLED=true` short-circuits before any ATTOM call. End-to-end smoke testing happens in the chaos suite (E9-S23 pattern) when extended for E13.
