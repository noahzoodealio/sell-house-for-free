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

const PILLAR_SLUG = "renovation-only" as const;
const PILLAR_NAME = "Renovation-Only";
const GET_STARTED_HREF = `${LINKS.getStarted}?pillar=${PILLAR_SLUG}`;

const BREADCRUMB = [
  { label: "Home", href: LINKS.home },
  { label: PILLAR_NAME, href: LINKS.renovationOnly },
];

const PILLAR_STEPS: readonly HowItWorksStep[] = [
  {
    heading: "Intake",
    body: "Your PM captures the home's current state, your timeline, and the net you're targeting.",
  },
  {
    heading: "Hola Home scope",
    body: "Hola Home — our third-party renovation partner — walks the property and proposes a renovation scope and budget.",
  },
  {
    heading: "Renovation",
    body: "Hola Home executes the renovation end-to-end. Your PM keeps you informed through weekly status; you don't run the job.",
  },
  {
    heading: "MLS listing at the new value",
    body: "Once complete, the renovated home lists under JK Realty on the MLS at the new, higher valuation — no cash-offer component.",
  },
  {
    heading: "Close",
    body: "Buyer-broker commission flows from sale proceeds at close. Hola Home's commission is structured on the investor side, not as a seller fee.",
  },
];

export const metadata: Metadata = buildMetadata({
  title: PILLAR_NAME,
  description:
    "Renovate an Arizona home first via Hola Home, then list conventionally under JK Realty at the post-renovation value — the site's unique differentiator.",
  path: LINKS.renovationOnly,
});

export default function RenovationOnlyPillar() {
  return (
    <>
      <PillarHero
        accent={PILLAR_SLUG}
        breadcrumb={BREADCRUMB}
        heading="Renovate first. Then list for maximum upside."
        subcopy={
          <>
            Hola Home — our third-party renovation partner — renovates the
            home, then it lists conventionally under JK Realty on the Arizona
            MLS. There’s no cash-offer component; this is the path we call
            Renovation-Only.
          </>
        }
        primaryCta={{ label: "Explore Renovation-Only", href: GET_STARTED_HREF }}
        secondaryCta={{ label: "See how it works", href: LINKS.howItWorks }}
      />
      <TrustBar claims={TRUST_BAR_CLAIMS} />
      <HowItWorks
        steps={[...PILLAR_STEPS]}
        cta={{ label: "Explore Renovation-Only", href: GET_STARTED_HREF }}
      />
      <section className="py-12 md:py-16">
        <Container size="prose">
          <h2 className="text-[28px] leading-[36px] md:text-[32px] md:leading-[40px] font-semibold text-ink-title">
            What Renovation-Only actually is
          </h2>
          <div className="mt-6 space-y-4 text-[17px] leading-[28px] text-ink-body">
            <p>
              Renovation-Only is the path we run on this site — a Project
              Manager on our Arizona team, Hola Home executing the renovation,
              and JK Realty listing the finished home. It’s a differentiator of{" "}
              <em>this site</em>, not a distinct product on a broader
              Offervana platform. We name that plainly because the trust
              posture of this site matters more than looking larger than we
              are.
            </p>
            <p>
              Hola Home’s commission is structured so the investor earns on
              the resale rather than billing you. You don’t fund the
              renovation out of pocket, and we don’t charge a seller fee.
            </p>
            <p>
              The trade-off is timeline and upside. Renovation stretches the
              calendar but keeps more of the post-renovation value with you
              than a{" "}
              <Link href={LINKS.cashPlusRepairs} className="text-brand underline underline-offset-2">
                Cash+ with Repairs
              </Link>{" "}
              split. If speed matters more than upside, a{" "}
              <Link href={LINKS.cashOffers} className="text-brand underline underline-offset-2">
                cash offer
              </Link>{" "}
              removes the timeline entirely.
            </p>
          </div>
        </Container>
      </section>
      <CTASection
        heading="Ready to walk the property?"
        subcopy="Your PM and Hola Home will scope the renovation against your target net — no commitment until you agree."
        primaryCta={{ label: "Explore Renovation-Only", href: GET_STARTED_HREF }}
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
    </>
  );
}
