import "server-only";

import { generateObject, tool } from "ai";
import { z } from "zod";

import { gateway, models } from "@/lib/ai/gateway";
import {
  DOC_SUMMARY_DISCLAIMER,
  pdfReviewerPrompt,
} from "@/lib/ai/prompts/pdf-reviewer";
import { redact } from "@/lib/ai/redact";
import { DocSummarySchema } from "@/lib/ai/schemas/doc-summary";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { mintSignedUrl } from "@/lib/supabase/storage";

interface ReviewPdfSessionCtx {
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
  return tool({
    description:
      "Review an uploaded PDF or image document (contract, offer, inspection, etc.) and produce a structured summary with key terms, concerns, and citations. Call when the user references an uploaded document by documentId.",
    inputSchema: z.object({
      documentId: z.string().uuid(),
    }),
    execute: async ({ documentId }) => {
      const supabase = getSupabaseAdmin();
      const startedAt = Date.now();

      const { data: toolRunData, error: toolRunError } = await supabase
        .from("ai_tool_runs")
        .insert({
          session_id: session.id,
          tool_name: "review_pdf",
          status: "running",
          input_json: { documentId },
        })
        .select("id")
        .single();

      const toolRunId = (toolRunData as { id: string } | null)?.id ?? null;
      if (toolRunError) {
        console.warn(
          redact(
            JSON.stringify({
              level: "warn",
              kind: "review_pdf.tool_run.insert_failed",
              message: toolRunError.message,
            }),
          ),
        );
      }

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
        const { data: artifactRaw, error: artifactError } = await supabase
          .from("ai_artifacts")
          .select("*")
          .eq("id", documentId)
          .maybeSingle();

        if (artifactError || !artifactRaw) {
          await finalize("error", null, {
            reason: "artifact_not_found",
          });
          return safeToolError("document_not_found");
        }

        const artifact = artifactRaw as DocArtifactRow;
        if (artifact.session_id !== session.id) {
          await finalize("error", null, {
            reason: "session_mismatch",
          });
          return safeToolError("document_not_found");
        }

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
                  mediaType: artifact.payload_json.mime,
                },
                {
                  type: "text",
                  text: `Summarize this document. The documentId is ${documentId} and the original filename was ${artifact.payload_json.originalName}. Your response's documentId field must equal ${documentId}, and originalName must equal the filename I just gave you.`,
                },
              ],
            },
          ],
        });

        if (!object.disclaimer || object.disclaimer.trim().length === 0) {
          await finalize("error", null, { reason: "missing_disclaimer" });
          return safeToolError("document_review_failed");
        }

        const mergedPayload = {
          ...artifact.payload_json,
          stage: "summarized",
          summary: object,
        };

        await supabase
          .from("ai_artifacts")
          .update({ payload_json: mergedPayload })
          .eq("id", documentId);

        await finalize("ok", object);

        return {
          summaryId: documentId,
          headline: object.headline,
          concerns: object.concerns,
          citations: object.citations,
          disclaimer: object.disclaimer,
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        await finalize("error", null, { message: redact(message) });
        return safeToolError("document_review_failed");
      }
    },
  });
}

function safeToolError(code: string) {
  return {
    kind: "tool-error" as const,
    safe: true,
    code,
    message:
      "I wasn't able to read that document. Please try again or share the key terms directly.",
    disclaimer: DOC_SUMMARY_DISCLAIMER,
  };
}
