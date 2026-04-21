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
      <div className="flex gap-2">
        <Button type="button" size="sm" variant="secondary" onClick={onDiscard}>
          Start fresh
        </Button>
        <Button type="button" size="sm" variant="primary" onClick={onDismiss}>
          Continue
        </Button>
      </div>
    </div>
  );
}
