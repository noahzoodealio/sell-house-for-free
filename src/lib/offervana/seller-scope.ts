import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { lookupIdempotent } from "@/lib/offervana/idempotency";

export interface SellerScope {
  submissionId: string;
  customerId: number;
}

/**
 * Resolves the trusted Offervana customerId for a seller given their AI
 * session's submissionId. Returns null when no idempotency row exists
 * (seller hasn't been synced yet, or submission predates E5).
 *
 * The customerId returned here is the *only* one the seller is authorized
 * to read against Offervana. Every OuterApi response must cross-check
 * its own `customerId` field against this value before returning data
 * to the LLM (see `assertScopeMatches`).
 */
export async function resolveSellerScope(
  submissionId: string | null | undefined,
  client?: SupabaseClient,
): Promise<SellerScope | null> {
  if (!submissionId) return null;
  const payload = await lookupIdempotent(submissionId, { client });
  if (!payload || typeof payload.customerId !== "number") return null;
  return { submissionId, customerId: payload.customerId };
}

export interface ScopeMatch {
  ok: true;
  customerId: number;
}
export interface ScopeMismatch {
  ok: false;
  reason: "no_record" | "scope_violation";
  expectedCustomerId?: number;
  actualCustomerId?: number;
}

/**
 * Cross-checks an OuterApi response object's customerId field against the
 * seller's trusted scope. Returns `{ok:true}` on match, `{ok:false}` with
 * a reason on mismatch. `scope_violation` is page-grade — the caller is
 * expected to write a Sentry event (S7).
 */
export function assertScopeMatches(
  scope: SellerScope,
  response: { customerId?: number | string | null } | null | undefined,
): ScopeMatch | ScopeMismatch {
  if (!response) {
    return { ok: false, reason: "no_record", expectedCustomerId: scope.customerId };
  }
  const actual =
    typeof response.customerId === "number"
      ? response.customerId
      : typeof response.customerId === "string"
        ? Number(response.customerId)
        : null;
  if (actual === null || Number.isNaN(actual)) {
    return { ok: false, reason: "no_record", expectedCustomerId: scope.customerId };
  }
  if (actual !== scope.customerId) {
    return {
      ok: false,
      reason: "scope_violation",
      expectedCustomerId: scope.customerId,
      actualCustomerId: actual,
    };
  }
  return { ok: true, customerId: scope.customerId };
}
