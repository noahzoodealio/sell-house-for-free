import type { ReactNode } from "react";
import { Container } from "@/components/layout/container";

export type TrustBarClaim = {
  id: string;
  icon: ReactNode;
  shortLabel: string;
  subLabel?: string;
};

export type TrustBarProps = {
  claims: readonly TrustBarClaim[];
};

export function TrustBar({ claims }: TrustBarProps) {
  if (process.env.NODE_ENV !== "production" && claims.length !== 4) {
    console.warn(
      `TrustBar design intent is exactly 4 claims; received ${claims.length}.`,
    );
  }
  return (
    <section
      aria-label="Trust and transparency"
      className="bg-surface-muted py-8 md:py-10"
    >
      <Container>
        <ul
          role="list"
          className="grid grid-cols-2 gap-4 md:flex md:flex-row md:justify-between md:items-start md:gap-8"
        >
          {claims.map((claim) => (
            <li
              key={claim.id}
              className="flex flex-col items-start gap-2 md:flex-1"
            >
              <div aria-hidden="true" className="size-8 text-brand">
                {claim.icon}
              </div>
              <p className="text-sm font-medium text-ink-title">
                {claim.shortLabel}
              </p>
              {claim.subLabel ? (
                <p className="text-xs text-ink-muted">{claim.subLabel}</p>
              ) : null}
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
