import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { PortalLoading } from "@/components/portal/portal-app";

export const metadata: Metadata = buildMetadata({
  title: "Setting up your portal",
  description: "Preparing your sellfree portal.",
  path: "/portal/setup",
  noindex: true,
});

export default function Page() {
  return <PortalLoading />;
}
