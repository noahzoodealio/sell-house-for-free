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

export function listMySubmissionOffersTool(session: Session) {
  const factory = defineTool({
    name: "listMySubmissionOffers",
    description:
      "Read the seller's locally-mirrored offers (path, low/high cents). Local mirror; for current Offervana state use listMyOffersV2 (S4 tool). Falls back to this only when listMyOffersV2 returns upstream_unavailable.",
    inputSchema: z.object({}),
    handler: async (_input, ctx) => {
      const submission = await resolveSubmissionForSession(session, ctx.supabase);
      if (!submission) {
        return {
          data: [],
          reason: "no_record" as const,
          source: "supabase-submission-offers",
          retrievedAt: null,
          disclaimer: DOC_SUMMARY_DISCLAIMER,
        };
      }

      const { data: rows } = await ctx.supabase
        .from("submission_offers")
        .select("id, path, low_cents, high_cents, created_at")
        .eq("submission_id", submission.id)
        .order("created_at", { ascending: false });

      return {
        data: redactObject(rows ?? []),
        source: "supabase-submission-offers",
        retrievedAt: new Date().toISOString(),
        disclaimer: DOC_SUMMARY_DISCLAIMER,
      };
    },
  });
  return factory(session);
}
