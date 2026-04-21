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
      className="bg-surface-soft border-y border-border-soft py-10 md:py-12"
    >
      <Container>
        <ul
          role="list"
          className="grid grid-cols-2 gap-6 md:grid-cols-4 md:gap-8"
        >
          {claims.map((claim) => (
            <li
              key={claim.id}
              className="flex flex-col items-start gap-3"
            >
              <div
                aria-hidden="true"
                className="inline-flex size-11 items-center justify-center rounded-full bg-brand-subtle text-brand"
              >
                {claim.icon}
              </div>
              <p className="text-[15px] font-semibold text-ink-title leading-[1.3]">
                {claim.shortLabel}
              </p>
              {claim.subLabel ? (
                <p className="text-[13px] text-ink-muted leading-[1.4]">
                  {claim.subLabel}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
