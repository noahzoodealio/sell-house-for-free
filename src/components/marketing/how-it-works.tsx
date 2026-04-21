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
  eyebrow?: string;
  heading?: ReactNode;
  subcopy?: ReactNode;
};

export function HowItWorks({
  steps,
  cta,
  eyebrow,
  heading,
  subcopy,
}: HowItWorksProps) {
  return (
    <section className="py-20 md:py-24">
      <Container>
        {(eyebrow || heading || subcopy) && (
          <div className="mb-12 md:mb-16 max-w-2xl">
            {eyebrow ? <p className="eyebrow mb-3">{eyebrow}</p> : null}
            {heading ? (
              <h2 className="text-[32px] leading-[1.15] md:text-[44px] md:leading-[1.1] font-semibold text-ink-title">
                {heading}
              </h2>
            ) : null}
            {subcopy ? (
              <p className="mt-4 text-[17px] leading-[28px] text-ink-body">
                {subcopy}
              </p>
            ) : null}
          </div>
        )}
        <ol className="list-none space-y-10 md:space-y-14">
          {steps.map((step, idx) => {
            const numeral = String(idx + 1).padStart(2, "0");
            return (
              <li
                key={numeral}
                className="grid gap-5 md:grid-cols-[140px_1fr] md:gap-10 md:items-start"
              >
                <span
                  aria-hidden="true"
                  className="font-[var(--font-inter)] font-semibold text-[56px] md:text-[88px] leading-[1] text-brand-tint"
                >
                  {numeral}
                </span>
                <div>
                  {step.icon ? (
                    <div aria-hidden="true" className="mb-3 text-brand">
                      {step.icon}
                    </div>
                  ) : null}
                  <h3 className="text-[22px] leading-[30px] md:text-[26px] md:leading-[34px] font-semibold text-ink-title">
                    {step.heading}
                  </h3>
                  <div className="mt-3 text-[16px] leading-[26px] text-ink-body max-w-[60ch]">
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
          <div className="mt-14">
            <CtaLink href={cta.href} variant="primary" size="lg">
              {cta.label}
            </CtaLink>
          </div>
        ) : null}
      </Container>
    </section>
  );
}
