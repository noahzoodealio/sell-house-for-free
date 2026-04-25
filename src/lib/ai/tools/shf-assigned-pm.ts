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

export function getMyAssignedPmTool(session: Session) {
  const factory = defineTool({
    name: "getMyAssignedPm",
    description:
      "Read the seller's assigned PM (name, role, contact). Seller-scoped via the submission's pm_user_id.",
    inputSchema: z.object({}),
    handler: async (_input, ctx) => {
      const submission = await resolveSubmissionForSession(session, ctx.supabase);
      if (!submission || !submission.pm_user_id) {
        return {
          data: null,
          reason: "no_record" as const,
          source: "supabase-team-members",
          retrievedAt: null,
          disclaimer: DOC_SUMMARY_DISCLAIMER,
        };
      }

      const { data: pm } = await ctx.supabase
        .from("team_members")
        .select("id, name, email, phone, role, coverage")
        .eq("id", submission.pm_user_id)
        .maybeSingle();

      return {
        data: redactObject(pm),
        source: "supabase-team-members",
        retrievedAt: new Date().toISOString(),
        disclaimer: DOC_SUMMARY_DISCLAIMER,
      };
    },
  });
  return factory(session);
}
