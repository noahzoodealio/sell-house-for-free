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
  children,
}: HeroProps) {
  const hasImage = Boolean(image);
  return (
    <section className="py-16 md:py-24 lg:py-32">
      <Container>
        <div
          className={cn(
            "grid gap-10 md:gap-12",
            hasImage ? "md:grid-cols-12 md:items-center" : "",
          )}
        >
          <div
            className={cn(
              hasImage ? "md:col-span-6" : "",
              align === "center" ? "text-center mx-auto max-w-[48rem]" : "",
            )}
          >
            {eyebrow ? (
              <p className="mb-3 text-sm uppercase tracking-wider text-ink-muted">
                {eyebrow}
              </p>
            ) : null}
            <h1 className="text-[44px] leading-[50px] md:text-[80px] md:leading-[1] font-semibold text-ink-title">
              {heading}
            </h1>
            {(children || subcopy) ? (
              <div
                className={cn(
                  "mt-6 text-[18px] leading-[28px] text-ink-body max-w-[60ch]",
                  align === "center" ? "mx-auto" : "",
                )}
              >
                {children ?? <p>{subcopy}</p>}
              </div>
            ) : null}
            <div
              className={cn(
                "mt-8 flex flex-col sm:flex-row gap-4",
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
          </div>
          {image ? (
            <div className="md:col-span-6">
              <Image
                src={image.src}
                alt={image.alt}
                width={image.width}
                height={image.height}
                priority
                sizes="(min-width: 768px) 50vw, 100vw"
                className="w-full h-auto rounded-lg"
              />
            </div>
          ) : null}
        </div>
      </Container>
    </section>
  );
}
