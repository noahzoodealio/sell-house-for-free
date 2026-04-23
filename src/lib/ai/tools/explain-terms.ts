import "server-only";

import { generateText, tool } from "ai";
import { z } from "zod";

import { gateway, models } from "@/lib/ai/gateway";
import { DOC_SUMMARY_DISCLAIMER } from "@/lib/ai/prompts/pdf-reviewer";
import { redact } from "@/lib/ai/redact";
import { getSupabaseAdmin } from "@/lib/supabase/server";

interface ExplainTermsSessionCtx {
  id: string;
}

const EXPLAIN_TERMS_PROMPT = `You are the Transaction Manager explaining a real-estate contract term to the homeowner in plain English. Friend-style, direct, warm, no jargon-dump.

Rules:
- Lead with a one-sentence definition.
- Give a concrete AZ-context example.
- If the term has negotiation levers, name them.
- End with a one-line "when to push back" note when relevant.
- Do not practice law. If the question is a legal-interpretation question (enforceability, case law), say so and point to an attorney.
- Close with the disclaimer: "${DOC_SUMMARY_DISCLAIMER}"`;

export function explainTermsTool(session: ExplainTermsSessionCtx) {
  return tool({
    description:
      "Explain a real-estate contract or offer term in plain English (e.g. earnest money, appraisal contingency, title contingency, earnest forfeiture). Use when the user asks what a term means or how it works.",
    inputSchema: z.object({
      term: z.string().min(1),
      context: z
        .string()
        .max(500)
        .optional()
        .describe(
          "Optional surrounding context (e.g. a quote from their offer) to ground the explanation.",
        ),
    }),
    execute: async ({ term, context }) => {
      const supabase = getSupabaseAdmin();
      const startedAt = Date.now();

      const { data: runData } = await supabase
        .from("ai_tool_runs")
        .insert({
          session_id: session.id,
          tool_name: "explain_terms",
          status: "running",
          input_json: { term, context: context ?? null },
        })
        .select("id")
        .single();
      const toolRunId = (runData as { id: string } | null)?.id ?? null;

      async function finalize(
        status: "ok" | "error",
        output: unknown,
        errorDetail?: unknown,
      ) {
        if (!toolRunId) return;
        await supabase
          .from("ai_tool_runs")
          .update({
            status,
            output_json: output ?? null,
            error_detail: errorDetail ?? null,
            latency_ms: Date.now() - startedAt,
          })
          .eq("id", toolRunId);
      }

      try {
        const userPrompt = context
          ? `Term: ${term}\nSurrounding context the homeowner gave: ${context}\n\nExplain.`
          : `Term: ${term}\n\nExplain.`;

        const { text } = await generateText({
          model: gateway(models.orchestrator),
          system: EXPLAIN_TERMS_PROMPT,
          prompt: userPrompt,
        });

        const payload = {
          term,
          explanation: text,
          disclaimer: DOC_SUMMARY_DISCLAIMER,
        };

        await finalize("ok", payload);
        return payload;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        await finalize("error", null, { message: redact(message) });
        return {
          kind: "tool-error" as const,
          safe: true,
          message:
            "I couldn't pull that explanation together. Try asking again or rephrase the term.",
          disclaimer: DOC_SUMMARY_DISCLAIMER,
        };
      }
    },
  });
}
