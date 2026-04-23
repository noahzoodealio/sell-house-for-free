import type { SellerFormDraft } from "@/lib/seller-form/types";

import type { AddPropInput, NewClientDto, SignUpData } from "./types";

export const CUSTOMER_LEAD_SOURCE_SELL_YOUR_HOUSE_FREE = 13;
export const CUSTOMER_LEAD_SOURCE_SELL_YOUR_HOUSE_FREE_RENOVATION = 14;
export const SUBMITTER_ROLE_HOMEOWNER = 0;

export function mapDraftToNewClientDto(draft: SellerFormDraft): NewClientDto {
  return {
    propData: buildPropData(draft),
    signUpData: buildSignUpData(draft),
    surveyData: buildSurveyData(draft),
    sendPrelims: true,
    customerLeadSource: pickLeadSource(draft),
    submitterRole: SUBMITTER_ROLE_HOMEOWNER,
    isSellerSource: true,
    ...buildAttribution(draft),
  };
}

function buildPropData(draft: SellerFormDraft): AddPropInput {
  const { address, property, enrichment } = draft;
  return {
    address1: address.street1,
    address2: address.street2 ?? null,
    city: address.city,
    country: "US",
    stateCd: address.state,
    zipCode: address.zip,
    gpsCoordinates: null,
    customerId: 0,
    propertyType: property.propertyType ?? null,
    dwellingType: null,
    absenteeInd: null,
    legalOne: enrichment?.attomId ?? null,
    reoFlag: null,
    auctionDate: null,
  };
}

function buildSignUpData(draft: SellerFormDraft): SignUpData {
  const [firstName, ...rest] = draft.contact.name.trim().split(/\s+/);
  return {
    firstName: firstName ?? "",
    lastName: rest.join(" "),
    email: draft.contact.email,
    phone: draft.contact.phone,
  };
}

function buildSurveyData(draft: SellerFormDraft): string {
  const enriched = draft.enrichment?.status === "ok"
    ? draft.enrichment.details
    : undefined;

  // Offervana reads bedrooms/bathrooms/squareFootage directly off the deserialized
  // dynamic — they must live at the top level and must be non-null numbers (the
  // Offervana binder casts to decimal). Architecture §3.1.3.
  const bedrooms = enriched?.bedrooms ?? draft.property.bedrooms ?? 1;
  const bathrooms = enriched?.bathrooms ?? draft.property.bathrooms ?? 1;
  const squareFootage =
    enriched?.squareFootage ?? draft.property.squareFootage ?? 1500;

  const payload = {
    submissionId: draft.submissionId,
    schemaVersion: draft.schemaVersion,
    bedrooms,
    bathrooms,
    squareFootage,
    yearBuilt: enriched?.yearBuilt ?? draft.property.yearBuilt ?? null,
    lotSize: enriched?.lotSize ?? draft.property.lotSize ?? null,
    pillarHint: draft.pillarHint,
    cityHint: draft.cityHint,
    currentListingStatus:
      draft.currentListingStatus ??
      draft.enrichment?.listingStatus ??
      null,
    condition: draft.condition,
    attomId: draft.enrichment?.attomId ?? null,
    mlsRecordId: draft.enrichment?.mlsRecordId ?? null,
    consent: {
      tcpa: draft.consent.tcpa?.version ?? null,
      terms: draft.consent.terms?.version ?? null,
      privacy: draft.consent.privacy?.version ?? null,
      acceptedAt: draft.consent.tcpa?.acceptedAt ?? null,
    },
    enrichmentStatus: draft.enrichment?.status ?? "idle",
    sellYourHouseFreePath:
      draft.pillarHint === "renovation-only" ? "renovation" : "cash",
  };
  return JSON.stringify(payload);
}

function pickLeadSource(draft: SellerFormDraft): number {
  if (draft.pillarHint === "renovation-only") {
    return CUSTOMER_LEAD_SOURCE_SELL_YOUR_HOUSE_FREE_RENOVATION;
  }
  return CUSTOMER_LEAD_SOURCE_SELL_YOUR_HOUSE_FREE;
}

function buildAttribution(draft: SellerFormDraft) {
  const a = draft.attribution;
  return {
    gppcParam: null,
    entryPage: a.entryPage ?? null,
    entryTimestamp: parseEntryTimestamp(a.entryTimestamp),
    gclid: a.gclid ?? null,
    gbraid: a.gbraid ?? null,
    wbraid: a.wbraid ?? null,
    gadSource: a.gadSource ?? null,
    gadCampaignId: a.gadCampaignId ?? null,
    utmSource: a.utmSource ?? null,
    utmMedium: a.utmMedium ?? null,
    utmCampaign: a.utmCampaign ?? null,
    utmTerm: a.utmTerm ?? null,
    utmContent: a.utmContent ?? null,
    referrer: a.referrer ?? null,
    sessionId: null,
  };
}

function parseEntryTimestamp(raw: string | undefined): number | null {
  if (!raw) return null;
  const ms = Date.parse(raw);
  return Number.isFinite(ms) ? ms : null;
}
