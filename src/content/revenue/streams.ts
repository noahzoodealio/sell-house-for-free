import type { RevenueStream } from "@/components/marketing/revenue-table";

export const streams: RevenueStream[] = [
  {
    id: "buyer-broker-mls",
    label: "Buyer-broker commission on MLS listings",
    whoPays: "Paid from sale proceeds at close, market-standard practice for any AZ MLS listing.",
    whenItActivates: "On every closed Listing + MLS sale.",
    note: "We earn the buyer-side, not the seller-side. The seller never writes us a check.",
  },
  {
    id: "cash-offer-spread",
    label: "Cash-offer buyer-side spread",
    whoPays: "Paid by the investor-buyer on the closed transaction.",
    whenItActivates: "Only when a Cash Offer is accepted and closes.",
    note: "If you decline the offer, no fee is owed by anyone.",
  },
  {
    id: "cash-plus-share",
    label: "Cash+ ARV-uplift share",
    whoPays: "Paid by the investor partner from the resale proceeds.",
    whenItActivates: "On Cash+ closings, after the investor recovers the funded repair scope.",
    note: "You keep the spread above the investor's funded scope + share. No money out of your pocket.",
  },
  {
    id: "renovation-cost-at-close",
    label: "Renovation cost settled at close (Renovation path)",
    whoPays: "The seller, from sale proceeds at close. Never out of pocket.",
    whenItActivates: "On Renovation closings, the full agreed renovation scope is paid from proceeds before seller net is calculated.",
    note: "No investor takes a share of upside on this path. Hola Home Services is paid for the renovation work itself. Our own revenue on this path is the same buyer-broker commission as any listed sale.",
  },
];
