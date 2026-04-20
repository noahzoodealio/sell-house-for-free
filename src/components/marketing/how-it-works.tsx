import type { ReactNode } from "react";
import { Container } from "@/components/layout/container";
import { CtaLink } from "./cta-link";

export type HowItWorksStep = {
  heading: string;
  body: ReactNode;
  icon?: ReactNode;
};

export type HowItWorksProps = {
  steps: HowItWorksStep[];
  cta?: { label: string; href: string };
};

export function HowItWorks({ steps, cta }: HowItWorksProps) {
  return (
    <section className="py-16 md:py-24">
      <Container>
        <ol className="list-none space-y-12 md:space-y-16">
          {steps.map((step, idx) => {
            const numeral = String(idx + 1).padStart(2, "0");
            return (
              <li
                key={numeral}
                className="grid gap-4 md:grid-cols-[160px_1fr] md:gap-10"
              >
                <span
                  aria-hidden="true"
                  className="font-[var(--font-inter)] font-semibold text-[64px] leading-[1] md:text-[96px] text-brand-subtle"
                >
                  {numeral}
                </span>
                <div>
                  {step.icon ? (
                    <div aria-hidden="true" className="mb-3 text-brand">
                      {step.icon}
                    </div>
                  ) : null}
                  <h3 className="text-[24px] leading-[32px] font-semibold text-ink-title">
                    {step.heading}
                  </h3>
                  <div className="mt-3 text-[16px] leading-[24px] text-ink-body max-w-[60ch]">
                    {typeof step.body === "string" ? (
                      <p>{step.body}</p>
                    ) : (
                      step.body
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
        {cta ? (
          <div className="mt-12">
            <CtaLink href={cta.href} variant="primary" size="lg">
              {cta.label}
            </CtaLink>
          </div>
        ) : null}
      </Container>
    </section>
  );
}
