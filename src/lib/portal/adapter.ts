import type { PortalData } from "@/components/portal/portal-data";

import type { PortalSnapshot } from "./queries";

/**
 * Turns an RLS-scoped `PortalSnapshot` into the `PortalData` shape the
 * client `<PortalApp>` renders. Only the fields backed by Supabase today
 * are live (user, property, offers); the remaining sections render
 * empty/neutral content until later epics wire them (E11 team, E12 plan,
 * etc.). This keeps the authenticated portal free of the dev-only
 * demo-seller copy from `seedPortal()`.
 */
export function snapshotToPortalData(
  snapshot: PortalSnapshot,
): PortalData | null {
  const { profile, submission, offers } = snapshot;
  if (!profile || !submission) return null;

  const firstName = (profile.full_name ?? "").split(/\s+/)[0] || "Seller";

  const addressLine1 = submission.address_line1;
  const cityBlock = `${submission.city}, ${submission.state} ${submission.zip}`;

  return {
    user: {
      name: profile.full_name ?? firstName,
      first: firstName,
      email: profile.email,
      avatarSeed: 2,
    },
    property: {
      addr: addressLine1,
      city: cityBlock,
      beds: submission.beds ?? 0,
      baths: submission.baths ?? 0,
      sqft: submission.sqft ?? 0,
      year: submission.year_built ?? 0,
      lot: "",
      estValue: 0,
      listPrice: 0,
      avgDom: 0,
      daysOnMarket: 0,
      pricedAt: new Date(submission.created_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
    },
    plan: {
      name: "Plan pending",
      price: 0,
      features: [],
    },
    team: {
      tc: {
        name: "Assigning…",
        role: "Transaction coordinator",
        seed: 1,
        phone: "",
        email: "",
        responseTime: "",
      },
      agent: {
        name: "Assigning…",
        role: "On-demand licensed agent",
        seed: 4,
        license: "",
        rating: 0,
      },
    },
    offers: offers.map((row) => {
      const low = row.low_cents ? Math.round(row.low_cents / 100) : 0;
      const high = row.high_cents ? Math.round(row.high_cents / 100) : 0;
      return {
        id: row.path,
        name:
          row.path === "cash_plus"
            ? "Cash+"
            : row.path === "snml"
              ? "SNML"
              : row.path === "cash"
                ? "Cash"
                : "Listing",
        label: "",
        low,
        high,
        popular: row.path === "cash_plus",
        lender: "Zoodealio partner network",
        closes: "",
        terms: [],
        tone:
          row.path === "cash_plus"
            ? "lime"
            : row.path === "snml"
              ? "dark"
              : "bone",
      };
    }),
    listing: {
      url: "",
      zillow: "",
      mlsId: "",
      status: "",
      views: 0,
      saves: 0,
      leads: 0,
      showings: 0,
      offers: 0,
      photos: 0,
      photosReady: false,
    },
    todos: [],
    docs: [],
    guides: [],
    ai: { recentQuestions: [] },
    pricingRationale: {
      comps: [],
      logic: "",
      confidence: 0,
    },
  };
}
