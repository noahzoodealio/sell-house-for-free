import type { ReactNode } from "react";
import { Container } from "@/components/layout/container";

export type LogoBandItem = {
  /** Display label (also used as accessible name). */
  label: string;
};

export type LogoBandProps = {
  eyebrow?: string;
  heading?: ReactNode;
  subcopy?: ReactNode;
  logos: readonly LogoBandItem[];
};

/**
 * Placeholder partner/brand band. Renders wordmarks in a muted type
 * treatment until real SVG logos are wired in — this is an intentional
 * visual slot that reads as logo-band without licensed assets.
 */
export function LogoBand({
  eyebrow,
  heading,
  subcopy,
  logos,
}: LogoBandProps) {
  return (
    <section className="bg-surface-soft py-16 md:py-20 border-y border-border-soft">
      <Container>
        {(eyebrow || heading || subcopy) && (
          <div className="mb-10 md:mb-12 max-w-2xl">
            {eyebrow ? <p className="eyebrow mb-3">{eyebrow}</p> : null}
            {heading ? (
              <h2 className="text-[26px] md:text-[32px] font-semibold text-ink-title leading-[1.2]">
                {heading}
              </h2>
            ) : null}
            {subcopy ? (
              <p className="mt-3 text-[16px] leading-[24px] text-ink-muted">
                {subcopy}
              </p>
            ) : null}
          </div>
        )}
        <ul
          role="list"
          className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-6 md:gap-8 items-center"
        >
          {logos.map((l) => (
            <li
              key={l.label}
              className="flex items-center justify-center h-12"
            >
              <span className="font-[var(--font-inter)] font-semibold text-[16px] md:text-[18px] text-ink-muted/80 tracking-[0.04em] uppercase">
                {l.label}
              </span>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
