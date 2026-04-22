import "server-only";

import { getAttomProfile } from "./attom-client";
import {
  getAttomDetails,
  getImages,
  searchByAddress,
  type SearchByAddressResult,
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
  type AttomProfileDto,
  type EnrichInput,
  type EnrichmentEnvelope,
  type EnrichmentResult,
  type EnrichmentSource,
  type EnrichmentTelemetry,
  type ListingImageDto,
  type PropertyDetailsDto,
  type PropertySearchResultDto,
  type SuggestEnvelope,
  type SuggestInput,
  type SuggestedAddress,
} from "./types";
import type { EnrichmentSlot } from "@/lib/seller-form/types";

type CachedBody =
  | { kind: "ok"; slot: EnrichmentSlot }
  | { kind: "ok-partial"; slot: EnrichmentSlot }
  | { kind: "no-match" }
  | { kind: "timeout" }
  | { kind: "error"; code?: string };

type RunResult = {
  body: CachedBody;
  attomLatencyMs?: number;
  attomOk: boolean;
  mlsSearchOk: boolean;
  mlsDetailsOk: boolean;
  mlsImagesOk: boolean;
  sources: EnrichmentSource[];
};

const DEFAULT_SOURCES: EnrichmentSource[] = ["mls", "attom"];

const AZURE_BLOB_MLS_HOST = "zoodealiomls.blob.core.windows.net";

function isAzureBlobMlsImage(url: string): boolean {
  if (!url.startsWith("https://")) return false;
  try {
    const parsed = new URL(url);
    return (
      parsed.hostname === AZURE_BLOB_MLS_HOST &&
      parsed.pathname.startsWith("/mlsimages/")
    );
  } catch {
    return false;
  }
}

/**
 * Prefer Azure Blob-hosted MLS photos over HomeJunction. MLS is migrating
 * photo hosting to `zoodealiomls.blob.core.windows.net/mlsimages/…`; once
 * the migration completes the inline `images[]` array will be entirely
 * Azure Blob, and this filter becomes a no-op. During the transition:
 *   - If *any* URL is Azure Blob, return only the Azure Blob subset.
 *   - Otherwise return the HomeJunction list as-is.
 */
function preferAzureBlobMlsImages(urls: string[]): string[] {
  const azureBlob = urls.filter(isAzureBlobMlsImage);
  return azureBlob.length > 0 ? azureBlob : urls;
}

/**
 * Parse the `ENRICHMENT_SOURCES` env toggle. Comma-separated allow-list;
 * unknown / empty values fall back to the default. Used as a kill-switch
 * (e.g. `ENRICHMENT_SOURCES=mls` to disable ATTOM cheaply in preview
 * deployments or during an ATTOM outage — see .env.example).
 */
function getEnabledSources(): EnrichmentSource[] {
  const raw = process.env.ENRICHMENT_SOURCES?.trim();
  if (!raw) return DEFAULT_SOURCES;
  const parts = raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const valid: EnrichmentSource[] = [];
  for (const p of parts) {
    if ((p === "mls" || p === "attom") && !valid.includes(p)) {
      valid.push(p);
    }
  }
  return valid.length > 0 ? valid : DEFAULT_SOURCES;
}

function mlsErrorToCached(err: MlsError): CachedBody {
  if (err.code === "timeout") return { kind: "timeout" };
  return { kind: "error", code: err.code };
}

async function runEnrichment(input: EnrichInput): Promise<RunResult> {
  const { address } = input;
  const enabledSources = getEnabledSources();
  const mlsEnabled = enabledSources.includes("mls");
  const attomEnabled = enabledSources.includes("attom");

  // Round 1 — parallel MLS search + ATTOM profile. Either side may be
  // a synthetic `Promise.resolve(null)` when disabled via the env toggle.
  const attomStartedAt = attomEnabled ? performance.now() : undefined;
  const [searchSettled, attomSettled] = (await Promise.allSettled([
    mlsEnabled
      ? searchByAddress(address)
      : Promise.resolve<SearchByAddressResult | null>(null),
    attomEnabled
      ? getAttomProfile(address)
      : Promise.resolve<AttomProfileDto | null>(null),
  ])) as [
    PromiseSettledResult<SearchByAddressResult | null>,
    PromiseSettledResult<AttomProfileDto | null>,
  ];
  const attomLatencyMs =
    attomStartedAt !== undefined
      ? Math.round(performance.now() - attomStartedAt)
      : undefined;

  // MLS search outcome
  let search: PropertySearchResultDto | null = null;
  let inlineImages: string[] | undefined;
  let mlsError: MlsError | undefined;
  if (searchSettled.status === "fulfilled") {
    if (searchSettled.value) {
      search = searchSettled.value.match;
      inlineImages = searchSettled.value.inlineImages;
    }
  } else if (searchSettled.reason instanceof MlsError) {
    mlsError = searchSettled.reason;
  } else {
    throw searchSettled.reason;
  }

  const mlsSearchOk = search !== null;
  const attomOk =
    attomSettled.status === "fulfilled" && attomSettled.value !== null;

  const sources: EnrichmentSource[] = [];
  if (mlsSearchOk) sources.push("mls");
  if (attomOk) sources.push("attom");

  const baseTelemetry = {
    attomLatencyMs,
    attomOk,
    mlsSearchOk,
    sources,
  };

  // Neither source contributed usable data → preserve existing behaviour
  // (timeout / error / no-match) driven by the MLS outcome.
  if (sources.length === 0) {
    const body: CachedBody = mlsError
      ? mlsErrorToCached(mlsError)
      : { kind: "no-match" };
    return {
      body,
      ...baseTelemetry,
      mlsDetailsOk: false,
      mlsImagesOk: false,
    };
  }

  // Round 2 — when MLS matched, pull details + images (existing logic).
  let detailsSettled: PromiseSettledResult<PropertyDetailsDto> | null = null;
  let imagesSettled: PromiseSettledResult<ListingImageDto[] | undefined> | null =
    null;
  let mlsDetailsOk = false;
  let mlsImagesOk = false;

  if (search) {
    const listingStatus = normalizeListingStatus(search.listingStatus);
    const shouldFetchImages =
      listingStatus === "currently-listed" && Boolean(search.mlsRecordId);

    // Inline images ride along on the search response — skip the extra
    // `/images` round trip when the matched record already has them.
    // Prefer Azure Blob-hosted URLs over HomeJunction when both are
    // present, since MLS is in the middle of migrating photo hosting to
    // `zoodealiomls.blob.core.windows.net/mlsimages/…`.
    const preferredInline = inlineImages
      ? preferAzureBlobMlsImages(inlineImages)
      : undefined;
    const haveInlineImages =
      Array.isArray(preferredInline) && preferredInline.length > 0;

    [detailsSettled, imagesSettled] = await Promise.allSettled([
      search.attomId
        ? getAttomDetails(search.attomId)
        : Promise.reject(
            new MlsError({
              code: "parse",
              endpoint: "attom",
              message: "no attomId on search result",
            }),
          ),
      shouldFetchImages && !haveInlineImages
        ? getImages(search.mlsRecordId as string)
        : Promise.resolve<ListingImageDto[] | undefined>(
            haveInlineImages
              ? (preferredInline as string[]).map((url) => ({ url }))
              : undefined,
          ),
    ] satisfies [
      Promise<PropertyDetailsDto>,
      Promise<ListingImageDto[] | undefined>,
    ]);

    mlsDetailsOk = detailsSettled.status === "fulfilled";
    mlsImagesOk =
      imagesSettled.status === "fulfilled" &&
      Array.isArray(imagesSettled.value) &&
      imagesSettled.value.length > 0;
  }

  // When every enabled source contributed, envelope status is `ok`.
  // When some enabled source fell short, it's `ok-partial`. A single
  // ENRICHMENT_SOURCES-disabled source is not a partial — only *data
  // gaps* among the enabled set demote the status.
  const slotStatus: "ok" | "ok-partial" =
    sources.length === enabledSources.length ? "ok" : "ok-partial";

  const slot = mergeToEnrichmentSlot({
    search,
    detailsSettled,
    imagesSettled,
    attomProfileSettled: attomSettled,
    sources,
    slotStatus,
    fetchedAt: new Date().toISOString(),
  });

  return {
    body: { kind: slotStatus, slot },
    ...baseTelemetry,
    mlsDetailsOk,
    mlsImagesOk,
  };
}

const SEEN_KEYS = new Set<string>();

function toEnvelope(body: CachedBody, cacheHit: boolean): EnrichmentEnvelope {
  switch (body.kind) {
    case "ok":
      return { status: "ok", slot: body.slot, cacheHit };
    case "ok-partial":
      return { status: "ok-partial", slot: body.slot, cacheHit };
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
): Promise<EnrichmentResult> {
  if (!isAzZip(input.address.zip)) {
    const envelope: EnrichmentEnvelope = { status: "out-of-area" };
    return {
      envelope,
      telemetry: {
        mlsSearchOk: false,
        mlsDetailsOk: false,
        mlsImagesOk: false,
        attomOk: false,
        sources: [],
      },
    };
  }

  const key = addressCacheKey(input.address);

  const result = await runEnrichment(input);
  const { body } = result;

  const cacheHit = SEEN_KEYS.has(key);

  if (body.kind === "ok" || body.kind === "ok-partial") {
    await withEnrichmentCache(key, () => Promise.resolve(body));
  } else if (body.kind === "no-match") {
    await withEnrichmentCache(`${key}:no-match`, () => Promise.resolve(body), {
      revalidate: ENRICHMENT_TTL_NO_MATCH_SECONDS,
    });
  }

  SEEN_KEYS.add(key);

  const envelope = toEnvelope(body, cacheHit);
  const telemetry: EnrichmentTelemetry = {
    mlsSearchOk: result.mlsSearchOk,
    mlsDetailsOk: result.mlsDetailsOk,
    mlsImagesOk: result.mlsImagesOk,
    attomOk: result.attomOk,
    attomLatencyMs: result.attomLatencyMs,
    sources: result.sources,
  };
  return { envelope, telemetry };
}

export async function suggest(input: SuggestInput): Promise<SuggestEnvelope> {
  // Suggest mode: MLS-only by design (ATTOM does not power autocomplete).
  // Uncached — MLS treats partial addresses as broad searches.
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
            street1: hit.match.propertyAddressFull ?? input.query,
            city: hit.match.propertyAddressCity ?? input.query,
            state: "AZ",
            zip: hit.match.propertyAddressZip ?? "85004",
            mlsRecordId: hit.match.mlsRecordId,
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
