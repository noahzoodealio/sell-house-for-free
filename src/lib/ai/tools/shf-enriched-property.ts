import "server-only";

import { z } from "zod";

import { DOC_SUMMARY_DISCLAIMER } from "@/lib/ai/prompts/pdf-reviewer";
import { redactObject } from "@/lib/ai/redact";
import {
  defineTool,
  type DefineToolSessionLike,
} from "@/lib/ai/tools/_define";
import {
  resolveSubmissionForSession,
  type ShfSession,
} from "@/lib/ai/tools/shf-shared";

interface Session extends DefineToolSessionLike, ShfSession {
  id: string;
}

interface EnrichmentRow {
  address_key: string;
  attom_payload: unknown;
  mls_payload: unknown;
  retrieved_at: string;
}

export function getMyEnrichedPropertyTool(session: Session) {
  const factory = defineTool({
    name: "getMyEnrichedProperty",
    description:
      "Read the cached ATTOM + MLS enrichment for the seller's subject property (E12 cache). Zero upstream calls; cache-only.",
    inputSchema: z.object({}),
    handler: async (_input, ctx) => {
      const submission = await resolveSubmissionForSession(session, ctx.supabase);
      if (!submission) {
        return {
          data: null,
          reason: "no_record" as const,
          source: "supabase-property-enrichments",
          retrievedAt: null,
          disclaimer: DOC_SUMMARY_DISCLAIMER,
        };
      }

      // Load the address-keyed cache by the submission's address fields.
      const { data: subAddr } = await ctx.supabase
        .from("submissions")
        .select("city, state, zip")
        .eq("id", submission.id)
        .maybeSingle();
      if (!subAddr) {
        return {
          data: null,
          reason: "no_record" as const,
          source: "supabase-property-enrichments",
          retrievedAt: null,
          disclaimer: DOC_SUMMARY_DISCLAIMER,
        };
      }

      const { data: rowRaw } = await ctx.supabase
        .from("property_enrichments")
        .select("address_key, attom_payload, mls_payload, retrieved_at")
        .eq("submission_id", submission.id)
        .order("retrieved_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const row = rowRaw as EnrichmentRow | null;
      if (!row) {
        return {
          data: null,
          reason: "no_data" as const,
          source: "supabase-property-enrichments",
          retrievedAt: null,
          disclaimer: DOC_SUMMARY_DISCLAIMER,
        };
      }

      return {
        data: redactObject({
          attom: row.attom_payload,
          mls: row.mls_payload,
        }),
        source: "supabase-property-enrichments",
        retrievedAt: row.retrieved_at,
        cacheHit: true,
        disclaimer: DOC_SUMMARY_DISCLAIMER,
      };
    },
  });
  return factory(session);
}
