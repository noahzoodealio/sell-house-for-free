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
      name: "Jane Doe",
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
  it("maps the cash path to customerLeadSource=13 with homeowner role + seller source flags", () => {
    const dto = mapDraftToNewClientDto(baseDraft());
    expect(dto.customerLeadSource).toBe(
      CUSTOMER_LEAD_SOURCE_SELL_YOUR_HOUSE_FREE,
    );
    expect(dto.submitterRole).toBe(SUBMITTER_ROLE_HOMEOWNER);
    expect(dto.isSellerSource).toBe(true);
    expect(dto.sendPrelims).toBe(true);
  });

  it("maps the renovation path to customerLeadSource=14", () => {
    const dto = mapDraftToNewClientDto(
      baseDraft({ pillarHint: "renovation-only" }),
    );
    expect(dto.customerLeadSource).toBe(
      CUSTOMER_LEAD_SOURCE_SELL_YOUR_HOUSE_FREE_RENOVATION,
    );
  });

  it("defaults listing path + missing pillarHint to lead source 13", () => {
    expect(
      mapDraftToNewClientDto(baseDraft({ pillarHint: "listing" }))
        .customerLeadSource,
    ).toBe(CUSTOMER_LEAD_SOURCE_SELL_YOUR_HOUSE_FREE);
    expect(
      mapDraftToNewClientDto(baseDraft({ pillarHint: undefined }))
        .customerLeadSource,
    ).toBe(CUSTOMER_LEAD_SOURCE_SELL_YOUR_HOUSE_FREE);
  });

  it("splits contact.name into firstName/lastName for signUpData", () => {
    const dto = mapDraftToNewClientDto(baseDraft());
    expect(dto.signUpData).toEqual({
      firstName: "Jane",
      lastName: "Doe",
      email: "jane@example.com",
      phone: "+16025551234",
    });
  });

  it("handles multi-word last names (everything after the first token)", () => {
    const dto = mapDraftToNewClientDto(
      baseDraft({
        contact: {
          name: "Jane Van Der Doe",
          email: "jane@example.com",
          phone: "+16025551234",
        },
      }),
    );
    expect(dto.signUpData.firstName).toBe("Jane");
    expect(dto.signUpData.lastName).toBe("Van Der Doe");
  });

  it("handles single-name input with empty lastName", () => {
    const dto = mapDraftToNewClientDto(
      baseDraft({
        contact: {
          name: "Cher",
          email: "cher@example.com",
          phone: "+16025551234",
        },
      }),
    );
    expect(dto.signUpData.firstName).toBe("Cher");
    expect(dto.signUpData.lastName).toBe("");
  });

  it("emits address to propData with stateCd + zipCode + country=US + customerId=0", () => {
    const dto = mapDraftToNewClientDto(baseDraft());
    expect(dto.propData).toMatchObject({
      address1: "123 Main St",
      address2: null,
      city: "Phoenix",
      stateCd: "AZ",
      zipCode: "85001",
      country: "US",
      customerId: 0,
      propertyType: "single-family",
    });
  });

  it("passes street2 through propData.address2 when present", () => {
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
    expect(dto.propData.address2).toBe("Apt 4");
  });

  it("emits bedrooms/bathrooms/squareFootage at top level of surveyData (offervana reads them via dynamic binder), preferring enrichment when status=ok", () => {
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
    const survey = JSON.parse(dto.surveyData!);
    expect(survey.bedrooms).toBe(4);
    expect(survey.bathrooms).toBe(2.5);
    expect(survey.squareFootage).toBe(2200);
    expect(survey.yearBuilt).toBe(2001);
    expect(survey.attomId).toBe("A-1001");
    expect(survey.mlsRecordId).toBe("M-2002");
    expect(dto.propData.legalOne).toBe("A-1001");
  });

  it("falls back to user-entered property facts when enrichment absent, top-level on surveyData", () => {
    const dto = mapDraftToNewClientDto(baseDraft());
    const survey = JSON.parse(dto.surveyData!);
    expect(survey.bedrooms).toBe(3);
    expect(survey.bathrooms).toBe(2);
    expect(survey.squareFootage).toBe(1800);
    expect(survey.attomId).toBeNull();
    expect(survey.enrichmentStatus).toBe("idle");
  });

  it("defaults bedrooms=1 / bathrooms=1 / squareFootage=1500 when both sources absent (offervana decimal cast requires non-null)", () => {
    const dto = mapDraftToNewClientDto(
      baseDraft({
        property: { propertyType: "single-family" },
      }),
    );
    const survey = JSON.parse(dto.surveyData!);
    expect(survey.bedrooms).toBe(1);
    expect(survey.bathrooms).toBe(1);
    expect(survey.squareFootage).toBe(1500);
  });

  it("ignores enrichment.details when status is not ok but still carries attomId if present", () => {
    const dto = mapDraftToNewClientDto(
      baseDraft({
        enrichment: {
          status: "timeout",
          attomId: "A-9",
          details: { bedrooms: 99 },
        },
      }),
    );
    const survey = JSON.parse(dto.surveyData!);
    expect(survey.bedrooms).toBe(3);
    expect(survey.attomId).toBe("A-9");
    expect(dto.propData.legalOne).toBe("A-9");
  });

  it("serializes surveyData as a JSON string carrying condition + consent + path", () => {
    const dto = mapDraftToNewClientDto(
      baseDraft({
        enrichment: { status: "ok", listingStatus: "not-listed" },
      }),
    );
    expect(typeof dto.surveyData).toBe("string");
    const survey = JSON.parse(dto.surveyData!);
    expect(survey.condition).toEqual({
      currentCondition: "move-in",
      timeline: "0-3mo",
    });
    expect(survey.consent.tcpa).toBe("tcpa-2026-04");
    expect(survey.currentListingStatus).toBe("not-listed");
    expect(survey.sellYourHouseFreePath).toBe("cash");
  });

  it("derives sellYourHouseFreePath='renovation' on pillarHint='renovation-only'", () => {
    const dto = mapDraftToNewClientDto(
      baseDraft({ pillarHint: "renovation-only" }),
    );
    const survey = JSON.parse(dto.surveyData!);
    expect(survey.sellYourHouseFreePath).toBe("renovation");
  });

  it("copies utm + click identifiers + parses entryTimestamp to ms", () => {
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
    expect(dto.utmSource).toBe("google");
    expect(dto.utmMedium).toBe("cpc");
    expect(dto.gclid).toBe("gclid-x");
    expect(dto.entryTimestamp).toBe(Date.parse("2026-04-23T14:59:00.000Z"));
    expect(dto.referrer).toBe("https://news.example.com");
    expect(dto.gppcParam).toBeNull();
    expect(dto.sessionId).toBeNull();
  });

  it("returns null entryTimestamp when attribution.entryTimestamp is missing or unparseable", () => {
    expect(mapDraftToNewClientDto(baseDraft()).entryTimestamp).toBeNull();
    expect(
      mapDraftToNewClientDto(
        baseDraft({ attribution: { entryTimestamp: "not-a-date" } }),
      ).entryTimestamp,
    ).toBeNull();
  });

  it("emits camelCase top-level keys for wire compatibility with the swagger-documented schema", () => {
    const dto = mapDraftToNewClientDto(baseDraft());
    for (const k of Object.keys(dto)) {
      expect(/^[a-z]/.test(k)).toBe(true);
    }
    expect(Object.keys(dto.signUpData).every((k) => /^[a-z]/.test(k))).toBe(
      true,
    );
    expect(Object.keys(dto.propData).every((k) => /^[a-z]/.test(k))).toBe(true);
  });
});
