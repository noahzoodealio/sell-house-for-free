"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SITE } from "@/lib/site";
import { ROUTES, type RouteEntry } from "@/lib/routes";
import { cn } from "@/lib/cn";

type NavItem = { path: string; title: string };

function route(path: string): NavItem {
  const r = (ROUTES as readonly RouteEntry[]).find((x) => x.path === path);
  return { path, title: r?.title ?? path };
}

const WAYS_TO_SELL: readonly NavItem[] = [
  route("/listing"),
  route("/cash-offers"),
  route("/cash-plus-repairs"),
  route("/renovation-only"),
];

const LEARN_MORE: readonly NavItem[] = [
  route("/how-it-works"),
  route("/why-its-free"),
  route("/faq"),
];

const COMPANY: readonly NavItem[] = [
  route("/meet-your-pm"),
  route("/about"),
];

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

function DrawerSection({
  heading,
  items,
  pathname,
}: {
  heading: string;
  items: readonly NavItem[];
  pathname: string;
}) {
  return (
    <section>
      <h2 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-ink-muted mb-4">
        {heading}
      </h2>
      <ul className="flex flex-col">
        {items.map((r) => {
          const active = pathname === r.path;
          return (
            <li key={r.path}>
              <Link
                href={r.path}
                className={cn(
                  "flex items-center justify-between py-2.5 text-[16px] leading-[1.4] border-b border-border-soft last:border-b-0 transition-colors",
                  active
                    ? "text-brand font-medium"
                    : "text-ink-title hover:text-brand",
                )}
              >
                <span>{r.title}</span>
                <svg
                  viewBox="0 0 20 20"
                  aria-hidden="true"
                  className="size-4 text-ink-muted transition-transform group-hover:translate-x-0.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M7 5l5 5-5 5" />
                </svg>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
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

  return (
    <header className="relative z-40 border-b border-border-soft bg-surface">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-surface focus:px-4 focus:py-2 focus:text-ink-title focus:outline-2 focus:outline-brand"
      >
        Skip to main content
      </a>
      <div className="mx-auto flex h-[76px] w-full items-center justify-between gap-6 px-5 md:px-10 lg:px-14">
        <Link
          href="/"
          aria-label={`${SITE.name}, home`}
          className="flex items-center gap-2 text-[18px] md:text-[20px] font-semibold font-[var(--font-inter)] text-ink-title shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          <span
            aria-hidden="true"
            className="inline-flex size-8 items-center justify-center rounded-lg bg-brand text-brand-foreground text-[14px] font-bold"
          >
            S
          </span>
          <span>{SITE.name}</span>
        </Link>

        <nav
          aria-label="Ways to sell"
          className="hidden lg:flex flex-1 items-center justify-center gap-10"
        >
          {WAYS_TO_SELL.map((r) => {
            const active = pathname === r.path;
            return (
              <Link
                key={r.path}
                href={r.path}
                className={cn(
                  "text-[15px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
                  active
                    ? "text-brand"
                    : "text-ink-title/80 hover:text-brand",
                )}
              >
                {r.title}
              </Link>
            );
          })}
        </nav>

        <button
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls="site-nav-panel"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-2 rounded-lg px-3 h-11 text-[15px] font-semibold text-ink-title transition-colors hover:bg-surface-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          <HamburgerIcon open={open} />
          <span className="hidden sm:inline">{open ? "Close" : "Menu"}</span>
        </button>
      </div>

      {open ? (
        <>
          <div
            aria-hidden="true"
            onClick={() => setOpen(false)}
            className="fixed inset-0 top-[77px] z-40 bg-ink-title/30 backdrop-blur-[1px]"
          />
          <div
            id="site-nav-panel"
            className="fixed inset-x-0 top-[77px] z-50 max-h-[calc(100vh-77px)] overflow-y-auto bg-surface border-t border-border-soft shadow-[var(--shadow-card)]"
          >
            <div className="mx-auto grid w-full max-w-[1200px] grid-cols-1 gap-x-12 gap-y-10 px-5 py-10 md:grid-cols-3 md:px-10 md:py-14 lg:px-14">
              <DrawerSection
                heading="Ways to sell"
                items={WAYS_TO_SELL}
                pathname={pathname}
              />
              <DrawerSection
                heading="Learn more"
                items={LEARN_MORE}
                pathname={pathname}
              />
              <DrawerSection
                heading="Company"
                items={COMPANY}
                pathname={pathname}
              />
            </div>
          </div>
        </>
      ) : null}
    </header>
  );
}
