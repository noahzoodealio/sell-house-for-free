import type { ReactNode } from "react";
import { Container } from "@/components/layout/container";

export type PageHeaderProps = {
  eyebrow?: string;
  heading: ReactNode;
  subcopy?: ReactNode;
};

export function PageHeader({ eyebrow, heading, subcopy }: PageHeaderProps) {
  return (
    <header className="py-12 md:py-16">
      <Container>
        {eyebrow ? (
          <p className="mb-3 text-sm uppercase tracking-wider text-ink-muted">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="text-[36px] leading-[44px] md:text-[56px] md:leading-[64px] font-semibold text-ink-title">
          {heading}
        </h1>
        {subcopy ? (
          <div className="mt-4 text-[18px] leading-[28px] text-ink-body max-w-[var(--container-prose)]">
            {typeof subcopy === "string" ? <p>{subcopy}</p> : subcopy}
          </div>
        ) : null}
      </Container>
    </header>
  );
}
