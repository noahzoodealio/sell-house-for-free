import "server-only";

import { z } from "zod";

import { DOC_SUMMARY_DISCLAIMER } from "@/lib/ai/prompts/pdf-reviewer";
import { redactObject } from "@/lib/ai/redact";
import {
  defineTool,
  type DefineToolSessionLike,
} from "@/lib/ai/tools/_define";
import { searchByAddress } from "@/lib/enrichment/mls-client";

interface Session extends DefineToolSessionLike {
  id: string;
}

const ADDRESS_SHAPE = z.object({
  street1: z.string().min(1).max(120),
  street2: z.string().max(120).optional(),
  city: z.string().min(1).max(60),
  state: z.literal("AZ").default("AZ"),
  zip: z.string().min(5),
});

export function searchListingsByAddressTool(session: Session) {
  const factory = defineTool({
    name: "searchListingsByAddress",
    description:
      "Search MLS listings by address. Returns the best match (status, price, DOM, agent) plus a short status history. Use for 'is my house listed' / 'what's on the market on my street' questions.",
    inputSchema: z.object({ address: ADDRESS_SHAPE }),
    telemetry: { cost_class: "priced", budget_bucket: "mls" },
    handler: async ({ address }) => {
      let result;
      try {
        result = await searchByAddress(address);
      } catch {
        return {
          kind: "tool-error" as const,
          safe: true as const,
          cause: "upstream_unavailable",
          message: "MLS didn't respond cleanly. Try again in a few.",
          disclaimer: DOC_SUMMARY_DISCLAIMER,
        };
      }
      if (!result || !result.match) {
        return {
          data: null,
          reason: "no_match" as const,
          source: "mls-search",
          retrievedAt: new Date().toISOString(),
          cacheHit: false,
          disclaimer: DOC_SUMMARY_DISCLAIMER,
        };
      }

      const m = result.match;
      return {
        data: redactObject({
          attomId: m.attomId,
          mlsRecordId: m.mlsRecordId,
          listingStatus: m.listingStatus,
          statusChangeDate: m.statusChangeDate,
          address: m.propertyAddressFull,
          zip: m.propertyAddressZip,
          history: (result.history ?? []).slice(0, 30),
          imageCount: result.inlineImages?.length ?? 0,
        }),
        source: "mls-search",
        retrievedAt: new Date().toISOString(),
        cacheHit: false,
        disclaimer: DOC_SUMMARY_DISCLAIMER,
      };
    },
  });
  return factory(session);
}
