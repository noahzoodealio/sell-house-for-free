import "server-only";

import type { SubmissionOfferPath } from "@/lib/supabase/schema";

export interface AssignInputSeller {
  fullName: string;
  email: string;
  phone?: string;
  address: string;
  addressLine2?: string;
  city: string;
  state: string;
  zip: string;
  beds?: number;
  baths?: number;
  sqft?: number;
  yearBuilt?: number;
  timeline?: string;
  sellerPaths: string[];
  tcpaVersion?: string;
  tcpaAcceptedAt?: string;
  termsVersion?: string;
  termsAcceptedAt?: string;
}

export interface AssignInputOffer {
  path: SubmissionOfferPath;
  lowCents: number | null;
  highCents: number | null;
  rawPayload: Record<string, unknown> | null;
}

export interface AssignInput {
  submissionId: string;
  referralCode: string;
  customerId: number;
  userId: number | null;
  propertyId: number | null;
  pillarHint: string | null;
  seller: AssignInputSeller;
  offers: AssignInputOffer[];
}

export interface PmPreview {
  firstName: string;
  photoUrl: string | null;
}

export type AssignResultReason =
  | "no_active_pms"
  | "timeout"
  | "db_error"
  | "profile_failed"
  | "submission_failed"
  | "unexpected";

export type AssignResult =
  | {
      ok: true;
      pmUserId: string;
      pmFirstName: string;
      pmPhotoUrl: string | null;
      profileCreated: boolean;
      emailsEnqueued: { seller: boolean; team: boolean };
    }
  | {
      ok: false;
      reason: AssignResultReason;
      sentryEventId?: string;
    };

export interface AssignmentView {
  submission: {
    submissionId: string;
    referralCode: string;
    assignedAt: string | null;
  };
  pmPreview: PmPreview | null;
}
