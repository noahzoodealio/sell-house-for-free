import type { MetadataRoute } from "next";

export type RouteEntry = {
  path: string;
  title: string;
  showInNav: boolean;
  showInSitemap: boolean;
  changeFrequency?: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority?: number;
};

export const AZ_CITY_SLUGS = [
  "phoenix",
  "tucson",
  "mesa",
  "chandler",
  "scottsdale",
  "gilbert",
  "glendale",
] as const;

export type AzCitySlug = (typeof AZ_CITY_SLUGS)[number];

export const ROUTES = [
  {
    path: "/",
    title: "Home",
    showInNav: true,
    showInSitemap: true,
    changeFrequency: "weekly",
    priority: 1,
  },
  {
    path: "/get-started",
    title: "Get started",
    showInNav: true,
    showInSitemap: true,
    changeFrequency: "monthly",
    priority: 0.7,
  },
  {
    path: "/faq",
    title: "FAQ",
    showInNav: true,
    showInSitemap: true,
    changeFrequency: "monthly",
    priority: 0.7,
  },
  {
    path: "/listing",
    title: "Listing + MLS",
    showInNav: true,
    showInSitemap: true,
    changeFrequency: "monthly",
    priority: 0.9,
  },
  {
    path: "/cash-offers",
    title: "Cash Offers",
    showInNav: true,
    showInSitemap: true,
    changeFrequency: "monthly",
    priority: 0.9,
  },
  {
    path: "/cash-plus-repairs",
    title: "Cash+ with Repairs",
    showInNav: true,
    showInSitemap: true,
    changeFrequency: "monthly",
    priority: 0.9,
  },
  {
    path: "/renovation-only",
    title: "Renovation-Only",
    showInNav: true,
    showInSitemap: true,
    changeFrequency: "monthly",
    priority: 0.9,
  },
  {
    path: "/how-it-works",
    title: "How it works",
    showInNav: true,
    showInSitemap: true,
    changeFrequency: "monthly",
    priority: 0.8,
  },
  {
    path: "/why-its-free",
    title: "Why it's free",
    showInNav: true,
    showInSitemap: true,
    changeFrequency: "monthly",
    priority: 0.7,
  },
  {
    path: "/meet-your-pm",
    title: "Meet your PM",
    showInNav: true,
    showInSitemap: true,
    changeFrequency: "monthly",
    priority: 0.7,
  },
  {
    path: "/about",
    title: "About",
    showInNav: true,
    showInSitemap: true,
    changeFrequency: "monthly",
    priority: 0.6,
  },
  {
    path: "/az",
    title: "Arizona",
    showInNav: false,
    showInSitemap: true,
    changeFrequency: "monthly",
    priority: 0.6,
  },
  {
    path: "/az/phoenix",
    title: "Sell your Phoenix home",
    showInNav: false,
    showInSitemap: true,
    changeFrequency: "monthly",
    priority: 0.7,
  },
  {
    path: "/az/tucson",
    title: "Sell your Tucson home",
    showInNav: false,
    showInSitemap: true,
    changeFrequency: "monthly",
    priority: 0.7,
  },
  {
    path: "/az/mesa",
    title: "Sell your Mesa home",
    showInNav: false,
    showInSitemap: true,
    changeFrequency: "monthly",
    priority: 0.7,
  },
  {
    path: "/az/chandler",
    title: "Sell your Chandler home",
    showInNav: false,
    showInSitemap: true,
    changeFrequency: "monthly",
    priority: 0.7,
  },
  {
    path: "/az/scottsdale",
    title: "Sell your Scottsdale home",
    showInNav: false,
    showInSitemap: true,
    changeFrequency: "monthly",
    priority: 0.7,
  },
  {
    path: "/az/gilbert",
    title: "Sell your Gilbert home",
    showInNav: false,
    showInSitemap: true,
    changeFrequency: "monthly",
    priority: 0.7,
  },
  {
    path: "/az/glendale",
    title: "Sell your Glendale home",
    showInNav: false,
    showInSitemap: true,
    changeFrequency: "monthly",
    priority: 0.7,
  },
] as const satisfies readonly RouteEntry[];
