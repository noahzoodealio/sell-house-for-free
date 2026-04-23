import { z } from "zod";

export const KeyTermSchema = z.object({
  label: z.string().min(1),
  value: z.string().min(1),
  pageRef: z.number().int().positive().optional(),
});

export const ConcernSchema = z.object({
  severity: z.enum(["info", "caution", "warn"]),
  note: z.string().min(1),
  pageRef: z.number().int().positive().optional(),
});

export const CitationSchema = z.object({
  pageRef: z.number().int().positive(),
  excerpt: z.string().min(1),
});

export const DocSummarySchema = z.object({
  documentId: z.string().uuid(),
  originalName: z.string().min(1),
  headline: z.string().min(1),
  keyTerms: z.array(KeyTermSchema).min(1),
  concerns: z.array(ConcernSchema),
  citations: z.array(CitationSchema),
  disclaimer: z.string().min(1),
});

export type DocSummary = z.infer<typeof DocSummarySchema>;
