// Maps raw OffersV2 items from sellfreeai.zoodealio.net/openapi/OffersV2 into
// the PortalOffer shape the cash-offers tiles render. The raw payload is
// the Offervana `IBuyerOffer` family (see Angular reference:
// owner-dashboard-rebuild/src/app/customer/dashboard/models/ibuyer-offer.model.ts).
//
// Routing rules (from product):
//   - iBuyerOfferType 3 (fixList / Cash+ with Repairs) → Cash+ tile
//   - iBuyerOfferType 1 (cashOfferPlus)                → Cash tile  (prelim surfaces here)
//   - iBuyerOfferType 2 (sellLeaseback)                → SNML tile
//   - iBuyerOfferType 0 (cashOffer prelim)             → ignored
//   - iBuyerOfferType 4 (cashBuyer, real cash)         → Cash tile
//
// Display state priority mirrors the Angular OfferDisplayStateService: a
// DetailsShared offer beats a preliminary-only one inside the same tile.

import type {
  OfferTone,
  PortalOffer,
  PortalOfferDisplayState,
} from "@/components/portal/portal-data";

export const OFFERVANA_OFFER_TYPE = {
  cashOffer: 0,
  cashOfferPlus: 1,
  sellLeaseback: 2,
  fixList: 3,
  cashBuyer: 4,
  listOnMarket: 5,
} as const;

type TileKey = "cash-plus" | "snml" | "cash";

interface TileSpec {
  id: TileKey;
  name: string;
  label: string;
  closes: string;
  terms: string[];
  tone: OfferTone;
  popular: boolean;
}

const TILE_SPECS: Record<TileKey, TileSpec> = {
  "cash-plus": {
    id: "cash-plus",
    name: "Cash+",
    label: "Post-repair value offer",
    closes: "As fast as 14 days",
    terms: [
      "Offer based on post-repair value",
      "No showings required",
      "Sellfree + partners handle repairs",
    ],
    tone: "lime",
    popular: true,
  },
  snml: {
    id: "snml",
    name: "SNML",
    label: "Full market value · leaseback",
    closes: "14-day close · flexible leaseback",
    terms: [
      "Full market value offer",
      "Lease back from buyer after close",
      "Move on your timeline",
    ],
    tone: "dark",
    popular: false,
  },
  cash: {
    id: "cash",
    name: "Cash",
    label: "70–100% of market value",
    closes: "As fast as 7 days",
    terms: [
      "No repairs needed",
      "Waived contingencies",
      "70–100% of market value",
    ],
    tone: "bone",
    popular: false,
  },
};

const DISPLAY_STATE_PRIORITY: Record<PortalOfferDisplayState, number> = {
  DETAILS_SHARED: 0,
  OFFER_READY: 1,
  EVALUATING: 2,
  RANGE_ONLY: 3,
};
type DisplayState = PortalOfferDisplayState;

interface RawOffer {
  id?: number;
  iBuyerOfferType?: number;
  offerAmount?: number;
  isExpired?: boolean;
  isDisabled?: boolean;
  isDetailsAvailable?: boolean;
  currentPropertyOfferStatus?: { systemName?: string } | null;
  cashOfferType?: { offerAmount?: number; netOfferAmount?: number } | null;
  cashOfferPlusType?: {
    offerAmount?: number;
    totalPayouts?: number;
  } | null;
  fixListType?: { offerAmount?: number; totalPayouts?: number } | null;
  sellLeasebackType?: {
    offerAmount?: number;
    totalPayouts?: number;
  } | null;
}

function asRawOffer(raw: unknown): RawOffer | null {
  if (!raw || typeof raw !== "object") return null;
  return raw as RawOffer;
}

function getDisplayState(offer: RawOffer): DisplayState {
  if (offer.isDetailsAvailable) return "DETAILS_SHARED";
  switch (offer.currentPropertyOfferStatus?.systemName) {
    case "DetailsShared":
      return "DETAILS_SHARED";
    case "OfferFinalized":
      return "OFFER_READY";
    case "DetailsRequested":
      return "EVALUATING";
    default:
      return "RANGE_ONLY";
  }
}

function getBaseAmount(offer: RawOffer): number {
  return (
    offer.cashOfferPlusType?.offerAmount ??
    offer.sellLeasebackType?.offerAmount ??
    offer.cashOfferType?.offerAmount ??
    offer.fixListType?.offerAmount ??
    offer.offerAmount ??
    0
  );
}

// Matches Angular's calculateOfferRange util (spreadPercent = 15).
export function calculateOfferRange(
  amount: number,
  spreadPercent = 15,
): { low: number; high: number } {
  if (!amount) return { low: 0, high: 0 };
  const spread = amount * (spreadPercent / 100);
  return {
    low: Math.round(amount - spread),
    high: Math.round(amount + spread),
  };
}

function routeToTile(offer: RawOffer): TileKey | null {
  switch (offer.iBuyerOfferType) {
    case OFFERVANA_OFFER_TYPE.fixList:
      return "cash-plus";
    case OFFERVANA_OFFER_TYPE.cashOfferPlus:
    case OFFERVANA_OFFER_TYPE.cashBuyer:
      return "cash";
    case OFFERVANA_OFFER_TYPE.sellLeaseback:
      return "snml";
    case OFFERVANA_OFFER_TYPE.cashOffer:
    default:
      // Cash offer preliminary is intentionally unused per product direction.
      return null;
  }
}

function pickPrimary(offers: RawOffer[]): RawOffer | null {
  if (!offers.length) return null;
  return [...offers].sort(
    (a, b) =>
      DISPLAY_STATE_PRIORITY[getDisplayState(a)] -
      DISPLAY_STATE_PRIORITY[getDisplayState(b)],
  )[0];
}

export interface MappedPortalOffer extends PortalOffer {
  offerId?: number;
  displayState: DisplayState;
  rawAmount: number;
  sharedAmount: number | null;
}

export function mapOffersV2ToPortal(raw: unknown[]): MappedPortalOffer[] {
  const buckets: Record<TileKey, RawOffer[]> = {
    "cash-plus": [],
    snml: [],
    cash: [],
  };

  for (const item of raw) {
    const offer = asRawOffer(item);
    if (!offer) continue;
    if (offer.isExpired || offer.isDisabled) continue;
    const tile = routeToTile(offer);
    if (!tile) continue;
    buckets[tile].push(offer);
  }

  const result: MappedPortalOffer[] = [];
  (Object.keys(TILE_SPECS) as TileKey[]).forEach((key) => {
    const primary = pickPrimary(buckets[key]);
    if (!primary) return;
    const spec = TILE_SPECS[key];
    const amount = getBaseAmount(primary);
    const { low, high } = calculateOfferRange(amount);
    const displayState = getDisplayState(primary);
    const sharedAmount =
      displayState === "DETAILS_SHARED"
        ? (primary.cashOfferPlusType?.totalPayouts ??
          primary.fixListType?.totalPayouts ??
          primary.sellLeasebackType?.totalPayouts ??
          primary.cashOfferType?.netOfferAmount ??
          primary.offerAmount ??
          null)
        : null;
    result.push({
      id: spec.id,
      name: spec.name,
      label: spec.label,
      low,
      high,
      popular: spec.popular,
      lender: "Zoodealio partner network",
      closes: spec.closes,
      terms: spec.terms,
      tone: spec.tone,
      offerId: primary.id,
      displayState,
      rawAmount: amount,
      sharedAmount,
    });
  });

  return result;
}
