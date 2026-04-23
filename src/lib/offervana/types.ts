export interface NewClientDto {
  propData: AddPropInput;
  signUpData: SignUpData;
  surveyData: string | null;
  sendPrelims: boolean;
  customerLeadSource: number | null;
  submitterRole: number;
  isSellerSource: boolean | null;
  gppcParam?: string | null;
  entryPage?: string | null;
  entryTimestamp?: number | null;
  gclid?: string | null;
  gbraid?: string | null;
  wbraid?: string | null;
  gadSource?: string | null;
  gadCampaignId?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmTerm?: string | null;
  utmContent?: string | null;
  referrer?: string | null;
  sessionId?: string | null;
}

export interface AddPropInput {
  address1: string;
  address2?: string | null;
  city: string;
  country: string;
  stateCd: string;
  zipCode: string;
  gpsCoordinates?: string | null;
  customerId: number;
  propertyType?: string | null;
  dwellingType?: number | null;
  absenteeInd?: number | null;
  legalOne?: string | null;
  reoFlag?: boolean | null;
  auctionDate?: string | null;
}

export interface SignUpData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
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
