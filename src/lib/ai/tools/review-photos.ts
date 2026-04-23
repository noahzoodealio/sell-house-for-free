import "server-only";

import { generateObject, tool } from "ai";
import { z } from "zod";

import { gateway, models } from "@/lib/ai/gateway";
import {
  PHOTO_ASSESSMENT_DISCLAIMER,
  photoReviewerPrompt,
} from "@/lib/ai/prompts/photo-reviewer";
import {
  PhotoAssessmentSchema,
  type PhotoAssessment,
} from "@/lib/ai/schemas/photo-assessment";

const MAX_PHOTOS_PER_COMP = 6;

export interface ReviewPhotosInput {
  mlsRecordId: string;
  photoUrls: string[];
}

export async function reviewPhotosImpl(
  input: ReviewPhotosInput,
): Promise<PhotoAssessment> {
  const photos = input.photoUrls.slice(0, MAX_PHOTOS_PER_COMP);
  if (photos.length === 0) {
    return {
      mlsRecordId: input.mlsRecordId,
      condition: "unknown",
      notableFeatures: [],
      concerns: [],
      disclaimer: PHOTO_ASSESSMENT_DISCLAIMER,
    };
  }

  const { object } = await generateObject({
    model: gateway(models.vision),
    schema: PhotoAssessmentSchema,
    system: photoReviewerPrompt,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Assess this comp. mlsRecordId: ${input.mlsRecordId}. Set mlsRecordId in your response to exactly this value.`,
          },
          ...photos.map((url) => ({
            type: "image" as const,
            image: new URL(url),
          })),
        ],
      },
    ],
  });

  return {
    ...object,
    mlsRecordId: input.mlsRecordId,
    disclaimer: object.disclaimer || PHOTO_ASSESSMENT_DISCLAIMER,
  };
}

interface ReviewPhotosSessionCtx {
  id: string;
}

export function reviewPhotosTool(_session: ReviewPhotosSessionCtx) {
  return tool({
    description:
      "Assess up to six listing photos for a single comparable property and produce a condition rating + notable features + concerns. Standalone tool surface for the orchestrator; also reused as workflow step 3 inside start_comp_job.",
    inputSchema: z.object({
      mlsRecordId: z.string().min(1),
      photoUrls: z.array(z.string().url()).max(MAX_PHOTOS_PER_COMP),
    }),
    execute: async (args) => {
      try {
        return await reviewPhotosImpl(args);
      } catch (err) {
        return {
          kind: "tool-error" as const,
          safe: true,
          message:
            "I couldn't read those comp photos. The condition is treated as 'unknown' for this run.",
          fallback: {
            mlsRecordId: args.mlsRecordId,
            condition: "unknown" as const,
            notableFeatures: [],
            concerns: [],
            disclaimer: PHOTO_ASSESSMENT_DISCLAIMER,
          },
          detail: err instanceof Error ? err.message : String(err),
        };
      }
    },
  });
}
