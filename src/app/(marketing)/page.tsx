import type { Metadata } from "next";
import Link from "next/link";
import { buildMetadata } from "@/lib/seo";
import { LINKS } from "@/lib/links";
import { entries as faqEntries } from "@/content/faq/entries";
import { organizationSchema, faqPageSchema } from "@/lib/schema";
import { Container } from "@/components/layout/container";
import { Hero } from "@/components/marketing/hero";
import { TrustBar } from "@/components/marketing/trust-bar";
import { PillarGrid } from "@/components/marketing/pillar-grid";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { FAQ } from "@/components/marketing/faq";
import { CTASection } from "@/components/marketing/cta-section";
import { JsonLd } from "@/components/marketing/json-ld";
import { PLACEHOLDER_HOME_TRUST_CLAIMS } from "@/content/anti-broker/placeholder-claims";
import { HOME_PILLARS } from "@/content/pillars/home-pillars";
import { HOME_HOW_IT_WORKS_STEPS } from "@/content/how-it-works/home-steps";

const HOME_TITLE =
  "Sell Your House Free — Free Arizona cash-offer service, no fees, real PM";
const HOME_DESCRIPTION =
  "Sell your Arizona home for free through a licensed broker. No listing fees, no data resale, and a real Project Manager handling your sale end-to-end.";

export const metadata: Metadata = {
  ...buildMetadata({
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    path: "/",
  }),
  title: { absolute: HOME_TITLE },
};

const homeFaqExcerpt = faqEntries.filter(
  (entry) => entry.category === "free-and-fair" || entry.skepticFirst,
);

export default function Home() {
  return (
    <>
      <Hero
        heading={
          <>
            Sell your Arizona home <span className="whitespace-nowrap">for free.</span>
            <br className="hidden md:inline" />
            {" "}No listing fees. No data resale. Real people.
          </>
        }
        subcopy={
          <>
            Sell Your House Free is a licensed-broker service for Arizona homeowners —
            listing, vetted cash offers, repair-funded listings, or full renovation-first
            sales, all under one Project Manager and JK Realty as broker of record.
            You only pay what closing itself costs. Never a fee to us.
          </>
        }
        primaryCta={{ label: "Get my cash offer", href: LINKS.getStarted }}
        secondaryCta={{ label: "See how it works", href: LINKS.howItWorks }}
      />
      <TrustBar claims={PLACEHOLDER_HOME_TRUST_CLAIMS} />
      <PillarGrid pillars={[...HOME_PILLARS]} />
      <HowItWorks
        steps={[...HOME_HOW_IT_WORKS_STEPS]}
        cta={{ label: "Learn more about the process", href: LINKS.howItWorks }}
      />
      <FAQ entries={homeFaqExcerpt} title="Common questions" />
      <section className="pb-12 md:pb-16">
        <Container size="prose">
          <Link
            href={LINKS.faq}
            className="inline-flex items-center gap-1 text-[16px] font-semibold text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            See all questions
            <span aria-hidden="true">→</span>
          </Link>
        </Container>
      </section>
      <CTASection
        heading="Ready to see your cash offer?"
        subcopy="Get your free, no-obligation cash offer in minutes — a real PM reviews every response."
        primaryCta={{ label: "Get my cash offer", href: LINKS.getStarted }}
        secondaryCta={{
          label: "Meet your Project Manager",
          href: LINKS.meetYourPm,
        }}
      />
      <JsonLd id="ld-organization" data={organizationSchema()} />
      <JsonLd id="ld-faqpage" data={faqPageSchema(homeFaqExcerpt)} />
    </>
  );
}
