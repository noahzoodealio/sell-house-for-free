import "server-only";

import type { AssignInput, PmPreview } from "./types";

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

// Stub email senders. E6-S4 replaces this file with a real Resend + React
// Email implementation under src/lib/email/** and deletes this file.
// Contract: never throw; always return a SendResult.

export async function sendSellerConfirmation(
  _input: SellerConfirmationInput,
): Promise<SendResult> {
  return { ok: true, messageId: "stub.seller" };
}

export async function sendTeamMemberNotification(
  _input: TeamMemberNotificationInput,
): Promise<SendResult> {
  return { ok: true, messageId: "stub.team" };
}
