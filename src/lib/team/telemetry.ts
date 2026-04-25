import "server-only";

import {
  captureException,
  type SentryEventName,
  type SentrySeverity,
} from "@/lib/pm-service/observability";

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;
const PHONE_RE = /(\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g;

/**
 * Recursively redacts likely PII (email + 10-digit phone) from any string
 * value in a team-portal Sentry payload. Keys themselves are not
 * inspected — the AC's posture is "no PII in serialized payloads",
 * which means the value side. Numbers + booleans pass through unchanged.
 */
function redactValue(value: unknown): unknown {
  if (typeof value === "string") {
    return value.replace(EMAIL_RE, "[redacted-email]").replace(PHONE_RE, "[redacted-phone]");
  }
  if (Array.isArray(value)) {
    return value.map(redactValue);
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = redactValue(v);
    }
    return out;
  }
  return value;
}

export interface TeamPortalEventTags {
  submissionId?: string;
  teamUserId?: string;
  documentId?: string;
  // Free-form extras — values get redacted before send.
  [key: string]: unknown;
}

/**
 * Stable wrapper for emitting team-portal Sentry events.
 * - Pulls the event name from the SentryEventName union (compile-time
 *   guard against typos).
 * - Redacts likely-PII strings recursively.
 * - Defaults severity to 'warning' (operational signal, not page).
 * Use 'error' for cases that block a user; 'critical' for revenue impact.
 */
export function emitTeamPortalEvent(args: {
  event: Extract<SentryEventName, `team_${string}`>;
  severity?: SentrySeverity;
  error?: unknown;
  tags?: TeamPortalEventTags;
}): string {
  const sanitized = (args.tags ? redactValue(args.tags) : {}) as Record<
    string,
    unknown
  >;
  return captureException({
    event: args.event,
    severity: args.severity ?? "warning",
    error: args.error,
    extras: sanitized,
  });
}
