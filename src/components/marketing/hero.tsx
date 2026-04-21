import type { ReactNode } from "react";
import Image from "next/image";
import { Container } from "@/components/layout/container";
import { cn } from "@/lib/cn";
import { CtaLink } from "./cta-link";

export type HeroProps = {
  eyebrow?: string;
  heading: ReactNode;
  subcopy?: ReactNode;
  primaryCta: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
  image?: { src: string; alt: string; width: number; height: number };
  align?: "left" | "center";
  /** Optional slot rendered below the CTA row (e.g., rating badge). */
  trailing?: ReactNode;
  children?: ReactNode;
};

export function Hero({
  eyebrow,
  heading,
  subcopy,
  primaryCta,
  secondaryCta,
  image,
  align = "left",
  trailing,
  children,
}: HeroProps) {
  const hasImage = Boolean(image);
  return (
    <section className="bg-brand-subtle/40 py-16 md:py-24 lg:py-28">
      <Container>
        <div
          className={cn(
            "grid gap-12 md:gap-10",
            hasImage ? "md:grid-cols-12 md:items-center" : "",
          )}
        >
          <div
            className={cn(
              hasImage ? "md:col-span-6" : "",
              align === "center" ? "text-center mx-auto max-w-[48rem]" : "",
            )}
          >
            {eyebrow ? <p className="eyebrow mb-4">{eyebrow}</p> : null}
            <h1 className="text-[40px] leading-[1.1] md:text-[56px] lg:text-[64px] lg:leading-[1.05] font-semibold text-ink-title">
              {heading}
            </h1>
            {children || subcopy ? (
              <div
                className={cn(
                  "mt-5 text-[17px] leading-[28px] text-ink-body max-w-[48ch]",
                  align === "center" ? "mx-auto" : "",
                )}
              >
                {children ?? <p>{subcopy}</p>}
              </div>
            ) : null}
            <div
              className={cn(
                "mt-8 flex flex-col sm:flex-row gap-3",
                align === "center" ? "justify-center" : "",
              )}
            >
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
            </div>
            {trailing ? <div className="mt-6">{trailing}</div> : null}
          </div>
          {image ? (
            <div className="md:col-span-6">
              <div className="relative overflow-hidden rounded-[var(--radius-image)] shadow-[var(--shadow-card)]">
                <Image
                  src={image.src}
                  alt={image.alt}
                  width={image.width}
                  height={image.height}
                  priority
                  sizes="(min-width: 768px) 50vw, 100vw"
                  className="w-full h-auto"
                />
              </div>
            </div>
          ) : null}
        </div>
      </Container>
    </section>
  );
}
