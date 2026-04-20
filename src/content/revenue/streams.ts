import type { RevenueStream } from "@/components/marketing/revenue-table";

export const streams: RevenueStream[] = [
  {
    id: "buyer-broker-mls",
    label: "Buyer-broker commission on MLS listings",
    whoPays: "Paid from sale proceeds at close — market-standard practice for any AZ MLS listing.",
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
    label: "Cash+ with Repairs ARV-uplift share",
    whoPays: "Paid by the investor partner from the resale proceeds.",
    whenItActivates: "On Cash+ closings, after the investor recovers the funded repair scope.",
    note: "You keep the spread above the investor's funded scope + share. No money out of your pocket.",
  },
  {
    id: "renovation-only-hola",
    label: "Renovation-Only commission via Hola Home",
    whoPays: "Hola Home (the renovation partner) earns on the post-renovation resale, not from the seller.",
    whenItActivates: "On Renovation-Only closings, after Hola Home completes the renovation and the listed home closes.",
    note: "The seller funds nothing up front; we do not charge a seller fee in this path.",
  },
];
