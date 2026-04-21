import type { ReactNode } from "react";
import Link from "next/link";
import { Container } from "@/components/layout/container";
import { LINKS } from "@/lib/links";
import { SITE } from "@/lib/site";

export default function GetStartedLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <header className="border-b border-border">
        <Container>
          <div className="flex h-[64px] items-center justify-between">
            <Link
              href={LINKS.home}
              aria-label={`${SITE.name} — home`}
              className="font-display text-[18px] font-semibold text-ink-title focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              {SITE.name}
            </Link>
            <a
              href="tel:+14805550100"
              className="text-[14px] text-ink-muted hover:text-ink-title focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              Questions? Call (480) 555-0100
            </a>
          </div>
        </Container>
      </header>
      <main id="main" className="flex flex-1 flex-col">
        <Container size="form" className="flex flex-1 flex-col py-10 md:py-14">
          {children}
        </Container>
      </main>
    </div>
  );
}
