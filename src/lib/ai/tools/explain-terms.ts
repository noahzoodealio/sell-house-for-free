import "server-only";

import { generateText } from "ai";
import { z } from "zod";

import { gateway, models } from "@/lib/ai/gateway";
import { DOC_SUMMARY_DISCLAIMER } from "@/lib/ai/prompts/pdf-reviewer";
import {
  defineTool,
  type DefineToolSessionLike,
} from "@/lib/ai/tools/_define";

interface ExplainTermsSessionCtx extends DefineToolSessionLike {
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

const explainTermsFactory = defineTool({
  name: "explain_terms",
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
  handler: async ({ term, context }) => {
    const userPrompt = context
      ? `Term: ${term}\nSurrounding context the homeowner gave: ${context}\n\nExplain.`
      : `Term: ${term}\n\nExplain.`;

    try {
      const { text } = await generateText({
        model: gateway(models.orchestrator),
        system: EXPLAIN_TERMS_PROMPT,
        prompt: userPrompt,
      });

      return {
        term,
        explanation: text,
        disclaimer: DOC_SUMMARY_DISCLAIMER,
      };
    } catch {
      return {
        kind: "tool-error" as const,
        safe: true as const,
        message:
          "I couldn't pull that explanation together. Try asking again or rephrase the term.",
        disclaimer: DOC_SUMMARY_DISCLAIMER,
      };
    }
  },
});

export function explainTermsTool(session: ExplainTermsSessionCtx) {
  return explainTermsFactory(session);
}
