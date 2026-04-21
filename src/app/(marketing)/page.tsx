import type { Metadata } from "next";
import Link from "next/link";
import { buildMetadata } from "@/lib/seo";
import { LINKS } from "@/lib/links";
import { entries as faqEntries } from "@/content/faq/entries";
import { organizationSchema, faqPageSchema } from "@/lib/schema";
import { Container } from "@/components/layout/container";
import { Hero } from "@/components/marketing/hero";
import { AddressSearchBar } from "@/components/marketing/address-search-bar";
import { StatBar } from "@/components/marketing/stat-bar";
import { PillarGrid } from "@/components/marketing/pillar-grid";
import { FeatureSplit } from "@/components/marketing/feature-split";
import { NumberedReasons } from "@/components/marketing/numbered-reasons";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { Testimonial } from "@/components/marketing/testimonial";
import { ServicesBand } from "@/components/marketing/services-band";
import { FAQ } from "@/components/marketing/faq";
import { CTASection } from "@/components/marketing/cta-section";
import { JsonLd } from "@/components/marketing/json-ld";
import { HOME_PILLARS } from "@/content/pillars/home-pillars";
import { HOME_HOW_IT_WORKS_STEPS } from "@/content/how-it-works/home-steps";

const HOME_TITLE =
  "Sell Your House Free. Free Arizona cash offers, no fees, real PM";
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

const HOME_STATS = [
  { value: "$0", label: "Fees charged to you, ever" },
  { value: "1 PM", label: "Real person handling your sale" },
  { value: "4", label: "Ways to sell, all free" },
  { value: "100%", label: "Arizona-licensed broker of record" },
] as const;

const HOME_REASONS = [
  {
    heading: "Zero fees means zero surprises",
    body: "You pay what closing itself costs: taxes, title, recording. Never a fee to us. We are funded by buyer-side and partner relationships, never by the seller.",
  },
  {
    heading: "Four paths, not one",
    body: "Cash offer, cash-plus-repairs, renovation-first, or classic MLS listing. Your Project Manager matches the path to your goals, not the other way around.",
  },
  {
    heading: "A real broker, a real PM",
    body: "Every sale runs through a licensed Arizona broker of record and a Project Manager whose name you know before day one. No call centers, no handoffs.",
  },
] as const;

const HOME_SERVICES = [
  {
    label: "Real MLS listings",
    description: "Full syndication on ARMLS and every major buyer site.",
  },
  {
    label: "Paperwork handled for you",
    description: "Contracts, disclosures, and addenda drafted and reviewed.",
  },
  {
    label: "Negotiation assistance",
    description: "Your PM counters, concedes, and defends your bottom line.",
  },
  {
    label: "Licensed AZ broker of record",
    description: "Every transaction closes under a licensed Arizona brokerage.",
  },
  {
    label: "Title and escrow coordination",
    description: "We line up title, escrow, and closing logistics end-to-end.",
  },
  {
    label: "Dedicated Project Manager",
    description: "One named point of contact from first call to keys handed over.",
  },
] as const;

function RatingBadge() {
  return (
    <div className="inline-flex items-center gap-3 text-[14px]">
      <span
        aria-hidden="true"
        className="flex items-center gap-0.5 text-[#f5b301]"
      >
        {[0, 1, 2, 3, 4].map((i) => (
          <svg
            key={i}
            viewBox="0 0 20 20"
            className="size-4"
            fill="currentColor"
          >
            <path d="M10 1.5l2.6 5.5 6 .9-4.3 4.2 1 6-5.3-2.8L4.7 18l1-6L1.4 7.9l6-.9L10 1.5z" />
          </svg>
        ))}
      </span>
      <span className="font-semibold text-ink-title">4.9</span>
      <span className="text-ink-muted">· Sellers who closed with us</span>
    </div>
  );
}

export default function Home() {
  return (
    <>
      <Hero
        eyebrow="Arizona homeowners"
        heading={
          <>
            Sell your Arizona home{" "}
            <span className="text-brand">for free.</span>
          </>
        }
        subcopy={
          <>
            Four ways to sell, zero seller fees, one Project Manager from
            offer to close.
          </>
        }
        action={
          <AddressSearchBar
            destination={LINKS.getStarted}
            buttonLabel="Get my cash offer"
            placeholder="Enter your home address"
          />
        }
        trailing={<RatingBadge />}
      />

      <StatBar
        eyebrow="What makes it free"
        heading="Four promises that hold from first call to closing day."
        stats={HOME_STATS}
      />

      <PillarGrid
        eyebrow="Put your sale on autopilot"
        heading="Four ways to sell. Pick the one that fits your home."
        subcopy="Every path runs under a licensed Arizona broker of record and a single Project Manager who stays with you until keys change hands."
        pillars={[...HOME_PILLARS]}
      />

      <FeatureSplit
        tone="soft"
        eyebrow="One point of contact"
        heading="A real Project Manager, every step from offer to close."
        body="Your PM coordinates cash offers, listing prep, repair funding, and buyer negotiations, then stays with you until keys change hands."
        bullets={[
          "Real phone number, real name, real email",
          "Coordinates with the broker of record and buyer-side partners",
          "No handoffs to junior agents or call centers",
          "Available for questions at every stage of the sale",
        ]}
        cta={{ label: "Meet your PM", href: LINKS.meetYourPm }}
        imageSide="right"
      />

      <NumberedReasons
        eyebrow="Why Sell Your House Free"
        heading="Built for sellers, not for broker commissions."
        subcopy="We do not charge you. We do not resell your data. We do not push you toward one path. Everything else is detail."
        reasons={HOME_REASONS}
        cta={{ label: "Read the full story", href: LINKS.whyItsFree }}
      />

      <HowItWorks
        eyebrow="How it works"
        heading="Four steps, no pressure."
        subcopy="Start with a cash offer or a listing plan. We will pick the right path together on the first call."
        steps={[...HOME_HOW_IT_WORKS_STEPS]}
        cta={{ label: "Learn more about the process", href: LINKS.howItWorks }}
      />

      <Testimonial
        eyebrow="Seller story"
        quote="My PM explained every option up front, handled the broker paperwork, and closed in under three weeks. I never wrote a check to anyone but the title company."
        author={{ name: "Arizona homeowner", title: "Closed via cash offer" }}
      />

      <ServicesBand
        eyebrow="What's included"
        heading="Everything a full-service sale needs, zero seller fees."
        items={HOME_SERVICES}
      />

      <FAQ
        entries={homeFaqExcerpt}
        eyebrow="Common questions"
        title="Answers to what sellers ask us first."
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
        heading="Ready to see your cash offer?"
        subcopy="Get your free, no-obligation cash offer in minutes. A real PM reviews every response."
        primaryCta={{ label: "Get my cash offer", href: LINKS.getOffer }}
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
