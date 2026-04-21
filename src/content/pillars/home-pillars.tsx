import { LINKS } from "@/lib/links";
import type { Pillar } from "@/components/marketing/pillar-grid";

const svgProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  className: "size-6",
};

function IconListing() {
  return (
    <svg {...svgProps}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
      <path d="M9 13h6M9 17h4" />
    </svg>
  );
}

function IconCash() {
  return (
    <svg {...svgProps}>
      <rect x="2.5" y="6.5" width="19" height="11" rx="2" />
      <circle cx="12" cy="12" r="2.75" />
      <circle cx="6" cy="12" r="0.5" fill="currentColor" stroke="none" />
      <circle cx="18" cy="12" r="0.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconCashPlus() {
  return (
    <svg {...svgProps}>
      <path d="M3 17l6-6 4 4 7-7" />
      <path d="M14 8h6v6" />
    </svg>
  );
}

function IconReno() {
  return (
    <svg {...svgProps}>
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.8-3.8a6 6 0 0 1-7.94 7.94l-6.9 6.9a2.12 2.12 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.94-7.94z" />
    </svg>
  );
}

export const HOME_PILLARS: readonly Pillar[] = [
  {
    icon: <IconListing />,
    heading: "Listing + MLS",
    blurb:
      "Full-service MLS listing at zero cost to you, covered by the buyer-side commission standard in AZ.",
    href: LINKS.listing,
  },
  {
    icon: <IconCash />,
    heading: "Cash Offers",
    blurb:
      "Vetted cash offers with a fast close, for when certainty and speed matter more than top-of-market pricing.",
    href: LINKS.cashOffers,
  },
  {
    icon: <IconCashPlus />,
    heading: "Cash+",
    blurb:
      "We cash-fund the repairs before the home hits the MLS, so it sells for more. No money out of your pocket.",
    href: LINKS.cashPlusRepairs,
  },
  {
    icon: <IconReno />,
    heading: "Renovation",
    blurb:
      "Full pre-list renovation, paid from sale proceeds. Still a free MLS listing, still nothing out of pocket.",
    href: LINKS.renovationOnly,
  },
];
