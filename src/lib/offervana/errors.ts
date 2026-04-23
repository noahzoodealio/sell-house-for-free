import type { OffervanaOkPayload, SubmitResult } from "./types";

export type ClassificationKind =
  | "ok"
  | "email-conflict"
  | "permanent-failure"
  | "transient"
  | "malformed-response";

export interface Classification {
  kind: ClassificationKind;
  message: string;
}

const EMAIL_CONFLICT_PATTERN =
  /email.*(already\s+(registered|exists|in\s+use)|taken)|user(name)?\s+already\s+exists|duplicate\s+email/i;

export function classifyResponse(
  status: number,
  body: unknown,
): Classification {
  const message = extractMessage(body);

  if (status >= 200 && status < 300) {
    return { kind: "ok", message };
  }

  if (EMAIL_CONFLICT_PATTERN.test(message)) {
    return { kind: "email-conflict", message };
  }

  // ABP wraps UserFriendlyException in HTTP 500 with error.code / error.message;
  // treat those as permanent when the message indicates validation, otherwise retry.
  if (status === 500 && isUserFriendly(body)) {
    return { kind: "permanent-failure", message };
  }

  if (status >= 500 || status === 408 || status === 429) {
    return { kind: "transient", message };
  }

  if (status >= 400) {
    return { kind: "permanent-failure", message };
  }

  return { kind: "transient", message };
}

export function normalizeOkPayload(
  body: unknown,
): OffervanaOkPayload | { error: string } {
  if (!body || typeof body !== "object") {
    return { error: "response body is not an object" };
  }
  const obj = body as Record<string, unknown>;
  const item1 = obj.item1 ?? obj.Item1;
  const item2 = obj.item2 ?? obj.Item2;
  const item3 = obj.item3 ?? obj.Item3;

  if (typeof item1 !== "number") {
    return { error: "item1 (customerId) missing or non-numeric" };
  }
  if (typeof item2 !== "number") {
    return { error: "item2 (userId) missing or non-numeric" };
  }
  if (typeof item3 !== "string" || item3.length === 0) {
    return { error: "item3 (referralCode) missing or empty" };
  }

  return {
    customerId: item1,
    userId: item2,
    referralCode: item3,
  };
}

export function toSubmitResult(
  classification: Classification,
  body: unknown,
  status: number,
  attempts: number,
): SubmitResult {
  switch (classification.kind) {
    case "ok": {
      const payload = normalizeOkPayload(body);
      if ("error" in payload) {
        return {
          kind: "malformed-response",
          detail: { status, body, message: payload.error },
          attempts,
        };
      }
      return { kind: "ok", payload, attempts };
    }
    case "email-conflict":
      return {
        kind: "email-conflict",
        detail: { status, body, message: classification.message },
        attempts,
      };
    case "permanent-failure":
      return {
        kind: "permanent-failure",
        detail: { status, body, message: classification.message },
        attempts,
      };
    case "malformed-response":
      return {
        kind: "malformed-response",
        detail: { status, body, message: classification.message },
        attempts,
      };
    case "transient":
      // transient bubbles up to caller for retry decisions
      throw new Error(
        "transient classification must not be converted directly to SubmitResult",
      );
  }
}

function extractMessage(body: unknown): string {
  if (!body || typeof body !== "object") {
    return typeof body === "string" ? body : "";
  }
  const obj = body as Record<string, unknown>;
  const err = obj.error;
  if (err && typeof err === "object") {
    const errObj = err as Record<string, unknown>;
    if (typeof errObj.message === "string") return errObj.message;
    if (typeof errObj.details === "string") return errObj.details;
  }
  if (typeof obj.message === "string") return obj.message;
  return "";
}

function isUserFriendly(body: unknown): boolean {
  if (!body || typeof body !== "object") return false;
  const obj = body as Record<string, unknown>;
  const err = obj.error;
  return typeof err === "object" && err !== null;
}
