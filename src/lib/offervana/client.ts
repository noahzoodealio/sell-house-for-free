import "server-only";

import { classifyResponse, toSubmitResult } from "./errors";
import type { CreateCustomerDto, SubmitResult } from "./types";

const OFFERVANA_BASE_URL = "https://sellfreeai.zoodealio.net";
const CREATE_CUSTOMER_PATH = "/openapi/Customers";

const MAX_ATTEMPTS = 2;
const PER_ATTEMPT_TIMEOUT_MS = 13_000;
const BACKOFF_SCHEDULE_MS = [0, 1000];
const JITTER_MAX_MS = 250;

export interface CreateCustomerOptions {
  submissionId?: string;
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  random?: () => number;
}

/**
 * POSTs a CreateCustomerDto to the Offervana OuterAPI `/openapi/Customers`
 * endpoint. Authenticates via the enterprise `ApiKey` header; retries
 * transient failures (5xx / 408 / 429 / network / timeout) at 0/1s with
 * <=250ms jitter; per-attempt timeout 13s, wall-clock budget ~27s.
 *
 * Returns a tagged SubmitResult:
 *  - `ok` — customer created, payload carries customerId + referralCode
 *          (derived from the `GetCustomersDto` response wrapped in the
 *          ABP `{result, success, error}` envelope; upstream misspells
 *          the field `referalCode`, which we accept + normalize).
 *  - `email-conflict` — ABP UserFriendlyException matching the email
 *          regex; not retried.
 *  - `permanent-failure` — 4xx (non-408/429, non-email-conflict) or 200
 *          ABP envelope with `success: false`; not retried.
 *  - `transient-exhausted` — retry budget exhausted after 2 attempts.
 *  - `malformed-response` — 200 body lacks `result.id`/`result.referalCode`.
 *
 * Callers (S6 Server Action) pattern-match on `kind` for exhaustiveness.
 * `submissionId` is forwarded as `X-Client-Submission-Id` for future
 * idempotency primitives on the Offervana side.
 */
export async function createOuterApiCustomer(
  dto: CreateCustomerDto,
  options: CreateCustomerOptions = {},
): Promise<SubmitResult> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const sleep =
    options.sleep ?? ((ms: number) => new Promise((r) => setTimeout(r, ms)));
  const random = options.random ?? Math.random;

  const apiKey = process.env.ZOODEALIO_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ZOODEALIO_API_KEY is not set. Required to call sellfreeai.zoodealio.net OuterAPI.",
    );
  }

  const url = `${OFFERVANA_BASE_URL}${CREATE_CUSTOMER_PATH}`;
  const body = JSON.stringify(dto);

  let lastStatus: number | null = null;
  let lastError = "";

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const baseDelay = BACKOFF_SCHEDULE_MS[attempt - 1] ?? 0;
    if (baseDelay > 0) {
      await sleep(baseDelay + Math.floor(random() * JITTER_MAX_MS));
    }

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Accept: "application/json",
        ApiKey: apiKey,
      };
      if (options.submissionId) {
        headers["X-Client-Submission-Id"] = options.submissionId;
      }
      const response = await fetchImpl(url, {
        method: "POST",
        headers,
        body,
        cache: "no-store",
        signal: AbortSignal.timeout(PER_ATTEMPT_TIMEOUT_MS),
      });

      lastStatus = response.status;
      const rawBody = await readJsonSafely(response);
      const classification = classifyResponse(response.status, rawBody);

      if (classification.kind === "transient") {
        lastError = classification.message || `HTTP ${response.status}`;
        continue;
      }

      return toSubmitResult(classification, rawBody, response.status, attempt);
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      // Abort / network / DNS — all transient; fall through to retry.
    }
  }

  return {
    kind: "transient-exhausted",
    detail: { lastStatus, lastError },
    attempts: MAX_ATTEMPTS,
  };
}

async function readJsonSafely(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
