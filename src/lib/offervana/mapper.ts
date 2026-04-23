import type { SellerFormDraft } from "@/lib/seller-form/types";

import type { AddPropInput, NewClientDto, SignUpData } from "./types";

export const CUSTOMER_LEAD_SOURCE_SELL_YOUR_HOUSE_FREE = 13;
export const CUSTOMER_LEAD_SOURCE_SELL_YOUR_HOUSE_FREE_RENOVATION = 14;
export const SUBMITTER_ROLE_HOMEOWNER = 0;

export function mapDraftToNewClientDto(draft: SellerFormDraft): NewClientDto {
  const propData = buildPropData(draft);
  const signUpData = buildSignUpData(draft);
  const surveyData = buildSurveyData(draft);
  const attribution = buildAttribution(draft);

  return {
    PropData: propData,
    SignUpData: signUpData,
    SurveyData: surveyData,
    SendPrelims: true,
    CustomerLeadSource: pickLeadSource(draft),
    SubmitterRole: SUBMITTER_ROLE_HOMEOWNER,
    IsSellerSource: true,
    ...attribution,
  };
}

function buildPropData(draft: SellerFormDraft): AddPropInput {
  const { address, property, enrichment } = draft;
  const enriched = enrichment?.status === "ok" ? enrichment.details : undefined;

  const street = address.street2
    ? `${address.street1} ${address.street2}`
    : address.street1;

  return {
    PropertyAddress: street,
    PropertyCity: address.city,
    PropertyState: address.state,
    PropertyZip: address.zip,
    PropertyBedrooms: enriched?.bedrooms ?? property.bedrooms ?? null,
    PropertyBathrooms: enriched?.bathrooms ?? property.bathrooms ?? null,
    PropertySquareFootage:
      enriched?.squareFootage ?? property.squareFootage ?? null,
    PropertyYearBuilt: enriched?.yearBuilt ?? property.yearBuilt ?? null,
    PropertyType: property.propertyType ?? null,
    AttomId: enrichment?.attomId ?? null,
    MlsRecordId: enrichment?.mlsRecordId ?? null,
  };
}

function buildSignUpData(draft: SellerFormDraft): SignUpData {
  return {
    Name: draft.contact.firstName,
    LastName: draft.contact.lastName,
    EmailAddress: draft.contact.email,
    PhoneNumber: draft.contact.phone,
  };
}

function buildSurveyData(draft: SellerFormDraft): string {
  const payload = {
    submissionId: draft.submissionId,
    schemaVersion: draft.schemaVersion,
    pillarHint: draft.pillarHint,
    cityHint: draft.cityHint,
    currentListingStatus:
      draft.currentListingStatus ??
      draft.enrichment?.listingStatus ??
      null,
    condition: draft.condition,
    consent: {
      tcpa: draft.consent.tcpa.version,
      terms: draft.consent.terms.version,
      privacy: draft.consent.privacy.version,
      acceptedAt: draft.consent.tcpa.acceptedAt,
    },
    enrichmentStatus: draft.enrichment?.status ?? "idle",
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
    GppcParam: null,
    EntryPage: a.entryPage ?? null,
    EntryTimestamp: parseEntryTimestamp(a.entryTimestamp),
    Gclid: a.gclid ?? null,
    Gbraid: a.gbraid ?? null,
    Wbraid: a.wbraid ?? null,
    GadSource: a.gadSource ?? null,
    GadCampaignId: a.gadCampaignId ?? null,
    UtmSource: a.utmSource ?? null,
    UtmMedium: a.utmMedium ?? null,
    UtmCampaign: a.utmCampaign ?? null,
    UtmTerm: a.utmTerm ?? null,
    UtmContent: a.utmContent ?? null,
    Referrer: a.referrer ?? null,
    SessionId: null,
  };
}

function parseEntryTimestamp(raw: string | undefined): number | null {
  if (!raw) return null;
  const ms = Date.parse(raw);
  return Number.isFinite(ms) ? ms : null;
}
