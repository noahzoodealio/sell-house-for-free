/**
 * Types for the Offervana OuterAPI Customers endpoint.
 * See https://sellfreeai.zoodealio.net/swagger/v1/swagger.json — schema
 * `Offervana.OuterApi.Customers.Dto.CreateCustomerDto`.
 */

export interface CreateCustomerDto {
  // Required identity fields.
  name: string;
  surname: string;
  // Required routing + preferences.
  isEmailNotificationsEnabled: boolean;
  isSmsNotificationsEnabled: boolean;
  // Required address.
  address1: string;
  city: string;
  stateCd: string;
  zipCode: string;
  country: string;
  // Required property fact.
  floors: number;

  // Contact (nullable on the wire — included when available).
  emailAddress?: string | null;
  password?: string | null;
  phoneNumber?: string | null;

  // Referral + ABP tenant hooks.
  refLink?: string | null;
  refId?: number | null;

  // Address extension.
  address2?: string | null;

  // Property facts (flat — these replaced the nested surveyData blob).
  bedroomsCount?: number;
  bathroomsCount?: number;
  squareFootage?: number;
  parkingSpaces?: string | null;
  yearBuilt?: number | null;
  coordinates?: string | null;
  estimatedValue?: number | null;
  realValue?: number | null;

  // Residential context (all nullable — pass-through from the draft when present).
  isTenantRentalLeasing?: boolean | null;
  rentalMonth?: number | null;
  rentalYear?: number | null;
  isPrimaryResidence?: boolean | null;
  sewerSeptic?: string | null;
  isSolarPanels?: boolean | null;
  solarLeaseOwned?: string | null;
  solarEstimatedValue?: number | null;
  isPool?: boolean | null;
  poolType?: string | null;

  // Catch-all for everything the DTO doesn't have a home for
  // (pillar hint, consent versions, attribution, enrichment ids).
  additionalInfo?: string | null;

  // Population + optional gallery.
  population?: number | null;
  imageUrls?: string[] | null;
}

export interface OffervanaOkPayload {
  customerId: number;
  referralCode: string;
  propertyId: number | null;
}

export type SubmitResult =
  | { kind: "ok"; payload: OffervanaOkPayload; attempts: number }
  | {
      kind: "email-conflict";
      detail: { status: number; body: unknown; message: string };
      attempts: number;
    }
  | {
      kind: "permanent-failure";
      detail: { status: number; body: unknown; message: string };
      attempts: number;
    }
  | {
      kind: "transient-exhausted";
      detail: { lastStatus: number | null; lastError: string };
      attempts: number;
    }
  | {
      kind: "malformed-response";
      detail: { status: number; body: unknown; message: string };
      attempts: number;
    };
