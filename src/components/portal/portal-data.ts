// Portal data shape + localStorage seed. Mirrors design_handoff_sellfree_landing/components/Portal.jsx.
// Backend wiring is intentionally deferred — this module fabricates a deterministic seed
// based on any submission-flow crumbs it finds in localStorage and persists edits back
// to localStorage so the placeholder portal feels "alive" across reloads.

export type OfferTone = "lime" | "dark" | "bone";

export type PortalOffer = {
  id: string;
  name: string;
  label: string;
  low: number;
  high: number;
  popular: boolean;
  lender: string;
  closes: string;
  terms: string[];
  tone: OfferTone;
};

export type PortalTodo = {
  id: string;
  title: string;
  detail: string;
  urgent: boolean;
  done: boolean;
};

export type PortalDoc = {
  name: string;
  type: string;
  status: "awaiting-signature" | "draft" | "received" | "in-progress";
  dated: string;
};

export type PortalGuide = {
  title: string;
  read: string;
  tag: string;
  heat: number;
};

export type PortalComp = {
  addr: string;
  ppsqft: number;
  sold: string;
  price: number;
  days: number;
};

export type PortalData = {
  user: { name: string; first: string; email: string; avatarSeed: number };
  property: {
    addr: string;
    city: string;
    beds: number;
    baths: number;
    sqft: number;
    year: number;
    lot: string;
    estValue: number;
    listPrice: number;
    avgDom: number;
    daysOnMarket: number;
    pricedAt: string;
  };
  plan: { name: string; price: number; features: string[] };
  team: {
    tc: {
      name: string;
      role: string;
      seed: number;
      phone: string;
      email: string;
      responseTime: string;
    };
    agent: {
      name: string;
      role: string;
      seed: number;
      license: string;
      rating: number;
    };
  };
  offers: PortalOffer[];
  listing: {
    url: string;
    zillow: string;
    mlsId: string;
    status: string;
    views: number;
    saves: number;
    leads: number;
    showings: number;
    offers: number;
    photos: number;
    photosReady: boolean;
  };
  todos: PortalTodo[];
  docs: PortalDoc[];
  guides: PortalGuide[];
  ai: { recentQuestions: string[] };
  pricingRationale: {
    comps: PortalComp[];
    logic: string;
    confidence: number;
  };
};

const PORTAL_KEY = "sellfree:portal";

type FlowCrumbs = {
  seedAddress?: { addr?: string; city?: string };
  data?: {
    beds?: number;
    baths?: number;
    sqft?: number;
    year?: number;
    lot?: string;
    type?: string;
    est?: number;
    tax?: string;
  };
  name?: string;
  email?: string;
};

function readFlowCrumbs(): FlowCrumbs {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem("sellfree:flow") || "{}");
  } catch {
    return {};
  }
}

export function seedPortal(): PortalData {
  const flow = readFlowCrumbs();
  const seed = flow.seedAddress || {
    addr: "1429 Maple Grove Lane",
    city: "Austin, TX 78704",
  };
  const data = flow.data || {
    beds: 3,
    baths: 2,
    sqft: 1840,
    year: 1998,
    lot: "0.21 ac",
    type: "Single Family",
    est: 742000,
    tax: "$6,840/yr",
  };
  const first = (flow.name || "Alex").split(" ")[0];
  const est = data.est ?? 742000;
  return {
    user: {
      name: flow.name || "Alex Rivera",
      first,
      email: flow.email || "alex@email.com",
      avatarSeed: 2,
    },
    property: {
      addr: seed.addr || "1429 Maple Grove Lane",
      city: seed.city || "Austin, TX 78704",
      beds: data.beds ?? 3,
      baths: data.baths ?? 2,
      sqft: data.sqft ?? 1840,
      year: data.year ?? 1998,
      lot: data.lot ?? "0.21 ac",
      estValue: est,
      listPrice: Math.round((est * 1.01) / 1000) * 1000,
      avgDom: 22,
      daysOnMarket: 0,
      pricedAt: new Date().toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
    },
    plan: {
      name: "Full-Service Lite",
      price: 2999,
      features: [
        "MLS + 100 portals",
        "Pro photos + 3D tour",
        "Offer negotiation",
        "Closing coordination",
      ],
    },
    team: {
      tc: {
        name: "Jordan Nakamura",
        role: "Transaction coordinator",
        seed: 1,
        phone: "(512) 555-0188",
        email: "jordan@sellfree.ai",
        responseTime: "< 4 hrs",
      },
      agent: {
        name: "Priya Shah",
        role: "On-demand licensed agent",
        seed: 4,
        license: "TX #683442",
        rating: 4.97,
      },
    },
    offers: [
      {
        id: "cash-plus",
        name: "Cash+",
        label: "Sell at peak price",
        low: 725000,
        high: 758000,
        popular: true,
        lender: "Knock · backed by sellfree",
        closes: "As fast as 14 days",
        terms: [
          "No showings required",
          "Keep up to 98% of market",
          "3.5% service fee",
        ],
        tone: "lime",
      },
      {
        id: "snml",
        name: "SNML",
        label: "Sell now, move later",
        low: 688000,
        high: 720000,
        popular: false,
        lender: "Flyhomes partners",
        closes: "14-day close · 90-day leaseback",
        terms: [
          "Lease back from buyer",
          "90 days to move",
          "2% leaseback rent",
        ],
        tone: "dark",
      },
      {
        id: "cash",
        name: "Cash",
        label: "Certain cash in hand",
        low: 650000,
        high: 685000,
        popular: false,
        lender: "Opendoor · Offerpad",
        closes: "As fast as 7 days",
        terms: [
          "No repairs needed",
          "Waived contingencies",
          "7% service fee",
        ],
        tone: "bone",
      },
    ],
    listing: {
      url: "sellfree.ai/listing/1429-maple-grove",
      zillow: "zillow.com/homedetails/1429-maple-grove",
      mlsId: "AUS-2481993",
      status: "Draft — awaiting your approval",
      views: 0,
      saves: 0,
      leads: 0,
      showings: 0,
      offers: 0,
      photos: 12,
      photosReady: false,
    },
    todos: [
      {
        id: "approve-photos",
        title: "Approve listing photos",
        detail:
          "Your photographer delivered 24 shots. Review + approve to go live.",
        urgent: true,
        done: false,
      },
      {
        id: "sign-agreement",
        title: "Sign listing agreement",
        detail: "Standard sellfree disclosure + exclusive listing terms.",
        urgent: true,
        done: false,
      },
      {
        id: "confirm-price",
        title: "Confirm list price",
        detail:
          "We're recommending $749,000 based on 6 comps. You can adjust.",
        urgent: false,
        done: true,
      },
      {
        id: "schedule-walkthrough",
        title: "Schedule optional walkthrough",
        detail: "30-min video call with your TC to review prep.",
        urgent: false,
        done: false,
      },
    ],
    docs: [
      {
        name: "Exclusive listing agreement",
        type: "PDF",
        status: "awaiting-signature",
        dated: "Apr 21",
      },
      {
        name: "Property disclosure (Form T-47)",
        type: "PDF",
        status: "draft",
        dated: "Apr 20",
      },
      {
        name: "HOA bylaws + financials",
        type: "PDF · 3 files",
        status: "received",
        dated: "Apr 19",
      },
      {
        name: "Title report (preliminary)",
        type: "PDF",
        status: "in-progress",
        dated: "Apr 22",
      },
    ],
    guides: [
      { title: "Staging on a weekend budget", read: "8 min", tag: "Prep", heat: 95 },
      { title: "What to fix before photos", read: "5 min", tag: "Prep", heat: 88 },
      { title: "How to read your offer sheet", read: "6 min", tag: "Offers", heat: 76 },
      { title: "Closing costs — what to expect", read: "7 min", tag: "Closing", heat: 72 },
    ],
    ai: {
      recentQuestions: [
        "What's a fair counter to a 93% list-price offer?",
        "Do I need to disclose the 2022 foundation repair?",
        "When should I drop my list price?",
      ],
    },
    pricingRationale: {
      comps: [
        { addr: "1412 Maple Grove", ppsqft: 407, sold: "Mar 28", price: 745000, days: 17 },
        { addr: "1520 Barton Springs", ppsqft: 412, sold: "Apr 3", price: 762000, days: 24 },
        { addr: "1405 Linden Ln", ppsqft: 398, sold: "Feb 14", price: 735000, days: 31 },
        { addr: "1610 Maple Grove", ppsqft: 421, sold: "Apr 11", price: 775000, days: 12 },
      ],
      logic:
        "6 comps within 0.4mi, 90-day window. Median $/sqft: $409. Your home at $406/sqft = $749K — priced to sell in under 20 days.",
      confidence: 94,
    },
  };
}

export function loadPortal(): PortalData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PORTAL_KEY);
    return raw ? (JSON.parse(raw) as PortalData) : null;
  } catch {
    return null;
  }
}

export function savePortal(d: PortalData) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PORTAL_KEY, JSON.stringify(d));
  } catch {
    // ignore — quota or privacy mode
  }
}
