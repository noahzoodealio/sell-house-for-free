import type {
  EnrichInput,
  EnrichmentEnvelope,
  SuggestEnvelope,
  SuggestInput,
} from "./types";

/**
 * Dev-only fixture generator for the BFF route. Gated at the call site
 * by `process.env.ENRICHMENT_DEV_MOCK === 'true'`. Lets S2–S10 build
 * against the real envelope shape before the MLS client lands.
 *
 * Scenario triggers on `kind: 'enrich'` (via `address.street1`):
 * - `__TIMEOUT__`  → `{status: 'timeout', retryable: true}`
 * - `__NOMATCH__`  → `{status: 'no-match', cacheHit: false}`
 * - `__OUTAREA__`  → `{status: 'out-of-area'}`
 * - `__ERROR__`    → `{status: 'error', code: 'dev-mock'}`
 * - `__LISTED__`   → `ok` with `listingStatus: 'currently-listed'` + 3 photos
 * - anything else  → canned happy path
 *
 * Same triggers for `kind: 'suggest'` via `query`.
 */
export function devMockEnrich(input: EnrichInput): EnrichmentEnvelope {
  const street1 = input.address.street1.trim().toUpperCase();
  const nowIso = new Date().toISOString();

  if (street1 === "__TIMEOUT__") {
    return { status: "timeout", retryable: true };
  }
  if (street1 === "__NOMATCH__") {
    return { status: "no-match", cacheHit: false };
  }
  if (street1 === "__OUTAREA__") {
    return { status: "out-of-area" };
  }
  if (street1 === "__ERROR__") {
    return { status: "error", code: "dev-mock" };
  }
  if (street1 === "__LISTED__") {
    return {
      status: "ok",
      cacheHit: false,
      slot: {
        status: "ok",
        attomId: "attom-dev-listed-001",
        mlsRecordId: "mls-dev-listed-001",
        listingStatus: "currently-listed",
        details: {
          bedrooms: 4,
          bathrooms: 2.5,
          squareFootage: 2150,
          yearBuilt: 2004,
          lotSize: 7200,
        },
        photos: [
          {
            url: "https://zoodealiomls.blob.core.windows.net/mlsimages/dev/listed-001-1.jpg",
            caption: "Front elevation",
          },
          {
            url: "https://zoodealiomls.blob.core.windows.net/mlsimages/dev/listed-001-2.jpg",
            caption: "Living room",
          },
          {
            url: "https://zoodealiomls.blob.core.windows.net/mlsimages/dev/listed-001-3.jpg",
            caption: "Kitchen",
          },
        ],
        fetchedAt: nowIso,
      },
    };
  }

  return {
    status: "ok",
    cacheHit: false,
    slot: {
      status: "ok",
      attomId: "attom-dev-happy-001",
      mlsRecordId: undefined,
      listingStatus: "not-listed",
      details: {
        bedrooms: 3,
        bathrooms: 2,
        squareFootage: 1620,
        yearBuilt: 1998,
        lotSize: 6000,
      },
      photos: [],
      fetchedAt: nowIso,
    },
  };
}

export function devMockSuggest(input: SuggestInput): SuggestEnvelope {
  const q = input.query.trim().toUpperCase();

  if (q === "__TIMEOUT__") {
    return { status: "timeout", retryable: true };
  }
  if (q === "__OUTAREA__") {
    return { status: "out-of-area" };
  }
  if (q === "__ERROR__") {
    return { status: "error", code: "dev-mock" };
  }

  return {
    status: "ok",
    results: (
      [
        { street1: "123 Main St", city: "Phoenix", state: "AZ", zip: "85004" },
        { street1: "456 Oak Ave", city: "Tempe", state: "AZ", zip: "85281" },
        { street1: "789 Palm Ln", city: "Scottsdale", state: "AZ", zip: "85251" },
        { street1: "101 Desert Rd", city: "Mesa", state: "AZ", zip: "85201" },
        { street1: "202 Saguaro Dr", city: "Chandler", state: "AZ", zip: "85224" },
      ] as const
    ).slice(0, input.limit),
  };
}
