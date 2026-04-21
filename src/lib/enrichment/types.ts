import { z } from "zod";
import { addressStepSchema } from "../seller-form/schema";

export type { EnrichmentSlot } from "../seller-form/types";
import type { EnrichmentSlot } from "../seller-form/types";

/**
 * POST /api/enrich input — discriminated union on `kind`.
 *
 * - `enrich` → full lookup for a completed address; returns an
 *   `EnrichmentEnvelope` that the draft store persists to
 *   `SellerFormDraft.enrichment`.
 * - `suggest` → lightweight autocomplete for the combobox dropdown.
 */
export const zEnrichInput = z.object({
  kind: z.literal("enrich"),
  submissionId: z.uuid(),
  address: addressStepSchema,
});

export const zSuggestInput = z.object({
  kind: z.literal("suggest"),
  query: z.string().trim().min(3).max(120),
  limit: z.number().int().min(1).max(10).default(5),
});

export const zEnrichmentInput = z.discriminatedUnion("kind", [
  zEnrichInput,
  zSuggestInput,
]);

export type EnrichInput = z.infer<typeof zEnrichInput>;
export type SuggestInput = z.infer<typeof zSuggestInput>;
export type EnrichmentInput = z.infer<typeof zEnrichmentInput>;

/**
 * Envelope returned for `kind: 'enrich'`. `status` carries the outcome;
 * HTTP is always 200 (except on BFF crash) so the client branches on
 * `body.status` rather than the HTTP code.
 */
export type EnrichmentEnvelope =
  | { status: "ok"; slot: EnrichmentSlot; cacheHit: boolean }
  | { status: "no-match"; cacheHit: boolean }
  | { status: "out-of-area" }
  | { status: "timeout"; retryable: true }
  | { status: "error"; code?: string };

/**
 * Suggestion result — structured address the combobox can turn into a
 * full `AddressFields` value on select. Manual-typed fallback in the
 * field works without any suggestions ever returning.
 */
export type SuggestedAddress = {
  street1: string;
  street2?: string;
  city: string;
  state: "AZ";
  zip: string;
  mlsRecordId?: string;
  listingStatus?: string;
};

export type SuggestEnvelope =
  | { status: "ok"; results: SuggestedAddress[] }
  | { status: "out-of-area" }
  | { status: "timeout"; retryable: true }
  | { status: "error"; code?: string };

/**
 * 400 response shape for malformed input.
 */
export type InvalidInputResponse = {
  error: "invalid_input";
  issues: z.core.$ZodIssue[];
};

// ───────────────────────────── MLS DTOs (E4-S2) ─────────────────────────────
//
// Only the fields E4 consumes are typed. `PropertyDetailsDto` in the real
// `Zoodealio.MLS` schema has ~168 fields — every field we pin here is a
// field we have to maintain when MLS shifts. Leave the rest as `unknown`.

export type PropertySearchResultDto = {
  attomId?: string;
  mlsRecordId?: string;
  listingStatus?: string;
  latestListingPrice?: number;
  daysOnMarket?: number;
  bedrooms?: number;
  bathrooms?: number;
  squareFootage?: number;
  yearBuilt?: number;
  photoCount?: number;
  city?: string;
  zip?: string;
};

export type PropertyDetailsDto = {
  bedrooms?: number;
  bathrooms?: number;
  squareFootage?: number;
  yearBuilt?: number;
  lotSize?: number;
  [k: string]: unknown;
};

export type ListingImageDto = {
  url: string;
  caption?: string;
  displayOrder?: number;
};

export type MlsErrorCode = "timeout" | "network" | "http" | "parse" | "config";
export type MlsEndpoint = "search" | "attom" | "images" | "all";

export type MlsErrorInit = {
  code: MlsErrorCode;
  endpoint: MlsEndpoint;
  status?: number;
  cause?: unknown;
  message?: string;
};

export class MlsError extends Error {
  readonly code: MlsErrorCode;
  readonly endpoint: MlsEndpoint;
  readonly status?: number;

  constructor(init: MlsErrorInit) {
    super(init.message ?? `MLS ${init.endpoint} failed: ${init.code}`);
    this.name = "MlsError";
    this.code = init.code;
    this.endpoint = init.endpoint;
    this.status = init.status;
    if (init.cause !== undefined) {
      (this as { cause?: unknown }).cause = init.cause;
    }
  }
}
