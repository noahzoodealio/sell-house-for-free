"use client";

import { useId, useRef } from "react";
import { cn } from "@/lib/cn";
import {
  CURRENT_LISTING_STATUS_VALUES,
  type CurrentListingStatus,
} from "@/lib/seller-form/schema";
import type { EnrichmentSlot } from "@/lib/seller-form/types";

export const LISTED_REASON_VALUES = CURRENT_LISTING_STATUS_VALUES;

export type ListedReason = CurrentListingStatus;

type ChipCopy = { value: ListedReason; label: string };

const CHIPS: readonly ChipCopy[] = [
  { value: "second-opinion", label: "Second opinion" },
  { value: "ready-to-switch", label: "Ready to switch" },
  { value: "just-exploring", label: "Just exploring" },
];

export type ListedNoticeProps = {
  listingStatus: EnrichmentSlot["listingStatus"];
  value: ListedReason | undefined;
  onChange: (reason: ListedReason) => void;
  className?: string;
};

export function ListedNotice({
  listingStatus,
  value,
  onChange,
  className,
}: ListedNoticeProps) {
  const groupId = useId();
  const chipRefs = useRef<Array<HTMLButtonElement | null>>([]);

  if (listingStatus !== "currently-listed") return null;

  const selectedIdx = CHIPS.findIndex((c) => c.value === value);
  // When nothing is selected, focus lands on the first chip — per ARIA
  // radiogroup pattern (roving tabindex on a single chip).
  const focusIdx = selectedIdx === -1 ? 0 : selectedIdx;

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    const isForward = event.key === "ArrowRight" || event.key === "ArrowDown";
    const isBackward = event.key === "ArrowLeft" || event.key === "ArrowUp";
    if (!isForward && !isBackward) return;
    event.preventDefault();
    const delta = isForward ? 1 : -1;
    const next = (focusIdx + delta + CHIPS.length) % CHIPS.length;
    onChange(CHIPS[next].value);
    chipRefs.current[next]?.focus();
  };

  return (
    <fieldset
      aria-labelledby={`${groupId}-legend`}
      className={cn(
        "flex flex-col gap-3 rounded-md border border-border bg-surface p-4",
        className,
      )}
    >
      <legend id={`${groupId}-legend`} className="contents">
        <h3 className="text-[16px] leading-[22px] font-semibold text-ink-title">
          We see your home is currently listed.
        </h3>
        <p className="text-[14px] leading-[20px] text-ink-body">
          We can still help &mdash; are you exploring a second opinion, or
          ready to switch representation?
        </p>
      </legend>

      <div role="radiogroup" className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {CHIPS.map((chip, idx) => {
          const isSelected = value === chip.value;
          const isTabTarget = idx === focusIdx;
          return (
            <button
              key={chip.value}
              ref={(el) => {
                chipRefs.current[idx] = el;
              }}
              type="button"
              role="radio"
              aria-checked={isSelected}
              tabIndex={isTabTarget ? 0 : -1}
              onClick={() => {
                if (value !== chip.value) onChange(chip.value);
              }}
              onKeyDown={handleKeyDown}
              className={cn(
                "inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border px-4 py-2 text-[14px] leading-[20px]",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
                isSelected
                  ? "border-brand bg-[color:color-mix(in_srgb,var(--color-brand)_12%,transparent)] text-ink-title font-medium"
                  : "border-border bg-surface text-ink-body hover:border-[color:color-mix(in_srgb,var(--color-brand)_40%,transparent)]",
              )}
            >
              {chip.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
