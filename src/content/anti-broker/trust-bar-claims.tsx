import type { ReactNode } from "react";
import type { TrustBarClaim } from "@/components/marketing/trust-bar";
import { claims as registry } from "./claims";

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

const ICONS: Record<string, ReactNode> = {
  "no-fees": <IconCheckShield />,
  "no-data-resale": <IconLock />,
  "real-pm": <IconPerson />,
  "jk-realty-broker": <IconBuildingCheck />,
};

export const TRUST_BAR_CLAIMS: readonly TrustBarClaim[] = registry
  .slice(0, 4)
  .map((claim) => ({
    id: claim.id,
    icon: ICONS[claim.id] ?? <IconCheckShield />,
    shortLabel: claim.shortLabel,
    subLabel: claim.subLabel,
  }));
