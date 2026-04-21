export const LINKS = {
  home: "/",
  listing: "/listing",
  cashOffers: "/cash-offers",
  cashPlusRepairs: "/cash-plus-repairs",
  renovationOnly: "/renovation-only",
  howItWorks: "/how-it-works",
  whyItsFree: "/why-its-free",
  meetYourPm: "/meet-your-pm",
  about: "/about",
  faq: "/faq",
  getOffer: "/get-offer",
  getStarted: "/get-started",
  city: (slug: string) => `/az/${slug}` as const,
} as const;

export type PillarSlug =
  | "listing"
  | "cash-offers"
  | "cash-plus-repairs"
  | "renovation-only";

const PILLAR_OFFER_FLAG: Record<PillarSlug, string> = {
  listing: "listing",
  "cash-offers": "cash-offer",
  "cash-plus-repairs": "cash-plus",
  "renovation-only": "renovation",
};

export function getOfferFor(pillar: PillarSlug): string {
  return `${LINKS.getOffer}?${PILLAR_OFFER_FLAG[pillar]}=true`;
}
