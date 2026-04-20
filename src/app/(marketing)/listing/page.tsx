import type { Metadata } from "next";
import Link from "next/link";
import { buildMetadata } from "@/lib/seo";
import { LINKS } from "@/lib/links";
import { breadcrumbSchema, serviceSchema } from "@/lib/schema";
import { Container } from "@/components/layout/container";
import { PillarHero } from "@/components/marketing/pillar-hero";
import { TrustBar } from "@/components/marketing/trust-bar";
import { HowItWorks } from "@/components/marketing/how-it-works";
import type { HowItWorksStep } from "@/components/marketing/how-it-works";
import { CTASection } from "@/components/marketing/cta-section";
import { JsonLd } from "@/components/marketing/json-ld";
import { TRUST_BAR_CLAIMS } from "@/content/anti-broker/trust-bar-claims";

const PILLAR_SLUG = "listing" as const;
const PILLAR_NAME = "Listing + MLS";
const GET_STARTED_HREF = `${LINKS.getStarted}?pillar=${PILLAR_SLUG}`;

const BREADCRUMB = [
  { label: "Home", href: LINKS.home },
  { label: PILLAR_NAME, href: LINKS.listing },
];

const PILLAR_STEPS: readonly HowItWorksStep[] = [
  {
    heading: "Tell us about your home",
    body: "A quick intake: address, bed/bath, condition, timing. Your PM starts the file the same day.",
  },
  {
    heading: "Photography & pricing",
    body: "We coordinate professional photos and set the list price using comps your PM walks you through.",
  },
  {
    heading: "Go live on the MLS",
    body: "Your home lists under JK Realty on the Arizona MLS — syndicated to every major buyer site.",
  },
  {
    heading: "PM-assisted offer review",
    body: "Every offer comes through your PM. We review terms together; you decide which to counter, accept, or pass on.",
  },
  {
    heading: "Close",
    body: "We coordinate title, inspections, and the buyer-broker side through to close. You sign; the proceeds wire.",
  },
];

export const metadata: Metadata = buildMetadata({
  title: PILLAR_NAME,
  description:
    "Full-service MLS listing in Arizona with no seller commission — listing and transaction handled under JK Realty.",
  path: LINKS.listing,
});

export default function ListingPillar() {
  return (
    <>
      <PillarHero
        accent={PILLAR_SLUG}
        breadcrumb={BREADCRUMB}
        heading="Free MLS listing. No seller commission."
        subcopy={
          <>
            List your Arizona home on the MLS under JK Realty without paying a
            seller-side commission. The buyer-broker side is paid from sale
            proceeds at closing — standard market practice — so you never write
            us a check.
          </>
        }
        primaryCta={{ label: "Get my free listing started", href: GET_STARTED_HREF }}
        secondaryCta={{ label: "See how it works", href: LINKS.howItWorks }}
      />
      <TrustBar claims={TRUST_BAR_CLAIMS} />
      <HowItWorks
        steps={[...PILLAR_STEPS]}
        cta={{ label: "Start my free listing", href: GET_STARTED_HREF }}
      />
      <section className="py-12 md:py-16">
        <Container size="prose">
          <h2 className="text-[28px] leading-[36px] md:text-[32px] md:leading-[40px] font-semibold text-ink-title">
            How this stays free for you
          </h2>
          <div className="mt-6 space-y-4 text-[17px] leading-[28px] text-ink-body">
            <p>
              Arizona sellers traditionally pay both sides of the broker
              commission at closing. We cover the seller side entirely. The
              buyer-broker commission still flows from the sale proceeds — the
              market-standard practice every MLS listing uses — and never
              comes out of your pocket as a separate bill.
            </p>
            <p>
              If a closing doesn’t happen, you owe nothing. There’s no listing
              fee, no marketing fee, no “premium tier.” If the listing path
              doesn’t feel like the right fit, your PM can model a{" "}
              <Link href={LINKS.cashOffers} className="text-brand underline underline-offset-2">
                cash offer
              </Link>{" "}
              or{" "}
              <Link href={LINKS.cashPlusRepairs} className="text-brand underline underline-offset-2">
                Cash+ with Repairs
              </Link>{" "}
              path against the same intake — you choose what to move on.
            </p>
          </div>
        </Container>
      </section>
      <CTASection
        heading="Ready to list?"
        subcopy="Your PM will price the home, set the listing date, and walk you through every offer."
        primaryCta={{ label: "Get my free listing started", href: GET_STARTED_HREF }}
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
    </>
  );
}
