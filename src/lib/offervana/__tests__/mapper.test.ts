import { describe, expect, it } from "vitest";
import type { SellerFormDraft } from "@/lib/seller-form/types";
import { mapDraftToCreateCustomerDto } from "@/lib/offervana/mapper";

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

describe("mapDraftToCreateCustomerDto", () => {
  it("emits required fields + hard-coded notification prefs + floors=1", () => {
    const dto = mapDraftToCreateCustomerDto(baseDraft());
    expect(dto.isEmailNotificationsEnabled).toBe(true);
    expect(dto.isSmsNotificationsEnabled).toBe(true);
    expect(dto.floors).toBe(1);
    expect(dto.country).toBe("US");
    expect(dto.stateCd).toBe("AZ");
    expect(dto.zipCode).toBe("85001");
  });

  it("splits contact.name into name + surname (single-token → empty surname)", () => {
    const dto = mapDraftToCreateCustomerDto(baseDraft());
    expect(dto.name).toBe("Jane");
    expect(dto.surname).toBe("Doe");

    const dto2 = mapDraftToCreateCustomerDto(
      baseDraft({
        contact: {
          name: "Cher",
          email: "cher@example.com",
          phone: "+16025551234",
        },
      }),
    );
    expect(dto2.name).toBe("Cher");
    expect(dto2.surname).toBe("");

    const dto3 = mapDraftToCreateCustomerDto(
      baseDraft({
        contact: {
          name: "Jane Van Der Doe",
          email: "jane@example.com",
          phone: "+16025551234",
        },
      }),
    );
    expect(dto3.name).toBe("Jane");
    expect(dto3.surname).toBe("Van Der Doe");
  });

  it("emits address1/address2/city/stateCd/zipCode flat on the DTO top level", () => {
    const dto = mapDraftToCreateCustomerDto(
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
    expect(dto.address1).toBe("123 Main St");
    expect(dto.address2).toBe("Apt 4");
    expect(dto.city).toBe("Phoenix");
  });

  it("emits property facts flat — bedroomsCount / bathroomsCount / squareFootage / yearBuilt", () => {
    const dto = mapDraftToCreateCustomerDto(baseDraft());
    expect(dto.bedroomsCount).toBe(3);
    expect(dto.bathroomsCount).toBe(2);
    expect(dto.squareFootage).toBe(1800);
    expect(dto.yearBuilt).toBe(1995);
  });

  it("prefers enrichment details when enrichment.status === 'ok'", () => {
    const dto = mapDraftToCreateCustomerDto(
      baseDraft({
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
    expect(dto.bedroomsCount).toBe(4);
    expect(dto.bathroomsCount).toBe(2.5);
    expect(dto.squareFootage).toBe(2200);
    expect(dto.yearBuilt).toBe(2001);
  });

  it("defaults bedrooms=1 / bathrooms=1 / squareFootage=1500 when both sources absent", () => {
    const dto = mapDraftToCreateCustomerDto(
      baseDraft({
        property: { propertyType: "single-family" },
      }),
    );
    expect(dto.bedroomsCount).toBe(1);
    expect(dto.bathroomsCount).toBe(1);
    expect(dto.squareFootage).toBe(1500);
  });

  it("additionalInfo is a JSON string carrying submission context + consent + enrichment + attribution", () => {
    const dto = mapDraftToCreateCustomerDto(baseDraft());
    expect(typeof dto.additionalInfo).toBe("string");
    const info = JSON.parse(dto.additionalInfo!);
    expect(info.submissionId).toBe("11111111-1111-4111-8111-111111111111");
    expect(info.pillarHint).toBe("cash-offers");
    expect(info.sellYourHouseFreePath).toBe("cash");
    expect(info.condition).toEqual({
      currentCondition: "move-in",
      timeline: "0-3mo",
    });
    expect(info.consent.tcpa).toBe("tcpa-2026-04");
    expect(info.enrichment.status).toBe("idle");
  });

  it("derives sellYourHouseFreePath=renovation on pillarHint=renovation-only", () => {
    const dto = mapDraftToCreateCustomerDto(
      baseDraft({ pillarHint: "renovation-only" }),
    );
    const info = JSON.parse(dto.additionalInfo!);
    expect(info.sellYourHouseFreePath).toBe("renovation");
  });

  it("parses attribution.entryTimestamp to ms inside additionalInfo", () => {
    const dto = mapDraftToCreateCustomerDto(
      baseDraft({
        attribution: {
          utmSource: "google",
          utmMedium: "cpc",
          entryTimestamp: "2026-04-23T14:59:00.000Z",
        },
      }),
    );
    const info = JSON.parse(dto.additionalInfo!);
    expect(info.attribution.utmSource).toBe("google");
    expect(info.attribution.entryTimestamp).toBe(
      Date.parse("2026-04-23T14:59:00.000Z"),
    );
  });

  it("does NOT emit customerLeadSource / signUpData / propData (fields belong to the internal DTO only)", () => {
    const dto = mapDraftToCreateCustomerDto(baseDraft()) as unknown as Record<
      string,
      unknown
    >;
    expect(dto.customerLeadSource).toBeUndefined();
    expect(dto.signUpData).toBeUndefined();
    expect(dto.propData).toBeUndefined();
    expect(dto.surveyData).toBeUndefined();
  });
});
