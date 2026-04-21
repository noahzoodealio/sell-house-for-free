import "server-only";

import {
  getAttomDetails,
  getImages,
  searchByAddress,
} from "./mls-client";
import {
  ENRICHMENT_TTL_NO_MATCH_SECONDS,
  withEnrichmentCache,
} from "./cache";
import {
  addressCacheKey,
  isAzZip,
  mergeToEnrichmentSlot,
  normalizeListingStatus,
} from "./normalize";
import {
  MlsError,
  type EnrichInput,
  type EnrichmentEnvelope,
  type ListingImageDto,
  type PropertyDetailsDto,
  type SuggestEnvelope,
  type SuggestInput,
  type SuggestedAddress,
} from "./types";
import type { EnrichmentSlot } from "@/lib/seller-form/types";

type CachedBody =
  | { kind: "ok"; slot: EnrichmentSlot }
  | { kind: "no-match" }
  | { kind: "timeout" }
  | { kind: "error"; code?: string };

function mlsErrorToCached(err: MlsError): CachedBody {
  if (err.code === "timeout") return { kind: "timeout" };
  return { kind: "error", code: err.code };
}

async function runEnrichment(input: EnrichInput): Promise<CachedBody> {
  const { address } = input;

  let search;
  try {
    search = await searchByAddress(address);
  } catch (err) {
    if (err instanceof MlsError) return mlsErrorToCached(err);
    throw err;
  }

  if (!search) return { kind: "no-match" };

  const listingStatus = normalizeListingStatus(search.listingStatus);
  const shouldFetchImages =
    listingStatus === "currently-listed" && Boolean(search.mlsRecordId);

  const [detailsSettled, imagesSettled] = await Promise.allSettled([
    search.attomId
      ? getAttomDetails(search.attomId)
      : Promise.reject(
          new MlsError({
            code: "parse",
            endpoint: "attom",
            message: "no attomId on search result",
          }),
        ),
    shouldFetchImages
      ? getImages(search.mlsRecordId as string)
      : Promise.resolve<ListingImageDto[] | undefined>(undefined),
  ] satisfies [
    Promise<PropertyDetailsDto>,
    Promise<ListingImageDto[] | undefined>,
  ]);

  const fetchedAt = new Date().toISOString();
  const slot = mergeToEnrichmentSlot(
    search,
    detailsSettled,
    imagesSettled,
    fetchedAt,
  );

  return { kind: "ok", slot };
}

const SEEN_KEYS = new Set<string>();

function toEnvelope(body: CachedBody, cacheHit: boolean): EnrichmentEnvelope {
  switch (body.kind) {
    case "ok":
      return { status: "ok", slot: body.slot, cacheHit };
    case "no-match":
      return { status: "no-match", cacheHit };
    case "timeout":
      return { status: "timeout", retryable: true };
    case "error":
      return { status: "error", code: body.code };
  }
}

export async function getEnrichment(
  input: EnrichInput,
): Promise<EnrichmentEnvelope> {
  if (!isAzZip(input.address.zip)) {
    return { status: "out-of-area" };
  }

  const key = addressCacheKey(input.address);

  // Short-circuit: do the work uncached, then cache the outcome with
  // the appropriate TTL depending on whether the result is reusable.
  const body = await runEnrichment(input);

  const cacheHit = SEEN_KEYS.has(key);

  if (body.kind === "ok") {
    await withEnrichmentCache(key, () => Promise.resolve(body));
  } else if (body.kind === "no-match") {
    await withEnrichmentCache(`${key}:no-match`, () => Promise.resolve(body), {
      revalidate: ENRICHMENT_TTL_NO_MATCH_SECONDS,
    });
  }

  SEEN_KEYS.add(key);
  return toEnvelope(body, cacheHit);
}

export async function suggest(input: SuggestInput): Promise<SuggestEnvelope> {
  // Suggest mode: uncached by design. Calls `searchByAddress` with the
  // raw query — MLS treats partial addresses as broad searches.
  const limit = input.limit;
  try {
    const hit = await searchByAddress({
      street1: input.query,
      city: input.query,
      state: "AZ",
      zip: "85004",
    });

    const results: SuggestedAddress[] = hit
      ? [
          {
            street1: hit.city ?? input.query,
            city: hit.city ?? input.query,
            state: "AZ",
            zip: hit.zip ?? "85004",
            mlsRecordId: hit.mlsRecordId,
          },
        ]
      : [];
    return { status: "ok", results: results.slice(0, limit) };
  } catch (err) {
    if (err instanceof MlsError) {
      if (err.code === "timeout") return { status: "timeout", retryable: true };
      return { status: "error", code: err.code };
    }
    throw err;
  }
}
