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

const PILLAR_SLUG = "listing" as const;
const PILLAR_NAME = "Listing + MLS";
const GET_STARTED_HREF = getOfferFor(PILLAR_SLUG);

const BREADCRUMB = [
  { label: "Home", href: LINKS.home },
  { label: PILLAR_NAME, href: LINKS.listing },
];

const PILLAR_STEPS: readonly HowItWorksStep[] = [
  {
    heading: "Tell us about your home",
    body: "Address, bed/bath, condition, timing. Your PM opens the file same day.",
  },
  {
    heading: "Photography & pricing",
    body: "Pro photos coordinated. List price set from comps your PM walks you through.",
  },
  {
    heading: "Go live on the MLS",
    body: "Listed under JK Realty on ARMLS, syndicated to every major buyer site.",
  },
  {
    heading: "PM-assisted offer review",
    body: "Every offer routes through your PM. We review together; you decide.",
  },
  {
    heading: "Close",
    body: "Title, inspections, and the buyer-broker side, coordinated to the wire.",
  },
];

const LISTING_STATS = [
  { value: "$0", label: "Seller commission we charge" },
  { value: "JK", label: "Realty, your broker of record" },
  { value: "ARMLS", label: "Full MLS syndication" },
  { value: "1 PM", label: "Named contact, start to close" },
] as const;

const LISTING_REASONS = [
  {
    heading: "Seller commission? On us.",
    body: "We cover the seller-side commission entirely. The buyer-broker side is paid from sale proceeds at close, same as any MLS listing, never out of pocket.",
  },
  {
    heading: "You're represented, not sold to",
    body: "Your PM and broker owe you fiduciary duty. Offers reviewed, terms countered, bottom line defended. You never negotiate alone.",
  },
  {
    heading: "Switch paths without starting over",
    body: (
      <>
        Not the right fit? Your PM can model a{" "}
        <Link
          href={LINKS.cashOffers}
          className="text-brand underline underline-offset-2"
        >
          cash offer
        </Link>{" "}
        or{" "}
        <Link
          href={LINKS.cashPlusRepairs}
          className="text-brand underline underline-offset-2"
        >
          Cash+
        </Link>{" "}
        from the same intake.
      </>
    ),
  },
] as const;

const LISTING_SERVICES = [
  {
    label: "ARMLS syndication",
    description: "Full Arizona MLS listing under JK Realty, pushed to every major buyer site.",
  },
  {
    label: "Professional photography",
    description: "Pro photos coordinated and covered.",
  },
  {
    label: "Comp-backed pricing",
    description: "Recent comps walked through with your PM.",
  },
  {
    label: "Showings coordinated for you",
    description: "Buyer-agent showings routed through the brokerage, not your inbox.",
  },
  {
    label: "Offer review & negotiation",
    description: "Every offer through your PM. We counter and defend your bottom line.",
  },
  {
    label: "Title & closing coordination",
    description: "Title, escrow, inspections, and buyer-broker side coordinated to close.",
  },
] as const;

const listingFaqExcerpt = faqEntries.filter(
  (entry) =>
    entry.relatedPillar === "listing" || entry.category === "free-and-fair",
);

export const metadata: Metadata = buildMetadata({
  title: PILLAR_NAME,
  description:
    "Full-service MLS listing in Arizona with no seller commission, listing and transaction handled under JK Realty.",
  path: LINKS.listing,
});

export default function ListingPillar() {
  return (
    <>
      <Hero
        heading="Free MLS listing. No seller commission."
        subcopy={
          <>
            Full MLS listing under a licensed Arizona broker, with a PM
            representing you, not charging you.
          </>
        }
        action={
          <AddressSearchBar
            destination={GET_STARTED_HREF}
            buttonLabel="Start my free listing"
            placeholder="Enter your home address"
          />
        }
      />

      <TrustBar claims={TRUST_BAR_CLAIMS} />

      <StatBar
        eyebrow="What listing with us looks like"
        heading="Full-service listing, zero seller commission."
        stats={LISTING_STATS}
      />

      <FeatureSplit
        tone="soft"
        eyebrow="Your listing agent, without the commission"
        heading="One Project Manager from intake to closing day."
        body="Your PM represents you through pricing, photos, showings, offers, and buyer-side coordination, under a licensed Arizona brokerage of record."
        bullets={[
          "Named PM with real phone, email, and accountability",
          "All transactions under JK Realty, licensed AZ broker of record",
          "Fiduciary duty to you on every offer and counter",
          "No junior hand-offs, no call-center routing",
        ]}
        cta={{ label: "Meet your PM", href: LINKS.meetYourPm }}
        imageSide="right"
      />

      <NumberedReasons
        eyebrow="Why this works for sellers"
        heading="Full-service listing, without the seller commission."
        subcopy="No funnel, no upsell, no premium tier. A licensed broker and a PM on your side, paid on the buyer side at close."
        reasons={[...LISTING_REASONS]}
        cta={{ label: "Read the full story", href: LINKS.whyItsFree }}
      />

      <HowItWorks
        eyebrow="How it works"
        heading="Five steps, one PM."
        subcopy="The same named PM stays with the file from first call to closing day."
        steps={[...PILLAR_STEPS]}
        cta={{ label: "Start my free listing", href: GET_STARTED_HREF }}
      />

      <Testimonial
        eyebrow="Seller story"
        quote="My PM priced the home, ran showings, and walked me through every offer. The house closed above list and I never got a bill from the brokerage."
        author={{ name: "Arizona homeowner", title: "Closed via MLS listing" }}
      />

      <ServicesBand
        eyebrow="What's included"
        heading="Everything a full-service listing needs, zero seller fees."
        items={LISTING_SERVICES}
      />

      <FAQ
        entries={listingFaqExcerpt}
        eyebrow="Common questions"
        title="What sellers ask us about listing."
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
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </Container>
      </section>

      <CTASection
        tone="brand"
        heading="Ready to list?"
        subcopy="Your PM will price the home, set the listing date, and walk you through every offer."
        primaryCta={{
          label: "Get my free listing started",
          href: GET_STARTED_HREF,
        }}
        secondaryCta={{
          label: "Meet your Project Manager",
          href: LINKS.meetYourPm,
        }}
      />

      <JsonLd id="ld-service-listing" data={serviceSchema(PILLAR_SLUG)} />
      <JsonLd
        id="ld-breadcrumb"
        data={breadcrumbSchema(
          BREADCRUMB.map((c) => ({ label: c.label, url: c.href })),
        )}
      />
      <JsonLd
        id="ld-faqpage-listing"
        data={faqPageSchema(listingFaqExcerpt)}
      />
    </>
  );
}
