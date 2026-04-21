import type { ReactNode } from "react";
import type { TrustBarClaim } from "@/components/marketing/trust-bar";
import { claims as registry } from "./claims";

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

function IconNoFees() {
  return (
    <svg {...svgProps}>
      <circle cx="12" cy="12" r="8" />
      <path d="M6 6l12 12" />
    </svg>
  );
}

function IconPrivacy() {
  return (
    <svg {...svgProps}>
      <rect x="5" y="11" width="14" height="9" rx="1.5" />
      <path d="M8.5 11V8a3.5 3.5 0 017 0v3" />
    </svg>
  );
}

function IconPerson() {
  return (
    <svg {...svgProps}>
      <circle cx="12" cy="9" r="3.5" />
      <path d="M5 20c1.3-3.2 4-4.75 7-4.75s5.7 1.55 7 4.75" />
    </svg>
  );
}

function IconBroker() {
  return (
    <svg {...svgProps}>
      <path d="M4 20V8l8-4 8 4v12" />
      <path d="M10 20v-6h4v6" />
    </svg>
  );
}

const ICONS: Record<string, ReactNode> = {
  "no-fees": <IconNoFees />,
  "no-data-resale": <IconPrivacy />,
  "real-pm": <IconPerson />,
  "jk-realty-broker": <IconBroker />,
};

export const TRUST_BAR_CLAIMS: readonly TrustBarClaim[] = registry
  .slice(0, 4)
  .map((claim) => ({
    id: claim.id,
    icon: ICONS[claim.id] ?? <IconNoFees />,
    shortLabel: claim.shortLabel,
    subLabel: claim.subLabel,
  }));
