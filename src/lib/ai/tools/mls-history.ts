import "server-only";

import { z } from "zod";

import { DOC_SUMMARY_DISCLAIMER } from "@/lib/ai/prompts/pdf-reviewer";
import { redactObject } from "@/lib/ai/redact";
import {
  defineTool,
  type DefineToolSessionLike,
} from "@/lib/ai/tools/_define";
import { getListingHistory } from "@/lib/enrichment/mls-client";

interface Session extends DefineToolSessionLike {
  id: string;
}

export function getListingHistoryTool(session: Session) {
  const factory = defineTool({
    name: "getListingHistory",
    description:
      "MLS price-cut + status history for a listing (newest-first). Useful for 'how much has the price dropped' or 'how long has this been on the market' questions.",
    inputSchema: z.object({
      attomId: z.string().regex(/^\d{6,12}$/),
    }),
    telemetry: { cost_class: "priced", budget_bucket: "mls" },
    handler: async ({ attomId }) => {
      try {
        const events = await getListingHistory(attomId);
        return {
          data: redactObject({
            attomId,
            events: (events ?? []).slice(0, 30),
          }),
          source: "mls-history",
          retrievedAt: new Date().toISOString(),
          cacheHit: false,
          disclaimer: DOC_SUMMARY_DISCLAIMER,
        };
      } catch {
        return {
          kind: "tool-error" as const,
          safe: true as const,
          cause: "upstream_unavailable",
          message: "MLS didn't respond cleanly. Try again in a few.",
          disclaimer: DOC_SUMMARY_DISCLAIMER,
        };
      }
    },
  });
  return factory(session);
}
