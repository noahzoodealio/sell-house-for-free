import { unstable_cache } from "next/cache";

export const ENRICHMENT_CACHE_TAG = "enrichment";

export const ENRICHMENT_TTL_OK_SECONDS = 86400;
export const ENRICHMENT_TTL_NO_MATCH_SECONDS = 3600;

function getTtlOk(): number {
  const raw = process.env.ENRICHMENT_CACHE_TTL_SECONDS;
  if (!raw) return ENRICHMENT_TTL_OK_SECONDS;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : ENRICHMENT_TTL_OK_SECONDS;
}

/**
 * Wraps an async fn in `unstable_cache` keyed by the caller-provided
 * cache key. The project follows `caching-without-cache-components.md`
 * (architecture §5 deviation 1); `unstable_cache` remains the stable
 * primitive here. `revalidateTag(ENRICHMENT_CACHE_TAG)` drains the
 * cache in ops runbooks (S10).
 */
export function withEnrichmentCache<T>(
  cacheKey: string,
  fn: () => Promise<T>,
  opts: { revalidate?: number } = {},
): Promise<T> {
  const cached = unstable_cache(fn, [cacheKey], {
    revalidate: opts.revalidate ?? getTtlOk(),
    tags: [ENRICHMENT_CACHE_TAG],
  });
  return cached();
}
