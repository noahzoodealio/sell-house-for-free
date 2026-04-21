import "server-only";

import type { AddressFields } from "@/lib/seller-form/types";
import {
  MlsError,
  type ListingImageDto,
  type MlsEndpoint,
  type PropertyDetailsDto,
  type PropertySearchResultDto,
} from "./types";

const RETRY_DELAY_MS = 250;
const DEFAULT_TIMEOUT_MS = 4000;

function getBaseUrl(endpoint: MlsEndpoint): string {
  const base = process.env.MLS_API_BASE_URL;
  if (!base) {
    throw new MlsError({ code: "config", endpoint, message: "MLS_API_BASE_URL is not set" });
  }
  return base.replace(/\/$/, "");
}

function getTimeoutMs(): number {
  const raw = process.env.ENRICHMENT_TIMEOUT_MS;
  if (!raw) return DEFAULT_TIMEOUT_MS;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_TIMEOUT_MS;
}

function buildHeaders(): Record<string, string> {
  const headers: Record<string, string> = { Accept: "application/json" };
  const token = process.env.MLS_API_TOKEN;
  if (token && token.length > 0) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

function isAbortError(err: unknown): boolean {
  return err instanceof Error && err.name === "AbortError";
}

function isFetchFailed(err: unknown): boolean {
  return err instanceof TypeError;
}

/**
 * One retry on AbortError / network / 5xx. 250ms delay between attempts.
 * Non-retryable: 4xx and parse errors (caller must throw those).
 */
async function retryOnce<T>(
  attempt: () => Promise<T>,
  endpoint: MlsEndpoint,
): Promise<T> {
  let firstError: unknown;
  try {
    return await attempt();
  } catch (err) {
    if (err instanceof MlsError) {
      // Non-retryable MlsError subclasses (http-4xx, parse, config) rethrow.
      if (err.code === "parse" || err.code === "config") throw err;
      if (err.code === "http" && err.status && err.status < 500) throw err;
    } else if (!isAbortError(err) && !isFetchFailed(err)) {
      // Unknown throw — surface as network error, no retry.
      throw new MlsError({ code: "network", endpoint, cause: err });
    }
    firstError = err;
  }

  await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));

  try {
    return await attempt();
  } catch (err) {
    if (err instanceof MlsError) throw err;
    if (isAbortError(err)) {
      throw new MlsError({ code: "timeout", endpoint, cause: err });
    }
    if (isFetchFailed(err)) {
      throw new MlsError({ code: "network", endpoint, cause: err });
    }
    throw new MlsError({
      code: "network",
      endpoint,
      cause: err ?? firstError,
    });
  }
}

async function parseJson(res: Response, endpoint: MlsEndpoint): Promise<unknown> {
  try {
    return await res.json();
  } catch (err) {
    throw new MlsError({ code: "parse", endpoint, cause: err });
  }
}

function formatAddress(addr: AddressFields): string {
  const line1 = addr.street2
    ? `${addr.street1} ${addr.street2}`
    : addr.street1;
  return `${line1}, ${addr.city}, AZ ${addr.zip}`;
}

export async function searchByAddress(
  addr: AddressFields,
): Promise<PropertySearchResultDto | null> {
  const base = getBaseUrl("search");
  const url = `${base}/properties/search?address=${encodeURIComponent(
    formatAddress(addr),
  )}&pageSize=10`;

  const attempt = async (): Promise<PropertySearchResultDto | null> => {
    const res = await fetch(url, {
      method: "GET",
      headers: buildHeaders(),
      signal: AbortSignal.timeout(getTimeoutMs()),
    });
    if (res.status >= 500) {
      throw new MlsError({ code: "http", endpoint: "search", status: res.status });
    }
    if (!res.ok) {
      throw new MlsError({ code: "http", endpoint: "search", status: res.status });
    }
    const body = (await parseJson(res, "search")) as
      | { items?: unknown }
      | null;
    if (!body || !Array.isArray((body as { items?: unknown[] }).items)) {
      throw new MlsError({ code: "parse", endpoint: "search" });
    }
    const items = (body as { items: PropertySearchResultDto[] }).items;
    const match = items.find((item) => {
      const cityMatch =
        typeof item.city === "string" &&
        item.city.trim().toLowerCase() === addr.city.trim().toLowerCase();
      const zipMatch = item.zip === addr.zip;
      return cityMatch && zipMatch;
    });
    return match ?? null;
  };

  return retryOnce(attempt, "search");
}

export async function getAttomDetails(
  attomId: string,
): Promise<PropertyDetailsDto> {
  const base = getBaseUrl("attom");
  const url = `${base}/properties/attom/${encodeURIComponent(attomId)}`;

  const attempt = async (): Promise<PropertyDetailsDto> => {
    const res = await fetch(url, {
      method: "GET",
      headers: buildHeaders(),
      signal: AbortSignal.timeout(getTimeoutMs()),
    });
    if (res.status >= 500) {
      throw new MlsError({ code: "http", endpoint: "attom", status: res.status });
    }
    if (!res.ok) {
      throw new MlsError({ code: "http", endpoint: "attom", status: res.status });
    }
    const body = (await parseJson(res, "attom")) as PropertyDetailsDto | null;
    if (!body || typeof body !== "object") {
      throw new MlsError({ code: "parse", endpoint: "attom" });
    }
    return body;
  };

  return retryOnce(attempt, "attom");
}

export async function getImages(
  mlsRecordId: string,
): Promise<ListingImageDto[]> {
  const base = getBaseUrl("images");
  const url = `${base}/properties/${encodeURIComponent(mlsRecordId)}/images`;

  const attempt = async (): Promise<ListingImageDto[]> => {
    const res = await fetch(url, {
      method: "GET",
      headers: buildHeaders(),
      signal: AbortSignal.timeout(getTimeoutMs()),
    });
    if (res.status >= 500) {
      throw new MlsError({ code: "http", endpoint: "images", status: res.status });
    }
    if (!res.ok) {
      throw new MlsError({ code: "http", endpoint: "images", status: res.status });
    }
    const body = await parseJson(res, "images");
    if (!Array.isArray(body)) {
      throw new MlsError({ code: "parse", endpoint: "images" });
    }
    return body as ListingImageDto[];
  };

  return retryOnce(attempt, "images");
}
