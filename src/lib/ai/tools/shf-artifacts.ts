import "server-only";

import { z } from "zod";

import { DOC_SUMMARY_DISCLAIMER } from "@/lib/ai/prompts/pdf-reviewer";
import {
  defineTool,
  type DefineToolSessionLike,
} from "@/lib/ai/tools/_define";

interface Session extends DefineToolSessionLike {
  id: string;
}

const ArtifactKind = z.enum([
  "doc_summary",
  "offer_analysis",
  "comp_report",
  "valuation",
]);

export function listMyArtifactsTool(session: Session) {
  const factory = defineTool({
    name: "listMyArtifacts",
    description:
      "Read the seller's prior AI artifacts (doc summaries, offer analyses, comp reports). Useful when the seller asks 'what did you say about my offer earlier'.",
    inputSchema: z.object({
      kind: ArtifactKind.optional(),
      limit: z.number().int().min(1).max(20).optional(),
    }),
    handler: async ({ kind, limit }, ctx) => {
      let query = ctx.supabase
        .from("ai_artifacts")
        .select("id, kind, payload_json, created_at")
        .eq("session_id", session.id);

      if (kind) query = query.eq("kind", kind);
      query = query.order("created_at", { ascending: false }).limit(
        Math.min(limit ?? 10, 20),
      );

      const { data: rows } = await query;

      return {
        data: rows ?? [],
        source: "supabase-ai-artifacts",
        retrievedAt: new Date().toISOString(),
        disclaimer: DOC_SUMMARY_DISCLAIMER,
      };
    },
  });
  return factory(session);
}
