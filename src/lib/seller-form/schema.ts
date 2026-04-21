import { z } from "zod";

const AZ_ZIP_REGEX = /^8[5-6]\d{3}$/;

export const addressStepSchema = z.object({
  street1: z.string().trim().min(1, "Street is required").max(120),
  street2: z.string().trim().max(60).optional(),
  city: z.string().trim().min(1, "City is required").max(60),
  state: z.literal("AZ"),
  zip: z
    .string()
    .trim()
    .regex(AZ_ZIP_REGEX, "Enter a valid Arizona ZIP (85000–86999)"),
});

export const propertyStepSchema = z.object({
  propertyType: z.enum([
    "single-family",
    "townhouse",
    "condo",
    "multi-family",
    "manufactured",
    "land",
    "other",
  ]),
  bedrooms: z.number().int().min(0).max(20),
  bathrooms: z.number().min(0).max(20),
  squareFootage: z.number().int().min(100).max(50000).optional(),
  yearBuilt: z
    .number()
    .int()
    .min(1800)
    .max(new Date().getFullYear() + 2)
    .optional(),
  lotSize: z.number().min(0).max(1_000_000).optional(),
});

export const conditionStepSchema = z.object({
  condition: z.enum(["excellent", "good", "fair", "needs-work", "distressed"]),
  timeline: z.enum(["asap", "30-days", "60-days", "90-days", "flexible"]),
  reasonForSelling: z.string().trim().max(500).optional(),
});

export const contactStepSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(60),
  lastName: z.string().trim().min(1, "Last name is required").max(60),
  email: z.email("Enter a valid email address").max(254),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[\d\s().-]{10,20}$/, "Enter a valid phone number"),
});

const consentAgreementSchema = z.object({
  version: z.string().min(1),
  acceptedAt: z.string().datetime(),
  isPlaceholder: z.boolean().default(true),
});

export const consentStepSchema = z.object({
  tcpa: consentAgreementSchema,
  terms: consentAgreementSchema,
  privacy: consentAgreementSchema,
});

export const attributionSchema = z.object({
  utmSource: z.string().optional(),
  utmMedium: z.string().optional(),
  utmCampaign: z.string().optional(),
  utmTerm: z.string().optional(),
  utmContent: z.string().optional(),
  gclid: z.string().optional(),
  gbraid: z.string().optional(),
  wbraid: z.string().optional(),
  gadSource: z.string().optional(),
  gadCampaignId: z.string().optional(),
  referrer: z.string().optional(),
  entryPage: z.string().optional(),
  entryTimestamp: z.string().optional(),
});

export const enrichmentSlotSchema = z.object({
  status: z.enum(["idle", "loading", "ok", "error", "timeout"]),
  attomId: z.string().optional(),
  mlsRecordId: z.string().optional(),
  listingStatus: z
    .enum(["not-listed", "currently-listed", "previously-listed"])
    .optional(),
  details: z
    .object({
      bedrooms: z.number().optional(),
      bathrooms: z.number().optional(),
      squareFootage: z.number().optional(),
      yearBuilt: z.number().optional(),
      lotSize: z.number().optional(),
    })
    .optional(),
  photos: z
    .array(z.object({ url: z.url(), caption: z.string().optional() }))
    .optional(),
  fetchedAt: z.string().datetime().optional(),
});

export const fullSellerFormSchema = z
  .object({
    submissionId: z.uuid(),
    schemaVersion: z.literal(1),
    address: addressStepSchema,
    property: propertyStepSchema,
    condition: conditionStepSchema,
    contact: contactStepSchema,
    consent: consentStepSchema,
    pillarHint: z
      .enum(["listing", "cash-offers", "cash-plus-repairs", "renovation-only"])
      .optional(),
    cityHint: z.string().optional(),
    attribution: attributionSchema,
    currentListingStatus: z
      .enum(["not-listed", "currently-listed", "previously-listed"])
      .optional(),
    enrichment: enrichmentSlotSchema.optional(),
  })
  .refine((data) => data.address.state === "AZ", {
    message: "Service area is Arizona only",
    path: ["address", "state"],
  });

export const STEP_SCHEMAS = {
  address: addressStepSchema,
  property: propertyStepSchema,
  condition: conditionStepSchema,
  contact: contactStepSchema,
} as const;

export type StepSlug = keyof typeof STEP_SCHEMAS;

export type StepDataForSlug<S extends StepSlug> = z.infer<
  (typeof STEP_SCHEMAS)[S]
>;

export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; errors: Record<string, string[]> };

export function validateStep<S extends StepSlug>(
  step: S,
  data: unknown,
): ValidationResult<StepDataForSlug<S>> {
  const schema: z.ZodType = STEP_SCHEMAS[step];
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data as StepDataForSlug<S> };
  }
  const flat = z.flattenError(result.error);
  return {
    success: false,
    errors: flat.fieldErrors as Record<string, string[]>,
  };
}

export type FullValidationResult = ValidationResult<
  z.infer<typeof fullSellerFormSchema>
>;

export function validateAll(data: unknown): FullValidationResult {
  const result = fullSellerFormSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  const flat = z.flattenError(result.error);
  return {
    success: false,
    errors: flat.fieldErrors as Record<string, string[]>,
  };
}
