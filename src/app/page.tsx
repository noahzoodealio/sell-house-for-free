import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { LandingPage } from "@/components/landing/landing-page";

const HOME_TITLE = "sellfree.ai — Sell your home. For free.";
const HOME_DESCRIPTION =
  "AI-powered home selling with on-demand licensed agent support. Pay $0 commission, keep the 6%. Listings, cash offers, docs, and closing in one platform.";

export const metadata: Metadata = {
  ...buildMetadata({
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    path: "/",
  }),
  title: { absolute: HOME_TITLE },
};

export default function Page() {
  return <LandingPage />;
}
