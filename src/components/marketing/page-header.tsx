import type { ReactNode } from "react";
import { Container } from "@/components/layout/container";

export type PageHeaderProps = {
  eyebrow?: string;
  heading: ReactNode;
  subcopy?: ReactNode;
};

export function PageHeader({ eyebrow, heading, subcopy }: PageHeaderProps) {
  return (
    <header className="py-14 md:py-20">
      <Container>
        {eyebrow ? <p className="eyebrow mb-4">{eyebrow}</p> : null}
        <h1 className="text-[36px] leading-[1.15] md:text-[52px] md:leading-[1.1] font-semibold text-ink-title max-w-[22ch]">
          {heading}
        </h1>
        {subcopy ? (
          <div className="mt-5 text-[17px] leading-[28px] text-ink-body max-w-[var(--container-prose)]">
            {typeof subcopy === "string" ? <p>{subcopy}</p> : subcopy}
          </div>
        ) : null}
      </Container>
    </header>
  );
}
