import "server-only";

import type { AssignInput, PmPreview } from "@/lib/pm-service";

export interface SendResult {
  ok: boolean;
  messageId?: string;
  error?: string;
}

export interface SellerConfirmationInput {
  submissionId: string;
  referralCode: string;
  to: string;
  sellerFirstName: string;
  pm: PmPreview;
  contactWindowHours: number;
  pillarHint: string | null;
}

export interface TeamMemberNotificationInput {
  submissionId: string;
  referralCode: string;
  to: string;
  teamMemberFirstName: string;
  seller: AssignInput["seller"];
  pillarHint: string | null;
  offers: AssignInput["offers"];
}
