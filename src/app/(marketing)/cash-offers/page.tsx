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
import { PLACEHOLDER_HOME_TRUST_CLAIMS } from "@/content/anti-broker/placeholder-claims";

const PILLAR_SLUG = "cash-offers" as const;
const PILLAR_NAME = "Cash Offers";
const GET_STARTED_HREF = `${LINKS.getStarted}?pillar=${PILLAR_SLUG}`;

const BREADCRUMB = [
  { label: "Home", href: LINKS.home },
  { label: PILLAR_NAME, href: LINKS.cashOffers },
];

const PILLAR_STEPS: readonly HowItWorksStep[] = [
  {
    heading: "Tell us about your home",
    body: "A quick intake — address, condition, timing. Enough for your PM to take it to our vetted buyer pool.",
  },
  {
    heading: "Cash offer in 24–48 hours",
    body: "Our vetted investor-buyer pool returns a real, written offer — no obligation, no pressure.",
  },
  {
    heading: "PM walkthrough of the numbers",
    body: "Your PM explains exactly what the net to you looks like, including closing costs, and what's negotiable.",
  },
  {
    heading: "Accept, counter, or pass",
    body: "If the offer isn't right, you walk away free. We'll model a listing or Cash+ path against the same intake if you want.",
  },
  {
    heading: "Close in 7–21 days",
    body: "Cash closes fast — no lender, no appraisal delay. You sign; the proceeds wire on your chosen date.",
  },
];

export const metadata: Metadata = buildMetadata({
  title: PILLAR_NAME,
  description:
    "No-obligation cash offers on Arizona homes from a vetted investor pool, with a close in 7–21 days handled by your Project Manager.",
  path: LINKS.cashOffers,
});

export default function CashOffersPillar() {
  return (
    <>
      <PillarHero
        accent={PILLAR_SLUG}
        breadcrumb={BREADCRUMB}
        heading="A real cash offer. On your timeline. No repairs."
        subcopy={
          <>
            A vetted cash offer within 24–48 hours, close in 7 to 21 days, zero
            repairs required. No obligation to accept, and no fee to you if you
            don’t.
          </>
        }
        primaryCta={{ label: "Get my cash offer", href: GET_STARTED_HREF }}
        secondaryCta={{ label: "See how it works", href: LINKS.howItWorks }}
      />
      <TrustBar claims={PLACEHOLDER_HOME_TRUST_CLAIMS} />
      <HowItWorks
        steps={[...PILLAR_STEPS]}
        cta={{ label: "Get my cash offer", href: GET_STARTED_HREF }}
      />
      <section className="py-12 md:py-16">
        <Container size="prose">
          <h2 className="text-[28px] leading-[36px] md:text-[32px] md:leading-[40px] font-semibold text-ink-title">
            Who pays, and when
          </h2>
          <div className="mt-6 space-y-4 text-[17px] leading-[28px] text-ink-body">
            <p>
              Our cash-offer buyer pool is a limited, vetted group of investors
              we manage directly — not an open marketplace. We earn a small
              spread from the buyer side on a closed transaction, which means
              we get paid only if the deal actually closes. You never pay us a
              fee.
            </p>
            <p>
              A cash offer trades top-of-market price for speed and certainty.
              If speed matters less than the highest possible net, a{" "}
              <Link href={LINKS.listing} className="text-brand underline underline-offset-2">
                full MLS listing
              </Link>{" "}
              usually nets more. Your PM will model both so you can compare.
            </p>
          </div>
        </Container>
      </section>
      <CTASection
        heading="Want to see your offer?"
        subcopy="Intake takes a few minutes. Your offer comes back with real numbers — not a range."
        primaryCta={{ label: "Get my cash offer", href: GET_STARTED_HREF }}
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
    </>
  );
}
