import "server-only";

import type {
  AssignInput,
  AssignInputSeller,
  AssignInputOffer,
  PmPreview,
} from "@/lib/pm-service";

export interface SellerConfirmationProps {
  sellerFirstName: string;
  pmFirstName: string;
  pmPhotoUrl: string | null;
  contactWindowHours: number;
  referralCode: string;
  pillarHint: string | null;
  unsubscribeUrl: string;
}

export interface TeamMemberNotificationProps {
  teamMemberFirstName: string;
  submissionRef: string;
  sellerFullName: string;
  sellerEmail: string;
  sellerPhone: string | null;
  propertyAddress: string;
  propertyCity: string;
  propertyState: string;
  propertyZip: string;
  sellerPaths: string[];
  timeline: string | null;
  pillarHint: string | null;
  offers: Array<{
    path: string;
    lowCents: number | null;
    highCents: number | null;
  }>;
}

export function buildSellerConfirmationProps(params: {
  sellerFirstName: string;
  pm: PmPreview;
  contactWindowHours: number;
  referralCode: string;
  pillarHint: string | null;
  unsubscribeUrl: string;
}): SellerConfirmationProps {
  return {
    sellerFirstName: params.sellerFirstName,
    pmFirstName: params.pm.firstName,
    pmPhotoUrl: params.pm.photoUrl,
    contactWindowHours: params.contactWindowHours,
    referralCode: params.referralCode,
    pillarHint: params.pillarHint,
    unsubscribeUrl: params.unsubscribeUrl,
  };
}

export function buildTeamMemberNotificationProps(params: {
  teamMemberFirstName: string;
  submissionRef: string;
  seller: AssignInputSeller;
  pillarHint: string | null;
  offers: AssignInputOffer[];
}): TeamMemberNotificationProps {
  return {
    teamMemberFirstName: params.teamMemberFirstName,
    submissionRef: params.submissionRef,
    sellerFullName: params.seller.fullName,
    sellerEmail: params.seller.email,
    sellerPhone: params.seller.phone ?? null,
    propertyAddress: params.seller.address,
    propertyCity: params.seller.city,
    propertyState: params.seller.state,
    propertyZip: params.seller.zip,
    sellerPaths: params.seller.sellerPaths,
    timeline: params.seller.timeline ?? null,
    pillarHint: params.pillarHint,
    offers: params.offers.map((o) => ({
      path: o.path,
      lowCents: o.lowCents,
      highCents: o.highCents,
    })),
  };
}

// Used by both templates to format a cents → dollars range label. Kept
// here so the JSON-serialized shape that exercises snapshot tests is the
// only thing that has to change when copy evolves.
export function formatOfferRange(
  lowCents: number | null,
  highCents: number | null,
): string {
  if (lowCents == null && highCents == null) return "Pending";
  if (lowCents != null && highCents != null) {
    return `${formatUsd(lowCents)} – ${formatUsd(highCents)}`;
  }
  return formatUsd((lowCents ?? highCents) as number);
}

function formatUsd(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

// Re-export for callers that want a single source of truth for what
// fields make it into rendered output (S7 snapshot tests).
export type { AssignInput };
