import "server-only";

import { classifyResponse, toSubmitResult } from "./errors";
import type { CreateCustomerDto, SubmitResult } from "./types";

const OFFERVANA_BASE_URL = "https://sellfreeai.zoodealio.net";
const CREATE_CUSTOMER_PATH = "/openapi/Customers";

const MAX_ATTEMPTS = 2;
// OuterAPI Customers reliably takes ~15s end-to-end (creates customer +
// property + kicks off downstream offer work). 25s per attempt gives enough
// headroom for the happy path without burning the whole wall-clock budget
// on a single slow request.
const PER_ATTEMPT_TIMEOUT_MS = 25_000;
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

// ---------- OffersV2 -------------------------------------------------------

const OFFERS_PATH = "/openapi/OffersV2";
const OFFERS_PER_ATTEMPT_TIMEOUT_MS = 15_000;

export type OffersV2FetchResult =
  | { kind: "ok"; offers: unknown[]; rawCount: number; latencyMs: number }
  | { kind: "empty"; latencyMs: number }
  | {
      kind: "error";
      detail: { status: number | null; message: string; body?: unknown };
      latencyMs: number;
    };

export interface FetchOffersV2Options {
  fetchImpl?: typeof fetch;
  submissionId?: string;
}

/**
 * GET `/openapi/OffersV2?propertyId={id}&includeHistory=false` against the
 * Offervana OuterAPI. Single attempt — the customer record already exists,
 * so a transient failure here just means the portal starts without offers
 * and can re-fetch later. Returns a tagged result the caller logs/persists.
 */
export async function fetchOffersV2(
  propertyId: number,
  options: FetchOffersV2Options = {},
): Promise<OffersV2FetchResult> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const apiKey = process.env.ZOODEALIO_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ZOODEALIO_API_KEY is not set. Required to call sellfreeai.zoodealio.net OuterAPI.",
    );
  }

  const url = `${OFFERVANA_BASE_URL}${OFFERS_PATH}?propertyId=${encodeURIComponent(
    String(propertyId),
  )}&includeHistory=false`;

  const start = Date.now();
  try {
    const headers: Record<string, string> = {
      Accept: "application/json",
      ApiKey: apiKey,
    };
    if (options.submissionId) {
      headers["X-Client-Submission-Id"] = options.submissionId;
    }
    const response = await fetchImpl(url, {
      method: "GET",
      headers,
      cache: "no-store",
      signal: AbortSignal.timeout(OFFERS_PER_ATTEMPT_TIMEOUT_MS),
    });
    const latencyMs = Date.now() - start;
    const rawBody = await readJsonSafely(response);

    if (response.status < 200 || response.status >= 300) {
      return {
        kind: "error",
        detail: {
          status: response.status,
          message: `HTTP ${response.status}`,
          body: rawBody,
        },
        latencyMs,
      };
    }

    const offers = extractOffersArray(rawBody);
    if (offers === null) {
      return {
        kind: "error",
        detail: {
          status: response.status,
          message: "OffersV2 response not shaped as { result: [...] }",
          body: rawBody,
        },
        latencyMs,
      };
    }

    if (offers.length === 0) {
      return { kind: "empty", latencyMs };
    }
    return { kind: "ok", offers, rawCount: offers.length, latencyMs };
  } catch (err) {
    return {
      kind: "error",
      detail: {
        status: null,
        message: err instanceof Error ? err.message : String(err),
      },
      latencyMs: Date.now() - start,
    };
  }
}

function extractOffersArray(body: unknown): unknown[] | null {
  if (!body || typeof body !== "object") return null;
  const envelope = body as Record<string, unknown>;
  const result = envelope.result ?? envelope.Result;
  if (Array.isArray(result)) return result;
  // Some ABP endpoints return the array directly; tolerate that shape too.
  if (Array.isArray(body)) return body;
  return null;
}
