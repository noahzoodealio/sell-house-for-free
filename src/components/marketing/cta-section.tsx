import type { ReactNode } from "react";
import Link from "next/link";
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

const buttonBase =
  "inline-flex items-center justify-center rounded-lg font-semibold font-[var(--font-inter)] " +
  "transition-colors duration-150 h-[52px] px-7 text-[16px] " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";

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
              <>
                <Link
                  href={primaryCta.href}
                  className={cn(
                    buttonBase,
                    "bg-white text-brand shadow-[var(--shadow-card)] hover:bg-white/95 active:bg-white/90",
                  )}
                >
                  {primaryCta.label}
                </Link>
                {secondaryCta ? (
                  <Link
                    href={secondaryCta.href}
                    className={cn(
                      buttonBase,
                      "bg-transparent border border-white/70 text-white hover:bg-white/10 active:bg-white/15",
                    )}
                  >
                    {secondaryCta.label}
                  </Link>
                ) : null}
              </>
            ) : (
              <>
                <CtaLink href={primaryCta.href} variant="primary" size="lg">
                  {primaryCta.label}
                </CtaLink>
                {secondaryCta ? (
                  <CtaLink
                    href={secondaryCta.href}
                    variant="secondary"
                    size="lg"
                  >
                    {secondaryCta.label}
                  </CtaLink>
                ) : null}
              </>
            )}
          </div>
        </div>
      </Container>
    </section>
  );
}
