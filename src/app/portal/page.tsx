import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { PortalApp } from "@/components/portal/portal-app";

export const metadata: Metadata = buildMetadata({
  title: "Your portal",
  description: "Manage your sale — offers, listing, photos, team, and docs.",
  path: "/portal",
  noindex: true,
});

export default function Page() {
  return <PortalApp />;
}
