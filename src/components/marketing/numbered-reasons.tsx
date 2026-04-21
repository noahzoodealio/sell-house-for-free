import type { ReactNode } from "react";
import { Container } from "@/components/layout/container";
import { CtaLink } from "./cta-link";

export type Reason = {
  heading: string;
  body: ReactNode;
};

export type NumberedReasonsProps = {
  eyebrow?: string;
  heading: ReactNode;
  subcopy?: ReactNode;
  reasons: readonly Reason[];
  cta?: { label: string; href: string };
};

export function NumberedReasons({
  eyebrow,
  heading,
  subcopy,
  reasons,
  cta,
}: NumberedReasonsProps) {
  return (
    <section className="bg-surface py-20 md:py-24">
      <Container>
        <div className="grid gap-12 md:grid-cols-12 md:gap-16">
          <div className="md:col-span-5">
            {eyebrow ? <p className="eyebrow mb-3">{eyebrow}</p> : null}
            <h2 className="text-[30px] leading-[1.2] md:text-[40px] md:leading-[1.15] font-semibold text-ink-title">
              {heading}
            </h2>
            {subcopy ? (
              <p className="mt-5 text-[17px] leading-[28px] text-ink-body max-w-[44ch]">
                {subcopy}
              </p>
            ) : null}
            {cta ? (
              <div className="mt-8 hidden md:block">
                <CtaLink href={cta.href} variant="primary" size="lg">
                  {cta.label}
                </CtaLink>
              </div>
            ) : null}
          </div>

          <ol className="md:col-span-7 list-none relative">
            <div
              aria-hidden="true"
              className="absolute left-[22px] top-6 bottom-6 w-px bg-border-soft hidden md:block"
            />
            {reasons.map((r, idx) => {
              const num = String(idx + 1).padStart(2, "0");
              const isLast = idx === reasons.length - 1;
              return (
                <li
                  key={r.heading}
                  className={`relative grid grid-cols-[48px_1fr] gap-5 ${
                    isLast ? "" : "pb-10"
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className="relative z-10 flex size-11 items-center justify-center rounded-full bg-brand text-[15px] font-semibold text-brand-foreground font-[var(--font-inter)]"
                  >
                    {num}
                  </span>
                  <div className="pt-1">
                    <h3 className="text-[20px] leading-[28px] md:text-[22px] md:leading-[30px] font-semibold text-ink-title">
                      {r.heading}
                    </h3>
                    <div className="mt-2 text-[16px] leading-[26px] text-ink-body max-w-[54ch]">
                      {typeof r.body === "string" ? <p>{r.body}</p> : r.body}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>

          {cta ? (
            <div className="md:hidden">
              <CtaLink href={cta.href} variant="primary" size="lg">
                {cta.label}
              </CtaLink>
            </div>
          ) : null}
        </div>
      </Container>
    </section>
  );
}
