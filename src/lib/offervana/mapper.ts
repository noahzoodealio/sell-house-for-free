import type { SellerFormDraft } from "@/lib/seller-form/types";

import type { CreateCustomerDto } from "./types";

const DEFAULT_BEDROOMS = 1;
const DEFAULT_BATHROOMS = 1;
const DEFAULT_SQUARE_FOOTAGE = 1500;
const DEFAULT_FLOORS = 1;
const ADDITIONAL_INFO_MAX_BYTES = 1024;

export function mapDraftToCreateCustomerDto(
  draft: SellerFormDraft,
): CreateCustomerDto {
  const { firstName, lastName } = splitName(draft.contact.name);
  const enriched =
    draft.enrichment?.status === "ok" ? draft.enrichment.details : undefined;

  const bedroomsCount =
    enriched?.bedrooms ?? draft.property.bedrooms ?? DEFAULT_BEDROOMS;
  const bathroomsCount =
    enriched?.bathrooms ?? draft.property.bathrooms ?? DEFAULT_BATHROOMS;
  const squareFootage =
    enriched?.squareFootage ??
    draft.property.squareFootage ??
    DEFAULT_SQUARE_FOOTAGE;
  const yearBuilt =
    enriched?.yearBuilt ?? draft.property.yearBuilt ?? null;

  return {
    name: firstName,
    surname: lastName,
    emailAddress: draft.contact.email ?? null,
    phoneNumber: draft.contact.phone ?? null,

    isEmailNotificationsEnabled: true,
    isSmsNotificationsEnabled: true,

    address1: draft.address.street1,
    address2: draft.address.street2 ?? null,
    city: draft.address.city,
    stateCd: draft.address.state,
    zipCode: draft.address.zip,
    country: "US",

    floors: DEFAULT_FLOORS,
    bedroomsCount,
    bathroomsCount,
    squareFootage,
    yearBuilt,
    coordinates: null,

    additionalInfo: buildAdditionalInfo(draft),
  };
}

function splitName(raw: string): { firstName: string; lastName: string } {
  const parts = raw.trim().split(/\s+/);
  const firstName = parts[0] ?? "";
  const lastName = parts.slice(1).join(" ");
  return { firstName, lastName };
}

function buildAdditionalInfo(draft: SellerFormDraft): string {
  // Everything the OuterAPI CreateCustomerDto has no home for —
  // PMs can still read this JSON string when triaging the lead.
  const info = {
    submissionId: draft.submissionId,
    schemaVersion: draft.schemaVersion,
    pillarHint: draft.pillarHint,
    cityHint: draft.cityHint,
    sellYourHouseFreePath:
      draft.pillarHint === "renovation-only" ? "renovation" : "cash",
    currentListingStatus:
      draft.currentListingStatus ?? draft.enrichment?.listingStatus ?? null,
    hasAgent: (draft as Record<string, unknown>).hasAgent ?? null,
    condition: draft.condition,
    consent: {
      tcpa: draft.consent.tcpa?.version ?? null,
      terms: draft.consent.terms?.version ?? null,
      privacy: draft.consent.privacy?.version ?? null,
      acceptedAt: draft.consent.tcpa?.acceptedAt ?? null,
    },
    enrichment: {
      status: draft.enrichment?.status ?? "idle",
      attomId: draft.enrichment?.attomId ?? null,
      mlsRecordId: draft.enrichment?.mlsRecordId ?? null,
    },
    attribution: {
      utmSource: draft.attribution.utmSource ?? null,
      utmMedium: draft.attribution.utmMedium ?? null,
      utmCampaign: draft.attribution.utmCampaign ?? null,
      utmTerm: draft.attribution.utmTerm ?? null,
      utmContent: draft.attribution.utmContent ?? null,
      gclid: draft.attribution.gclid ?? null,
      gbraid: draft.attribution.gbraid ?? null,
      wbraid: draft.attribution.wbraid ?? null,
      gadSource: draft.attribution.gadSource ?? null,
      gadCampaignId: draft.attribution.gadCampaignId ?? null,
      referrer: draft.attribution.referrer ?? null,
      entryPage: draft.attribution.entryPage ?? null,
      entryTimestamp: parseEntryTimestamp(draft.attribution.entryTimestamp),
    },
  };

  const serialized = JSON.stringify(info);
  if (serialized.length <= ADDITIONAL_INFO_MAX_BYTES) return serialized;

  // Over budget — drop attribution first (marketing context), keep the
  // submission identity + consent + enrichment.
  const trimmed = { ...info, attribution: null };
  const trimmedSerialized = JSON.stringify(trimmed);
  return trimmedSerialized.length <= ADDITIONAL_INFO_MAX_BYTES
    ? trimmedSerialized
    : trimmedSerialized.slice(0, ADDITIONAL_INFO_MAX_BYTES);
}

function parseEntryTimestamp(raw: string | undefined): number | null {
  if (!raw) return null;
  const ms = Date.parse(raw);
  return Number.isFinite(ms) ? ms : null;
}
