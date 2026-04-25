import "server-only";

import { z } from "zod";

import { DOC_SUMMARY_DISCLAIMER } from "@/lib/ai/prompts/pdf-reviewer";
import { redactObject } from "@/lib/ai/redact";
import {
  defineTool,
  type DefineToolSessionLike,
} from "@/lib/ai/tools/_define";
import { listOffers } from "@/lib/offervana/outer-api-client";
import {
  assertScopeMatches,
  resolveSellerScope,
} from "@/lib/offervana/seller-scope";

interface OffervanaSession extends DefineToolSessionLike {
  id: string;
  submissionId?: string | null;
}

export function listMyOffersTool(session: OffervanaSession) {
  const factory = defineTool({
    name: "listMyOffers",
    description:
      "List the seller's V1 cash offers from Offervana. Use only when V2 is unavailable; otherwise prefer listMyOffersV2 (richer history). Seller-scoped.",
    inputSchema: z.object({
      propertyId: z.string().optional(),
    }),
    telemetry: { cost_class: "priced", budget_bucket: "offervana" },
    handler: async ({ propertyId }, ctx) => {
      const scope = await resolveSellerScope(session.submissionId, ctx.supabase);
      if (!scope || !propertyId) {
        return {
          data: [],
          reason: "no_record" as const,
          source: "offervana-outerapi-offers",
          retrievedAt: null,
          cacheHit: false,
          disclaimer: DOC_SUMMARY_DISCLAIMER,
        };
      }

      const result = await listOffers({ propertyId }, { signal: ctx.signal });

      if (result.kind === "auth-failed" || result.kind === "upstream-unavailable") {
        return {
          kind: "tool-error" as const,
          safe: true as const,
          cause: result.kind === "auth-failed" ? "auth_failed" : "upstream_unavailable",
          message: "Offervana is having a moment. Try again shortly.",
          disclaimer: DOC_SUMMARY_DISCLAIMER,
        };
      }
      if (result.kind === "not-found" || result.kind === "malformed-response") {
        return {
          data: [],
          reason: "no_record" as const,
          source: "offervana-outerapi-offers",
          retrievedAt: new Date().toISOString(),
          cacheHit: false,
          disclaimer: DOC_SUMMARY_DISCLAIMER,
        };
      }

      const offers = Array.isArray(result.data) ? result.data : [];
      const scoped = offers.filter((o) => assertScopeMatches(scope, o).ok);

      return {
        data: redactObject(
          scoped.map((o) => ({
            offerId: o.id,
            propertyId: o.propertyId,
            status: o.status,
            amount: o.amount,
            source: o.source,
            createdAt: o.createdAt,
          })),
        ),
        source: "offervana-outerapi-offers",
        retrievedAt: new Date().toISOString(),
        cacheHit: false,
        disclaimer: DOC_SUMMARY_DISCLAIMER,
      };
    },
  });
  return factory(session);
}
