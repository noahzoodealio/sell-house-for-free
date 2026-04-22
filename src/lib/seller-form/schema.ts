import { z } from "zod";

const AZ_ZIP_REGEX = /^8[5-6]\d{3}$/;

export const addressStepSchema = z.object({
  street1: z
    .string()
    .trim()
    .min(3, "Please enter your street address")
    .max(120),
  street2: z.string().trim().max(60).optional(),
  city: z.string().trim().min(1, "Please enter your city").max(60),
  state: z.literal("AZ", "Arizona is the only service area right now"),
  zip: z
    .string()
    .trim()
    .regex(AZ_ZIP_REGEX, "Enter a valid Arizona ZIP (85000–86999)"),
});

export const propertyStepSchema = z.object({
  propertyType: z
    .enum([
      "single-family",
      "townhouse",
      "condo",
      "multi-family",
      "manufactured",
      "land",
      "other",
    ])
    .optional(),
  bedrooms: z.number().int().min(0).max(20).optional(),
  bathrooms: z
    .number()
    .min(0)
    .max(20)
    .multipleOf(0.5, "Half-bath increments only (e.g. 2.5)")
    .optional(),
  squareFootage: z.number().int().min(100).max(50000).optional(),
  yearBuilt: z
    .number()
    .int()
    .min(1850, "Year must be 1850 or later")
    .max(new Date().getFullYear(), "Year cannot be in the future")
    .optional(),
  lotSize: z.number().int().min(0).max(5_000_000).optional(),
});

export const CURRENT_LISTING_STATUS_VALUES = [
  "second-opinion",
  "ready-to-switch",
  "just-exploring",
] as const;
export type CurrentListingStatus = (typeof CURRENT_LISTING_STATUS_VALUES)[number];

export const HAS_AGENT_VALUES = ["yes", "no", "not-sure"] as const;
export type HasAgent = (typeof HAS_AGENT_VALUES)[number];

export const CONDITION_VALUES = ["move-in", "needs-work", "major-reno"] as const;
export const TIMELINE_VALUES = [
  "0-3mo",
  "3-6mo",
  "6-12mo",
  "exploring",
] as const;

export const conditionStepSchema = z.object({
  currentCondition: z.enum(CONDITION_VALUES, {
    error: "Please pick your home's current condition",
  }),
  timeline: z.enum(TIMELINE_VALUES, {
    error: "Please pick a target timeline",
  }),
  motivation: z.string().trim().max(500).optional(),
});

export const contactStepSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Please enter your full name")
    .max(120),
  email: z.email("Enter a valid email address").max(254),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[\d\s().-]{10,20}$/, "Enter a valid phone number"),
});

// Consent is now implicit via the "By continuing you agree to…" footnote on
// the contact step — the checkbox block was removed. The schema keeps the
// fields so existing drafts/server code doesn't break, but they're all
// optional and the form never collects them from the UI.
const consentAgreementSchema = z.object({
  version: z.string().min(1),
  acceptedAt: z.string().datetime(),
  isPlaceholder: z.boolean().default(true),
});

export const consentStepSchema = z.object({
  tcpa: consentAgreementSchema.optional(),
  terms: consentAgreementSchema.optional(),
  privacy: consentAgreementSchema.optional(),
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
  status: z.enum([
    "idle",
    "loading",
    "ok",
    "ok-partial",
    "no-match",
    "out-of-area",
    "timeout",
    "error",
  ]),
  attomId: z.string().optional(),
  mlsRecordId: z.string().optional(),
  listingStatus: z
    .enum(["not-listed", "currently-listed", "previously-listed"])
    .optional(),
  rawListingStatus: z.string().optional(),
  listingStatusDisplay: z.string().optional(),
  // Listing-level MLS metadata surfaced on the "we found your listing" card.
  // Optional — only populated when MLS returned a currently-listed match.
  listPrice: z.number().optional(),
  previousListPrice: z.number().optional(),
  daysOnMarket: z.number().optional(),
  listedAt: z.string().optional(),
  photosCount: z.number().optional(),
  // Full lifecycle history (newest first) — drives the activity timeline.
  // Each entry is a prior-state snapshot from the MLS search response.
  history: z
    .array(
      z.object({
        status: z.string(),
        statusChangeDate: z.string().optional(),
        listPrice: z.number().optional(),
      }),
    )
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
  sources: z.array(z.enum(["mls", "attom"])).optional(),
  // True when ATTOM propType indicates the address is part of a multi-unit
  // building (condo, apartment, duplex, etc.) — the form uses this to force
  // the seller to fill in the Apt/Unit field before advancing.
  isMultiUnit: z.boolean().optional(),
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
      .enum(CURRENT_LISTING_STATUS_VALUES)
      .optional(),
    hasAgent: z
      .enum(HAS_AGENT_VALUES, { error: "Invalid agent-involvement value." })
      .optional(),
    enrichment: enrichmentSlotSchema.optional(),
  })
  .refine((data) => data.address.state === "AZ", {
    message: "Service area is Arizona only",
    path: ["address", "state"],
  });

// `mls` is a UI-only interstitial after property details — it carries no form
// fields of its own (hasAgent / currentListingStatus are session state
// forwarded via hidden fields). An empty passthrough schema keeps validateStep
// type-safe without introducing a second code path for stepless advancement.
const mlsStepSchema = z.object({}).passthrough();

export const STEP_SCHEMAS = {
  address: addressStepSchema,
  property: propertyStepSchema,
  mls: mlsStepSchema,
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
