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

const PILLAR_SLUG = "cash-plus-repairs" as const;
const PILLAR_NAME = "Cash+";
const GET_STARTED_HREF = getOfferFor(PILLAR_SLUG);

const BREADCRUMB = [
  { label: "Home", href: LINKS.home },
  { label: PILLAR_NAME, href: LINKS.cashPlusRepairs },
];

const PILLAR_STEPS: readonly HowItWorksStep[] = [
  {
    heading: "Walk-through with your PM",
    body: "Your PM walks the home and scopes the repairs and cosmetic upgrades that move the after-repair value most.",
  },
  {
    heading: "Investor funds the scope",
    body: "A partner investor funds the agreed scope up front. The contract names who pays for what and the ARV the listing will target.",
  },
  {
    heading: "Repairs run, you don't",
    body: "Your PM coordinates the crew end-to-end. You don't manage contractors, schedules, or bills.",
  },
  {
    heading: "List at the higher ARV",
    body: "The refreshed home lists under JK Realty on the MLS at the targeted after-repair value.",
  },
  {
    heading: "Close and keep the spread",
    body: "At close, the investor is paid back their scope plus their agreed share. You keep the rest.",
  },
];

const CASH_PLUS_STATS = [
  { value: "$0", label: "Out of your pocket, ever" },
  { value: "ARV", label: "List price, not current value" },
  { value: "1 PM", label: "Coordinates the whole job" },
  { value: "JK", label: "Realty, your broker of record" },
] as const;

const CASH_PLUS_REASONS = [
  {
    heading: "The repair money isn't yours",
    body: "An investor partner funds the agreed scope before a single contractor starts. You don't front the work, and you don't reimburse it out of pocket.",
  },
  {
    heading: "You list at the after-repair value",
    body: "A refreshed home on the MLS lists and shows at a higher number. That is the whole point of funding repairs first.",
  },
  {
    heading: "Compare against the alternatives",
    body: (
      <>
        Not sure Cash+ fits? Your PM can model a straight{" "}
        <Link
          href={LINKS.cashOffers}
          className="text-brand underline underline-offset-2"
        >
          cash offer
        </Link>{" "}
        or a conventional{" "}
        <Link
          href={LINKS.listing}
          className="text-brand underline underline-offset-2"
        >
          listing
        </Link>{" "}
        on the same intake so you can pick with the numbers side by side.
      </>
    ),
  },
] as const;

const CASH_PLUS_SERVICES = [
  {
    label: "ARV-targeted scope",
    description: "Repairs chosen for ARV lift, not vanity upgrades.",
  },
  {
    label: "Investor-funded repairs",
    description: "Partner capital covers the agreed scope up front.",
  },
  {
    label: "PM-managed contractors",
    description: "Your PM coordinates the crew. You don't handle schedules or invoices.",
  },
  {
    label: "ARMLS listing under JK Realty",
    description: "Full Arizona MLS listing once the home is show-ready.",
  },
  {
    label: "Weekly PM check-ins",
    description: "Real status every week. Budget, timeline, ARV, no surprises.",
  },
  {
    label: "Fiduciary representation, free",
    description: "Same PM and broker on your side from scope to close.",
  },
] as const;

const cashPlusFaqExcerpt = faqEntries.filter(
  (entry) =>
    entry.relatedPillar === "cash-plus-repairs" ||
    entry.category === "free-and-fair",
);

export const metadata: Metadata = buildMetadata({
  title: PILLAR_NAME,
  description:
    "Investor-funded pre-list repairs on Arizona homes, then a conventional MLS listing at the higher after-repair value. Zero out of pocket, represented for free.",
  path: LINKS.cashPlusRepairs,
});

export default function CashPlusRepairsPillar() {
  return (
    <>
      <Hero
        heading="Fix the home first. Sell for more."
        subcopy={
          <>
            An investor partner funds pre-list repairs. The home lists at the
            higher after-repair value, and you keep the spread. Zero out of
            pocket, represented the whole way.
          </>
        }
        action={
          <AddressSearchBar
            destination={GET_STARTED_HREF}
            buttonLabel="See my Cash+ path"
            placeholder="Enter your home address"
          />
        }
      />

      <TrustBar claims={TRUST_BAR_CLAIMS} />

      <StatBar
        eyebrow="What Cash+ looks like"
        heading="Funded repairs. Higher ARV. Zero out of pocket."
        stats={CASH_PLUS_STATS}
      />

      <FeatureSplit
        tone="soft"
        eyebrow="Funded by an investor, run by your PM"
        heading="The repair money isn't yours. The upside is."
        body="A partner investor funds the agreed scope before the first contractor shows up. Your PM runs the crew, manages the budget, and hands the refreshed home to the listing team. You don't write a check at any point."
        bullets={[
          "Investor capital covers the full agreed scope",
          "PM coordinates contractors, schedule, and budget",
          "Home lists on the MLS at the after-repair value",
          "You pocket the spread above the funded amount",
        ]}
        cta={{ label: "Meet your PM", href: LINKS.meetYourPm }}
        imageSide="right"
      />

      <NumberedReasons
        eyebrow="Why Cash+ works"
        heading="You skip the cost of fixing. You keep the benefit of fixing."
        subcopy="The investor earns on their funded share. You keep the rest. Represented by a licensed broker the entire time."
        reasons={[...CASH_PLUS_REASONS]}
        cta={{ label: "Read the full story", href: LINKS.whyItsFree }}
      />

      <HowItWorks
        eyebrow="How it works"
        heading="Five steps, one PM."
        subcopy="The same named PM owns the file from scope walk to closing table."
        steps={[...PILLAR_STEPS]}
        cta={{ label: "See my Cash+ path", href: GET_STARTED_HREF }}
      />

      <Testimonial
        eyebrow="Seller story"
        quote="The crew started the week after I signed. My PM handled the whole job. The list price came in well above what I thought the home would sell for."
        author={{ name: "Arizona homeowner", title: "Closed via Cash+" }}
      />

      <ServicesBand
        eyebrow="What's included"
        heading="Everything a pre-list renovation needs, none on your tab."
        items={CASH_PLUS_SERVICES}
      />

      <FAQ
        entries={cashPlusFaqExcerpt}
        eyebrow="Common questions"
        title="What sellers ask us about Cash+."
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
        heading="See whether Cash+ fits your home."
        subcopy="Free intake. Your PM models the funded scope, the ARV target, and what you keep before you commit to anything."
        primaryCta={{
          label: "See my Cash+ path",
          href: GET_STARTED_HREF,
        }}
        secondaryCta={{
          label: "Meet your Project Manager",
          href: LINKS.meetYourPm,
        }}
      />

      <JsonLd
        id="ld-service-cash-plus-repairs"
        data={serviceSchema(PILLAR_SLUG)}
      />
      <JsonLd
        id="ld-breadcrumb"
        data={breadcrumbSchema(
          BREADCRUMB.map((c) => ({ label: c.label, url: c.href })),
        )}
      />
      <JsonLd
        id="ld-faqpage-cash-plus-repairs"
        data={faqPageSchema(cashPlusFaqExcerpt)}
      />
    </>
  );
}
