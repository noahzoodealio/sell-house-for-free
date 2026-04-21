import type { ReactNode } from "react";
import { Container } from "@/components/layout/container";

export type ServiceItem = {
  label: string;
  description?: string;
};

export type ServicesBandProps = {
  eyebrow?: string;
  heading?: ReactNode;
  subcopy?: ReactNode;
  items: readonly ServiceItem[];
};

function Checkmark() {
  return (
    <span
      aria-hidden="true"
      className="mt-0.5 inline-flex size-6 flex-none items-center justify-center rounded-full bg-brand-subtle text-brand"
    >
      <svg
        viewBox="0 0 20 20"
        className="size-3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4 10.5l4 4 8-9" />
      </svg>
    </span>
  );
}

export function ServicesBand({
  eyebrow,
  heading,
  subcopy,
  items,
}: ServicesBandProps) {
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
              <p className="mt-3 text-[16px] leading-[24px] text-ink-body">
                {subcopy}
              </p>
            ) : null}
          </div>
        )}
        <ul
          role="list"
          className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3"
        >
          {items.map((item) => (
            <li key={item.label} className="flex items-start gap-3">
              <Checkmark />
              <div>
                <p className="text-[16px] leading-[24px] font-semibold text-ink-title">
                  {item.label}
                </p>
                {item.description ? (
                  <p className="mt-1 text-[14px] leading-[22px] text-ink-body">
                    {item.description}
                  </p>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
