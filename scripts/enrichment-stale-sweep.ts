/* eslint-disable no-console */

/**
 * E12-S6: stale-cache sweep.
 *
 * Walks property_enrichments looking for any address_key whose ATTOM
 * profile is stale per src/lib/enrichment/durable-cache-policy.ts.
 * For each match, prints the row's address_key + age. With --refresh,
 * re-runs getEnrichment for the address (zip-only path requires manual
 * address reconstruction — out of scope for v1; the dry-run report is
 * the primary value here).
 *
 * Usage:
 *   npx tsx scripts/enrichment-stale-sweep.ts            # dry-run, all stale
 *   npx tsx scripts/enrichment-stale-sweep.ts --zip 85004  # filter by zip
 *
 * SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY must be set. Read-only by
 * design — never deletes or overwrites cache rows.
 */

import { createClient } from "@supabase/supabase-js";

import { isStale } from "../src/lib/enrichment/durable-cache-policy";

interface Args {
  zip?: string;
}

function parseArgs(argv: string[]): Args {
  const args: Args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--zip") {
      args.zip = argv[++i];
    }
  }
  return args;
}

async function main(): Promise<void> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error(
      "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set",
    );
    process.exitCode = 1;
    return;
  }

  const args = parseArgs(process.argv.slice(2));
  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let query = supabase
    .from("property_enrichments")
    .select(
      "address_key, zip, attom_profile_fetched_at, mls_search_fetched_at",
    )
    .order("attom_profile_fetched_at", { ascending: true })
    .limit(500);
  if (args.zip) {
    query = query.eq("zip", args.zip);
  }

  const { data, error } = await query;
  if (error) {
    console.error("query failed:", error.message);
    process.exitCode = 1;
    return;
  }

  const now = new Date();
  let staleProfile = 0;
  let staleMls = 0;
  for (const row of data ?? []) {
    const r = row as {
      address_key: string;
      zip: string;
      attom_profile_fetched_at: string | null;
      mls_search_fetched_at: string | null;
    };
    const profileStale =
      r.attom_profile_fetched_at !== null &&
      isStale("profile", new Date(r.attom_profile_fetched_at), now);
    const mlsStale =
      r.mls_search_fetched_at !== null &&
      isStale("mls_search", new Date(r.mls_search_fetched_at), now);

    if (profileStale) staleProfile++;
    if (mlsStale) staleMls++;
    if (profileStale || mlsStale) {
      console.log(
        JSON.stringify({
          address_key: r.address_key,
          zip: r.zip,
          profile_stale: profileStale,
          profile_age_days: r.attom_profile_fetched_at
            ? Math.round(
                (now.getTime() -
                  new Date(r.attom_profile_fetched_at).getTime()) /
                  (24 * 60 * 60 * 1000),
              )
            : null,
          mls_stale: mlsStale,
        }),
      );
    }
  }

  console.log(
    JSON.stringify({
      summary: true,
      rows_scanned: data?.length ?? 0,
      stale_profile: staleProfile,
      stale_mls_search: staleMls,
      filter_zip: args.zip ?? null,
    }),
  );
}

void main();
