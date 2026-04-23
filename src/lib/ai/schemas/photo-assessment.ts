import { z } from "zod";

export const PhotoAssessmentSchema = z.object({
  mlsRecordId: z.string().min(1),
  condition: z.enum(["poor", "fair", "good", "excellent", "unknown"]),
  notableFeatures: z.array(z.string().min(1)),
  concerns: z.array(z.string().min(1)),
  disclaimer: z.string().min(1),
});

export type PhotoAssessment = z.infer<typeof PhotoAssessmentSchema>;
