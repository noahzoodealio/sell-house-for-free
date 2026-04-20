import type {
  BreadcrumbList,
  FAQPage,
  HowTo,
  LocalBusiness,
  Organization,
  RealEstateAgent,
  Service,
  WebPage,
  WithContext,
} from "schema-dts";

import type { FaqEntry } from "@/content/faq/entries";
import { SITE } from "./site";

type Pillar =
  | "listing"
  | "cash-offers"
  | "cash-plus-repairs"
  | "renovation-only";

// TODO(E2-S10): replace with `import type { CityEntry } from "@/content/cities/registry"`.
type CityEntryShape = {
  slug: string;
  displayName: string;
  geo?: { latitude: number; longitude: number };
};

const SCHEMA_CONTEXT = "https://schema.org" as const;

const PILLAR_META: Record<
  Pillar,
  { name: string; description: string; serviceType: string }
> = {
  listing: {
    name: "Listing + MLS",
    description:
      "Full-service MLS listing at zero cost to the seller, covered by the buyer-side commission standard in Arizona.",
    serviceType: "Real estate listing",
  },
  "cash-offers": {
    name: "Cash Offers",
    description:
      "Vetted cash offers from investor buyers with a fast close, when certainty and speed outweigh top-of-market pricing.",
    serviceType: "Cash home buying",
  },
  "cash-plus-repairs": {
    name: "Cash+ with Repairs",
    description:
      "Cash-funded repairs and improvements before listing on the MLS, so the home sells for a higher price — no out-of-pocket cost to the seller.",
    serviceType: "Pre-list renovation with cash-backed repairs",
  },
  "renovation-only": {
    name: "Renovation-Only",
    description:
      "Hola Home renovates the property first, then the home goes to the MLS without a cash-offer component — maximum upside for sellers with time.",
    serviceType: "Renovation-first listing",
  },
};

export function organizationSchema(): WithContext<Organization> {
  return {
    "@context": SCHEMA_CONTEXT,
    "@type": "Organization",
    name: SITE.name,
    url: SITE.url,
    logo: `${SITE.url}/opengraph-image`,
    description: SITE.description,
  };
}

export function realEstateAgentSchema(): WithContext<RealEstateAgent> {
  return {
    "@context": SCHEMA_CONTEXT,
    "@type": "RealEstateAgent",
    name: SITE.name,
    url: SITE.url,
    parentOrganization: {
      "@type": "Organization",
      name: SITE.broker.name,
    },
    areaServed: [
      {
        "@type": "State",
        name: "Arizona",
      },
    ],
    description: SITE.description,
  };
}

export function serviceSchema(pillar: Pillar): WithContext<Service> {
  const meta = PILLAR_META[pillar];
  return {
    "@context": SCHEMA_CONTEXT,
    "@type": "Service",
    name: meta.name,
    description: meta.description,
    serviceType: meta.serviceType,
    areaServed: "Arizona",
    provider: {
      "@type": "RealEstateAgent",
      name: SITE.name,
      url: SITE.url,
      parentOrganization: {
        "@type": "Organization",
        name: SITE.broker.name,
      },
    },
  };
}

export function faqPageSchema(
  entries: ReadonlyArray<FaqEntry>,
): WithContext<FAQPage> {
  return {
    "@context": SCHEMA_CONTEXT,
    "@type": "FAQPage",
    mainEntity: entries.map((entry) => ({
      "@type": "Question",
      name: entry.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: entry.answer,
      },
    })),
  };
}

export function localBusinessSchema(
  city: CityEntryShape,
): WithContext<LocalBusiness> {
  return {
    "@context": SCHEMA_CONTEXT,
    "@type": "LocalBusiness",
    name: `${SITE.name} — ${city.displayName}`,
    url: `${SITE.url}/az/${city.slug}`,
    areaServed: city.displayName,
    address: {
      "@type": "PostalAddress",
      addressRegion: SITE.broker.stateOfRecord,
      addressLocality: city.displayName,
    },
    ...(city.geo && {
      geo: {
        "@type": "GeoCoordinates",
        latitude: city.geo.latitude,
        longitude: city.geo.longitude,
      },
    }),
    parentOrganization: {
      "@type": "Organization",
      name: SITE.name,
      url: SITE.url,
    },
  };
}

export function breadcrumbSchema(
  trail: ReadonlyArray<{ label: string; url: string }>,
): WithContext<BreadcrumbList> {
  return {
    "@context": SCHEMA_CONTEXT,
    "@type": "BreadcrumbList",
    itemListElement: trail.map((item, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: item.label,
      item: `${SITE.url}${item.url}`,
    })),
  };
}

export function webPageSchema(meta: {
  name: string;
  description: string;
  url: string;
}): WithContext<WebPage> {
  return {
    "@context": SCHEMA_CONTEXT,
    "@type": "WebPage",
    name: meta.name,
    description: meta.description,
    url: meta.url.startsWith("http") ? meta.url : `${SITE.url}${meta.url}`,
    isPartOf: {
      "@type": "WebSite",
      name: SITE.name,
      url: SITE.url,
    },
  };
}

export function howToSchema(
  meta: { name: string; description: string },
  steps: ReadonlyArray<{ heading: string; body: string }>,
): WithContext<HowTo> {
  return {
    "@context": SCHEMA_CONTEXT,
    "@type": "HowTo",
    name: meta.name,
    description: meta.description,
    step: steps.map((step, idx) => ({
      "@type": "HowToStep",
      position: idx + 1,
      name: step.heading,
      text: step.body,
    })),
  };
}
