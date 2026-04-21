import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Not found",
};

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-24 text-center">
      <h1 className="text-ink-title text-[36px] leading-[44px] md:text-[48px] md:leading-[56px]">
        404, Page not found
      </h1>
      <p className="text-ink-body max-w-[var(--container-prose)] text-[18px] leading-[28px]">
        The page you&apos;re looking for doesn&apos;t exist or has moved.
      </p>
      <div className="flex flex-col items-center gap-3 sm:flex-row">
        <Link
          href="/"
          className="bg-brand text-brand-foreground focus-visible:outline-brand inline-flex h-[52px] items-center justify-center rounded-lg px-6 text-[18px] font-semibold focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          Return home
        </Link>
        <Link
          href="/get-offer"
          className="text-ink-body focus-visible:outline-brand inline-flex h-[52px] items-center justify-center rounded-lg px-6 text-[18px] font-medium underline decoration-1 underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          Get started
        </Link>
      </div>
    </main>
  );
}
