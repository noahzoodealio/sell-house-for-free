// Placeholder home content — E2 replaces with final marketing copy.
import Link from "next/link";
import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

const homeTitle =
  "Sell Your House Free — Free Arizona cash-offer service";
const homeDescription =
  "Get a free, no-obligation cash offer on your Arizona home through a licensed broker. No listing fees. No agents. No pressure.";

export const metadata: Metadata = {
  ...buildMetadata({
    title: homeTitle,
    description: homeDescription,
    path: "/",
  }),
  title: { absolute: homeTitle },
};

const ctaClasses =
  "inline-flex h-[56px] w-full items-center justify-center rounded-lg " +
  "bg-brand text-brand-foreground hover:brightness-110 " +
  "px-7 text-[18px] font-semibold font-[var(--font-inter)] " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand " +
  "sm:w-auto";

export default function Home() {
  return (
    <section className="py-16 md:py-24 lg:py-32">
      <h1 className="text-[44px] leading-[50px] font-semibold font-[var(--font-inter)] text-ink-title md:text-[80px] md:leading-[1]">
        Sell your Arizona home — <br className="hidden sm:inline" />
        free, fast, no obligations.
      </h1>

      <p className="mt-8 max-w-[var(--container-prose)] text-[18px] leading-[32px] text-ink-body md:text-[20px]">
        Get a no-obligation cash offer on your house through a licensed Arizona
        broker. No listing fees. No agents chasing you. Just a straight answer
        on what your home is worth today.
      </p>

      <p className="mt-4 max-w-[var(--container-prose)] text-[16px] leading-[24px] text-ink-muted">
        No listing fees. Licensed broker. Arizona only.
      </p>

      <div className="mt-10">
        <Link href="/get-started" className={ctaClasses}>
          Get started
        </Link>
      </div>
    </section>
  );
}
