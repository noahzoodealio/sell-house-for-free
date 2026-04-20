import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { JsonLd } from "@/components/marketing/json-ld";
import { faqPageSchema } from "@/lib/schema";
import { PageHeader } from "@/components/marketing/page-header";
import { FAQ } from "@/components/marketing/faq";
import { FaqHashTarget } from "@/components/marketing/faq-hash-target";
import { entries } from "@/content/faq/entries";

const description =
  "Straight answers: how we\u2019re actually free, who your Project Manager is, what we do and don\u2019t do with your information, and why we\u2019re not a lead-broker front.";

export const metadata: Metadata = buildMetadata({
  title: "FAQ",
  description,
  path: "/faq",
});

export default function FaqPage() {
  return (
    <>
      <PageHeader
        eyebrow="Frequently asked"
        heading="Questions, answered honestly."
        subcopy={description}
      />
      <FAQ entries={entries} />
      <JsonLd data={faqPageSchema(entries)} id="faq-jsonld" />
      <FaqHashTarget />
    </>
  );
}
