import "server-only";

// Sentry stub — S8 swaps the body for Sentry.captureException with the
// same signature. The event name (`pm_assignment_failed` or
// `pm_email_failed`) is locked as the S8 alert-rule contract.
//
// IMPORTANT: `extras` MUST NOT contain seller PII (email, phone, full
// name, address). The caller constructs a sanitized-extras object via
// sanitizeSentryExtras() below and passes it here.

export type SentryEventName =
  | "pm_assignment_failed"
  | "pm_email_failed"
  | "seller_login_succeeded"
  | "seller_login_failed"
  | "seller_magic_link_expired"
  | "seller_login_resend"
  | "team_inbound_webhook_misconfigured"
  | "team_inbound_message_unroutable"
  | "team_delivery_webhook_misconfigured"
  | "team_delivery_webhook_update_failed"
  | "team_message_insert_failed"
  | "team_message_send_failed";

export type SentrySeverity = "critical" | "error" | "warning";

export interface CaptureArgs {
  event: SentryEventName;
  severity: SentrySeverity;
  error?: unknown;
  extras?: Record<string, unknown>;
}

export function captureException({
  event,
  severity,
  error,
  extras,
}: CaptureArgs): string {
  const eventId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  const payload = {
    event,
    severity,
    ts: new Date().toISOString(),
    eventId,
    errorMessage: error instanceof Error ? error.message : String(error ?? ""),
    errorName: error instanceof Error ? error.name : undefined,
    ...extras,
  };

  console.error(JSON.stringify(payload));
  return eventId;
}

// Allow-list for Sentry extras. Anything not in this set is dropped.
const SAFE_EXTRA_KEYS = new Set([
  "submissionId",
  "referralCode",
  "customerId",
  "userId",
  "propertyId",
  "pillarHint",
  "assignmentKind",
  "profileCreated",
  "attempt",
  "classification",
  "templateKey",
  "recipientType",
  // E10 auth events:
  "authMethod",
  "authReason",
  "identifierType",
]);

export function sanitizeSentryExtras(
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
