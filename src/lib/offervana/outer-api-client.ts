import "server-only";

const OFFERVANA_BASE_URL = "https://sellfreeai.zoodealio.net";
const DEFAULT_TIMEOUT_MS = 15_000;

export type OuterApiResult<T> =
  | { kind: "ok"; data: T }
  | { kind: "not-found" }
  | { kind: "auth-failed" }
  | { kind: "upstream-unavailable"; status?: number }
  | { kind: "malformed-response" };

interface OuterApiCallOptions {
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
  timeoutMs?: number;
}

function getApiKey(): string {
  const key = process.env.ZOODEALIO_API_KEY;
  if (!key) {
    throw new Error(
      "ZOODEALIO_API_KEY is not set. Required to call sellfreeai.zoodealio.net OuterAPI.",
    );
  }
  return key;
}

async function callOuterApi<T>(
  path: string,
  query: Record<string, string | number | boolean | undefined>,
  options: OuterApiCallOptions = {},
): Promise<OuterApiResult<T>> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const apiKey = getApiKey();

  const url = new URL(`${OFFERVANA_BASE_URL}${path}`);
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined) continue;
    url.searchParams.set(k, String(v));
  }

  const ac = new AbortController();
  const timeout = setTimeout(() => ac.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  if (options.signal) {
    options.signal.addEventListener("abort", () => ac.abort(), { once: true });
  }

  let response: Response;
  try {
    response = await fetchImpl(url, {
      method: "GET",
      headers: {
        ApiKey: apiKey,
        Accept: "application/json",
      },
      signal: ac.signal,
    });
  } catch {
    clearTimeout(timeout);
    return { kind: "upstream-unavailable" };
  }
  clearTimeout(timeout);

  if (response.status === 401 || response.status === 403) {
    return { kind: "auth-failed" };
  }
  if (response.status === 404) {
    return { kind: "not-found" };
  }
  if (response.status >= 500 || response.status === 408 || response.status === 429) {
    return { kind: "upstream-unavailable", status: response.status };
  }
  if (!response.ok) {
    return { kind: "upstream-unavailable", status: response.status };
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return { kind: "malformed-response" };
  }

  // ABP-style envelope: { result, success, error }
  if (
    typeof body === "object" &&
    body !== null &&
    "success" in body &&
    (body as { success: unknown }).success === false
  ) {
    return { kind: "upstream-unavailable" };
  }

  const result =
    typeof body === "object" &&
    body !== null &&
    "result" in body &&
    (body as { result: unknown }).result !== undefined
      ? (body as { result: unknown }).result
      : body;

  return { kind: "ok", data: result as T };
}

// ----------------------------------------------------------------------------
// Endpoint wrappers — all read-only.
// ----------------------------------------------------------------------------

export interface OuterApiPropertyRecord {
  id: string;
  address?: string;
  customerId?: number;
  offers?: unknown[];
  [key: string]: unknown;
}

export interface OuterApiOfferRecord {
  id: string;
  propertyId?: string;
  customerId?: number;
  status?: string;
  amount?: number;
  source?: string;
  createdAt?: string;
  lastUpdated?: string;
  [key: string]: unknown;
}

export interface OuterApiOfferHistoryRecord {
  offerId: string;
  events: unknown[];
  [key: string]: unknown;
}

export interface OuterApiCustomerRecord {
  id: number;
  email?: string;
  firstName?: string;
  lastName?: string;
  [key: string]: unknown;
}

export function getOffervanaProperty(
  args: { address: string; includeOffers?: boolean },
  options?: OuterApiCallOptions,
): Promise<OuterApiResult<OuterApiPropertyRecord | OuterApiPropertyRecord[]>> {
  return callOuterApi("/openapi/Properties", {
    address: args.address,
    includeOffers: args.includeOffers ?? true,
  }, options);
}

export function listOffers(
  args: { propertyId: string },
  options?: OuterApiCallOptions,
): Promise<OuterApiResult<OuterApiOfferRecord[]>> {
  return callOuterApi("/openapi/Offers", { propertyId: args.propertyId }, options);
}

export function listOffersV2(
  args: { propertyId: string; includeHistory?: boolean },
  options?: OuterApiCallOptions,
): Promise<OuterApiResult<OuterApiOfferRecord[]>> {
  return callOuterApi(
    "/openapi/OffersV2",
    { propertyId: args.propertyId, includeHistory: args.includeHistory ?? true },
    options,
  );
}

export function getOfferHistoryV2(
  offerId: string,
  options?: OuterApiCallOptions,
): Promise<OuterApiResult<OuterApiOfferHistoryRecord>> {
  return callOuterApi(
    "/openapi/OffersV2/GetHistory",
    { offerId },
    options,
  );
}

export function getCustomerByEmail(
  email: string,
  options?: OuterApiCallOptions,
): Promise<OuterApiResult<OuterApiCustomerRecord>> {
  return callOuterApi("/openapi/Customers", { email }, options);
}
