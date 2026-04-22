import { createHash } from "node:crypto";
import type { AddressFields, EnrichmentSlot } from "@/lib/seller-form/types";
import type {
  AttomProfileDto,
  EnrichmentSource,
  ListingImageDto,
  PropertyDetailsDto,
  PropertySearchResultDto,
} from "./types";

const DIRECTIONAL_MAP: Record<string, string> = {
  north: "n",
  south: "s",
  east: "e",
  west: "w",
  northeast: "ne",
  northwest: "nw",
  southeast: "se",
  southwest: "sw",
};

const AZ_ZIP_MIN = 85001;
const AZ_ZIP_MAX = 86556;

function normalizeString(input: string): string {
  const stripped = input
    .toLowerCase()
    .replace(/[.,#]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return stripped
    .split(" ")
    .map((tok) => DIRECTIONAL_MAP[tok] ?? tok)
    .join(" ");
}

export type NormalizedAddress = {
  street1: string;
  street2: string;
  city: string;
  state: "AZ";
  zip: string;
};

export function normalizeAddress(addr: AddressFields): NormalizedAddress {
  return {
    street1: normalizeString(addr.street1),
    street2: addr.street2 ? normalizeString(addr.street2) : "",
    city: normalizeString(addr.city),
    state: "AZ",
    zip: addr.zip.trim(),
  };
}

export function addressCacheKey(addr: AddressFields): string {
  const n = normalizeAddress(addr);
  const canonical = [n.street1, n.street2, n.city, "AZ", n.zip].join("|");
  return createHash("sha256").update(canonical).digest("hex");
}

export function isAzZip(zip: string | number): boolean {
  const n = typeof zip === "string" ? Number.parseInt(zip, 10) : zip;
  if (!Number.isFinite(n)) return false;
  return n >= AZ_ZIP_MIN && n <= AZ_ZIP_MAX;
}

export const ACTIVE_STATUS_RAW_KEYS = new Set([
  "active",
  "activeundercontract",
  "pending",
  "comingsoon",
]);
const PREVIOUSLY_LISTED = new Set([
  "closed",
  "sold",
  "expired",
  "withdrawn",
  "cancelled",
]);

export function canonicalizeStatus(raw: string | null | undefined): string {
  if (!raw) return "";
  return raw.toLowerCase().replace(/[\s_-]/g, "");
}

export function normalizeListingStatus(
  raw: string | null | undefined,
): EnrichmentSlot["listingStatus"] {
  const key = canonicalizeStatus(raw);
  if (!key) return "not-listed";
  if (ACTIVE_STATUS_RAW_KEYS.has(key)) return "currently-listed";
  if (PREVIOUSLY_LISTED.has(key)) return "previously-listed";
  return "not-listed";
}

const DISPLAY_LISTING_STATUS: Record<string, string> = {
  active: "currently listed",
  activeundercontract: "listed, currently under contract",
  pending: "listed, currently under contract",
  comingsoon: "coming soon",
};

export function displayListingStatus(
  raw: string | null | undefined,
): string | undefined {
  const key = canonicalizeStatus(raw);
  return DISPLAY_LISTING_STATUS[key];
}

function mapPhotos(
  images: ListingImageDto[] | undefined,
): EnrichmentSlot["photos"] {
  if (!images || images.length === 0) return undefined;
  const sorted = [...images].sort((a, b) => {
    const ao = a.displayOrder ?? Number.MAX_SAFE_INTEGER;
    const bo = b.displayOrder ?? Number.MAX_SAFE_INTEGER;
    return ao - bo;
  });
  return sorted.slice(0, 3).map(({ url, caption }) => ({ url, caption }));
}

type SettledDetails = PromiseSettledResult<PropertyDetailsDto>;
type SettledImages = PromiseSettledResult<ListingImageDto[] | undefined>;
type SettledAttom = PromiseSettledResult<AttomProfileDto | null>;

export type MergeSlotInput = {
  search: PropertySearchResultDto | null;
  detailsSettled: SettledDetails | null;
  imagesSettled: SettledImages | null;
  attomProfileSettled: SettledAttom;
  sources: EnrichmentSource[];
  slotStatus: "ok" | "ok-partial";
  fetchedAt: string;
};

/**
 * Assemble the final `EnrichmentSlot` from the parallel-fetched source
 * results. Per-field fallback chain is `details → search → attom`;
 * MLS-specific fields (ids, listingStatus, photos) stay empty when MLS
 * didn't contribute (attom-only path). Caller owns `sources` + envelope
 * status — this function doesn't infer them from the settled results so
 * ENRICHMENT_SOURCES disables can't leak as ok-partial.
 */
export function mergeToEnrichmentSlot(input: MergeSlotInput): EnrichmentSlot {
  const {
    search,
    detailsSettled,
    imagesSettled,
    attomProfileSettled,
    sources,
    slotStatus,
    fetchedAt,
  } = input;

  const details =
    detailsSettled?.status === "fulfilled" ? detailsSettled.value : undefined;

  const images =
    imagesSettled?.status === "fulfilled" ? imagesSettled.value : undefined;

  const attom =
    attomProfileSettled.status === "fulfilled"
      ? attomProfileSettled.value ?? undefined
      : undefined;

  const slotDetails: NonNullable<EnrichmentSlot["details"]> = {
    bedrooms: details?.bedrooms ?? search?.bedrooms ?? attom?.bedrooms,
    bathrooms: details?.bathrooms ?? search?.bathrooms ?? attom?.bathrooms,
    squareFootage:
      details?.squareFootage ?? search?.squareFootage ?? attom?.squareFootage,
    yearBuilt: details?.yearBuilt ?? search?.yearBuilt ?? attom?.yearBuilt,
    lotSize: details?.lotSize ?? attom?.lotSize,
  };

  const hasAnyDetail = Object.values(slotDetails).some(
    (v) => v !== undefined && v !== null,
  );

  return {
    status: slotStatus,
    attomId: search?.attomId,
    mlsRecordId: search?.mlsRecordId,
    listingStatus: search
      ? normalizeListingStatus(search.listingStatus)
      : undefined,
    rawListingStatus: search?.listingStatus,
    listingStatusDisplay: search
      ? displayListingStatus(search.listingStatus)
      : undefined,
    details: hasAnyDetail ? slotDetails : undefined,
    photos: mapPhotos(images),
    sources: sources.length > 0 ? sources : undefined,
    fetchedAt,
  };
}
