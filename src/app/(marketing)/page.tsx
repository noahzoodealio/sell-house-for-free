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
import { LogoBand } from "@/components/marketing/logo-band";
import { FAQ } from "@/components/marketing/faq";
import { CTASection } from "@/components/marketing/cta-section";
import { JsonLd } from "@/components/marketing/json-ld";
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

const HOME_STATS = [
  { value: "$0", label: "Fees charged to you, ever" },
  { value: "1 PM", label: "Real person handling your sale" },
  { value: "4", label: "Ways to sell, all free" },
  { value: "100%", label: "Arizona-licensed broker of record" },
] as const;

const HOME_REASONS = [
  {
    heading: "Zero fees means zero surprises",
    body: "You pay what closing itself costs — taxes, title, recording. Never a fee to us. We are funded by buyer-side and partner relationships, never by the seller.",
  },
  {
    heading: "Four paths, not one",
    body: "Cash offer, cash-plus-repairs, renovation-first, or classic MLS listing. Your Project Manager matches the path to your goals, not the other way around.",
  },
  {
    heading: "A real broker, a real PM",
    body: "Listed through JK Realty, a licensed Arizona broker. Handled by a Project Manager whose name you know before day one — no call centers, no handoffs.",
  },
] as const;

const HOME_LOGOS = [
  { label: "JK Realty" },
  { label: "ARMLS" },
  { label: "Hola Home" },
  { label: "AAR" },
  { label: "NAR" },
  { label: "Zoodealio" },
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
            <br className="hidden md:inline" />{" "}
            No listing fees. No data resale.
          </>
        }
        subcopy={
          <>
            A licensed-broker service for Arizona homeowners — cash offers,
            repair-funded listings, MLS, or full renovation-first sales, all
            under one Project Manager. You only pay what closing itself costs.
            Never a fee to us.
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
        heading="Four ways to sell — pick the one that fits your home."
        subcopy="Every path is routed through JK Realty as broker of record and a single Project Manager who stays with you until keys change hands."
        pillars={[...HOME_PILLARS]}
      />

      <FeatureSplit
        tone="soft"
        eyebrow="One point of contact"
        heading="A real Project Manager, every step from offer to close."
        body="Your PM coordinates cash offers, listing prep, repair funding, and buyer negotiations — and stays with you until keys change hands."
        bullets={[
          "Real phone number, real name, real email",
          "Coordinates with JK Realty and buyer-side partners",
          "No handoffs to junior agents or call centers",
          "Available for questions at every stage of the sale",
        ]}
        cta={{ label: "Meet your PM", href: LINKS.meetYourPm }}
        imageSide="right"
      />

      <NumberedReasons
        eyebrow="Why Sell Your House Free"
        heading="Built for sellers — not for broker commissions."
        subcopy="We do not charge you. We do not resell your data. We do not push you toward one path. Everything else is detail."
        reasons={HOME_REASONS}
        cta={{ label: "Read the full story", href: LINKS.whyItsFree }}
      />

      <HowItWorks
        eyebrow="How it works"
        heading="Four steps, no pressure."
        subcopy="Start with a cash offer or a listing plan — we will pick the right path together on the first call."
        steps={[...HOME_HOW_IT_WORKS_STEPS]}
        cta={{ label: "Learn more about the process", href: LINKS.howItWorks }}
      />

      <Testimonial
        eyebrow="Seller story"
        quote="My PM explained every option up front, handled the broker paperwork, and closed in under three weeks. I never wrote a check to anyone but the title company."
        author={{ name: "Arizona homeowner", title: "Closed via cash offer" }}
      />

      <LogoBand
        eyebrow="Our partners"
        heading="Backed by licensed Arizona real estate."
        logos={HOME_LOGOS}
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
        tone="brand"
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
