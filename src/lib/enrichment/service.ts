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
  type AddressLocator,
  markNegativeCache,
  readDurable,
  readNegativeCache,
  writeDurable,
} from "./durable-cache";
import {
  isNegativeCacheStale,
  isStale,
} from "./durable-cache-policy";
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

function locatorFor(input: EnrichInput): AddressLocator {
  return {
    street1: input.address.street1,
    city: input.address.city,
    state: "AZ",
    zip: input.address.zip,
  };
}

// E12-S4 deviation note: the parent Feature #7921 prescribes storing raw
// upstream payloads so future normalize.ts improvements can re-derive
// without re-paying upstream. For S4's first-pass we store the extracted
// result instead — getAttomProfile already collapses the raw response to
// the narrow AttomProfileDto, and searchByAddress collapses items to a
// matched SearchByAddressResult. Storing raw would require exposing
// getAttomProfileRaw + searchByAddressRaw and threading them through the
// cached path, which we *did* prepare (S5 + the pickBestMatch export +
// extractProfile export are in place). Switching the storage form is a
// follow-up: the durable-cache shape (jsonb columns) is permissive of
// either form, only the read/write call sites change.

async function logStaleOutage(
  endpoint: string,
  addressKey: string,
  err: unknown,
): Promise<void> {
  if (process.env.NODE_ENV !== "production") {
    console.log(
      "[enrichment]",
      JSON.stringify({
        event: "enrichment_stale_refresh_skipped_outage",
        endpoint,
        addressKey,
        err: err instanceof Error ? err.message : String(err),
      }),
    );
  }
}

/**
 * E12-S4: ATTOM profile with durable-cache short-circuit. On hit + fresh
 * we return the cached extract. On miss/stale we fetch upstream + write
 * back. On upstream failure with stale durable, serve stale (outage
 * tolerance — the whole point of the durable layer).
 */
async function cachedAttomProfile(
  input: EnrichInput,
  addressKey: string,
): Promise<AttomProfileDto | null> {
  const cached = await readDurable<AttomProfileDto>(addressKey, "profile");
  if (cached && !isStale("profile", cached.fetchedAt)) {
    return cached.payload;
  }

  try {
    const profile = await getAttomProfile(input.address);
    if (profile !== null) {
      await writeDurable(addressKey, "profile", profile, locatorFor(input));
    }
    return profile;
  } catch (err) {
    if (cached) {
      await logStaleOutage("profile", addressKey, err);
      return cached.payload;
    }
    throw err;
  }
}

/**
 * E12-S4: MLS search with durable-cache short-circuit.
 */
async function cachedSearchByAddress(
  input: EnrichInput,
  addressKey: string,
): Promise<SearchByAddressResult | null> {
  const cached = await readDurable<SearchByAddressResult>(
    addressKey,
    "mls_search",
  );
  if (cached && !isStale("mls_search", cached.fetchedAt)) {
    return cached.payload;
  }

  try {
    const result = await searchByAddress(input.address);
    if (result !== null) {
      await writeDurable(addressKey, "mls_search", result, locatorFor(input));
    }
    return result;
  } catch (err) {
    if (cached) {
      await logStaleOutage("mls_search", addressKey, err);
      return cached.payload;
    }
    throw err;
  }
}

async function runEnrichment(
  input: EnrichInput,
  addressKey: string,
): Promise<RunResult> {
  const { address } = input;
  const enabledSources = getEnabledSources();
  const mlsEnabled = enabledSources.includes("mls");
  const attomEnabled = enabledSources.includes("attom");

  // Round 1 — parallel MLS search + ATTOM profile. Either side may be
  // a synthetic `Promise.resolve(null)` when disabled via the env toggle.
  // Both calls go through the durable cache (E12-S4).
  const attomStartedAt = attomEnabled ? performance.now() : undefined;
  const [searchSettled, attomSettled] = (await Promise.allSettled([
    mlsEnabled
      ? cachedSearchByAddress(input, addressKey)
      : Promise.resolve<SearchByAddressResult | null>(null),
    attomEnabled
      ? cachedAttomProfile(input, addressKey)
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
  let history: PropertySearchResultDto[] | null = null;
  let mlsError: MlsError | undefined;
  if (searchSettled.status === "fulfilled") {
    if (searchSettled.value) {
      search = searchSettled.value.match;
      inlineImages = searchSettled.value.inlineImages;
      history = searchSettled.value.history;
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
    history,
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

  // E12-S4: durable negative-cache short-circuit. If we previously saw
  // this address with no upstream match and the negative-cache TTL
  // hasn't expired, skip both upstreams entirely and return no-match.
  // Wrapped in try/catch so a Supabase outage degrades to the original
  // behavior — never fail the request because the cache layer is down.
  try {
    const negative = await readNegativeCache(key);
    if (negative && !isNegativeCacheStale(negative.updatedAt)) {
      const envelope = toEnvelope({ kind: "no-match" }, true);
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
  } catch {
    // ignore — durable layer is best-effort, fall through
  }

  const result = await runEnrichment(input, key);
  const { body } = result;

  const cacheHit = SEEN_KEYS.has(key);

  if (body.kind === "ok" || body.kind === "ok-partial") {
    await withEnrichmentCache(key, () => Promise.resolve(body));
  } else if (body.kind === "no-match") {
    await withEnrichmentCache(`${key}:no-match`, () => Promise.resolve(body), {
      revalidate: ENRICHMENT_TTL_NO_MATCH_SECONDS,
    });
    // Persist the negative-cache row durably (1h TTL via S3 policy).
    try {
      await markNegativeCache(key, locatorFor(input));
    } catch {
      // best-effort — caller already has the no-match envelope
    }
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
