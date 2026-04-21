"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    // E8: swap for Sentry.captureException(error), one-line change.
    console.error(error);
  }, [error]);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-24 text-center">
      <h1 className="text-ink-title text-[36px] leading-[44px] md:text-[48px] md:leading-[56px]">
        Something went wrong
      </h1>
      <p className="text-ink-body max-w-[var(--container-prose)] text-[18px] leading-[28px]">
        An unexpected error interrupted this page. You can try again, or head back home.
      </p>
      <div className="flex flex-col items-center gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => unstable_retry()}
          className="bg-brand text-brand-foreground focus-visible:outline-brand inline-flex h-[52px] items-center justify-center rounded-lg px-6 text-[18px] font-semibold focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          Try again
        </button>
        <Link
          href="/"
          className="text-ink-body focus-visible:outline-brand inline-flex h-[52px] items-center justify-center rounded-lg px-6 text-[18px] font-medium underline decoration-1 underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          Return home
        </Link>
      </div>
      {error.digest && (
        <p className="text-ink-muted text-[14px]">Ref: {error.digest}</p>
      )}
    </main>
  );
}
