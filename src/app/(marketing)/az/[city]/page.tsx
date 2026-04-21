import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { buildMetadata } from "@/lib/seo";
import { LINKS } from "@/lib/links";
import { AZ_CITY_SLUGS } from "@/lib/routes";
import {
  breadcrumbSchema,
  localBusinessSchema,
  realEstateAgentSchema,
} from "@/lib/schema";
import { cities, type CityEntry } from "@/content/cities/registry";
import { Container } from "@/components/layout/container";
import { Hero } from "@/components/marketing/hero";
import { TrustBar } from "@/components/marketing/trust-bar";
import { PillarGrid } from "@/components/marketing/pillar-grid";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { CTASection } from "@/components/marketing/cta-section";
import { JsonLd } from "@/components/marketing/json-ld";
import { TRUST_BAR_CLAIMS } from "@/content/anti-broker/trust-bar-claims";
import { HOME_PILLARS } from "@/content/pillars/home-pillars";
import { HOME_HOW_IT_WORKS_STEPS } from "@/content/how-it-works/home-steps";

export const dynamicParams = false;

type CityRouteParams = { city: string };

export async function generateStaticParams(): Promise<CityRouteParams[]> {
  return AZ_CITY_SLUGS.map((slug) => ({ city: slug }));
}

function findCity(slug: string): CityEntry | undefined {
  return cities.find((c) => c.slug === slug);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<CityRouteParams>;
}): Promise<Metadata> {
  const { city: slug } = await params;
  const city = findCity(slug);
  if (!city) return {};
  return buildMetadata({
    title: `Sell your ${city.displayName} home, free, licensed broker, no fees`,
    description: `Sell your ${city.displayName} home for free under our licensed Arizona broker, listing, vetted cash offers, Cash+, or our Renovation path, run by one Project Manager.`,
    path: LINKS.city(city.slug),
  });
}

export default async function CityLander({
  params,
}: {
  params: Promise<CityRouteParams>;
}) {
  const { city: slug } = await params;
  const city = findCity(slug);
  if (!city) notFound();

  const getStartedHref = `${LINKS.getOffer}?city=${city.slug}`;
  const breadcrumb = [
    { label: "Home", url: LINKS.home },
    { label: "Arizona", url: "/az" },
    { label: city.displayName, url: LINKS.city(city.slug) },
  ];

  return (
    <>
      <Hero
        heading={
          <>
            Sell your {city.displayName} home,{" "}
            <span className="whitespace-nowrap">free, licensed broker, no fees.</span>
          </>
        }
        subcopy={city.intro}
        primaryCta={{
          label: `Get my ${city.displayName} cash offer`,
          href: getStartedHref,
        }}
        secondaryCta={{ label: "See how it works", href: LINKS.howItWorks }}
        image={city.heroImage ?? undefined}
      />
      <TrustBar claims={TRUST_BAR_CLAIMS} />
      <section className="py-12 md:py-16">
        <Container size="prose">
          <p className="text-[17px] leading-[28px] text-ink-body">
            {city.localProofPoint}
          </p>
          {city.neighborhoodsSampled.length > 0 ? (
            <p className="mt-3 text-[15px] leading-[24px] text-ink-muted">
              Neighborhoods we work in: {city.neighborhoodsSampled.join(", ")}.
            </p>
          ) : null}
        </Container>
      </section>
      <PillarGrid pillars={[...HOME_PILLARS]} />
      <HowItWorks
        steps={[...HOME_HOW_IT_WORKS_STEPS]}
        cta={{
          label: `Start my ${city.displayName} sale`,
          href: getStartedHref,
        }}
      />
      <CTASection
        heading={`Ready to see your ${city.displayName} offer?`}
        subcopy={`Tell us about your ${city.displayName} home and your PM will model every path with real numbers.`}
        primaryCta={{
          label: `Get my ${city.displayName} cash offer`,
          href: getStartedHref,
        }}
        secondaryCta={{ label: "Common questions", href: LINKS.faq }}
      />
      <JsonLd
        id="ld-local-business"
        data={localBusinessSchema(city)}
      />
      <JsonLd
        id="ld-real-estate-agent"
        data={realEstateAgentSchema({ city: city.displayName })}
      />
      <JsonLd id="ld-breadcrumb" data={breadcrumbSchema(breadcrumb)} />
    </>
  );
}
