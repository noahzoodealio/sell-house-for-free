import { describe, expect, it } from "vitest";
import {
  OFFERVANA_OFFER_TYPE,
  calculateOfferRange,
  mapOffersV2ToPortal,
} from "@/lib/offervana/map-offers";

describe("calculateOfferRange", () => {
  it("produces a ±15% band by default", () => {
    expect(calculateOfferRange(1_000_000)).toEqual({
      low: 850_000,
      high: 1_150_000,
    });
  });

  it("returns zeros for a zero amount", () => {
    expect(calculateOfferRange(0)).toEqual({ low: 0, high: 0 });
  });
});

describe("mapOffersV2ToPortal", () => {
  it("routes fixList → Cash+ tile", () => {
    const offers = mapOffersV2ToPortal([
      {
        id: 1,
        iBuyerOfferType: OFFERVANA_OFFER_TYPE.fixList,
        fixListType: { offerAmount: 500_000 },
      },
    ]);
    expect(offers).toHaveLength(1);
    expect(offers[0]).toMatchObject({
      id: "cash-plus",
      name: "Cash+",
      label: "Post-repair value offer",
      lender: "Zoodealio partner network",
      low: 425_000,
      high: 575_000,
      displayState: "RANGE_ONLY",
    });
  });

  it("routes cashOfferPlus (prelim) → Cash tile, not Cash+ tile", () => {
    const offers = mapOffersV2ToPortal([
      {
        id: 2,
        iBuyerOfferType: OFFERVANA_OFFER_TYPE.cashOfferPlus,
        cashOfferPlusType: { offerAmount: 400_000 },
      },
    ]);
    expect(offers).toHaveLength(1);
    expect(offers[0].id).toBe("cash");
    expect(offers[0].label).toBe("70–100% of market value");
  });

  it("routes sellLeaseback → SNML tile", () => {
    const offers = mapOffersV2ToPortal([
      {
        id: 3,
        iBuyerOfferType: OFFERVANA_OFFER_TYPE.sellLeaseback,
        sellLeasebackType: { offerAmount: 600_000 },
      },
    ]);
    expect(offers.find((o) => o.id === "snml")).toBeDefined();
  });

  it("skips cashOffer (prelim — unused per product direction)", () => {
    const offers = mapOffersV2ToPortal([
      {
        id: 4,
        iBuyerOfferType: OFFERVANA_OFFER_TYPE.cashOffer,
        cashOfferType: { offerAmount: 300_000 },
      },
    ]);
    expect(offers).toHaveLength(0);
  });

  it("drops expired + disabled offers", () => {
    const offers = mapOffersV2ToPortal([
      {
        id: 5,
        iBuyerOfferType: OFFERVANA_OFFER_TYPE.fixList,
        fixListType: { offerAmount: 500_000 },
        isExpired: true,
      },
      {
        id: 6,
        iBuyerOfferType: OFFERVANA_OFFER_TYPE.sellLeaseback,
        sellLeasebackType: { offerAmount: 500_000 },
        isDisabled: true,
      },
    ]);
    expect(offers).toHaveLength(0);
  });

  it("prefers DetailsShared over preliminary within the same tile + surfaces sharedAmount", () => {
    const offers = mapOffersV2ToPortal([
      {
        id: 10,
        iBuyerOfferType: OFFERVANA_OFFER_TYPE.fixList,
        fixListType: { offerAmount: 500_000 },
      },
      {
        id: 11,
        iBuyerOfferType: OFFERVANA_OFFER_TYPE.fixList,
        isDetailsAvailable: true,
        fixListType: { offerAmount: 510_000, totalPayouts: 495_000 },
      },
    ]);
    expect(offers[0].offerId).toBe(11);
    expect(offers[0].displayState).toBe("DETAILS_SHARED");
    expect(offers[0].sharedAmount).toBe(495_000);
  });

  it("ignores malformed items silently", () => {
    const offers = mapOffersV2ToPortal([null, "nonsense", 42]);
    expect(offers).toEqual([]);
  });
});
