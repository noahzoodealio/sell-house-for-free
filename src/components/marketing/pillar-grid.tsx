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
};

export function PillarGrid({ pillars }: PillarGridProps) {
  return (
    <section className="py-16 md:py-20">
      <Container>
        <ul
          role="list"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8"
        >
          {pillars.map((pillar) => (
            <li key={pillar.href}>
              <article className="relative h-full rounded-lg border border-border bg-surface p-6 transition-shadow hover:shadow-[var(--shadow-elevated)] focus-within:shadow-[var(--shadow-elevated)]">
                <div
                  aria-hidden="true"
                  className="mb-4 inline-flex size-12 items-center justify-center rounded-lg bg-brand-subtle text-brand"
                >
                  {pillar.icon}
                </div>
                <h3 className="text-[20px] leading-[28px] font-semibold text-ink-title">
                  <Link
                    href={pillar.href}
                    className="static md:before:absolute md:before:inset-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                  >
                    {pillar.heading}
                  </Link>
                </h3>
                <p className="mt-3 text-[16px] leading-[24px] text-ink-body">
                  {pillar.blurb}
                </p>
                <span
                  aria-hidden="true"
                  className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand"
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
