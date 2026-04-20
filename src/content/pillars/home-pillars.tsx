import { LINKS } from "@/lib/links";
import type { Pillar } from "@/components/marketing/pillar-grid";

function IconListing() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="size-6">
      <path d="M4 21V10l8-6 8 6v11" />
      <path d="M10 21v-6h4v6" />
    </svg>
  );
}

function IconCash() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="size-6">
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  );
}

function IconCashPlus() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="size-6">
      <path d="M3 11l10-6 8 4v10H3z" />
      <path d="M12 13v4M10 15h4" />
    </svg>
  );
}

function IconReno() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="size-6">
      <path d="M3 21l9-9" />
      <path d="M12 12l3-3-6-6-3 3z" />
      <path d="M14 16l6-6 2 2-6 6z" />
    </svg>
  );
}

export const HOME_PILLARS: readonly Pillar[] = [
  {
    icon: <IconListing />,
    heading: "Listing + MLS",
    blurb:
      "Full-service MLS listing at zero cost to you — covered by the buyer-side commission standard in AZ.",
    href: LINKS.listing,
  },
  {
    icon: <IconCash />,
    heading: "Cash Offers",
    blurb:
      "Vetted cash offers with a fast close — when certainty and speed matter more than top-of-market pricing.",
    href: LINKS.cashOffers,
  },
  {
    icon: <IconCashPlus />,
    heading: "Cash+ with Repairs",
    blurb:
      "We cash-fund the repairs before the home hits the MLS, so it sells for more — no money out of your pocket.",
    href: LINKS.cashPlusRepairs,
  },
  {
    icon: <IconReno />,
    heading: "Renovation-Only",
    blurb:
      "Hola Home renovates the property first, then lists at maximum upside — best when you have time to spare.",
    href: LINKS.renovationOnly,
  },
];
