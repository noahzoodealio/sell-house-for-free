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
    showInNav: false,
    showInSitemap: false,
  },
] as const satisfies readonly RouteEntry[];
