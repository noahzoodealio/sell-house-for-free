export type AntiBrokerClaim = {
  id: string;
  shortLabel: string;
  subLabel?: string;
  fullStatement: string;
  fulfillmentAnchor: string;
  lastVerified: string;
};

export const claims: readonly AntiBrokerClaim[] = [
  {
    id: "no-fees",
    shortLabel: "No listing fees",
    subLabel: "You pay zero at closing.",
    fullStatement:
      "We don't charge home sellers anything to list or close through us. Our revenue comes from the buyer side of closed transactions and from optional partner products — never from you.",
    fulfillmentAnchor:
      "Marketing copy across home, four pillar pages, and city landers names exactly four revenue streams (buyer-broker MLS commission, cash-offer buyer-side spread, Cash+ ARV-uplift share, Renovation-Only Hola Home commission) — disclosed verbatim on /why-its-free via src/content/revenue/streams.ts. There is no seller-charge code path in the planned E5 submission flow; verification deferred to E5 architecture.",
    lastVerified: "2026-04-20",
  },
  {
    id: "no-data-resale",
    shortLabel: "We don't sell your data",
    subLabel: "Not a lead farm — ever.",
    fullStatement:
      "We don't sell, rent, or broker your contact information to third-party real-estate agents, lead networks, or marketers. Your details stay inside the engagement with your Project Manager.",
    fulfillmentAnchor:
      "PENDING E5: the submission payload to /api/submit must not include any sell_lead_to_third_party_agents flag, broker-syndication webhook, or partner-CRM mirror. PENDING E7: privacy policy must include an explicit clause naming no-resale + no-third-party-tracking-pixels. Today: only Vercel first-party analytics ships in production via the dual-env gate (NODE_ENV === 'production' && VERCEL_ENV !== 'preview') in src/app/layout.tsx.",
    lastVerified: "2026-04-20",
  },
  {
    id: "real-pm",
    shortLabel: "A real Project Manager",
    subLabel: "Named, reachable, on our team.",
    fullStatement:
      "Every sale is run end-to-end by one named Project Manager on our Arizona team — your single point of contact from intake through close. PMs are not commission-based sales reps and are not automated routing rules to outside agent networks.",
    fulfillmentAnchor:
      "PENDING E6: PM assignment must be a human-coordinated routing rule (region + pillar inputs), not an automated handoff to an external agent network. PMs live in our Supabase, not a partner CRM. /meet-your-pm page surfaces the role-region structure today (placeholder identities); E6 swaps in the real roster.",
    lastVerified: "2026-04-20",
  },
  {
    id: "jk-realty-broker",
    shortLabel: "Licensed AZ broker",
    subLabel: "Listings of record via JK Realty.",
    fullStatement:
      "All real-estate activity on every sale is transacted through JK Realty as broker of record under the Arizona Department of Real Estate. The brokerage name and AZ license number are disclosed on listing agreements and at the footer of every page on this site.",
    fulfillmentAnchor:
      "SITE.broker (src/lib/site.ts) carries the JK Realty + AZ-licensure-of-record fields, surfaced via realEstateAgentSchema (S5) on city landers and the footer (E1-S9). License number (currently TBD per src/lib/site.ts comment) needs JK Realty confirmation before launch — flagged as E7 / launch-readiness checklist item.",
    lastVerified: "2026-04-20",
  },
];
