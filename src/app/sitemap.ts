import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";
import { ROUTES } from "@/lib/routes";

const BUILT_AT = new Date();

export default function sitemap(): MetadataRoute.Sitemap {
  return ROUTES.filter((r) => r.showInSitemap).map((r) => ({
    url: `${SITE.url}${r.path}`,
    lastModified: BUILT_AT,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));
}
