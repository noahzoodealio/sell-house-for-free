import type { ReactNode } from "react";
import Image from "next/image";
import { Container } from "@/components/layout/container";
import { cn } from "@/lib/cn";
import { CtaLink } from "./cta-link";

export type FeatureSplitProps = {
  eyebrow?: string;
  heading: ReactNode;
  body?: ReactNode;
  bullets?: readonly string[];
  cta?: { label: string; href: string };
  image?: { src: string; alt: string; width: number; height: number };
  /** Side the image is rendered on. Alternates naturally by page composition. */
  imageSide?: "left" | "right";
  /** Section background tone. */
  tone?: "default" | "soft";
};

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden="true"
      className="size-5 shrink-0 text-brand"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 10.5l3.5 3.5L16 6" />
    </svg>
  );
}

function PlaceholderVisual() {
  return (
    <div className="aspect-[4/3] w-full rounded-[var(--radius-image)] bg-gradient-to-br from-brand-subtle via-brand-tint/60 to-brand-sky/50 shadow-[var(--shadow-card)] border border-border-soft flex items-center justify-center">
      <svg
        viewBox="0 0 96 96"
        className="size-20 text-brand/40"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M16 44L48 20l32 24" />
        <path d="M24 40v36h48V40" />
        <path d="M40 76V56h16v20" />
      </svg>
    </div>
  );
}

export function FeatureSplit({
  eyebrow,
  heading,
  body,
  bullets,
  cta,
  image,
  imageSide = "right",
  tone = "default",
}: FeatureSplitProps) {
  const bg = tone === "soft" ? "bg-surface-soft" : "bg-surface";
  return (
    <section className={`${bg} py-20 md:py-24`}>
      <Container>
        <div
          className={cn(
            "grid gap-10 md:gap-14 md:grid-cols-12 md:items-center",
          )}
        >
          <div
            className={cn(
              "md:col-span-6",
              imageSide === "left" ? "md:order-2" : "",
            )}
          >
            {eyebrow ? <p className="eyebrow mb-3">{eyebrow}</p> : null}
            <h2 className="text-[30px] leading-[1.2] md:text-[40px] md:leading-[1.15] font-semibold text-ink-title max-w-[22ch]">
              {heading}
            </h2>
            {body ? (
              <div className="mt-5 text-[17px] leading-[28px] text-ink-body max-w-[52ch]">
                {typeof body === "string" ? <p>{body}</p> : body}
              </div>
            ) : null}
            {bullets && bullets.length > 0 ? (
              <ul className="mt-6 space-y-3">
                {bullets.map((b) => (
                  <li
                    key={b}
                    className="flex items-start gap-3 text-[16px] leading-[26px] text-ink-body"
                  >
                    <CheckIcon />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            ) : null}
            {cta ? (
              <div className="mt-8">
                <CtaLink href={cta.href} variant="primary" size="lg">
                  {cta.label}
                </CtaLink>
              </div>
            ) : null}
          </div>

          <div
            className={cn(
              "md:col-span-6",
              imageSide === "left" ? "md:order-1" : "",
            )}
          >
            {image ? (
              <div className="overflow-hidden rounded-[var(--radius-image)] shadow-[var(--shadow-card)] border border-border-soft">
                <Image
                  src={image.src}
                  alt={image.alt}
                  width={image.width}
                  height={image.height}
                  sizes="(min-width: 768px) 50vw, 100vw"
                  className="w-full h-auto"
                />
              </div>
            ) : (
              <PlaceholderVisual />
            )}
          </div>
        </div>
      </Container>
    </section>
  );
}
