import "server-only";

import { classifyResponse, toSubmitResult } from "./errors";
import type { NewClientDto, SubmitResult } from "./types";

const OFFERVANA_BASE_URL = "https://sellfreeai.zoodealio.net";
const CREATE_HOST_ADMIN_PATH =
  "/api/services/app/CustomerAppServiceV2/CreateHostAdminCustomer";

const MAX_ATTEMPTS = 3;
const PER_ATTEMPT_TIMEOUT_MS = 5000;
const BACKOFF_SCHEDULE_MS = [0, 1000, 4000];
const JITTER_MAX_MS = 250;

export interface CreateHostAdminOptions {
  submissionId?: string;
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  random?: () => number;
}

/**
 * POSTs a NewClientDto to Offervana's CreateHostAdminCustomer endpoint with
 * per-attempt 5s timeout, 3-attempt retry at 0/1s/4s (+<=250ms jitter), and
 * response classification into a tagged SubmitResult union.
 *
 * - Happy path returns `{ kind: 'ok', payload }` with customerId/userId/referralCode
 *   normalized out of the C# ValueTuple `{item1,item2,item3}`.
 * - ABP UserFriendlyException matching the email-conflict regex returns
 *   `{ kind: 'email-conflict' }` without retry.
 * - 4xx (non-408/429, non-email-conflict) returns `{ kind: 'permanent-failure' }`.
 * - All transient failures after 3 attempts return `{ kind: 'transient-exhausted' }`.
 * - 200 bodies lacking the ValueTuple shape return `{ kind: 'malformed-response' }`.
 *
 * Callers (S6 Server Action) pattern-match on `kind` for exhaustiveness.
 * `submissionId` is forwarded as `X-Client-Submission-Id` for future idempotency
 * primitives on the Offervana side.
 */
export async function createHostAdminCustomer(
  dto: NewClientDto,
  options: CreateHostAdminOptions = {},
): Promise<SubmitResult> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const sleep =
    options.sleep ?? ((ms: number) => new Promise((r) => setTimeout(r, ms)));
  const random = options.random ?? Math.random;

  const apiKey = process.env.ZOODEALIO_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ZOODEALIO_API_KEY is not set. Required to call sellfreeai.zoodealio.net.",
    );
  }

  const url = `${OFFERVANA_BASE_URL}${CREATE_HOST_ADMIN_PATH}`;
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
        Authorization: `Bearer ${apiKey}`,
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
