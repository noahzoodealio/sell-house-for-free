import "server-only";

import type { AddressFields } from "@/lib/seller-form/types";
import { AttomError } from "./types";

const RETRY_DELAY_MS = 250;
const DEFAULT_TIMEOUT_MS = 4000;

export function getBaseUrl(): string {
  const base = process.env.ATTOM_API_BASE_URL;
  if (!base) {
    throw new AttomError({
      code: "config",
      message: "ATTOM_API_BASE_URL is not set",
    });
  }
  return base.replace(/\/$/, "");
}

export function getToken(): string {
  const token = process.env.ATTOM_PRIVATE_TOKEN;
  if (!token || token.length === 0) {
    throw new AttomError({
      code: "config",
      message: "ATTOM_PRIVATE_TOKEN is not set",
    });
  }
  return token;
}

export function getTimeoutMs(): number {
  const raw = process.env.ENRICHMENT_TIMEOUT_MS;
  if (!raw) return DEFAULT_TIMEOUT_MS;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_TIMEOUT_MS;
}

function isAbortError(err: unknown): boolean {
  return err instanceof Error && err.name === "AbortError";
}

function isFetchFailed(err: unknown): boolean {
  return err instanceof TypeError;
}

/**
 * One retry on AbortError / network / 5xx. 250ms delay between attempts.
 * Non-retryable: 4xx, parse, and config errors rethrow on the first try.
 */
export async function retryOnce<T>(attempt: () => Promise<T>): Promise<T> {
  let firstError: unknown;
  try {
    return await attempt();
  } catch (err) {
    if (err instanceof AttomError) {
      if (err.code === "parse" || err.code === "config") throw err;
      if (err.code === "http" && err.status && err.status < 500) throw err;
    } else if (!isAbortError(err) && !isFetchFailed(err)) {
      throw new AttomError({ code: "network", cause: err });
    }
    firstError = err;
  }

  await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));

  try {
    return await attempt();
  } catch (err) {
    if (err instanceof AttomError) throw err;
    if (isAbortError(err)) {
      throw new AttomError({ code: "timeout", cause: err });
    }
    if (isFetchFailed(err)) {
      throw new AttomError({ code: "network", cause: err });
    }
    throw new AttomError({ code: "network", cause: err ?? firstError });
  }
}

export async function parseJson(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch (err) {
    throw new AttomError({ code: "parse", cause: err });
  }
}

export function formatAddressParts(addr: AddressFields): {
  address1: string;
  address2: string;
} {
  const line1 = addr.street2
    ? `${addr.street1} ${addr.street2}`
    : addr.street1;
  return {
    address1: line1,
    address2: `${addr.city}, AZ ${addr.zip}`,
  };
}

/**
 * Generic ATTOM JSON GET that wraps retry + timeout + parse + status
 * handling. Returns the raw parsed JSON body. Caller is responsible for
 * extracting fields and treating empty `property[]` as no-match.
 */
export async function attomGetJson(path: string): Promise<unknown> {
  const base = getBaseUrl();
  const token = getToken();
  const url = `${base}${path}`;

  const attempt = async () => {
    const res = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json", apikey: token },
      signal: AbortSignal.timeout(getTimeoutMs()),
    });
    if (!res.ok) {
      throw new AttomError({ code: "http", status: res.status });
    }
    return parseJson(res);
  };

  return retryOnce(attempt);
}

/**
 * True when ATTOM returned an envelope with empty property[] (no match).
 * Both per-property and area endpoints follow this shape; some area
 * endpoints use `salestrend` or `school` keys instead — caller can
 * supply an alternate root via `roots`.
 */
export function isAttomNoMatch(
  body: unknown,
  roots: readonly string[] = ["property"],
): boolean {
  if (!body || typeof body !== "object") return true;
  const obj = body as Record<string, unknown>;
  for (const root of roots) {
    const list = obj[root];
    if (Array.isArray(list) && list.length > 0) return false;
  }
  return true;
}
