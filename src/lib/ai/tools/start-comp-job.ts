import "server-only";

import { after } from "next/server";
import { z } from "zod";

import { redact } from "@/lib/ai/redact";
import { VALUATION_DISCLAIMER } from "@/lib/ai/prompts/comping";
import type { SessionContext } from "@/lib/ai/session";
import {
  defineTool,
  type DefineToolSessionLike,
} from "@/lib/ai/tools/_define";
import { runCompPipeline } from "@/lib/ai/workflows/comp-run";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import type { AddressFields } from "@/lib/seller-form/types";

interface StartCompJobSessionCtx extends DefineToolSessionLike {
  id: string;
  context: SessionContext;
}

export function startCompJobTool(session: StartCompJobSessionCtx) {
  const factory = defineTool({
    name: "start_comp_job",
    description:
      "Kick off a comping valuation run for the subject property. Returns immediately with { jobId, pollUrl }; the valuation lands as a comp_report artifact when the workflow completes. Call when the homeowner asks 'what's my home worth' or similar.",
    inputSchema: z.object({
      address: z
        .object({
          street1: z.string().min(1),
          street2: z.string().optional(),
          city: z.string().min(1),
          state: z.literal("AZ").default("AZ"),
          zip: z.string().min(5),
        })
        .optional()
        .describe(
          "Override the session's subject address if the homeowner is asking about a different property. Otherwise omit and the session's context address is used.",
        ),
    }),
    skipAutoFinalize: true,
    handler: async ({ address }, ctx) => {
      const subject = resolveSubjectAddress(address, session.context);
      if (!subject) {
        // No row to finalize — the toolRunId row exists in 'running'; mark as error.
        await ctx.finalize("error", null, {
          kind: "tool-error",
          safe: true,
          stage: "input",
          cause: "no_subject_address",
        });
        return {
          kind: "tool-error" as const,
          safe: true as const,
          message:
            "I need your subject address before I can pull comps. What's the property?",
          disclaimer: VALUATION_DISCLAIMER,
        };
      }

      if (!ctx.toolRunId) {
        // ai_tool_runs insert failed. Surface a soft error; the LLM can retry.
        return {
          kind: "tool-error" as const,
          safe: true as const,
          message: "Couldn't queue the comp run. Let's try again in a moment.",
          disclaimer: VALUATION_DISCLAIMER,
        };
      }

      const jobId = ctx.toolRunId;

      // Background the pipeline. `after()` keeps the promise alive past
      // the stream response — when WDK is enabled (post-launch), S20
      // flips this to workflow.trigger('comp-run', { jobId, ... }).
      after(async () => {
        const supabaseInner = getSupabaseAdmin();
        try {
          const result = await runCompPipeline({
            sessionId: session.id,
            subjectAddress: subject,
            subjectAvm: {
              low: session.context.enrichment?.avmLow,
              high: session.context.enrichment?.avmHigh,
            },
          });

          if (result.valuation) {
            const { data: artifact } = await supabaseInner
              .from("ai_artifacts")
              .insert({
                session_id: session.id,
                kind: "comp_report",
                payload_json: result.valuation,
              })
              .select("id")
              .single();

            await supabaseInner
              .from("ai_tool_runs")
              .update({
                status: "ok",
                output_json: {
                  valuationSummary: {
                    low: result.valuation.low,
                    mid: result.valuation.mid,
                    high: result.valuation.high,
                    confidence: result.valuation.confidence,
                  },
                  artifactId: (artifact as { id: string } | null)?.id ?? null,
                },
              })
              .eq("id", jobId);
          } else {
            await supabaseInner
              .from("ai_tool_runs")
              .update({
                status: "error",
                error_detail: { reason: "no_valuation_produced" },
              })
              .eq("id", jobId);
          }
        } catch (err) {
          await supabaseInner
            .from("ai_tool_runs")
            .update({
              status: "error",
              error_detail: {
                message: redact(
                  err instanceof Error ? err.message : String(err),
                ),
              },
            })
            .eq("id", jobId);
        }
      });

      return {
        jobId,
        status: "running" as const,
        pollUrl: `/api/chat/jobs/${jobId}`,
        message:
          "Pulling comps now — this usually takes 30–90 seconds. I'll surface the valuation once it's ready.",
        disclaimer: VALUATION_DISCLAIMER,
      };
    },
  });
  return factory(session);
}

function resolveSubjectAddress(
  override: AddressFields | undefined,
  context: SessionContext,
): AddressFields | null {
  if (override) {
    return {
      ...override,
      state: override.state ?? "AZ",
    };
  }
  if (typeof context.address === "string" && context.address.length > 0) {
    // Best-effort parse: rely on enrichment keying by full string. The
    // runCompPipeline's mls-client.searchByAddress accepts AddressFields;
    // without structured components we can only pass the partial payload
    // and trust enrichment to fail gracefully.
    return {
      street1: context.address,
      city: "",
      state: "AZ",
      zip: "",
    };
  }
  return null;
}
