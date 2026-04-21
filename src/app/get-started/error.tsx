"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function GetStartedError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("get-started error boundary:", error);
  }, [error]);

  return (
    <div className="flex flex-col gap-4 py-8">
      <h1 className="text-ink-title text-[24px] font-semibold leading-[32px]">
        Something went wrong.
      </h1>
      <p className="text-ink-body text-[16px] leading-[24px]">
        Your draft is saved. You can pick up where you left off.
      </p>
      <div>
        <Button type="button" onClick={reset}>
          Try again
        </Button>
      </div>
    </div>
  );
}
