import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/layout/container";
import { SITE } from "@/lib/site";

const legalLinks = [
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/broker-relationships", label: "Broker relationships" },
];

const linkClasses =
  "text-[14px] text-ink-body transition-colors hover:text-brand " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

const headingClasses =
  "text-[12px] font-semibold uppercase tracking-[0.12em] text-ink-muted mb-3";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border-soft bg-surface-soft">
      <Container>
        <div className="grid gap-10 py-14 md:grid-cols-4 md:gap-8">
          <div className="md:col-span-1">
            <div className="text-[18px] font-semibold font-[var(--font-inter)] text-ink-title">
              {SITE.name}
            </div>
            <p className="mt-3 text-[14px] leading-[22px] text-ink-body max-w-[32ch]">
              {SITE.description}
            </p>
          </div>

          <nav aria-label="Legal" className="flex flex-col gap-2.5">
            <div className={headingClasses}>Legal</div>
            {legalLinks.map((l) => (
              <Link key={l.href} href={l.href} className={linkClasses}>
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="flex flex-col gap-2.5">
            <div className={headingClasses}>Broker</div>
            <p className="text-[14px] leading-[22px] text-ink-body">
              Listing broker:{" "}
              <strong className="font-semibold text-ink-title">
                {SITE.broker.name}
              </strong>
            </p>
            <p className="text-[13px] leading-[20px] text-ink-muted">
              Licensed in {SITE.broker.stateOfRecord}
            </p>
          </div>

          <div className="flex flex-col gap-2.5">
            <div className={headingClasses}>Compliance</div>
            <Image
              src="/logos/equal-housing-opportunity.jpg"
              alt="Equal Housing Opportunity"
              width={1130}
              height={1209}
              className="h-12 w-auto self-start mix-blend-multiply"
            />
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-border-soft py-6 text-[13px] text-ink-muted md:flex-row md:items-center md:justify-between">
          <span>
            &copy; {year} {SITE.name}. All rights reserved.
          </span>
          <span>Operated in partnership with {SITE.broker.name}.</span>
        </div>
      </Container>
    </footer>
  );
}
