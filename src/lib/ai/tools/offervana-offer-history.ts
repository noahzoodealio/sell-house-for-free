import "server-only";

import { z } from "zod";

import { DOC_SUMMARY_DISCLAIMER } from "@/lib/ai/prompts/pdf-reviewer";
import { redactObject } from "@/lib/ai/redact";
import {
  defineTool,
  type DefineToolSessionLike,
} from "@/lib/ai/tools/_define";
import {
  getOfferHistoryV2,
  listOffersV2,
} from "@/lib/offervana/outer-api-client";
import {
  assertScopeMatches,
  resolveSellerScope,
} from "@/lib/offervana/seller-scope";

interface OffervanaSession extends DefineToolSessionLike {
  id: string;
  submissionId?: string | null;
}

export function getOfferHistoryTool(session: OffervanaSession) {
  const factory = defineTool({
    name: "getOfferHistory",
    description:
      "Get the full version history of one of the seller's V2 offers. Cross-checked against the seller's offer list before history is fetched — cannot be used to read another seller's history.",
    inputSchema: z.object({
      offerId: z.string(),
      propertyId: z.string(),
    }),
    telemetry: { cost_class: "priced", budget_bucket: "offervana" },
    handler: async ({ offerId, propertyId }, ctx) => {
      const scope = await resolveSellerScope(session.submissionId, ctx.supabase);
      if (!scope) {
        return {
          data: null,
          reason: "no_record" as const,
          source: "offervana-outerapi-offer-history",
          retrievedAt: null,
          cacheHit: false,
          disclaimer: DOC_SUMMARY_DISCLAIMER,
        };
      }

      // Verify the offerId belongs to the seller before fetching history.
      const listing = await listOffersV2({ propertyId }, { signal: ctx.signal });
      if (listing.kind !== "ok") {
        return {
          kind: "tool-error" as const,
          safe: true as const,
          cause: listing.kind === "auth-failed" ? "auth_failed" : "upstream_unavailable",
          message: "Offervana is having a moment. Try again shortly.",
          disclaimer: DOC_SUMMARY_DISCLAIMER,
        };
      }
      const offers = Array.isArray(listing.data) ? listing.data : [];
      const owned = offers.find((o) => {
        if (o.id !== offerId) return false;
        return assertScopeMatches(scope, o).ok;
      });
      if (!owned) {
        return {
          data: null,
          reason: "no_record" as const,
          source: "offervana-outerapi-offer-history",
          retrievedAt: new Date().toISOString(),
          cacheHit: false,
          disclaimer: DOC_SUMMARY_DISCLAIMER,
        };
      }

      const history = await getOfferHistoryV2(offerId, { signal: ctx.signal });
      if (history.kind !== "ok") {
        return {
          kind: "tool-error" as const,
          safe: true as const,
          cause: history.kind === "auth-failed" ? "auth_failed" : "upstream_unavailable",
          message: "Offervana is having a moment. Try again shortly.",
          disclaimer: DOC_SUMMARY_DISCLAIMER,
        };
      }

      return {
        data: redactObject({
          offerId,
          events: history.data?.events ?? [],
        }),
        source: "offervana-outerapi-offer-history",
        retrievedAt: new Date().toISOString(),
        cacheHit: false,
        disclaimer: DOC_SUMMARY_DISCLAIMER,
      };
    },
  });
  return factory(session);
}
