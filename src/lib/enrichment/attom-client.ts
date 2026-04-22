import "server-only";

import type { AddressFields } from "@/lib/seller-form/types";
import { AttomError, type AttomProfileDto } from "./types";

const RETRY_DELAY_MS = 250;
const DEFAULT_TIMEOUT_MS = 4000;

function getBaseUrl(): string {
  const base = process.env.ATTOM_API_BASE_URL;
  if (!base) {
    throw new AttomError({
      code: "config",
      message: "ATTOM_API_BASE_URL is not set",
    });
  }
  return base.replace(/\/$/, "");
}

function getToken(): string {
  const token = process.env.ATTOM_PRIVATE_TOKEN;
  if (!token || token.length === 0) {
    throw new AttomError({
      code: "config",
      message: "ATTOM_PRIVATE_TOKEN is not set",
    });
  }
  return token;
}

function getTimeoutMs(): number {
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
 * Mirrors the shape of `mls-client.retryOnce` — kept as a local copy so
 * each client controls its own retry discipline.
 */
async function retryOnce<T>(attempt: () => Promise<T>): Promise<T> {
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

async function parseJson(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch (err) {
    throw new AttomError({ code: "parse", cause: err });
  }
}

function formatAddressParts(addr: AddressFields): {
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

// Narrow shape of the `property[0]` node we extract. The rest of the
// ATTOM response (168+ fields) is intentionally untyped — mirror the
// `PropertyDetailsDto` discipline. Paths confirmed against a live
// expandedprofile response (Phoenix SFR, Apr 2026) — ATTOM's actual
// response uses camelCase, not the lowercase form the story doc cited.
type AttomProperty = {
  building?: {
    rooms?: { beds?: number; bathsTotal?: number };
    size?: {
      universalSize?: number;
      livingSize?: number;
      bldgSize?: number;
    };
  };
  summary?: {
    yearBuilt?: number;
    propType?: string;
    propClass?: string;
  };
  lot?: { lotSize2?: number };
};

function extractProfile(body: unknown): AttomProfileDto | null {
  if (!body || typeof body !== "object") return null;
  const property = (body as { property?: unknown }).property;
  if (!Array.isArray(property) || property.length === 0) return null;
  const first = property[0] as AttomProperty | null | undefined;
  if (!first || typeof first !== "object") return null;
  return {
    bedrooms: first.building?.rooms?.beds,
    bathrooms: first.building?.rooms?.bathsTotal,
    // universalSize is ATTOM's recommended square-footage (normalized);
    // livingSize / bldgSize are near-identical fallbacks when absent.
    squareFootage:
      first.building?.size?.universalSize ??
      first.building?.size?.livingSize ??
      first.building?.size?.bldgSize,
    yearBuilt: first.summary?.yearBuilt,
    lotSize: first.lot?.lotSize2,
    propType: first.summary?.propType,
    propClass: first.summary?.propClass,
  };
}

/**
 * Fetch ATTOM expandedprofile for an address. Returns `null` when
 * ATTOM's 200 response has an empty `property[]` (no match) so the
 * caller can treat it as "no ATTOM data" without catching an error.
 * 4xx / 5xx / network / timeout / parse failures throw `AttomError`.
 */
export async function getAttomProfile(
  addr: AddressFields,
): Promise<AttomProfileDto | null> {
  // Synchronous config validation — no fetch fires on misconfig (AC2).
  const base = getBaseUrl();
  const token = getToken();

  const { address1, address2 } = formatAddressParts(addr);
  const url = `${base}/property/expandedprofile?address1=${encodeURIComponent(
    address1,
  )}&address2=${encodeURIComponent(address2)}`;

  const attempt = async (): Promise<AttomProfileDto | null> => {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        apikey: token,
      },
      signal: AbortSignal.timeout(getTimeoutMs()),
    });
    if (res.status >= 500) {
      throw new AttomError({ code: "http", status: res.status });
    }
    if (!res.ok) {
      throw new AttomError({ code: "http", status: res.status });
    }
    const body = await parseJson(res);
    const profile = extractProfile(body);
    if (process.env.NODE_ENV !== "production") {
      // Dev-only manual-test log. Includes the building/summary/lot subtrees
      // (the sections our narrow extractor looks at) so we can spot
      // path-mismatch bugs. Never the full body — `property[0].assessment.owner`,
      // `property[0].sale.{buyer,seller}`, etc. carry real PII per AC13.
      const first = (body as { property?: unknown[] } | null)?.property?.[0] as
        | Record<string, unknown>
        | undefined;
      console.log(
        "[attom-client]",
        JSON.stringify({
          at: new Date().toISOString(),
          httpStatus: res.status,
          noMatch: profile === null,
          profile,
          debug: first
            ? {
                building: first.building,
                summary: first.summary,
                lot: first.lot,
                size: (first as { size?: unknown }).size,
                identifierKeys: first.identifier
                  ? Object.keys(first.identifier as object)
                  : undefined,
                topLevelKeys: Object.keys(first),
              }
            : undefined,
        }),
      );
    }
    return profile;
  };

  return retryOnce(attempt);
}
