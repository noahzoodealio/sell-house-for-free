import Link from "next/link";
import { Container } from "@/components/layout/container";
import { SITE } from "@/lib/site";
import { ROUTES, type RouteEntry } from "@/lib/routes";

const navItems: readonly RouteEntry[] = (ROUTES as readonly RouteEntry[]).filter(
  (r) => r.showInNav && r.path !== "/" && r.path !== "/get-started",
);

const ctaClasses =
  "inline-flex items-center justify-center rounded-lg font-semibold text-[15px] font-[var(--font-inter)] " +
  "bg-brand text-brand-foreground shadow-[var(--shadow-card)] transition-colors hover:bg-[#084fb8] " +
  "h-10 px-5 md:h-11 md:px-6 " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-border-soft bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/80">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-surface focus:px-4 focus:py-2 focus:text-ink-title focus:outline-2 focus:outline-brand"
      >
        Skip to main content
      </a>
      <Container>
        <div className="flex h-[72px] items-center justify-between gap-6">
          <Link
            href="/"
            aria-label={`${SITE.name} — home`}
            className="text-[20px] font-semibold font-[var(--font-inter)] text-ink-title focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            {SITE.name}
          </Link>

          <nav
            aria-label="Primary"
            className="hidden md:flex items-center gap-7"
          >
            {navItems.map((r) => (
              <Link
                key={r.path}
                href={r.path}
                className="text-[15px] font-medium text-ink-body transition-colors hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                {r.title}
              </Link>
            ))}
          </nav>

          <Link href="/get-started" className={ctaClasses}>
            Get started
          </Link>
        </div>
      </Container>
    </header>
  );
}
