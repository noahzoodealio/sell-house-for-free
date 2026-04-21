import type { ReactNode } from "react";
import { Container } from "@/components/layout/container";

export type Stat = {
  value: string;
  label: string;
};

export type StatBarProps = {
  heading?: ReactNode;
  eyebrow?: string;
  stats: readonly Stat[];
  tone?: "dark" | "brand";
};

export function StatBar({
  heading,
  eyebrow,
  stats,
  tone = "dark",
}: StatBarProps) {
  const bg =
    tone === "brand"
      ? "bg-brand"
      : "bg-[var(--color-surface-dark)]";
  return (
    <section className={`${bg} py-14 md:py-16`}>
      <Container>
        {(eyebrow || heading) && (
          <div className="mb-10 md:mb-12 max-w-2xl">
            {eyebrow ? (
              <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-white/60 mb-3">
                {eyebrow}
              </p>
            ) : null}
            {heading ? (
              <h2 className="text-[24px] md:text-[28px] font-semibold text-white leading-[1.25]">
                {heading}
              </h2>
            ) : null}
          </div>
        )}
        <dl className="grid grid-cols-2 gap-8 md:grid-cols-4 md:gap-10">
          {stats.map((s) => (
            <div key={s.label} className="flex flex-col gap-2">
              <dt className="order-2 text-[13px] font-medium uppercase tracking-[0.08em] text-white/70 leading-[1.4]">
                {s.label}
              </dt>
              <dd className="order-1 font-[var(--font-inter)] font-semibold text-white text-[36px] md:text-[44px] leading-[1]">
                {s.value}
              </dd>
            </div>
          ))}
        </dl>
      </Container>
    </section>
  );
}
