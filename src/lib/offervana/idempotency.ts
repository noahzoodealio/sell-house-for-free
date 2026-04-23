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
    .select("submission_id, customer_id, user_id, referral_code, created_at")
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
    userId: row.user_id,
    referralCode: row.referral_code,
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
      user_id: payload.userId,
      referral_code: payload.referralCode,
      created_at: now.toISOString(),
    },
    { onConflict: "submission_id", ignoreDuplicates: true },
  );

  if (error) {
    throw new Error(
      `offervana_idempotency store failed: ${error.message}`,
    );
  }
}
