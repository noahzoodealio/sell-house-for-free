"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SITE } from "@/lib/site";
import { ROUTES, type RouteEntry } from "@/lib/routes";
import { cn } from "@/lib/cn";

const PRIMARY_NAV_PATHS = new Set<string>([
  "/how-it-works",
  "/faq",
  "/about",
]);

const ALL_NAV_ITEMS: readonly RouteEntry[] = (
  ROUTES as readonly RouteEntry[]
).filter((r) => r.showInNav && r.path !== "/" && r.path !== "/get-started");

const PRIMARY_NAV_ITEMS = ALL_NAV_ITEMS.filter((r) =>
  PRIMARY_NAV_PATHS.has(r.path),
);

const SERVICE_PATHS = new Set<string>([
  "/listing",
  "/cash-offers",
  "/cash-plus-repairs",
  "/renovation-only",
]);
const SERVICE_NAV_ITEMS = ALL_NAV_ITEMS.filter((r) =>
  SERVICE_PATHS.has(r.path),
);
const COMPANY_PATHS = new Set<string>(["/why-its-free", "/meet-your-pm"]);
const COMPANY_NAV_ITEMS = ALL_NAV_ITEMS.filter((r) =>
  COMPANY_PATHS.has(r.path),
);

const ctaClasses =
  "inline-flex items-center justify-center rounded-lg font-semibold text-[15px] font-[var(--font-inter)] " +
  "bg-brand text-brand-foreground shadow-[var(--shadow-card)] transition-colors hover:bg-[#084fb8] " +
  "h-10 px-5 md:h-11 md:px-6 " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

function HamburgerIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      {open ? (
        <>
          <path d="M6 6l12 12" />
          <path d="M18 6L6 18" />
        </>
      ) : (
        <>
          <path d="M4 7h16" />
          <path d="M4 12h16" />
          <path d="M4 17h16" />
        </>
      )}
    </svg>
  );
}

export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  const isActive = (p: string) => pathname === p;

  return (
    <header className="border-b border-border-soft bg-surface">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-surface focus:px-4 focus:py-2 focus:text-ink-title focus:outline-2 focus:outline-brand"
      >
        Skip to main content
      </a>
      <div className="mx-auto flex h-[76px] w-full items-center justify-between gap-6 px-5 md:px-10 lg:px-14">
        <Link
          href="/"
          aria-label={`${SITE.name} — home`}
          className="flex items-center gap-2 text-[18px] md:text-[20px] font-semibold font-[var(--font-inter)] text-ink-title shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          <span
            aria-hidden="true"
            className="inline-flex size-8 items-center justify-center rounded-lg bg-brand text-brand-foreground text-[14px] font-bold"
          >
            S
          </span>
          <span className="hidden xs:inline sm:inline">{SITE.name}</span>
        </Link>

        <nav
          aria-label="Primary"
          className="hidden md:flex flex-1 items-center justify-center gap-10"
        >
          {PRIMARY_NAV_ITEMS.map((r) => (
            <Link
              key={r.path}
              href={r.path}
              className={cn(
                "text-[15px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
                isActive(r.path)
                  ? "text-brand"
                  : "text-ink-title/80 hover:text-brand",
              )}
            >
              {r.title}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/get-started"
            className={`${ctaClasses} hidden sm:inline-flex`}
          >
            Get started
          </Link>

          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="mobile-nav-panel"
            onClick={() => setOpen((v) => !v)}
            className="md:hidden inline-flex size-11 items-center justify-center rounded-lg text-ink-title transition-colors hover:bg-surface-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            <HamburgerIcon open={open} />
          </button>
        </div>
      </div>

      {open ? (
        <div
          id="mobile-nav-panel"
          className="md:hidden fixed inset-0 top-[77px] z-50 bg-surface border-t border-border-soft overflow-y-auto"
        >
          <div className="mx-auto flex flex-col gap-8 px-5 py-8">
            <section>
              <p className="eyebrow mb-3">Menu</p>
              <ul className="flex flex-col gap-1">
                {PRIMARY_NAV_ITEMS.map((r) => (
                  <li key={r.path}>
                    <Link
                      href={r.path}
                      className={cn(
                        "block rounded-lg px-3 py-3 text-[17px] font-semibold transition-colors",
                        isActive(r.path)
                          ? "bg-brand-subtle text-brand"
                          : "text-ink-title hover:bg-surface-soft",
                      )}
                    >
                      {r.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <p className="eyebrow mb-3">Ways to sell</p>
              <ul className="flex flex-col gap-1">
                {SERVICE_NAV_ITEMS.map((r) => (
                  <li key={r.path}>
                    <Link
                      href={r.path}
                      className={cn(
                        "block rounded-lg px-3 py-3 text-[16px] transition-colors",
                        isActive(r.path)
                          ? "bg-brand-subtle text-brand font-semibold"
                          : "text-ink-body hover:bg-surface-soft hover:text-ink-title",
                      )}
                    >
                      {r.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <p className="eyebrow mb-3">Company</p>
              <ul className="flex flex-col gap-1">
                {COMPANY_NAV_ITEMS.map((r) => (
                  <li key={r.path}>
                    <Link
                      href={r.path}
                      className={cn(
                        "block rounded-lg px-3 py-3 text-[16px] transition-colors",
                        isActive(r.path)
                          ? "bg-brand-subtle text-brand font-semibold"
                          : "text-ink-body hover:bg-surface-soft hover:text-ink-title",
                      )}
                    >
                      {r.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>

            <Link
              href="/get-started"
              className={`${ctaClasses} w-full h-12 text-[16px]`}
            >
              Get started
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}
