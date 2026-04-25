import "server-only";

import { generateObject } from "ai";
import { z } from "zod";

import { gateway, models } from "@/lib/ai/gateway";
import {
  OFFER_ANALYSIS_DISCLAIMER,
  offerAnalyzerPrompt,
} from "@/lib/ai/prompts/offer-analyzer";
import { OfferAnalysisSchema } from "@/lib/ai/schemas/offer-analysis";
import type { SessionContext } from "@/lib/ai/session";
import {
  defineTool,
  type DefineToolSessionLike,
} from "@/lib/ai/tools/_define";
import { mintSignedUrl } from "@/lib/supabase/storage";

interface AnalyzeOfferSessionCtx extends DefineToolSessionLike {
  id: string;
  context: SessionContext;
}

interface ArtifactRow {
  id: string;
  session_id: string;
  payload_json: {
    stage: string;
    storagePath?: string;
    originalName?: string;
    mime?: string;
    summary?: unknown;
  };
}

export function analyzeOfferTool(session: AnalyzeOfferSessionCtx) {
  const factory = defineTool({
    name: "analyze_offer",
    description:
      "Analyze a specific offer (from an uploaded document or pasted terms) and produce pros/cons, vsAvm comparison, pushbacks, and an opinionated friendlyTake. Call when the user asks 'what do you think of this offer' or similar.",
    inputSchema: z.object({
      documentId: z
        .string()
        .uuid()
        .optional()
        .describe(
          "If the offer came from an uploaded PDF or image, pass its documentId. Otherwise omit and use offerText.",
        ),
      offerText: z
        .string()
        .max(8000)
        .optional()
        .describe(
          "Pasted offer text when the offer did not come from an uploaded document.",
        ),
    }),
    handler: async ({ documentId, offerText }, ctx) => {
      // Preserve E9-S12 input_json shape: { documentId, hasOfferText }.
      // defineTool persists the full input by default — we don't override.

      if (!documentId && !offerText) {
        return safeError("offer_input_missing");
      }

      try {
        let signedUrl: string | null = null;
        let mediaType: string | null = null;
        let artifact: ArtifactRow | null = null;

        if (documentId) {
          const { data: artifactRaw } = await ctx.supabase
            .from("ai_artifacts")
            .select("*")
            .eq("id", documentId)
            .maybeSingle();
          const row = artifactRaw as ArtifactRow | null;
          if (!row || row.session_id !== session.id) {
            return safeError("offer_document_not_found");
          }
          artifact = row;
          if (row.payload_json.storagePath) {
            signedUrl = await mintSignedUrl(row.payload_json.storagePath, 3600);
            mediaType = row.payload_json.mime ?? "application/pdf";
          }
        }

        const ctxNote = buildContextNote(session.context);

        const content: Array<
          | { type: "text"; text: string }
          | { type: "file"; data: string; mediaType: string }
        > = [];
        if (signedUrl && mediaType) {
          content.push({ type: "file", data: signedUrl, mediaType });
        }
        content.push({
          type: "text",
          text: offerText
            ? `Offer terms the homeowner pasted:\n\n${offerText}\n\n${ctxNote}`
            : `Analyze the attached offer document. ${ctxNote}`,
        });

        const { object } = await generateObject({
          model: gateway(models.judge),
          schema: OfferAnalysisSchema,
          system: offerAnalyzerPrompt,
          messages: [{ role: "user", content }],
        });

        if (
          !object.friendlyTake ||
          object.friendlyTake.trim().length < 20 ||
          !object.disclaimer
        ) {
          return safeError("offer_analysis_failed");
        }

        const payload = {
          ...object,
          documentId: documentId ?? object.documentId,
        };

        if (artifact) {
          const merged = {
            ...artifact.payload_json,
            stage: "offer_analyzed",
            offerAnalysis: payload,
          };
          await ctx.supabase
            .from("ai_artifacts")
            .update({ payload_json: merged })
            .eq("id", artifact.id);
        } else {
          await ctx.supabase.from("ai_artifacts").insert({
            session_id: session.id,
            kind: "offer_analysis",
            payload_json: payload,
          });
        }

        return payload;
      } catch {
        return safeError("offer_analysis_failed");
      }
    },
  });
  return factory(session);
}

function buildContextNote(ctx: SessionContext): string {
  const lines: string[] = [];
  if (ctx.address) lines.push(`Subject property: ${ctx.address}.`);
  if (ctx.enrichment?.avmLow && ctx.enrichment?.avmHigh) {
    lines.push(
      `Seller's AVM range: $${ctx.enrichment.avmLow.toLocaleString(
        "en-US",
      )} to $${ctx.enrichment.avmHigh.toLocaleString("en-US")}.`,
    );
  } else {
    lines.push("Seller's AVM range is not available — set vsAvm.positionWord to 'avm-unavailable' and vsAvm.comment accordingly.");
  }
  if (ctx.timeline) lines.push(`Seller timeline pressure: ${ctx.timeline}.`);
  return lines.join(" ");
}

function safeError(code: string) {
  return {
    kind: "tool-error" as const,
    safe: true as const,
    code,
    message:
      "I couldn't put a full read on that offer together. Can you paste the key terms (price, close date, contingencies) so I can try again?",
    disclaimer: OFFER_ANALYSIS_DISCLAIMER,
  };
}
