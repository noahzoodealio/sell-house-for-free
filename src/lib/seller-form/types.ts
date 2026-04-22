import type { z } from "zod";
import type {
  addressStepSchema,
  attributionSchema,
  conditionStepSchema,
  consentStepSchema,
  contactStepSchema,
  enrichmentSlotSchema,
  fullSellerFormSchema,
  propertyStepSchema,
} from "./schema";

export type { CurrentListingStatus, HasAgent } from "./schema";

export type AddressFields = z.infer<typeof addressStepSchema>;
export type PropertyFields = z.infer<typeof propertyStepSchema>;
export type ConditionFields = z.infer<typeof conditionStepSchema>;
export type ContactFields = z.infer<typeof contactStepSchema>;
export type ConsentFields = z.infer<typeof consentStepSchema>;
export type AttributionFields = z.infer<typeof attributionSchema>;
export type EnrichmentSlot = z.infer<typeof enrichmentSlotSchema>;
export type SellerFormDraft = z.infer<typeof fullSellerFormSchema>;

export const STEP_SLUGS = ["address", "property", "condition", "contact"] as const;
export type StepSlug = (typeof STEP_SLUGS)[number];

export const PILLAR_SLUGS = [
  "listing",
  "cash-offers",
  "cash-plus-repairs",
  "renovation-only",
] as const;
export type PillarSlug = (typeof PILLAR_SLUGS)[number];

export type SubmitState =
  | { ok: true; submissionId: string; referralCode?: string }
  | { ok: false; errors: Record<string, string[]> };

export const SUBMIT_STATE_INITIAL: SubmitState = {
  ok: false,
  errors: {},
};
