import "server-only";

import { z } from "zod";

import { DOC_SUMMARY_DISCLAIMER } from "@/lib/ai/prompts/pdf-reviewer";
import { redactObject } from "@/lib/ai/redact";
import {
  defineTool,
  type DefineToolSessionLike,
} from "@/lib/ai/tools/_define";
import { getCustomerByEmail } from "@/lib/offervana/outer-api-client";
import {
  assertScopeMatches,
  resolveSellerScope,
} from "@/lib/offervana/seller-scope";

interface OffervanaTeamSession extends DefineToolSessionLike {
  id: string;
  submissionId?: string | null;
  /** Set by E11 portal middleware when the session belongs to a team member. */
  isTeam?: boolean;
  /** Email of the customer being looked up — provided server-side only by team-portal flows. */
  teamLookupEmail?: string;
}

export function getMyCustomerRecordTool(session: OffervanaTeamSession) {
  const factory = defineTool({
    name: "getMyCustomerRecord",
    description:
      "[team-only] Read a customer's Offervana record by email. Stub today: returns 'forbidden' until E11 wires team-member identity into the AI session.",
    inputSchema: z.object({}),
    telemetry: { cost_class: "priced", budget_bucket: "offervana" },
    handler: async (_input, ctx) => {
      // E11 dependency: team-only path is gated by session.isTeam, which the
      // portal middleware will set once team auth lands. Until then, return
      // 'forbidden' — never expose this surface to seller sessions.
      if (!session.isTeam) {
        return {
          kind: "tool-error" as const,
          safe: true as const,
          cause: "forbidden",
          message:
            "That tool is for team members only and isn't enabled in this session.",
          disclaimer: DOC_SUMMARY_DISCLAIMER,
        };
      }

      const email = session.teamLookupEmail;
      if (!email) {
        return {
          data: null,
          reason: "no_record" as const,
          source: "offervana-outerapi-customers",
          retrievedAt: null,
          cacheHit: false,
          disclaimer: DOC_SUMMARY_DISCLAIMER,
        };
      }

      // Even for team users, scope_violation alerting still fires when the
      // returned customerId mismatches the team's expected target — a defense
      // in depth against email collisions or upstream bugs.
      const scope = await resolveSellerScope(session.submissionId, ctx.supabase);

      const result = await getCustomerByEmail(email, { signal: ctx.signal });
      if (result.kind !== "ok") {
        if (result.kind === "not-found" || result.kind === "malformed-response") {
          return {
            data: null,
            reason: "no_record" as const,
            source: "offervana-outerapi-customers",
            retrievedAt: new Date().toISOString(),
            cacheHit: false,
            disclaimer: DOC_SUMMARY_DISCLAIMER,
          };
        }
        return {
          kind: "tool-error" as const,
          safe: true as const,
          cause: result.kind === "auth-failed" ? "auth_failed" : "upstream_unavailable",
          message: "Offervana is having a moment. Try again shortly.",
          disclaimer: DOC_SUMMARY_DISCLAIMER,
        };
      }

      if (scope) {
        const customerId =
          typeof result.data.id === "number" ? result.data.id : null;
        const check = assertScopeMatches(scope, customerId === null ? null : { customerId });
        if (!check.ok && check.reason === "scope_violation") {
          await ctx.supabase
            .from("ai_tool_runs")
            .update({
              error_detail: {
                scope_violation: true,
                expectedCustomerId: scope.customerId,
                actualCustomerId: check.actualCustomerId,
              },
            })
            .eq("id", ctx.toolRunId ?? "");
        }
      }

      return {
        data: redactObject({
          id: result.data.id,
          firstName: result.data.firstName,
          lastName: result.data.lastName,
        }),
        source: "offervana-outerapi-customers",
        retrievedAt: new Date().toISOString(),
        cacheHit: false,
        disclaimer: DOC_SUMMARY_DISCLAIMER,
      };
    },
  });
  return factory(session);
}
