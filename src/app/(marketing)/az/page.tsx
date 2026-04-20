import type { Metadata } from "next";
import Link from "next/link";
import { buildMetadata } from "@/lib/seo";
import { LINKS } from "@/lib/links";
import { SITE } from "@/lib/site";
import { breadcrumbSchema, webPageSchema } from "@/lib/schema";
import { cities } from "@/content/cities/registry";
import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/marketing/page-header";
import { CTASection } from "@/components/marketing/cta-section";
import { JsonLd } from "@/components/marketing/json-ld";

const PAGE_TITLE = "Sell your home in Arizona";
const PAGE_DESCRIPTION =
  "Sell Your House Free serves seven Arizona cities — Phoenix, Tucson, Mesa, Chandler, Scottsdale, Gilbert, Glendale — with a fee-free path under our licensed AZ broker.";

export const metadata: Metadata = buildMetadata({
  title: "Arizona",
  description: PAGE_DESCRIPTION,
  path: "/az",
});

const breadcrumb = [
  { label: "Home", url: LINKS.home },
  { label: "Arizona", url: "/az" },
];

export default function AzIndex() {
  return (
    <>
      <PageHeader
        eyebrow="Arizona"
        heading={PAGE_TITLE}
        subcopy="Pick your city to see the local landing page, or jump straight into the intake."
      />
      <section className="py-12 md:py-16">
        <Container>
          <ul role="list" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {cities.map((city) => (
              <li key={city.slug}>
                <article className="relative h-full rounded-lg border border-border bg-surface p-6 transition-shadow hover:shadow-[var(--shadow-elevated)] focus-within:shadow-[var(--shadow-elevated)]">
                  <h2 className="text-[20px] leading-[28px] font-semibold text-ink-title">
                    <Link
                      href={LINKS.city(city.slug)}
                      className="static md:before:absolute md:before:inset-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                    >
                      {city.displayName}
                    </Link>
                  </h2>
                  <p className="mt-1 text-sm text-ink-muted">{city.county}</p>
                  <p className="mt-3 text-[15px] leading-[24px] text-ink-body">
                    {city.localProofPoint}
                  </p>
                </article>
              </li>
            ))}
          </ul>
        </Container>
      </section>
      <CTASection
        heading="Ready to start a free sale?"
        subcopy="Submit your home and your PM picks it up the same day — no city pre-selection required."
        primaryCta={{ label: "Get my free intake", href: LINKS.getStarted }}
        secondaryCta={{ label: "See how it works", href: LINKS.howItWorks }}
      />
      <JsonLd
        id="ld-webpage"
        data={webPageSchema({
          name: PAGE_TITLE,
          description: PAGE_DESCRIPTION,
          url: `${SITE.url}/az`,
        })}
      />
      <JsonLd id="ld-breadcrumb" data={breadcrumbSchema(breadcrumb)} />
    </>
  );
}
