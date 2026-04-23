import { describe, expect, it } from "vitest";
import type { SellerFormDraft } from "@/lib/seller-form/types";
import {
  CUSTOMER_LEAD_SOURCE_SELL_YOUR_HOUSE_FREE,
  CUSTOMER_LEAD_SOURCE_SELL_YOUR_HOUSE_FREE_RENOVATION,
  SUBMITTER_ROLE_HOMEOWNER,
  mapDraftToNewClientDto,
} from "@/lib/offervana/mapper";

function baseDraft(overrides: Partial<SellerFormDraft> = {}): SellerFormDraft {
  const base: SellerFormDraft = {
    submissionId: "11111111-1111-4111-8111-111111111111",
    schemaVersion: 1,
    address: {
      street1: "123 Main St",
      city: "Phoenix",
      state: "AZ",
      zip: "85001",
    },
    property: {
      propertyType: "single-family",
      bedrooms: 3,
      bathrooms: 2,
      squareFootage: 1800,
      yearBuilt: 1995,
    },
    condition: {
      currentCondition: "move-in",
      timeline: "0-3mo",
    },
    contact: {
      firstName: "Jane",
      lastName: "Doe",
      email: "jane@example.com",
      phone: "+16025551234",
    },
    consent: {
      tcpa: {
        version: "tcpa-2026-04",
        acceptedAt: "2026-04-23T15:00:00.000Z",
        isPlaceholder: true,
      },
      terms: {
        version: "terms-2026-04",
        acceptedAt: "2026-04-23T15:00:00.000Z",
        isPlaceholder: true,
      },
      privacy: {
        version: "privacy-2026-04",
        acceptedAt: "2026-04-23T15:00:00.000Z",
        isPlaceholder: true,
      },
    },
    attribution: {},
    pillarHint: "cash-offers",
  };
  return { ...base, ...overrides };
}

describe("mapDraftToNewClientDto", () => {
  it("maps the cash path to CustomerLeadSource=13 with homeowner role + seller source flags", () => {
    const dto = mapDraftToNewClientDto(baseDraft());
    expect(dto.CustomerLeadSource).toBe(
      CUSTOMER_LEAD_SOURCE_SELL_YOUR_HOUSE_FREE,
    );
    expect(dto.SubmitterRole).toBe(SUBMITTER_ROLE_HOMEOWNER);
    expect(dto.IsSellerSource).toBe(true);
    expect(dto.SendPrelims).toBe(true);
  });

  it("maps the renovation path to CustomerLeadSource=14", () => {
    const dto = mapDraftToNewClientDto(
      baseDraft({ pillarHint: "renovation-only" }),
    );
    expect(dto.CustomerLeadSource).toBe(
      CUSTOMER_LEAD_SOURCE_SELL_YOUR_HOUSE_FREE_RENOVATION,
    );
  });

  it("defaults listing path + missing pillarHint to lead source 13", () => {
    expect(
      mapDraftToNewClientDto(baseDraft({ pillarHint: "listing" }))
        .CustomerLeadSource,
    ).toBe(CUSTOMER_LEAD_SOURCE_SELL_YOUR_HOUSE_FREE);
    expect(
      mapDraftToNewClientDto(baseDraft({ pillarHint: undefined }))
        .CustomerLeadSource,
    ).toBe(CUSTOMER_LEAD_SOURCE_SELL_YOUR_HOUSE_FREE);
  });

  it("emits contact fields via SignUpData", () => {
    const dto = mapDraftToNewClientDto(baseDraft());
    expect(dto.SignUpData).toEqual({
      Name: "Jane",
      LastName: "Doe",
      EmailAddress: "jane@example.com",
      PhoneNumber: "+16025551234",
    });
  });

  it("concatenates street2 into PropertyAddress when present", () => {
    const dto = mapDraftToNewClientDto(
      baseDraft({
        address: {
          street1: "123 Main St",
          street2: "Apt 4",
          city: "Phoenix",
          state: "AZ",
          zip: "85001",
        },
      }),
    );
    expect(dto.PropData.PropertyAddress).toBe("123 Main St Apt 4");
  });

  it("falls back to user-entered property facts when enrichment is absent", () => {
    const dto = mapDraftToNewClientDto(baseDraft());
    expect(dto.PropData.PropertyBedrooms).toBe(3);
    expect(dto.PropData.PropertyBathrooms).toBe(2);
    expect(dto.PropData.PropertySquareFootage).toBe(1800);
    expect(dto.PropData.PropertyYearBuilt).toBe(1995);
    expect(dto.PropData.AttomId).toBeNull();
    expect(dto.PropData.MlsRecordId).toBeNull();
  });

  it("prefers enrichment.details + propagates attomId/mlsRecordId when enrichment.status=ok", () => {
    const dto = mapDraftToNewClientDto(
      baseDraft({
        property: {
          propertyType: "single-family",
          bedrooms: 3,
          bathrooms: 2,
          squareFootage: 1800,
          yearBuilt: 1995,
        },
        enrichment: {
          status: "ok",
          attomId: "A-1001",
          mlsRecordId: "M-2002",
          details: {
            bedrooms: 4,
            bathrooms: 2.5,
            squareFootage: 2200,
            yearBuilt: 2001,
          },
          fetchedAt: "2026-04-23T15:01:00.000Z",
        },
      }),
    );
    expect(dto.PropData.PropertyBedrooms).toBe(4);
    expect(dto.PropData.PropertyBathrooms).toBe(2.5);
    expect(dto.PropData.PropertySquareFootage).toBe(2200);
    expect(dto.PropData.PropertyYearBuilt).toBe(2001);
    expect(dto.PropData.AttomId).toBe("A-1001");
    expect(dto.PropData.MlsRecordId).toBe("M-2002");
  });

  it("ignores enrichment.details when status is timeout/error but still forwards ids if present", () => {
    const dto = mapDraftToNewClientDto(
      baseDraft({
        enrichment: {
          status: "timeout",
          attomId: "A-9",
          details: { bedrooms: 99 },
        },
      }),
    );
    expect(dto.PropData.PropertyBedrooms).toBe(3);
    expect(dto.PropData.AttomId).toBe("A-9");
  });

  it("serializes SurveyData as JSON containing condition, consent versions, and enrichment status", () => {
    const dto = mapDraftToNewClientDto(
      baseDraft({
        enrichment: {
          status: "ok",
          listingStatus: "not-listed",
        },
      }),
    );
    const survey = JSON.parse(dto.SurveyData!);
    expect(survey.condition).toEqual({
      currentCondition: "move-in",
      timeline: "0-3mo",
    });
    expect(survey.consent.tcpa).toBe("tcpa-2026-04");
    expect(survey.consent.acceptedAt).toBe("2026-04-23T15:00:00.000Z");
    expect(survey.enrichmentStatus).toBe("ok");
    expect(survey.currentListingStatus).toBe("not-listed");
  });

  it("copies utm + click identifiers + referrer, parses entryTimestamp to ms, defaults others to null", () => {
    const dto = mapDraftToNewClientDto(
      baseDraft({
        attribution: {
          utmSource: "google",
          utmMedium: "cpc",
          utmCampaign: "az-sellers",
          utmTerm: "sell house",
          utmContent: "ad-42",
          gclid: "gclid-x",
          gbraid: "gb-y",
          wbraid: "wb-z",
          gadSource: "AdSource-1",
          gadCampaignId: "cmp-7",
          referrer: "https://news.example.com",
          entryPage: "/get-started",
          entryTimestamp: "2026-04-23T14:59:00.000Z",
        },
      }),
    );
    expect(dto.UtmSource).toBe("google");
    expect(dto.UtmMedium).toBe("cpc");
    expect(dto.UtmCampaign).toBe("az-sellers");
    expect(dto.UtmTerm).toBe("sell house");
    expect(dto.UtmContent).toBe("ad-42");
    expect(dto.Gclid).toBe("gclid-x");
    expect(dto.Gbraid).toBe("gb-y");
    expect(dto.Wbraid).toBe("wb-z");
    expect(dto.GadSource).toBe("AdSource-1");
    expect(dto.GadCampaignId).toBe("cmp-7");
    expect(dto.Referrer).toBe("https://news.example.com");
    expect(dto.EntryPage).toBe("/get-started");
    expect(dto.EntryTimestamp).toBe(Date.parse("2026-04-23T14:59:00.000Z"));
    expect(dto.GppcParam).toBeNull();
    expect(dto.SessionId).toBeNull();
  });

  it("returns null EntryTimestamp when attribution.entryTimestamp is missing or unparseable", () => {
    expect(mapDraftToNewClientDto(baseDraft()).EntryTimestamp).toBeNull();
    expect(
      mapDraftToNewClientDto(
        baseDraft({ attribution: { entryTimestamp: "not-a-date" } }),
      ).EntryTimestamp,
    ).toBeNull();
  });

  it("emits PascalCase top-level keys for wire compatibility", () => {
    const dto = mapDraftToNewClientDto(baseDraft());
    const keys = Object.keys(dto);
    for (const k of keys) {
      expect(/^[A-Z]/.test(k)).toBe(true);
    }
  });
});
