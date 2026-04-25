import "server-only";

import { z } from "zod";

import { DOC_SUMMARY_DISCLAIMER } from "@/lib/ai/prompts/pdf-reviewer";
import { redactObject } from "@/lib/ai/redact";
import {
  defineTool,
  type DefineToolSessionLike,
} from "@/lib/ai/tools/_define";
import { getOffervanaProperty } from "@/lib/offervana/outer-api-client";
import {
  assertScopeMatches,
  resolveSellerScope,
} from "@/lib/offervana/seller-scope";

interface OffervanaSession extends DefineToolSessionLike {
  id: string;
  submissionId?: string | null;
}

export function getMyOffervanaPropertyTool(session: OffervanaSession) {
  const factory = defineTool({
    name: "getMyOffervanaProperty",
    description:
      "Read the seller's own property record from Offervana (source of truth, includes offer summary). Seller-scoped; never accepts an arbitrary email or property ID.",
    inputSchema: z.object({}),
    telemetry: { cost_class: "priced", budget_bucket: "offervana" },
    handler: async (_input, ctx) => {
      const scope = await resolveSellerScope(session.submissionId, ctx.supabase);
      if (!scope) {
        return {
          data: null,
          reason: "no_record" as const,
          source: "offervana-outerapi-properties",
          retrievedAt: null,
          cacheHit: false,
          disclaimer: DOC_SUMMARY_DISCLAIMER,
        };
      }

      const result = await getOffervanaProperty(
        { address: "", includeOffers: true },
        { signal: ctx.signal },
      );

      if (result.kind === "auth-failed") {
        return {
          kind: "tool-error" as const,
          safe: true as const,
          cause: "auth_failed",
          message: "Offervana isn't reachable right now. Try again in a few.",
          disclaimer: DOC_SUMMARY_DISCLAIMER,
        };
      }
      if (result.kind === "upstream-unavailable") {
        return {
          kind: "tool-error" as const,
          safe: true as const,
          cause: "upstream_unavailable",
          message: "Offervana is having a moment. Try again shortly.",
          disclaimer: DOC_SUMMARY_DISCLAIMER,
        };
      }
      if (result.kind === "not-found" || result.kind === "malformed-response") {
        return {
          data: null,
          reason: "no_record" as const,
          source: "offervana-outerapi-properties",
          retrievedAt: new Date().toISOString(),
          cacheHit: false,
          disclaimer: DOC_SUMMARY_DISCLAIMER,
        };
      }

      const properties = Array.isArray(result.data) ? result.data : [result.data];
      const matched = properties.find((p) => {
        const check = assertScopeMatches(scope, p as { customerId?: number });
        return check.ok;
      });

      if (!matched) {
        // Either no match or scope_violation. Surface scope_violation via metadata
        // so S7 can fire a Sentry alert.
        const violation = properties.some((p) => {
          const check = assertScopeMatches(scope, p as { customerId?: number });
          return !check.ok && check.reason === "scope_violation";
        });
        if (violation) {
          await ctx.supabase
            .from("ai_tool_runs")
            .update({
              error_detail: { scope_violation: true, expectedCustomerId: scope.customerId },
            })
            .eq("id", ctx.toolRunId ?? "");
        }
        return {
          data: null,
          reason: "no_record" as const,
          source: "offervana-outerapi-properties",
          retrievedAt: new Date().toISOString(),
          cacheHit: false,
          disclaimer: DOC_SUMMARY_DISCLAIMER,
        };
      }

      // LLM-shaped projection: keep the fields the agent uses, drop internals.
      const property = matched as Record<string, unknown>;
      return {
        data: redactObject({
          id: property.id,
          address: property.address,
          customerId: scope.customerId,
          offers: Array.isArray(property.offers) ? property.offers : [],
        }),
        source: "offervana-outerapi-properties",
        retrievedAt: new Date().toISOString(),
        cacheHit: false,
        disclaimer: DOC_SUMMARY_DISCLAIMER,
      };
    },
  });
  return factory(session);
}
