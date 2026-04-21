import type { ReactNode } from "react";
import Link from "next/link";
import { Container } from "@/components/layout/container";

export type Pillar = {
  icon: ReactNode;
  heading: string;
  blurb: string;
  href: string;
};

export type PillarGridProps = {
  pillars: Pillar[];
  eyebrow?: string;
  heading?: ReactNode;
  subcopy?: ReactNode;
};

export function PillarGrid({
  pillars,
  eyebrow,
  heading,
  subcopy,
}: PillarGridProps) {
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
        <ul
          role="list"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {pillars.map((pillar) => (
            <li key={pillar.href}>
              <article className="group relative h-full rounded-[var(--radius-card)] border border-border-soft bg-surface p-6 shadow-[var(--shadow-card)] transition-all hover:-translate-y-0.5 hover:border-brand-tint focus-within:border-brand">
                <div
                  aria-hidden="true"
                  className="mb-5 inline-flex size-12 items-center justify-center rounded-full bg-brand-subtle text-brand"
                >
                  {pillar.icon}
                </div>
                <h3 className="text-[19px] leading-[26px] font-semibold text-ink-title">
                  <Link
                    href={pillar.href}
                    className="static md:before:absolute md:before:inset-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                  >
                    {pillar.heading}
                  </Link>
                </h3>
                <p className="mt-2 text-[15px] leading-[24px] text-ink-body">
                  {pillar.blurb}
                </p>
                <span
                  aria-hidden="true"
                  className="mt-5 inline-flex items-center gap-1 text-[14px] font-semibold text-brand group-hover:gap-2 transition-all"
                >
                  Learn more
                  <span aria-hidden="true">→</span>
                </span>
              </article>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
