import "server-only";

import type { AddressFields } from "@/lib/seller-form/types";
import { getMlsBearerToken } from "./mls-jwt";
import {
  MlsError,
  type ListingImageDto,
  type ListingSearchItem,
  type MlsEndpoint,
  type PropertyDetailsDto,
  type PropertySearchResultDto,
} from "./types";

const RETRY_DELAY_MS = 250;
const DEFAULT_TIMEOUT_MS = 4000;

function logMlsCall(entry: Record<string, unknown>) {
  if (process.env.NODE_ENV === "production") return;
  console.log("[mls-client]", JSON.stringify({ at: new Date().toISOString(), ...entry }));
}

function describeMlsError(err: unknown): Record<string, unknown> {
  if (err instanceof MlsError) {
    return { code: err.code, status: err.status, message: err.message };
  }
  if (err instanceof Error) {
    return { code: "unknown", name: err.name, message: err.message };
  }
  return { code: "unknown", value: String(err) };
}

const MLS_DIRECTIONAL_MAP: Record<string, string> = {
  n: "n", north: "n",
  s: "s", south: "s",
  e: "e", east: "e",
  w: "w", west: "w",
  ne: "ne", northeast: "ne",
  nw: "nw", northwest: "nw",
  se: "se", southeast: "se",
  sw: "sw", southwest: "sw",
};

const MLS_STREET_SUFFIX_MAP: Record<string, string> = {
  street: "st", st: "st",
  avenue: "ave", ave: "ave", av: "ave",
  road: "rd", rd: "rd",
  drive: "dr", dr: "dr",
  lane: "ln", ln: "ln",
  court: "ct", ct: "ct",
  boulevard: "blvd", blvd: "blvd", boul: "blvd",
  way: "way", wy: "way",
  place: "pl", pl: "pl",
  circle: "cir", cir: "cir",
  terrace: "ter", ter: "ter", terr: "ter",
  parkway: "pkwy", pkwy: "pkwy",
  highway: "hwy", hwy: "hwy",
  trail: "trl", trl: "trl",
  loop: "loop",
};

function normalizeStreetForMatch(s: string): string {
  return s
    .toLowerCase()
    .replace(/[.,#]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .map((tok) => MLS_DIRECTIONAL_MAP[tok] ?? MLS_STREET_SUFFIX_MAP[tok] ?? tok)
    .join(" ");
}

/**
 * Parse "14474 West Coronado Road" into structured address-parts that
 * mirror MLS's own decomposition (`propertyAddressHouseNumber` + directional
 * + `propertyAddressStreetName` + suffix). Used as the matcher key — fuzzy
 * text matching on `propertyAddressFull` is unsafe because MLS's search
 * returns sibling house-numbers on different streets in the same zip
 * (e.g. `14474 W Coronado` and `14474 W Lexington` both surface on a search
 * for "14474 West Coronado").
 */
function parseUserStreet1(
  street1: string,
): { houseNumber: string; streetName: string } | null {
  const tokens = street1
    .toLowerCase()
    .replace(/[.,#]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (tokens.length === 0) return null;
  const first = tokens[0];
  if (!/^\d+[a-z]?$/.test(first)) return null;
  const houseNumber = first;

  const rest = tokens.slice(1).map((t) => MLS_DIRECTIONAL_MAP[t] ?? t);
  const nameTokens: string[] = [];
  for (let i = 0; i < rest.length; i++) {
    const t = rest[i];
    // Skip leading directional, leading unit-prefix tokens, and trailing suffix.
    const isLeadingDirectional =
      i === 0 && ["n", "s", "e", "w", "ne", "nw", "se", "sw"].includes(t);
    const isTrailingSuffix =
      i === rest.length - 1 && t in MLS_STREET_SUFFIX_MAP;
    if (isLeadingDirectional) continue;
    if (isTrailingSuffix) continue;
    nameTokens.push(t);
  }
  if (nameTokens.length === 0) return null;
  return { houseNumber, streetName: nameTokens.join(" ").toUpperCase() };
}

/**
 * MLS search returns the full lifecycle history of matching homes — up to
 * N records per home (listed → price-changed → cancelled → re-listed →
 * sold, etc.). Match on structured address fields (house number + street
 * name + zip) to filter out sibling-house-number listings on neighboring
 * streets, then pick the newest by `statusChangeDate` so the UI reflects
 * the home's *current* lifecycle state. Returns `null` for off-market
 * addresses.
 */
function pickBestMatch(
  items: ListingSearchItem[],
  addr: AddressFields,
): ListingSearchItem | null {
  if (items.length === 0) return null;
  const want = parseUserStreet1(addr.street1);
  if (!want) return null;

  const candidates = items.filter(({ details }) => {
    if (details.propertyAddressZip !== addr.zip) return false;
    if (details.propertyAddressHouseNumber !== want.houseNumber) return false;
    const mlsName = (details.propertyAddressStreetName ?? "")
      .trim()
      .toUpperCase();
    return mlsName === want.streetName;
  });
  if (candidates.length === 0) return null;

  const sortable = candidates.map((it) => ({
    it,
    ts: it.details.statusChangeDate
      ? Date.parse(it.details.statusChangeDate)
      : Number.NaN,
  }));
  sortable.sort((a, b) => {
    const aBad = Number.isNaN(a.ts);
    const bBad = Number.isNaN(b.ts);
    if (aBad && bBad) return 0;
    if (aBad) return 1;
    if (bBad) return -1;
    return b.ts - a.ts;
  });
  return sortable[0].it;
}

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
  const token = getMlsBearerToken();
  if (token) {
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

export type SearchByAddressResult = {
  match: PropertySearchResultDto;
  inlineImages?: string[];
};

export async function searchByAddress(
  addr: AddressFields,
): Promise<SearchByAddressResult | null> {
  const base = getBaseUrl("search");
  // `/api/Listings/search` — ListingsController.SearchByAddress, JWT-protected.
  // (Service was restructured: /api/properties/* routes no longer exist.)
  const url = `${base}/api/Listings/search?address=${encodeURIComponent(
    formatAddress(addr),
  )}&pageSize=10`;

  const attempt = async (): Promise<{
    matchedItem: ListingSearchItem | null;
    httpStatus: number;
    itemsCount: number;
    rawItems: ListingSearchItem[];
  }> => {
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
    const items = (body as { items: ListingSearchItem[] }).items;
    const matchedItem = pickBestMatch(items, addr);
    return {
      matchedItem,
      httpStatus: res.status,
      itemsCount: items.length,
      rawItems: items,
    };
  };

  const startedAt = Date.now();
  try {
    const { matchedItem, httpStatus, itemsCount, rawItems } = await retryOnce(
      attempt,
      "search",
    );
    const match = matchedItem?.details ?? null;
    logMlsCall({
      endpoint: "search",
      url,
      outcome: "ok",
      httpStatus,
      latencyMs: Date.now() - startedAt,
      itemsCount,
      matched: match
        ? {
            mlsRecordId: match.mlsRecordId,
            attomId: match.attomId,
            listingStatus: match.listingStatus,
            statusChangeDate: match.statusChangeDate,
            propertyAddressFull: match.propertyAddressFull,
            propertyAddressHouseNumber: match.propertyAddressHouseNumber,
            propertyAddressStreetName: match.propertyAddressStreetName,
            propertyAddressZip: match.propertyAddressZip,
            inlineImagesCount: matchedItem?.images?.length ?? 0,
          }
        : null,
      rawSample:
        match === null && process.env.NODE_ENV !== "production"
          ? rawItems.slice(0, 2).map((it) => ({
              details: {
                propertyAddressHouseNumber:
                  it.details?.propertyAddressHouseNumber,
                propertyAddressStreetName: it.details?.propertyAddressStreetName,
                propertyAddressFull: it.details?.propertyAddressFull,
                propertyAddressZip: it.details?.propertyAddressZip,
                statusChangeDate: it.details?.statusChangeDate,
                listingStatus: it.details?.listingStatus,
              },
            }))
          : undefined,
    });
    if (!matchedItem || !match) return null;
    return { match, inlineImages: matchedItem.images };
  } catch (err) {
    logMlsCall({
      endpoint: "search",
      url,
      outcome: "error",
      latencyMs: Date.now() - startedAt,
      error: describeMlsError(err),
    });
    throw err;
  }
}

export async function getAttomDetails(
  attomId: string,
): Promise<PropertyDetailsDto> {
  const base = getBaseUrl("attom");
  // `/api/Listings/attom/{attomId}` — JWT-protected.
  const url = `${base}/api/Listings/attom/${encodeURIComponent(attomId)}`;

  const attempt = async (): Promise<{
    body: PropertyDetailsDto;
    httpStatus: number;
  }> => {
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
    return { body, httpStatus: res.status };
  };

  const startedAt = Date.now();
  try {
    const { body, httpStatus } = await retryOnce(attempt, "attom");
    logMlsCall({
      endpoint: "attom",
      url,
      outcome: "ok",
      httpStatus,
      latencyMs: Date.now() - startedAt,
      bodyKeys: Object.keys(body as Record<string, unknown>),
    });
    return body;
  } catch (err) {
    logMlsCall({
      endpoint: "attom",
      url,
      outcome: "error",
      latencyMs: Date.now() - startedAt,
      error: describeMlsError(err),
    });
    throw err;
  }
}

export async function getImages(
  mlsRecordId: string,
): Promise<ListingImageDto[]> {
  const base = getBaseUrl("images");
  // `/api/Listings/{mlsRecordId}/images` — anonymous in practice (TIH
  // PropertyService.GetPropertyMlsPhotosAsync hits this URL with no bearer
  // token). Distinct from the JWT-protected PropertiesController routes.
  const url = `${base}/api/Listings/${encodeURIComponent(mlsRecordId)}/images`;

  const attempt = async (): Promise<{
    body: ListingImageDto[];
    httpStatus: number;
  }> => {
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
    return { body: body as ListingImageDto[], httpStatus: res.status };
  };

  const startedAt = Date.now();
  try {
    const { body, httpStatus } = await retryOnce(attempt, "images");
    logMlsCall({
      endpoint: "images",
      url,
      outcome: "ok",
      httpStatus,
      latencyMs: Date.now() - startedAt,
      imagesCount: body.length,
    });
    return body;
  } catch (err) {
    logMlsCall({
      endpoint: "images",
      url,
      outcome: "error",
      latencyMs: Date.now() - startedAt,
      error: describeMlsError(err),
    });
    throw err;
  }
}
