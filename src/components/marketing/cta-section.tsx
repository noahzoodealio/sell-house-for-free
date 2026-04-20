import type { ReactNode } from "react";
import { Container } from "@/components/layout/container";
import { CtaLink } from "./cta-link";

export type CTASectionProps = {
  heading: ReactNode;
  subcopy?: ReactNode;
  primaryCta: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
};

export function CTASection({
  heading,
  subcopy,
  primaryCta,
  secondaryCta,
}: CTASectionProps) {
  return (
    <section className="bg-brand-subtle py-16 md:py-24">
      <Container>
        <div className="max-w-3xl">
          <h2 className="text-[32px] leading-[40px] md:text-[48px] md:leading-[56px] font-semibold text-ink-title">
            {heading}
          </h2>
          {subcopy ? (
            <p className="mt-4 text-[18px] leading-[28px] text-ink-body">
              {subcopy}
            </p>
          ) : null}
          <div className="mt-8 flex flex-col sm:flex-row gap-4">
            <CtaLink href={primaryCta.href} variant="primary" size="lg">
              {primaryCta.label}
            </CtaLink>
            {secondaryCta ? (
              <CtaLink
                href={secondaryCta.href}
                variant="quiet"
                size="lg"
              >
                {secondaryCta.label}
              </CtaLink>
            ) : null}
          </div>
        </div>
      </Container>
    </section>
  );
}
