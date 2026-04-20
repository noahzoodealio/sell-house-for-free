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
  getStarted: "/get-started",
  city: (slug: string) => `/az/${slug}` as const,
} as const;
