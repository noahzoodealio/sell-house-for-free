import { createHash } from "node:crypto";
import type { AddressFields, EnrichmentSlot } from "@/lib/seller-form/types";
import type {
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

const CURRENTLY_LISTED = new Set([
  "active",
  "activeundercontract",
  "pending",
  "comingsoon",
]);
const PREVIOUSLY_LISTED = new Set([
  "closed",
  "expired",
  "withdrawn",
  "cancelled",
]);

export function normalizeListingStatus(
  raw: string | null | undefined,
): EnrichmentSlot["listingStatus"] {
  if (!raw) return "not-listed";
  const key = raw.toLowerCase().replace(/[\s_-]/g, "");
  if (CURRENTLY_LISTED.has(key)) return "currently-listed";
  if (PREVIOUSLY_LISTED.has(key)) return "previously-listed";
  return "not-listed";
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

export function mergeToEnrichmentSlot(
  search: PropertySearchResultDto,
  detailsSettled: SettledDetails,
  imagesSettled: SettledImages,
  fetchedAt: string,
): EnrichmentSlot {
  const details =
    detailsSettled.status === "fulfilled" ? detailsSettled.value : undefined;

  const images =
    imagesSettled.status === "fulfilled" ? imagesSettled.value : undefined;

  const slotDetails: EnrichmentSlot["details"] = {
    bedrooms: details?.bedrooms ?? search.bedrooms,
    bathrooms: details?.bathrooms ?? search.bathrooms,
    squareFootage: details?.squareFootage ?? search.squareFootage,
    yearBuilt: details?.yearBuilt ?? search.yearBuilt,
    lotSize: details?.lotSize,
  };

  const hasAnyDetail = Object.values(slotDetails).some(
    (v) => v !== undefined && v !== null,
  );

  return {
    status: "ok",
    attomId: search.attomId,
    mlsRecordId: search.mlsRecordId,
    listingStatus: normalizeListingStatus(search.listingStatus),
    details: hasAnyDetail ? slotDetails : undefined,
    photos: mapPhotos(images),
    fetchedAt,
  };
}
