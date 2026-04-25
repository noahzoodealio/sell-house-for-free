import "server-only";

import { z } from "zod";

import { DOC_SUMMARY_DISCLAIMER } from "@/lib/ai/prompts/pdf-reviewer";
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
  isTeam?: boolean;
}

export function listMyAssignmentEventsTool(session: Session) {
  const factory = defineTool({
    name: "listMyAssignmentEvents",
    description:
      "[team-only] Read the seller's submission assignment history (PM reassignments, handoffs). Stub today: returns 'forbidden' until E11 wires team-member identity into the AI session.",
    inputSchema: z.object({}),
    handler: async (_input, ctx) => {
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

      const submission = await resolveSubmissionForSession(session, ctx.supabase);
      if (!submission) {
        return {
          data: [],
          reason: "no_record" as const,
          source: "supabase-assignment-events",
          retrievedAt: null,
          disclaimer: DOC_SUMMARY_DISCLAIMER,
        };
      }

      const { data: rows } = await ctx.supabase
        .from("assignment_events")
        .select("id, kind, from_pm, to_pm, reason, created_at")
        .eq("submission_id", submission.id)
        .order("created_at", { ascending: false });

      return {
        data: rows ?? [],
        source: "supabase-assignment-events",
        retrievedAt: new Date().toISOString(),
        disclaimer: DOC_SUMMARY_DISCLAIMER,
      };
    },
  });
  return factory(session);
}
