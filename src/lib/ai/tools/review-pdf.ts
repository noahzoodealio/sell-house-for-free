import "server-only";

import { generateObject } from "ai";
import { z } from "zod";

import { gateway, models } from "@/lib/ai/gateway";
import {
  DOC_SUMMARY_DISCLAIMER,
  pdfReviewerPrompt,
} from "@/lib/ai/prompts/pdf-reviewer";
import { redact } from "@/lib/ai/redact";
import { DocSummarySchema } from "@/lib/ai/schemas/doc-summary";
import {
  defineTool,
  type DefineToolSessionLike,
} from "@/lib/ai/tools/_define";
import { mintSignedUrl } from "@/lib/supabase/storage";

interface ReviewPdfSessionCtx extends DefineToolSessionLike {
  id: string;
}

interface DocArtifactRow {
  id: string;
  session_id: string;
  kind: string;
  payload_json: {
    stage: string;
    storagePath: string;
    originalName: string;
    mime: string;
    sizeBytes: number;
  };
}

export function reviewPdfTool(session: ReviewPdfSessionCtx) {
  const factory = defineTool({
    name: "review_pdf",
    description:
      "Review an uploaded PDF or image document (contract, offer, inspection, etc.) and produce a structured summary with key terms, concerns, and citations. Call when the user references an uploaded document by documentId.",
    inputSchema: z.object({
      documentId: z.string().uuid(),
    }),
    handler: async ({ documentId }, ctx) => {
      const { data: artifactRaw } = await ctx.supabase
        .from("ai_artifacts")
        .select("*")
        .eq("id", documentId)
        .maybeSingle();
      const artifact = artifactRaw as DocArtifactRow | null;

      if (!artifact || artifact.session_id !== session.id) {
        return {
          kind: "tool-error" as const,
          safe: true as const,
          message:
            "I couldn't find that document in this session. If you just uploaded it, try again in a few seconds.",
          disclaimer: DOC_SUMMARY_DISCLAIMER,
        };
      }

      try {
        const signedUrl = await mintSignedUrl(
          artifact.payload_json.storagePath,
          3600,
        );

        const { object } = await generateObject({
          model: gateway(models.judge),
          schema: DocSummarySchema,
          system: pdfReviewerPrompt,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "file",
                  data: signedUrl,
                  mediaType: artifact.payload_json.mime ?? "application/pdf",
                },
                {
                  type: "text",
                  text: `Summarize this document. originalName: ${artifact.payload_json.originalName}.`,
                },
              ],
            },
          ],
        });

        const summary = {
          ...object,
          documentId,
          disclaimer: object.disclaimer || DOC_SUMMARY_DISCLAIMER,
        };

        const merged = {
          ...artifact.payload_json,
          stage: "summarized",
          summary,
        };

        await ctx.supabase
          .from("ai_artifacts")
          .update({ payload_json: merged })
          .eq("id", artifact.id);

        return summary;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.warn(
          redact(
            JSON.stringify({
              level: "warn",
              event: "review_pdf_failed",
              sessionId: session.id,
              documentId,
              message,
            }),
          ),
        );
        return {
          kind: "tool-error" as const,
          safe: true as const,
          message:
            "I had trouble reading that document. Try re-uploading or paste the key terms.",
          disclaimer: DOC_SUMMARY_DISCLAIMER,
        };
      }
    },
  });
  return factory(session);
}
