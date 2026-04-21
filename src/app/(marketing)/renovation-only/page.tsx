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

const PILLAR_SLUG = "renovation-only" as const;
const PILLAR_NAME = "Renovation";
const GET_STARTED_HREF = getOfferFor(PILLAR_SLUG);

const BREADCRUMB = [
  { label: "Home", href: LINKS.home },
  { label: PILLAR_NAME, href: LINKS.renovationOnly },
];

const PILLAR_STEPS: readonly HowItWorksStep[] = [
  {
    heading: "Walk-through with your PM",
    body: "Your PM walks the home with the renovation team and scopes the work that lifts list price most.",
  },
  {
    heading: "Scope and budget agreed",
    body: "You approve a full renovation scope and total cost before anything starts. No surprises at close.",
  },
  {
    heading: "Renovation runs, you don't",
    body: "Hola Home Services executes the renovation end-to-end. Your PM coordinates and sends weekly status.",
  },
  {
    heading: "List at the after-renovation value",
    body: "The finished home lists under JK Realty on the MLS. Same free listing as any of our sellers get.",
  },
  {
    heading: "Close; renovation settles from proceeds",
    body: "At close, the full renovation cost is paid from sale proceeds. Everything above that, minus standard closing costs, is yours.",
  },
];

const RENO_STATS = [
  { value: "$0", label: "Out of your pocket at any stage" },
  { value: "100%", label: "Of upside above reno cost is yours" },
  { value: "1 PM", label: "From scope walk to closing table" },
  { value: "JK", label: "Realty, your broker of record" },
] as const;

const RENO_REASONS = [
  {
    heading: "You pay for the reno. Just not out of pocket.",
    body: "The full renovation cost is yours. It's settled from sale proceeds at close, not from a check you write before work starts. There's no investor taking a share of your upside.",
  },
  {
    heading: "Still a free MLS listing",
    body: "This is the same zero-seller-commission MLS listing we run on every sale. The renovation is simply bundled in, at your direction and on your dime, settled at close.",
  },
  {
    heading: "You keep 100% of the upside",
    body: (
      <>
        Unlike{" "}
        <Link
          href={LINKS.cashPlusRepairs}
          className="text-brand underline underline-offset-2"
        >
          Cash+
        </Link>
        , there's no investor split on this path. Every dollar the home sells
        for above your renovation cost is yours to keep, net of standard
        closing costs.
      </>
    ),
  },
] as const;

const RENO_SERVICES = [
  {
    label: "Full pre-list renovation scope",
    description: "Structural, systems, cosmetic, chosen for list-price lift.",
  },
  {
    label: "No out-of-pocket funding",
    description: "Renovation cost is settled from sale proceeds at close, not upfront.",
  },
  {
    label: "PM-managed contractors",
    description: "Your PM coordinates the crew and schedule. You don't run the job.",
  },
  {
    label: "ARMLS listing under JK Realty",
    description: "Full Arizona MLS listing at the after-renovation value.",
  },
  {
    label: "Weekly PM check-ins",
    description: "Real status every week. Budget, timeline, value target.",
  },
  {
    label: "Fiduciary representation, free",
    description: "Same PM and broker represent you from scope to close.",
  },
] as const;

const renoFaqExcerpt = faqEntries.filter(
  (entry) =>
    entry.relatedPillar === "renovation-only" ||
    entry.category === "free-and-fair",
);

export const metadata: Metadata = buildMetadata({
  title: PILLAR_NAME,
  description:
    "Full pre-list renovation on your Arizona home, then a free MLS listing at the after-renovation value. Renovation cost settled from sale proceeds at close. Nothing out of pocket.",
  path: LINKS.renovationOnly,
});

export default function RenovationPillar() {
  return (
    <>
      <Hero
        heading="Renovate first. List for more. Pay nothing upfront."
        subcopy={
          <>
            A full pre-list renovation, bundled into your free MLS listing.
            You pay for the renovation in full, just not out of pocket. The
            cost is settled from sale proceeds at close, and everything above
            it is yours.
          </>
        }
        action={
          <AddressSearchBar
            destination={GET_STARTED_HREF}
            buttonLabel="Explore Renovation"
            placeholder="Enter your home address"
          />
        }
      />

      <TrustBar claims={TRUST_BAR_CLAIMS} />

      <StatBar
        eyebrow="What Renovation looks like"
        heading="Full renovation. Free listing. Nothing out of pocket."
        stats={RENO_STATS}
      />

      <FeatureSplit
        tone="soft"
        eyebrow="You pay for it. Just not yet."
        heading="The renovation is yours. The upside above it is too."
        body="You pay for the renovation in full. The difference is when. Instead of funding it out of pocket before work starts, the full cost is settled from sale proceeds at close. There's no investor spread, no uplift share, no seller commission. Every dollar above the reno cost is yours, net of standard closing costs."
        bullets={[
          "Full renovation scope approved by you up front",
          "Settled from sale proceeds at close, not out of pocket",
          "No investor split, you keep every dollar of upside",
          "Same free MLS listing we run on every sale",
        ]}
        cta={{ label: "Meet your PM", href: LINKS.meetYourPm }}
        imageSide="right"
      />

      <NumberedReasons
        eyebrow="Why Renovation works"
        heading="A free listing with a full renovation on deferred terms."
        subcopy="No out-of-pocket cost, no investor taking a share, no seller commission. Just a better-listed home, paid for at the closing table."
        reasons={[...RENO_REASONS]}
        cta={{ label: "Read the full story", href: LINKS.whyItsFree }}
      />

      <HowItWorks
        eyebrow="How it works"
        heading="Five steps, one PM."
        subcopy="The same named PM owns the file from scope walk to closing table."
        steps={[...PILLAR_STEPS]}
        cta={{ label: "Explore Renovation", href: GET_STARTED_HREF }}
      />

      <Testimonial
        eyebrow="Seller story"
        quote="I didn't have to front the renovation. The house looked brand new on the MLS, sold above what I thought possible, and the reno came out of the proceeds at close."
        author={{ name: "Arizona homeowner", title: "Closed via Renovation" }}
      />

      <ServicesBand
        eyebrow="What's included"
        heading="A full renovation and a free listing, both on your terms."
        items={RENO_SERVICES}
      />

      <FAQ
        entries={renoFaqExcerpt}
        eyebrow="Common questions"
        title="What sellers ask us about Renovation."
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
        heading="See whether Renovation fits your home."
        subcopy="Free intake. Your PM will scope the work and show you the math, reno cost, list price, and what you keep, before you commit."
        primaryCta={{
          label: "Explore Renovation",
          href: GET_STARTED_HREF,
        }}
        secondaryCta={{
          label: "Meet your Project Manager",
          href: LINKS.meetYourPm,
        }}
      />

      <JsonLd
        id="ld-service-renovation-only"
        data={serviceSchema(PILLAR_SLUG)}
      />
      <JsonLd
        id="ld-breadcrumb"
        data={breadcrumbSchema(
          BREADCRUMB.map((c) => ({ label: c.label, url: c.href })),
        )}
      />
      <JsonLd
        id="ld-faqpage-renovation"
        data={faqPageSchema(renoFaqExcerpt)}
      />
    </>
  );
}
