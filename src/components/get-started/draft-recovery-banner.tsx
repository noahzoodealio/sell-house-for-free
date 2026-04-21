"use client";

import { Button } from "@/components/ui/button";

type DraftRecoveryBannerProps = {
  onDismiss: () => void;
  onDiscard: () => void;
};

export function DraftRecoveryBanner({
  onDismiss,
  onDiscard,
}: DraftRecoveryBannerProps) {
  return (
    <div
      role="region"
      aria-label="Resume your draft"
      className="rounded-md border border-border bg-brand-subtle px-4 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="text-[14px] leading-[20px] text-ink-body">
        <strong>Welcome back.</strong> We kept your previous answers except your
        contact info (for privacy).
      </p>
      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={onDiscard}
          className="inline-flex items-center h-[40px] px-3 rounded-md text-[14px] leading-[20px] font-medium font-[var(--font-inter)] text-ink-muted hover:text-ink-body hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          Start fresh
        </button>
        <Button type="button" size="sm" variant="primary" onClick={onDismiss}>
          Continue
        </Button>
      </div>
    </div>
  );
}
