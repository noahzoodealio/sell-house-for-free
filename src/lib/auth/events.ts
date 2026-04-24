import "server-only";

import { captureException } from "@/lib/pm-service/observability";

export type AuthLoginMethod = "magic_link" | "email_otp" | "sms_otp";

export type AuthLoginFailureReason =
  | "expired"
  | "used"
  | "invalid_code"
  | "rate_limited"
  | "user_not_found"
  | "tcpa_missing"
  | "exchange_failed";

export type AuthEventInput =
  | { type: "seller_login_succeeded"; method: AuthLoginMethod; userId: string }
  | {
      type: "seller_login_failed";
      method: AuthLoginMethod;
      reason: AuthLoginFailureReason;
    }
  | {
      type: "seller_magic_link_expired";
      identifierType: "email" | "phone";
    }
  | {
      type: "seller_login_resend";
      identifierType: "email" | "phone";
      attempt: number;
    };

/**
 * Structured auth-event emitter. Routes through the shared Sentry capture
 * helper so payloads flow wherever E8's real Sentry SDK lands. PII rule:
 * payloads carry `userId` (UUID from auth.uid()), `identifierType` (the
 * string "email"|"phone"), `method`, `reason` — NEVER the raw email or
 * phone. Unit test asserts no `@` character in the serialized JSON.
 */
export function trackAuthEvent(input: AuthEventInput): void {
  if (input.type === "seller_login_succeeded") {
    captureException({
      event: input.type,
      severity: "warning",
      extras: {
        authMethod: input.method,
        userId: input.userId,
      },
    });
    return;
  }

  if (input.type === "seller_login_failed") {
    captureException({
      event: input.type,
      severity: "warning",
      extras: {
        authMethod: input.method,
        authReason: input.reason,
      },
    });
    return;
  }

  if (input.type === "seller_magic_link_expired") {
    captureException({
      event: input.type,
      severity: "warning",
      extras: {
        identifierType: input.identifierType,
      },
    });
    return;
  }

  // seller_login_resend
  captureException({
    event: input.type,
    severity: "warning",
    extras: {
      identifierType: input.identifierType,
      attempt: input.attempt,
    },
  });
}
