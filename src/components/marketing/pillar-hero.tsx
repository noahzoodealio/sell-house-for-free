import type { ReactNode } from "react";
import Link from "next/link";
import { Container } from "@/components/layout/container";
import { Hero, type HeroProps } from "./hero";

type PillarAccent =
  | "listing"
  | "cash-offers"
  | "cash-plus-repairs"
  | "renovation-only";

type BreadcrumbCrumb = { label: string; href: string };

export type PillarHeroProps = HeroProps & {
  accent: PillarAccent;
  breadcrumb: BreadcrumbCrumb[];
};

const accentClass: Record<PillarAccent, string> = {
  listing: "bg-accent-listing",
  "cash-offers": "bg-accent-cash-offers",
  "cash-plus-repairs": "bg-accent-cash-plus-repairs",
  "renovation-only": "bg-accent-renovation-only",
};

function Breadcrumb({ trail }: { trail: BreadcrumbCrumb[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-2 text-sm text-ink-muted">
        {trail.map((crumb, idx) => {
          const isLast = idx === trail.length - 1;
          return (
            <li key={crumb.href} className="flex items-center gap-2">
              {isLast ? (
                <span aria-current="page" className="text-ink-title">
                  {crumb.label}
                </span>
              ) : (
                <Link
                  href={crumb.href}
                  className="hover:text-ink-title focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                >
                  {crumb.label}
                </Link>
              )}
              {isLast ? null : (
                <span aria-hidden="true" className="text-ink-muted">
                  ›
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function PillarHero({
  accent,
  breadcrumb,
  ...heroProps
}: PillarHeroProps) {
  return (
    <>
      <div aria-hidden="true" className={`h-1 w-full ${accentClass[accent]}`} />
      <div className="pt-6">
        <Container>
          <Breadcrumb trail={breadcrumb} />
        </Container>
      </div>
      <Hero {...heroProps} />
    </>
  );
}
