import Link from "next/link";
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
    <header className="border-b border-border-soft bg-surface">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-surface focus:px-4 focus:py-2 focus:text-ink-title focus:outline-2 focus:outline-brand"
      >
        Skip to main content
      </a>
      <div className="mx-auto flex h-[76px] w-full items-center justify-between gap-8 px-6 md:px-10 lg:px-14">
        <Link
          href="/"
          aria-label={`${SITE.name} — home`}
          className="flex items-center gap-2 text-[20px] font-semibold font-[var(--font-inter)] text-ink-title shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          <span
            aria-hidden="true"
            className="inline-flex size-8 items-center justify-center rounded-lg bg-brand text-brand-foreground text-[14px] font-bold"
          >
            S
          </span>
          <span className="hidden sm:inline">{SITE.name}</span>
        </Link>

        <nav
          aria-label="Primary"
          className="hidden md:flex flex-1 items-center justify-center gap-10"
        >
          {navItems.map((r) => (
            <Link
              key={r.path}
              href={r.path}
              className="text-[15px] font-semibold text-ink-title/80 transition-colors hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              {r.title}
            </Link>
          ))}
        </nav>

        <Link href="/get-started" className={`${ctaClasses} shrink-0`}>
          Get started
        </Link>
      </div>
    </header>
  );
}
