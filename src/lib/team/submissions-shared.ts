export type SubmissionStatus =
  | "new"
  | "assigned"
  | "active"
  | "closed_won"
  | "closed_lost";

export interface SubmissionDetail {
  id: string;
  submissionId: string;
  referralCode: string;
  status: SubmissionStatus;
  pmUserId: string | null;
  pmFirstName: string | null;
  pmLastName: string | null;
  sellerId: string;
  sellerFirstName: string;
  sellerLastName: string;
  sellerEmail: string;
  sellerPhone: string | null;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  zip: string;
  beds: number | null;
  baths: number | null;
  sqft: number | null;
  yearBuilt: number | null;
  sellerPaths: string[];
  pillarHint: string | null;
  timeline: string | null;
  assignedAt: string | null;
  createdAt: string;
}

export interface SubmissionOffer {
  id: string;
  path: string;
  lowCents: number | null;
  highCents: number | null;
  teamNote: string | null;
  createdAt: string;
}

export interface ActivityEvent {
  source: "team_activity" | "messages" | "assignment_events";
  id: string;
  createdAt: string;
  actorAuthUserId: string | null;
  actorName: string | null;
  eventType: string;
  summary: string;
  data: Record<string, unknown>;
}

const SELLER_PATH_LABELS: Record<string, string> = {
  cash: "Cash Offer",
  cash_plus: "Cash + Listing",
  snml: "Sell Now, Move Later",
  list: "Traditional Listing",
};

export function labelSellerPath(path: string): string {
  return SELLER_PATH_LABELS[path] ?? path;
}

export const STATUS_ADVANCE_MAP: Record<SubmissionStatus, SubmissionStatus[]> = {
  new: ["assigned"],
  assigned: ["active"],
  active: ["closed_won", "closed_lost"],
  closed_won: [],
  closed_lost: [],
};

export const STATUS_LABELS: Record<SubmissionStatus, string> = {
  new: "New",
  assigned: "Assigned",
  active: "Active",
  closed_won: "Closed (Won)",
  closed_lost: "Closed (Lost)",
};
