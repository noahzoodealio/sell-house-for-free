import type { MetadataRoute } from "next";

export type RouteEntry = {
  path: string;
  title: string;
  showInNav: boolean;
  showInSitemap: boolean;
  changeFrequency?: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority?: number;
};

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
    priority: 0.6,
  },
] as const satisfies readonly RouteEntry[];
