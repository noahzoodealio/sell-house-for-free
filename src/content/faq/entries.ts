export const FAQ_CATEGORIES = [
  "how-it-works",
  "free-and-fair",
  "data-and-privacy",
  "pm-and-fulfillment",
  "arizona",
  "comparison",
] as const;

export type FaqCategory = (typeof FAQ_CATEGORIES)[number];

export const FAQ_CATEGORY_LABELS: Record<FaqCategory, string> = {
  "how-it-works": "How it works",
  "free-and-fair": "Is this really free?",
  "data-and-privacy": "Your data & privacy",
  "pm-and-fulfillment": "Your Project Manager",
  arizona: "Arizona specifics",
  comparison: "How we compare",
};

type Pillar =
  | "listing"
  | "cash-offers"
  | "cash-plus-repairs"
  | "renovation-only";

export type FaqEntry = {
  id: string;
  category: FaqCategory;
  question: string;
  answer: string;
  relatedPillar?: Pillar;
  lastReviewed: string;
  skepticFirst?: boolean;
};

const REVIEWED = "2026-04-20";

export const entries: readonly FaqEntry[] = [
  {
    id: "entry-how-is-this-free",
    category: "free-and-fair",
    question: "How is this actually free?",
    answer:
      "Arizona sellers typically pay the listing-side commission out of closing proceeds. We cover that side for you. The buyer\u2019s agent is still paid per the standard market norm in AZ, which comes out of the sale price — exactly as it would with any other listing.\n\nNo setup fee, no marketing fee, no \u201cpremium\u201d tier. If a closing doesn\u2019t happen, you owe nothing.",
    lastReviewed: REVIEWED,
  },
  {
    id: "entry-whats-the-catch",
    category: "free-and-fair",
    question: "What\u2019s the catch?",
    answer:
      "Honest answer: the catch is that we\u2019re new and we\u2019re Arizona-only right now. We\u2019re building trust with seven AZ cities before we expand.\n\nWe don\u2019t sell your information, we\u2019re not a lead farm for outside agents, and we\u2019re not a middleman that hands you off. The Project Manager assigned to your sale is on our team.",
    lastReviewed: REVIEWED,
    skepticFirst: true,
  },
  {
    id: "entry-do-you-sell-my-info",
    category: "data-and-privacy",
    question: "Are you going to sell my information to agents or investors?",
    answer:
      "No. We do not sell, rent, or broker your contact information to third parties.\n\nInvestor cash offers you receive through us come from a vetted, limited buyer pool that we manage directly — not an open marketplace. Your details stay inside the engagement with your Project Manager unless you choose to accept an offer and close.",
    lastReviewed: REVIEWED,
    skepticFirst: true,
  },
  {
    id: "entry-who-is-my-pm",
    category: "pm-and-fulfillment",
    question: "Who is my Project Manager \u2014 is it a real person?",
    answer:
      "Yes — a real, named person on our Arizona team who manages your sale end-to-end. You get their direct contact (name, phone, email) at onboarding.\n\nPMs are not commission-based sales reps. They\u2019re accountable for the outcome of your sale, not for closing you on a specific path.",
    lastReviewed: REVIEWED,
    skepticFirst: true,
  },
  {
    id: "entry-licensed-az-broker",
    category: "arizona",
    question: "Are you a licensed Arizona broker?",
    answer:
      "Yes. All real-estate activity on your sale is transacted through a licensed Arizona brokerage of record. The brokerage name and license number are disclosed on our listing agreements and at the footer of this site.",
    lastReviewed: REVIEWED,
  },
  {
    id: "entry-can-i-back-out",
    category: "how-it-works",
    question: "What happens if I want to back out?",
    answer:
      "You can cancel the engagement at any time before you sign a buyer\u2019s contract. There\u2019s no termination fee and no obligation to proceed.\n\nOnce a buyer contract is signed, standard Arizona real-estate terms apply (inspection, appraisal, and financing contingencies). Your PM walks you through each gate.",
    lastReviewed: REVIEWED,
  },
  {
    id: "entry-do-you-serve-my-city",
    category: "arizona",
    question: "Do you serve my AZ city?",
    answer:
      "Today we serve Phoenix, Tucson, Mesa, Chandler, Scottsdale, Gilbert, and Glendale. If your property is outside those seven cities, we\u2019ll tell you at intake — we\u2019re not going to onboard you for a service we can\u2019t deliver.\n\nMore Arizona markets are on the roadmap. Out-of-state is not.",
    lastReviewed: REVIEWED,
  },
  {
    id: "entry-vs-opendoor-offerpad",
    category: "comparison",
    question: "How is this different from Opendoor or Offerpad?",
    answer:
      "Those are iBuyers — a single company makes you one take-it-or-leave-it cash offer. We\u2019re a listing service that can optionally run a competing cash track alongside a normal MLS listing.\n\nYou can compare a real buyer\u2019s offer to a cash number, side by side, with the same PM. If the MLS offer is better, you take it. If cash speed matters more, you take that. Either way, you\u2019re not locked into one channel.",
    lastReviewed: REVIEWED,
  },
  {
    id: "entry-what-fees-do-i-pay",
    category: "free-and-fair",
    question: "What fees do I pay?",
    answer:
      "Zero out-of-pocket at any stage. No listing fee, no photography fee, no sign fee, no marketing fee.\n\nAt closing, the buyer-side commission comes out of sale proceeds — that\u2019s the Arizona standard and it\u2019s unchanged regardless of who lists the home. Title, escrow, and state-mandated closing costs are the normal seller-side costs you\u2019d owe on any sale; your PM itemizes them up front.",
    lastReviewed: REVIEWED,
  },
  {
    id: "entry-cash-plus-and-renovation-only",
    category: "how-it-works",
    question: "What are Cash+ with Repairs and Renovation-Only?",
    answer:
      "Cash+ with Repairs: we cash-fund pre-list repairs and improvements so your home sells for more on the MLS. You don\u2019t pay for the work; the uplift at sale covers it.\n\nRenovation-Only: we renovate the property first, then list without a cash-offer component. Best fit when you have time and want maximum upside. Your PM recommends a path after walking the property.",
    relatedPillar: "cash-plus-repairs",
    lastReviewed: REVIEWED,
  },
  {
    id: "entry-how-long-does-it-take",
    category: "how-it-works",
    question: "How long does it take to sell?",
    answer:
      "Cash offers: as fast as 7\u201314 days to close, depending on title work.\n\nStandard MLS listing: the AZ median is typically under 60 days on market from list to contract; add ~30 days for close. Cash+ with Repairs adds the repair window up front but tends to sell faster once listed because the home shows better.",
    lastReviewed: REVIEWED,
  },
  {
    id: "entry-can-i-change-paths",
    category: "how-it-works",
    question: "Can I switch between a cash offer and an MLS listing mid-process?",
    answer:
      "Yes, as long as you haven\u2019t signed a binding contract on the current path. Your PM treats the four pillars as a menu, not a funnel — if cash looked best at intake but the MLS numbers came back strong, you pivot.",
    lastReviewed: REVIEWED,
  },
];
