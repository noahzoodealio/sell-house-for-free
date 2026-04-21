import type { ReactNode } from "react";
import { Container } from "@/components/layout/container";
import { CtaLink } from "./cta-link";
import { cn } from "@/lib/cn";

type Tone = "soft" | "brand" | "dark";

export type CTASectionProps = {
  heading: ReactNode;
  subcopy?: ReactNode;
  primaryCta: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
  /** Background treatment. "soft" (default) is the legacy pale blue panel;
   *  "brand" is a full-bleed Zoodealio Blue band; "dark" is Bear Black. */
  tone?: Tone;
  align?: "left" | "center";
};

const toneBg: Record<Tone, string> = {
  soft: "bg-brand-subtle",
  brand: "bg-brand",
  dark: "bg-[var(--color-surface-dark)]",
};

export function CTASection({
  heading,
  subcopy,
  primaryCta,
  secondaryCta,
  tone = "soft",
  align = "left",
}: CTASectionProps) {
  const onDark = tone === "brand" || tone === "dark";
  return (
    <section className={cn(toneBg[tone], "py-16 md:py-20")}>
      <Container>
        <div
          className={cn(
            "max-w-3xl",
            align === "center" ? "mx-auto text-center" : "",
          )}
        >
          <h2
            className={cn(
              "text-[28px] leading-[1.2] md:text-[40px] md:leading-[1.15] font-semibold",
              onDark ? "text-white" : "text-ink-title",
            )}
          >
            {heading}
          </h2>
          {subcopy ? (
            <p
              className={cn(
                "mt-4 text-[17px] leading-[28px]",
                onDark ? "text-white/85" : "text-ink-body",
              )}
            >
              {subcopy}
            </p>
          ) : null}
          <div
            className={cn(
              "mt-8 flex flex-col sm:flex-row gap-3",
              align === "center" ? "justify-center" : "",
            )}
          >
            {onDark ? (
              <CtaLink
                href={primaryCta.href}
                size="lg"
                className="bg-white text-brand shadow-[var(--shadow-card)] hover:bg-white/95"
              >
                {primaryCta.label}
              </CtaLink>
            ) : (
              <CtaLink href={primaryCta.href} variant="primary" size="lg">
                {primaryCta.label}
              </CtaLink>
            )}
            {secondaryCta ? (
              onDark ? (
                <CtaLink
                  href={secondaryCta.href}
                  size="lg"
                  className="bg-transparent border border-white/70 text-white hover:bg-white/10"
                >
                  {secondaryCta.label}
                </CtaLink>
              ) : (
                <CtaLink
                  href={secondaryCta.href}
                  variant="secondary"
                  size="lg"
                >
                  {secondaryCta.label}
                </CtaLink>
              )
            ) : null}
          </div>
        </div>
      </Container>
    </section>
  );
}
