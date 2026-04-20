import type { Metadata } from "next";
import Link from "next/link";
import { buildMetadata } from "@/lib/seo";
import { LINKS } from "@/lib/links";
import { entries as faqEntries } from "@/content/faq/entries";
import {
  organizationSchema,
  faqPageSchema,
} from "@/lib/schema";
import { Container } from "@/components/layout/container";
import { Hero } from "@/components/marketing/hero";
import { TrustBar } from "@/components/marketing/trust-bar";
import { PillarGrid } from "@/components/marketing/pillar-grid";
import type { Pillar as PillarCard } from "@/components/marketing/pillar-grid";
import { HowItWorks } from "@/components/marketing/how-it-works";
import type { HowItWorksStep } from "@/components/marketing/how-it-works";
import { FAQ } from "@/components/marketing/faq";
import { CTASection } from "@/components/marketing/cta-section";
import { JsonLd } from "@/components/marketing/json-ld";
import { PLACEHOLDER_HOME_TRUST_CLAIMS } from "@/content/anti-broker/placeholder-claims";

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

function IconListing() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="size-6">
      <path d="M4 21V10l8-6 8 6v11" />
      <path d="M10 21v-6h4v6" />
    </svg>
  );
}
function IconCash() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="size-6">
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  );
}
function IconCashPlus() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="size-6">
      <path d="M3 11l10-6 8 4v10H3z" />
      <path d="M12 13v4M10 15h4" />
    </svg>
  );
}
function IconReno() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="size-6">
      <path d="M3 21l9-9" />
      <path d="M12 12l3-3-6-6-3 3z" />
      <path d="M14 16l6-6 2 2-6 6z" />
    </svg>
  );
}

const PILLARS: readonly PillarCard[] = [
  {
    icon: <IconListing />,
    heading: "Listing + MLS",
    blurb:
      "Full-service MLS listing at zero cost to you — covered by the buyer-side commission standard in AZ.",
    href: LINKS.listing,
  },
  {
    icon: <IconCash />,
    heading: "Cash Offers",
    blurb:
      "Vetted cash offers with a fast close — when certainty and speed matter more than top-of-market pricing.",
    href: LINKS.cashOffers,
  },
  {
    icon: <IconCashPlus />,
    heading: "Cash+ with Repairs",
    blurb:
      "We cash-fund the repairs before the home hits the MLS, so it sells for more — no money out of your pocket.",
    href: LINKS.cashPlusRepairs,
  },
  {
    icon: <IconReno />,
    heading: "Renovation-Only",
    blurb:
      "Hola Home renovates the property first, then lists at maximum upside — best when you have time to spare.",
    href: LINKS.renovationOnly,
  },
];

const HOME_HOW_IT_WORKS_STEPS: readonly HowItWorksStep[] = [
  {
    heading: "Tell us about your home",
    body: "A few minutes of address, condition, and timing lets your PM model every path that fits your situation.",
  },
  {
    heading: "Get every path priced",
    body: "Listing, cash offer, cash+ with repairs, renovation-only — you see the real numbers for each side-by-side.",
  },
  {
    heading: "Pick the path, we handle the rest",
    body: "Your Project Manager runs the sale end-to-end under a licensed AZ broker of record — no handoffs, no surprises.",
  },
];

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
      <PillarGrid pillars={[...PILLARS]} />
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
