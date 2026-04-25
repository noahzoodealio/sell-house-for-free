import "server-only";

import { z } from "zod";

import { DOC_SUMMARY_DISCLAIMER } from "@/lib/ai/prompts/pdf-reviewer";
import { redactObject } from "@/lib/ai/redact";
import {
  defineTool,
  type DefineToolSessionLike,
} from "@/lib/ai/tools/_define";
import { getAttomDetails, getImages } from "@/lib/enrichment/mls-client";

interface Session extends DefineToolSessionLike {
  id: string;
}

const MAX_PHOTOS = 6;

export function getListingDetailsTool(session: Session) {
  const factory = defineTool({
    name: "getListingDetails",
    description:
      "Read the full MLS listing detail (remarks, agent, features, DOM, status, photos) for an attomId from MLS search. Photos capped at 6.",
    inputSchema: z.object({
      attomId: z.string().regex(/^\d{6,12}$/),
    }),
    telemetry: { cost_class: "priced", budget_bucket: "mls" },
    handler: async ({ attomId }) => {
      try {
        const details = await getAttomDetails(attomId);
        let imageRows: Awaited<ReturnType<typeof getImages>> = [];
        try {
          imageRows = await getImages(attomId);
        } catch {
          imageRows = [];
        }
        return {
          data: redactObject({
            attomId: details.attomId,
            mlsRecordId: details.mlsRecordId,
            listingStatus: details.listingStatus,
            address: details.propertyAddressFull,
            zip: details.propertyAddressZip,
            yearBuilt: (details as { yearBuilt?: number }).yearBuilt,
            beds: (details as { beds?: number }).beds,
            baths: (details as { baths?: number }).baths,
            squareFeet: (details as { squareFeet?: number }).squareFeet,
            remarks: ((details as { publicRemarks?: string }).publicRemarks ?? "")
              .slice(0, 2000),
            statusChangeDate: details.statusChangeDate,
            photos: imageRows.slice(0, MAX_PHOTOS),
          }),
          source: "mls-detail",
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
