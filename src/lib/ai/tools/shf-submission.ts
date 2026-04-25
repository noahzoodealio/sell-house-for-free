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

export function getMySubmissionTool(session: Session) {
  const factory = defineTool({
    name: "getMySubmission",
    description:
      "Read the seller's own submission record (timestamps, status, path, address fields). Seller-scoped via session.submissionId.",
    inputSchema: z.object({}),
    handler: async (_input, ctx) => {
      const submission = await resolveSubmissionForSession(session, ctx.supabase);
      if (!submission) {
        return {
          data: null,
          reason: "no_record" as const,
          source: "supabase-submissions",
          retrievedAt: null,
          disclaimer: DOC_SUMMARY_DISCLAIMER,
        };
      }

      const { data: full } = await ctx.supabase
        .from("submissions")
        .select(
          "submission_id, status, seller_paths, pillar_hint, timeline, beds, baths, sqft, year_built, city, state, zip, created_at, assigned_at",
        )
        .eq("id", submission.id)
        .maybeSingle();

      return {
        data: redactObject(full),
        source: "supabase-submissions",
        retrievedAt: new Date().toISOString(),
        disclaimer: DOC_SUMMARY_DISCLAIMER,
      };
    },
  });
  return factory(session);
}
