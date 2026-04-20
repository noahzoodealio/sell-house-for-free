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

const PILLAR_SLUG = "cash-plus-repairs" as const;
const PILLAR_NAME = "Cash+ with Repairs";
const GET_STARTED_HREF = `${LINKS.getStarted}?pillar=${PILLAR_SLUG}`;

const BREADCRUMB = [
  { label: "Home", href: LINKS.home },
  { label: PILLAR_NAME, href: LINKS.cashPlusRepairs },
];

const PILLAR_STEPS: readonly HowItWorksStep[] = [
  {
    heading: "Intake & scope",
    body: "Intake plus a walk of the property with your PM. We identify which repairs and cosmetic upgrades move the after-repair value (ARV) most.",
  },
  {
    heading: "Investor match",
    body: "An investor partner funds the agreed scope upfront. The contract names who pays for what and the ARV the listing will target.",
  },
  {
    heading: "Repairs (1–8 weeks)",
    body: "Your PM coordinates the contractors end-to-end. You don't manage the crew or the bills.",
  },
  {
    heading: "MLS listing at the higher ARV",
    body: "The refreshed home lists under JK Realty on the MLS at the targeted ARV — standard buyer-broker treatment.",
  },
  {
    heading: "Close & split the uplift",
    body: "At close, the investor is paid back their funded scope plus their agreed share of the ARV uplift. You keep the rest.",
  },
];

export const metadata: Metadata = buildMetadata({
  title: PILLAR_NAME,
  description:
    "Investor-funded pre-list repairs for Arizona homes, then a conventional MLS listing at the higher ARV — no money out of your pocket.",
  path: LINKS.cashPlusRepairs,
});

export default function CashPlusRepairsPillar() {
  return (
    <>
      <PillarHero
        accent={PILLAR_SLUG}
        breadcrumb={BREADCRUMB}
        heading="Your home, improved — before it hits the MLS."
        subcopy={
          <>
            A partner investor funds pre-list repairs and cosmetic upgrades up
            front. The home then lists at a higher after-repair value, and you
            keep the spread above what the investor put in. No money out of
            your pocket.
          </>
        }
        primaryCta={{ label: "See my Cash+ path", href: GET_STARTED_HREF }}
        secondaryCta={{ label: "See how it works", href: LINKS.howItWorks }}
      />
      <TrustBar claims={PLACEHOLDER_HOME_TRUST_CLAIMS} />
      <HowItWorks
        steps={[...PILLAR_STEPS]}
        cta={{ label: "See my Cash+ path", href: GET_STARTED_HREF }}
      />
      <section className="py-12 md:py-16">
        <Container size="prose">
          <h2 className="text-[28px] leading-[36px] md:text-[32px] md:leading-[40px] font-semibold text-ink-title">
            Who pays, and the honest trade-offs
          </h2>
          <div className="mt-6 space-y-4 text-[17px] leading-[28px] text-ink-body">
            <p>
              The investor funds the agreed repair scope at the start. At
              close, the investor is paid back their funded amount plus a share
              of the ARV uplift; you keep the remainder above your original
              listing floor. You pay nothing up front, and we only earn on the
              buyer side at close — never a seller fee.
            </p>
            <p>
              The honest trade-offs: repair timelines can stretch past the
              estimate, the repair budget can come in higher than the initial
              scope, and the ARV is a forecast — the final sale price can miss
              it in either direction. Your PM names these up front, in the
              contract and in every weekly check-in.
            </p>
            <p>
              If the repair timeline or the ARV uncertainty feels too much, a
              straight{" "}
              <Link href={LINKS.cashOffers} className="text-brand underline underline-offset-2">
                cash offer
              </Link>{" "}
              removes both — faster, lower net. A conventional{" "}
              <Link href={LINKS.listing} className="text-brand underline underline-offset-2">
                listing
              </Link>{" "}
              keeps more upside but asks you to fund any repairs yourself.
            </p>
          </div>
        </Container>
      </section>
      <CTASection
        heading="See whether Cash+ fits your home."
        subcopy="We'll model the numbers — funded scope, ARV target, your keep — before you commit to anything."
        primaryCta={{ label: "See my Cash+ path", href: GET_STARTED_HREF }}
        secondaryCta={{ label: "Common questions", href: LINKS.faq }}
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
    </>
  );
}
