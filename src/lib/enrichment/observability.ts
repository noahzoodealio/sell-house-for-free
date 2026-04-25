import "server-only";

// E12-S6: Sentry stub for enrichment durable-cache events. Mirrors the
// pm-service/observability.ts pattern — event names are the alert-rule
// contract for the production Sentry project (rules are configured by
// name; renaming here renames there). Body will swap to
// Sentry.captureException when E8 wires the SDK.
//
// IMPORTANT: extras MUST NOT carry seller PII. Address fields are
// excluded; addressKey (sha256) is fine because it's one-way.

export type EnrichmentSentryEventName =
  | "enrichment_durable_hit"
  | "enrichment_upstream_refetch"
  | "enrichment_stale_refresh_skipped_outage"
  | "enrichment_upstream_error";

export type EnrichmentSentrySeverity = "info" | "warning" | "error";

export interface EnrichmentCaptureArgs {
  event: EnrichmentSentryEventName;
  severity: EnrichmentSentrySeverity;
  error?: unknown;
  extras?: Record<string, unknown>;
}

const SAFE_EXTRA_KEYS = new Set([
  "addressKey",
  "endpoint",
  "ttlMs",
  "fetchedAtIso",
  "ageMs",
  "durableHit",
  "stale",
  "outage",
  "errorCode",
  "errorStatus",
]);

export function sanitizeEnrichmentExtras(
  candidate: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(candidate)) {
    if (SAFE_EXTRA_KEYS.has(key) && value !== undefined) {
      out[key] = value;
    }
  }
  return out;
}

export function captureEnrichmentEvent({
  event,
  severity,
  error,
  extras,
}: EnrichmentCaptureArgs): string {
  const eventId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  const payload = {
    event,
    severity,
    ts: new Date().toISOString(),
    eventId,
    errorMessage:
      error instanceof Error ? error.message : error ? String(error) : undefined,
    errorName: error instanceof Error ? error.name : undefined,
    ...sanitizeEnrichmentExtras(extras ?? {}),
  };

  // Info events go to console.log so they don't trip Sentry's error-rate
  // alarms; warning/error go to console.error which the Sentry SDK swap
  // will route to captureException with matching severity.
  if (severity === "info") {
    console.log(JSON.stringify(payload));
  } else {
    console.error(JSON.stringify(payload));
  }

  return eventId;
}
