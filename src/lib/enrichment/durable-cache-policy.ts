import type {
  DurableAreaEndpoint,
  DurableEndpoint,
} from "./durable-cache";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const NEVER = Number.POSITIVE_INFINITY;

/**
 * Per-endpoint TTL in milliseconds. Setting a TTL to NEVER means the
 * row is treated as fresh forever — appropriate for endpoints whose
 * payload represents an immutable past (avm_history). All other TTLs
 * are tuned against the trade-off in the parent Feature #7921 §"Key
 * decisions": fundamentals don't change often, listing status flips
 * fast.
 */
export const DURABLE_TTL_MS: Record<DurableEndpoint, number> = {
  // Fundamentals (sqft, year_built, beds/baths, lot, propType): rarely
  // change. 90 days gives a safety net against ATTOM correcting stale
  // records (e.g. after a permit-recorded remodel).
  profile: 90 * DAY_MS,

  // Valuation drifts month-over-month. 30 days is a balance between
  // upstream cost and "the AVM I show is roughly current."
  avm: 30 * DAY_MS,

  // The past doesn't change. Indefinite cache; future entries only
  // append on the next fetch via the live AVM endpoint.
  avm_history: NEVER,

  // Sale snapshot is the most-recent transaction. New sales can land
  // any time, but daily refresh is overkill. 30 days keeps it current
  // without thrashing.
  sale: 30 * DAY_MS,
  sales_history: 30 * DAY_MS,

  // Assessments update yearly or less.
  assessment: 90 * DAY_MS,
  assessment_history: 90 * DAY_MS,

  // Permits trail by weeks; 30 days is fine.
  building_permits: 30 * DAY_MS,

  // Rental AVM same volatility profile as sale AVM.
  rental_avm: 30 * DAY_MS,

  // MLS listing status flips fast (active → pending in hours).
  mls_search: HOUR_MS,
  mls_details: HOUR_MS,

  // Listing history (status timeline) is mostly append-only; weekly
  // refresh catches new status events without burning MLS quota.
  mls_history: 7 * DAY_MS,
};

/**
 * Per-area-endpoint TTL. Area-scope endpoints are zip/geo-keyed and
 * change at regional cadence (sales trends shift weekly; school
 * boundaries shift annually).
 */
export const DURABLE_AREA_TTL_MS: Record<DurableAreaEndpoint, number> = {
  sales_trend: 7 * DAY_MS,
  schools: 90 * DAY_MS,
};

/**
 * Negative-cache row TTL. Address looked up, no upstream match — re-try
 * after an hour to catch the case where ATTOM/MLS finally indexes a new
 * build or a typo gets fixed by re-submission.
 */
export const NEGATIVE_CACHE_TTL_MS = HOUR_MS;

export function isStale(
  endpoint: DurableEndpoint,
  fetchedAt: Date,
  now: Date = new Date(),
): boolean {
  const ttl = DURABLE_TTL_MS[endpoint];
  if (ttl === NEVER) return false;
  return now.getTime() - fetchedAt.getTime() > ttl;
}

export function isAreaStale(
  endpoint: DurableAreaEndpoint,
  fetchedAt: Date,
  now: Date = new Date(),
): boolean {
  const ttl = DURABLE_AREA_TTL_MS[endpoint];
  if (ttl === NEVER) return false;
  return now.getTime() - fetchedAt.getTime() > ttl;
}

export function isNegativeCacheStale(
  updatedAt: Date,
  now: Date = new Date(),
): boolean {
  return now.getTime() - updatedAt.getTime() > NEGATIVE_CACHE_TTL_MS;
}
