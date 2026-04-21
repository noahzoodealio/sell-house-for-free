import type { Metadata } from "next";
import Link from "next/link";
import { buildMetadata } from "@/lib/seo";
import { LINKS, getOfferFor } from "@/lib/links";
import { entries as faqEntries } from "@/content/faq/entries";
import {
  breadcrumbSchema,
  faqPageSchema,
  serviceSchema,
} from "@/lib/schema";
import { Container } from "@/components/layout/container";
import { Hero } from "@/components/marketing/hero";
import { AddressSearchBar } from "@/components/marketing/address-search-bar";
import { TrustBar } from "@/components/marketing/trust-bar";
import { StatBar } from "@/components/marketing/stat-bar";
import { FeatureSplit } from "@/components/marketing/feature-split";
import { NumberedReasons } from "@/components/marketing/numbered-reasons";
import { HowItWorks } from "@/components/marketing/how-it-works";
import type { HowItWorksStep } from "@/components/marketing/how-it-works";
import { Testimonial } from "@/components/marketing/testimonial";
import { ServicesBand } from "@/components/marketing/services-band";
import { FAQ } from "@/components/marketing/faq";
import { CTASection } from "@/components/marketing/cta-section";
import { JsonLd } from "@/components/marketing/json-ld";
import { TRUST_BAR_CLAIMS } from "@/content/anti-broker/trust-bar-claims";

const PILLAR_SLUG = "cash-offers" as const;
const PILLAR_NAME = "Cash Offers";
const GET_STARTED_HREF = getOfferFor(PILLAR_SLUG);

const BREADCRUMB = [
  { label: "Home", href: LINKS.home },
  { label: PILLAR_NAME, href: LINKS.cashOffers },
];

const PILLAR_STEPS: readonly HowItWorksStep[] = [
  {
    heading: "Tell us about your home",
    body: "Address, condition, timing. Your PM opens the file same day.",
  },
  {
    heading: "Market-value cash offer",
    body: "A real written offer priced at current market value, not an iBuyer discount. Typically back within 48 hours.",
  },
  {
    heading: "Close in 7 to 21 days",
    body: "Cash closes fast. No lender, no appraisal delay. You sign and the proceeds wire on your chosen date.",
  },
  {
    heading: "We list the home",
    body: "After you close, we list the home on the MLS under JK Realty. You keep being represented by the same PM.",
  },
  {
    heading: "Upside flows back to you",
    body: "Any amount the home sells for above your cash number, net of closing costs, comes back to you.",
  },
];

const CASH_OFFERS_STATS = [
  { value: "Market", label: "Value cash offer, not a discount" },
  { value: "7-21d", label: "Close on your chosen date" },
  { value: "Upside", label: "At resale flows back to you" },
  { value: "$0", label: "Fees, start to finish" },
] as const;

const CASH_OFFERS_REASONS = [
  {
    heading: "Cash at market value",
    body: "Most cash offers come with a 10 to 20 percent discount for speed. Ours is priced at market, so you don't trade value for liquidity.",
  },
  {
    heading: "You keep the resale upside",
    body: "After you close in cash, we list the home traditionally. Whatever it sells for above your cash number, net of costs, comes back to you.",
  },
  {
    heading: "Pair with repairs for more",
    body: (
      <>
        Want even more upside?{" "}
        <Link
          href={LINKS.cashPlusRepairs}
          className="text-brand underline underline-offset-2"
        >
          Cash+
        </Link>{" "}
        funds pre-list work before we relist. Same cash now, higher resale later.
      </>
    ),
  },
] as const;

const CASH_OFFERS_SERVICES = [
  {
    label: "Vetted buyer pool",
    description: "A limited, direct investor network we manage. Not an open marketplace.",
  },
  {
    label: "Written offer at market value",
    description: "No verbal ranges. A real, written number priced at current comps.",
  },
  {
    label: "PM-walked net numbers",
    description: "Your PM breaks down exactly what hits your account at close.",
  },
  {
    label: "7 to 21 day close",
    description: "Pick the date. Cash closes on your timeline, not a lender's.",
  },
  {
    label: "Post-close MLS listing",
    description: "We list the home under JK Realty after you close so upside can return to you.",
  },
  {
    label: "Fiduciary representation, free",
    description: "Same PM and broker on your side through the cash close and the resale.",
  },
] as const;

const cashOffersFaqExcerpt = faqEntries.filter(
  (entry) =>
    entry.relatedPillar === "cash-offers" || entry.category === "free-and-fair",
);

export const metadata: Metadata = buildMetadata({
  title: PILLAR_NAME,
  description:
    "Full market-value cash offers on Arizona homes. Take the cash now, we list the home, you capture the upside. Represented for free the entire time.",
  path: LINKS.cashOffers,
});

export default function CashOffersPillar() {
  return (
    <>
      <Hero
        heading="Cash at market value. Keep the upside."
        subcopy={
          <>
            Take the cash now. We still list and sell the home, and any upside
            over your cash offer flows back to you. Represented the whole way,
            for free.
          </>
        }
        action={
          <AddressSearchBar
            destination={GET_STARTED_HREF}
            buttonLabel="Get my cash offer"
            placeholder="Enter your home address"
          />
        }
      />

      <TrustBar claims={TRUST_BAR_CLAIMS} />

      <StatBar
        eyebrow="What a cash offer with us looks like"
        heading="Cash now. Upside later. Fees never."
        stats={CASH_OFFERS_STATS}
      />

      <FeatureSplit
        tone="soft"
        eyebrow="Cash now, upside later"
        heading="This isn't an iBuyer lowball."
        body="Traditional cash offers trade 10 to 20 percent of your home's value for speed. Ours is priced at market. You take the cash, we list the home, and the spread over your cash number flows back to you at resale."
        bullets={[
          "Cash offer set at current market value",
          "We list and sell traditionally after you close",
          "Upside over the cash offer returns to you",
          "Same PM and broker represent you the entire time",
        ]}
        cta={{ label: "Meet your PM", href: LINKS.meetYourPm }}
        imageSide="right"
      />

      <NumberedReasons
        eyebrow="Why this beats a flat cash offer"
        heading="One sale, two upsides."
        subcopy="The cash number is real and honored. The resale upside is yours to keep."
        reasons={[...CASH_OFFERS_REASONS]}
        cta={{ label: "Read the full story", href: LINKS.whyItsFree }}
      />

      <HowItWorks
        eyebrow="How it works"
        heading="Five steps, one PM."
        subcopy="The same named PM stays with you through the cash close and the resale."
        steps={[...PILLAR_STEPS]}
        cta={{ label: "Get my cash offer", href: GET_STARTED_HREF }}
      />

      <Testimonial
        eyebrow="Seller story"
        quote="I took the cash and moved in three weeks. A few months later the resale check came through. No fees, no surprises, the same PM both times."
        author={{ name: "Arizona homeowner", title: "Closed via cash + resale" }}
      />

      <ServicesBand
        eyebrow="What's included"
        heading="Everything a cash close needs, plus the resale."
        items={CASH_OFFERS_SERVICES}
      />

      <FAQ
        entries={cashOffersFaqExcerpt}
        eyebrow="Common questions"
        title="What sellers ask us about cash offers."
        size="page"
      />
      <section className="pb-20 md:pb-24">
        <Container>
          <div className="max-w-3xl">
            <Link
              href={LINKS.faq}
              className="inline-flex items-center gap-1 text-[16px] font-semibold text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              See all questions
              <span aria-hidden="true">{"\u2192"}</span>
            </Link>
          </div>
        </Container>
      </section>

      <CTASection
        tone="brand"
        heading="Want to see your cash number?"
        subcopy="Free intake. Your PM returns a real written offer at market value, with the resale math laid out."
        primaryCta={{
          label: "Get my cash offer",
          href: GET_STARTED_HREF,
        }}
        secondaryCta={{
          label: "Meet your Project Manager",
          href: LINKS.meetYourPm,
        }}
      />

      <JsonLd id="ld-service-cash-offers" data={serviceSchema(PILLAR_SLUG)} />
      <JsonLd
        id="ld-breadcrumb"
        data={breadcrumbSchema(
          BREADCRUMB.map((c) => ({ label: c.label, url: c.href })),
        )}
      />
      <JsonLd
        id="ld-faqpage-cash-offers"
        data={faqPageSchema(cashOffersFaqExcerpt)}
      />
    </>
  );
}
