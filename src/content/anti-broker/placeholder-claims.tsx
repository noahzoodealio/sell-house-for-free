// TODO(E2-S11): replace this file's exports with imports from
// `src/content/anti-broker/claims.ts` (the authoritative registry) and
// delete this module. Consumers today: home page + four pillar pages.

import type { TrustBarClaim } from "@/components/marketing/trust-bar";

function IconCheckShield() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="size-full">
      <path d="M12 3l8 3v6c0 4.5-3.2 8.3-8 9-4.8-.7-8-4.5-8-9V6l8-3z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

function IconLock() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="size-full">
      <rect x="4" y="10" width="16" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 018 0v3" />
    </svg>
  );
}

function IconPerson() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="size-full">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c1.5-3.5 4.5-5 8-5s6.5 1.5 8 5" />
    </svg>
  );
}

function IconBuildingCheck() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="size-full">
      <path d="M4 21V6l8-3 8 3v15" />
      <path d="M9 21v-5h6v5" />
      <path d="M9 10h.01M15 10h.01M9 13h.01M15 13h.01" />
    </svg>
  );
}

export const PLACEHOLDER_HOME_TRUST_CLAIMS: readonly TrustBarClaim[] = [
  {
    id: "no-fees",
    icon: <IconCheckShield />,
    shortLabel: "No listing fees",
    subLabel: "You pay zero at closing.",
  },
  {
    id: "no-data-resale",
    icon: <IconLock />,
    shortLabel: "We don't sell your data",
    subLabel: "Not a lead farm — ever.",
  },
  {
    id: "real-pm",
    icon: <IconPerson />,
    shortLabel: "A real Project Manager",
    subLabel: "Named, reachable, on our team.",
  },
  {
    id: "jk-broker",
    icon: <IconBuildingCheck />,
    shortLabel: "Licensed AZ broker",
    subLabel: "Listings of record via JK Realty.",
  },
];
