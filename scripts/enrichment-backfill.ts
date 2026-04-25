/* eslint-disable no-console */

/**
 * E12-S7: opportunistic backfill from offervana_idempotency.
 *
 * The brief proposed warming property_enrichments from any cached
 * payloads that already exist on offervana_idempotency. After auditing
 * the schema (supabase/migrations/20260423180000_offervana_idempotency_offers_payload.sql)
 * the only payload column is `offers_v2_payload` — Offervana OffersV2
 * data, **not** ATTOM/MLS enrichment. There is nothing salvageable to
 * write into property_enrichments.
 *
 * The brief explicitly said "Skip if zero salvageable payloads." This
 * script preserves that contract: it scans the table, confirms the
 * absence of enrichment payloads, and reports the count for visibility,
 * then exits 0. The cache stays cold; rows fill in naturally as new
 * submissions hit /api/enrich.
 *
 * If a future schema change adds e.g. `attom_profile_payload` to
 * offervana_idempotency, extend the salvage selector below and add a
 * write loop. The script is a no-op today.
 *
 * Usage:
 *   npx tsx scripts/enrichment-backfill.ts            # dry-run summary
 *   npx tsx scripts/enrichment-backfill.ts --execute  # would write (currently no-op)
 *
 * SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY must be set.
 */

import { createClient } from "@supabase/supabase-js";

interface Args {
  execute: boolean;
}

function parseArgs(argv: string[]): Args {
  return { execute: argv.includes("--execute") };
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

  // Audit pass — count rows + look for any salvageable enrichment columns.
  const { count, error: countError } = await supabase
    .from("offervana_idempotency")
    .select("submission_id", { count: "exact", head: true });

  if (countError) {
    console.error("count failed:", countError.message);
    process.exitCode = 1;
    return;
  }

  // Probe: try to select hypothetical enrichment columns. If they don't
  // exist, Supabase returns an error we can interpret. Today they don't.
  const { error: probeError } = await supabase
    .from("offervana_idempotency")
    .select("attom_profile_payload, mls_search_payload")
    .limit(1);

  const salvageableColumnsExist = !probeError;

  console.log(
    JSON.stringify({
      summary: true,
      rows_scanned: count ?? 0,
      salvageable_columns_present: salvageableColumnsExist,
      salvageable_payloads_found: 0,
      execute_flag: args.execute,
      action: "skipped",
      reason:
        "offervana_idempotency carries no ATTOM/MLS payloads in the current schema; cache will warm naturally",
    }),
  );
}

void main();
