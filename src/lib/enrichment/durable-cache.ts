import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/server";

// Per-property endpoints that map 1:1 to columns on property_enrichments.
// Adding a new endpoint here requires (a) a column on the table and
// (b) a TTL entry in src/lib/enrichment/durable-cache-policy.ts (E12-S3).
export type DurableEndpoint =
  | "profile"
  | "avm"
  | "avm_history"
  | "sale"
  | "sales_history"
  | "assessment"
  | "assessment_history"
  | "building_permits"
  | "rental_avm"
  | "mls_search"
  | "mls_details"
  | "mls_history";

// Area-scope endpoints on area_enrichments (keyed by geoid_v4, not address).
export type DurableAreaEndpoint = "sales_trend" | "schools";

export type DurableEntry<T = unknown> = {
  payload: T;
  fetchedAt: Date;
};

// Locator written to property_enrichments on first upsert. After the row
// exists, subsequent writes only touch the per-endpoint columns + sources;
// the locator is preserved.
export type AddressLocator = {
  street1: string;
  city: string;
  state: string;
  zip: string;
};

const PROPERTY_ENDPOINT_TO_COLUMNS: Record<
  DurableEndpoint,
  { payload: string; fetchedAt: string }
> = {
  profile: {
    payload: "attom_profile_payload",
    fetchedAt: "attom_profile_fetched_at",
  },
  avm: { payload: "attom_avm_payload", fetchedAt: "attom_avm_fetched_at" },
  avm_history: {
    payload: "attom_avm_history_payload",
    fetchedAt: "attom_avm_history_fetched_at",
  },
  sale: { payload: "attom_sale_payload", fetchedAt: "attom_sale_fetched_at" },
  sales_history: {
    payload: "attom_sales_history_payload",
    fetchedAt: "attom_sales_history_fetched_at",
  },
  assessment: {
    payload: "attom_assessment_payload",
    fetchedAt: "attom_assessment_fetched_at",
  },
  assessment_history: {
    payload: "attom_assessment_history_payload",
    fetchedAt: "attom_assessment_history_fetched_at",
  },
  building_permits: {
    payload: "attom_building_permits_payload",
    fetchedAt: "attom_building_permits_fetched_at",
  },
  rental_avm: {
    payload: "attom_rental_avm_payload",
    fetchedAt: "attom_rental_avm_fetched_at",
  },
  mls_search: {
    payload: "mls_search_payload",
    fetchedAt: "mls_search_fetched_at",
  },
  mls_details: {
    payload: "mls_details_payload",
    fetchedAt: "mls_details_fetched_at",
  },
  mls_history: {
    payload: "mls_history_payload",
    fetchedAt: "mls_history_fetched_at",
  },
};

const AREA_ENDPOINT_TO_COLUMNS: Record<
  DurableAreaEndpoint,
  { payload: string; fetchedAt: string }
> = {
  sales_trend: {
    payload: "attom_sales_trend_payload",
    fetchedAt: "attom_sales_trend_fetched_at",
  },
  schools: {
    payload: "attom_schools_payload",
    fetchedAt: "attom_schools_fetched_at",
  },
};

function columnsForProperty(endpoint: DurableEndpoint) {
  return PROPERTY_ENDPOINT_TO_COLUMNS[endpoint];
}

function columnsForArea(endpoint: DurableAreaEndpoint) {
  return AREA_ENDPOINT_TO_COLUMNS[endpoint];
}

/**
 * Reads one endpoint's payload + freshness from property_enrichments.
 * Returns null when the row doesn't exist or the endpoint hasn't been
 * fetched (payload column is NULL). Caller decides staleness using
 * src/lib/enrichment/durable-cache-policy.ts:isStale (E12-S3) — this
 * helper has no policy.
 */
export async function readDurable<T = unknown>(
  addressKey: string,
  endpoint: DurableEndpoint,
): Promise<DurableEntry<T> | null> {
  const cols = columnsForProperty(endpoint);
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("property_enrichments")
    .select(`${cols.payload}, ${cols.fetchedAt}`)
    .eq("address_key", addressKey)
    .maybeSingle();

  if (error || !data) return null;

  const row = data as unknown as Record<string, unknown>;
  const payload = row[cols.payload];
  const fetchedAtRaw = row[cols.fetchedAt];

  if (payload == null || fetchedAtRaw == null) return null;

  return {
    payload: payload as T,
    fetchedAt: new Date(fetchedAtRaw as string),
  };
}

/**
 * Upserts one endpoint's payload + fetched_at into property_enrichments
 * and appends the endpoint name to the sources array (deduped). Locator
 * is required so we can create the row when no prior endpoint has
 * written for this address. On subsequent writes, the locator overwrites
 * — addresses don't move, so a re-write is benign.
 */
export async function writeDurable(
  addressKey: string,
  endpoint: DurableEndpoint,
  payload: unknown,
  locator: AddressLocator,
): Promise<void> {
  const cols = columnsForProperty(endpoint);
  const supabase = getSupabaseAdmin();

  // Read existing sources so we can union the endpoint into the array
  // without losing prior entries. Doing it client-side keeps the SQL
  // surface small (no array_append + on-conflict gymnastics).
  const { data: existing } = await supabase
    .from("property_enrichments")
    .select("sources")
    .eq("address_key", addressKey)
    .maybeSingle();

  const priorSources = (existing?.sources as string[] | undefined) ?? [];
  const nextSources = priorSources.includes(endpoint)
    ? priorSources
    : [...priorSources, endpoint];

  const upsertRow = {
    address_key: addressKey,
    street1: locator.street1,
    city: locator.city,
    state: locator.state,
    zip: locator.zip,
    [cols.payload]: payload,
    [cols.fetchedAt]: new Date().toISOString(),
    sources: nextSources,
  };

  const { error } = await supabase
    .from("property_enrichments")
    .upsert(upsertRow, { onConflict: "address_key" });

  if (error) {
    throw new Error(
      `durable-cache writeDurable(${endpoint}) failed for ${addressKey}: ${error.message}`,
    );
  }
}

/**
 * Records a negative-cache row: address looked up, no upstream match.
 * Stores `sources = []` and bumps updated_at so the negative-cache TTL
 * (src/lib/enrichment/durable-cache-policy.ts) measures from this call.
 * Re-running on an existing row resets the TTL clock and does not
 * destroy any payload columns that may have been written since.
 */
export async function markNegativeCache(
  addressKey: string,
  locator: AddressLocator,
): Promise<void> {
  const supabase = getSupabaseAdmin();

  const { data: existing } = await supabase
    .from("property_enrichments")
    .select("address_key")
    .eq("address_key", addressKey)
    .maybeSingle();

  if (existing) {
    // Row exists. Don't clobber payloads — just touch updated_at so the
    // negative-cache TTL window restarts. Service-role bypasses the
    // updated_at trigger's NEW vs OLD comparison concerns.
    const { error } = await supabase
      .from("property_enrichments")
      .update({ updated_at: new Date().toISOString() })
      .eq("address_key", addressKey);
    if (error) {
      throw new Error(
        `durable-cache markNegativeCache touch failed for ${addressKey}: ${error.message}`,
      );
    }
    return;
  }

  const { error } = await supabase.from("property_enrichments").insert({
    address_key: addressKey,
    street1: locator.street1,
    city: locator.city,
    state: locator.state,
    zip: locator.zip,
    sources: [],
  });
  if (error) {
    throw new Error(
      `durable-cache markNegativeCache insert failed for ${addressKey}: ${error.message}`,
    );
  }
}

/**
 * Returns true when the address row exists with `sources = []` and no
 * payload columns populated. Caller is expected to combine this with
 * isStale(negative-cache TTL) to decide whether to re-query upstream.
 */
export async function readNegativeCache(
  addressKey: string,
): Promise<{ updatedAt: Date } | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("property_enrichments")
    .select("sources, updated_at")
    .eq("address_key", addressKey)
    .maybeSingle();

  if (error || !data) return null;

  const sources = (data.sources as string[] | undefined) ?? [];
  if (sources.length > 0) return null;

  return { updatedAt: new Date(data.updated_at as string) };
}

// =====================================================================
// Area-scope (geoid_v4-keyed)
// =====================================================================

export async function readDurableArea<T = unknown>(
  geoidV4: string,
  endpoint: DurableAreaEndpoint,
): Promise<DurableEntry<T> | null> {
  const cols = columnsForArea(endpoint);
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("area_enrichments")
    .select(`${cols.payload}, ${cols.fetchedAt}`)
    .eq("geoid_v4", geoidV4)
    .maybeSingle();

  if (error || !data) return null;

  const row = data as unknown as Record<string, unknown>;
  const payload = row[cols.payload];
  const fetchedAtRaw = row[cols.fetchedAt];

  if (payload == null || fetchedAtRaw == null) return null;

  return {
    payload: payload as T,
    fetchedAt: new Date(fetchedAtRaw as string),
  };
}

export async function writeDurableArea(
  geoidV4: string,
  endpoint: DurableAreaEndpoint,
  payload: unknown,
): Promise<void> {
  const cols = columnsForArea(endpoint);
  const supabase = getSupabaseAdmin();

  const upsertRow = {
    geoid_v4: geoidV4,
    [cols.payload]: payload,
    [cols.fetchedAt]: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("area_enrichments")
    .upsert(upsertRow, { onConflict: "geoid_v4" });

  if (error) {
    throw new Error(
      `durable-cache writeDurableArea(${endpoint}) failed for ${geoidV4}: ${error.message}`,
    );
  }
}
