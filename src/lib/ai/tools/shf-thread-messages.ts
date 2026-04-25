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

export function listMyThreadMessagesTool(session: Session) {
  const factory = defineTool({
    name: "listMyThreadMessages",
    description:
      "Read the seller's thread messages with their PM (E11). Seller-scoped via the submission_id.",
    inputSchema: z.object({
      limit: z.number().int().min(1).max(50).optional(),
    }),
    handler: async ({ limit }, ctx) => {
      const submission = await resolveSubmissionForSession(session, ctx.supabase);
      if (!submission) {
        return {
          data: [],
          reason: "no_record" as const,
          source: "supabase-messages",
          retrievedAt: null,
          disclaimer: DOC_SUMMARY_DISCLAIMER,
        };
      }

      const { data: rows } = await ctx.supabase
        .from("messages")
        .select("id, sender_role, body, created_at, delivered_at")
        .eq("submission_id", submission.id)
        .order("created_at", { ascending: false })
        .limit(Math.min(limit ?? 25, 50));

      return {
        data: redactObject(rows ?? []),
        source: "supabase-messages",
        retrievedAt: new Date().toISOString(),
        disclaimer: DOC_SUMMARY_DISCLAIMER,
      };
    },
  });
  return factory(session);
}
