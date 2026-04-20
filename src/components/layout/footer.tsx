import Link from "next/link";
import { Container } from "@/components/layout/container";
import { SITE } from "@/lib/site";

const legalLinks = [
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/broker-relationships", label: "Broker relationships" },
];

const linkClasses =
  "text-[14px] text-ink-body hover:text-ink-title " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-16 border-t border-border bg-surface-tint">
      <Container>
        <div className="grid gap-8 py-12 md:grid-cols-4">
          <div>
            <div className="text-[16px] font-semibold font-[var(--font-inter)] text-ink-title">
              {SITE.name}
            </div>
            <p className="mt-2 text-[14px] leading-[20px] text-ink-body">
              {SITE.description}
            </p>
          </div>

          <nav aria-label="Legal" className="flex flex-col gap-2">
            <div className="text-[14px] font-semibold text-ink-title">Legal</div>
            {legalLinks.map((l) => (
              <Link key={l.href} href={l.href} className={linkClasses}>
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="flex flex-col gap-2">
            <div className="text-[14px] font-semibold text-ink-title">Broker</div>
            <p className="text-[14px] leading-[20px] text-ink-body">
              Listing broker: <strong className="font-semibold">{SITE.broker.name}</strong>
            </p>
            <p className="text-[14px] leading-[20px] text-ink-muted">
              Licensed in {SITE.broker.stateOfRecord}
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <div className="text-[14px] font-semibold text-ink-title">Compliance</div>
            <p className="text-[14px] leading-[20px] text-ink-muted">
              Equal Housing Opportunity
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-border py-6 text-[14px] text-ink-muted md:flex-row md:items-center md:justify-between">
          <span>
            &copy; {year} {SITE.name}. All rights reserved.
          </span>
          <span>Operated in partnership with {SITE.broker.name}.</span>
        </div>
      </Container>
    </footer>
  );
}
