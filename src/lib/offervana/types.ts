export interface NewClientDto {
  PropData: AddPropInput;
  SignUpData: SignUpData;
  SurveyData: string | null;
  SendPrelims: boolean;
  CustomerLeadSource: number | null;
  SubmitterRole: number;
  IsSellerSource: boolean | null;
  GppcParam?: string | null;
  EntryPage?: string | null;
  EntryTimestamp?: number | null;
  Gclid?: string | null;
  Gbraid?: string | null;
  Wbraid?: string | null;
  GadSource?: string | null;
  GadCampaignId?: string | null;
  UtmSource?: string | null;
  UtmMedium?: string | null;
  UtmCampaign?: string | null;
  UtmTerm?: string | null;
  UtmContent?: string | null;
  Referrer?: string | null;
  SessionId?: string | null;
}

export interface AddPropInput {
  PropertyAddress: string;
  PropertyCity: string;
  PropertyState: string;
  PropertyZip: string;
  PropertyCounty?: string | null;
  PropertyBedrooms?: number | null;
  PropertyBathrooms?: number | null;
  PropertySquareFootage?: number | null;
  PropertyYearBuilt?: number | null;
  PropertyType?: string | null;
  AttomId?: string | null;
  MlsRecordId?: string | null;
  [key: string]: unknown;
}

export interface SignUpData {
  Name: string;
  LastName: string;
  EmailAddress: string;
  PhoneNumber: string;
  [key: string]: unknown;
}

export interface OffervanaOkPayload {
  customerId: number;
  userId: number;
  referralCode: string;
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
