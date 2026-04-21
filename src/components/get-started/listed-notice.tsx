"use client";

import { useId, useRef } from "react";
import { cn } from "@/lib/cn";
import type { EnrichmentSlot } from "@/lib/seller-form/types";

// S6 skeleton values — S8 will finalize copy + wire the strict z.enum on the
// draft schema's `currentListingStatus` field. These string literals are
// intentionally standalone from the schema enum (which today shares names
// with `listingStatus`) so S8 has a clear edit target.
export const LISTED_REASON_VALUES = [
  "second-opinion",
  "ready-to-switch",
  "just-exploring",
] as const;

export type ListedReason = (typeof LISTED_REASON_VALUES)[number];

type ChipCopy = { value: ListedReason; label: string; helper: string };

const CHIPS: readonly ChipCopy[] = [
  {
    value: "second-opinion",
    label: "Looking for a second opinion",
    helper: "I want another look at what my home could sell for",
  },
  {
    value: "ready-to-switch",
    label: "Ready to switch agents",
    helper: "I'm not happy with how my listing is going",
  },
  {
    value: "just-exploring",
    label: "Just exploring options",
    helper: "I'm curious what else is out there",
  },
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
        <p className="text-[14px] leading-[20px] font-medium text-ink-title">
          Looks like your home is currently listed.
        </p>
        <p className="text-[13px] leading-[18px] text-ink-muted">
          Want to tell us a bit more so we can help?
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
              onClick={() => onChange(chip.value)}
              onKeyDown={handleKeyDown}
              title={chip.helper}
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
