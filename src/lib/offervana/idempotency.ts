import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseAdmin } from "@/lib/supabase/server";
import type { OffervanaIdempotencyRow } from "@/lib/supabase/schema";

import type { OffervanaOkPayload } from "./types";

export const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;

export interface IdempotencyDeps {
  client?: SupabaseClient;
  now?: () => Date;
}

export async function lookupIdempotent(
  submissionId: string,
  deps: IdempotencyDeps = {},
): Promise<OffervanaOkPayload | null> {
  const client = deps.client ?? getSupabaseAdmin();
  const now = deps.now ? deps.now() : new Date();

  const cutoff = new Date(now.getTime() - IDEMPOTENCY_TTL_MS).toISOString();

  const { data, error } = await client
    .from("offervana_idempotency")
    .select(
      "submission_id, customer_id, user_id, referral_code, created_at, property_id",
    )
    .eq("submission_id", submissionId)
    .gte("created_at", cutoff)
    .maybeSingle();

  if (error) {
    throw new Error(
      `offervana_idempotency lookup failed: ${error.message}`,
    );
  }
  if (!data) return null;

  const row = data as OffervanaIdempotencyRow;
  return {
    customerId: row.customer_id,
    referralCode: row.referral_code,
    propertyId: row.property_id,
  };
}

export async function storeIdempotent(
  submissionId: string,
  payload: OffervanaOkPayload,
  deps: IdempotencyDeps = {},
): Promise<void> {
  const client = deps.client ?? getSupabaseAdmin();
  const now = deps.now ? deps.now() : new Date();

  const { error } = await client.from("offervana_idempotency").upsert(
    {
      submission_id: submissionId,
      customer_id: payload.customerId,
      user_id: null,
      referral_code: payload.referralCode,
      created_at: now.toISOString(),
      property_id: payload.propertyId,
    },
    { onConflict: "submission_id", ignoreDuplicates: true },
  );

  if (error) {
    throw new Error(
      `offervana_idempotency store failed: ${error.message}`,
    );
  }
}

export async function storeOffersV2Payload(
  submissionId: string,
  offers: unknown[],
  deps: IdempotencyDeps = {},
): Promise<void> {
  const client = deps.client ?? getSupabaseAdmin();
  const now = deps.now ? deps.now() : new Date();

  const { error } = await client
    .from("offervana_idempotency")
    .update({
      offers_v2_payload: offers,
      offers_v2_fetched_at: now.toISOString(),
    })
    .eq("submission_id", submissionId);

  if (error) {
    throw new Error(
      `offervana_idempotency offers update failed: ${error.message}`,
    );
  }
}
