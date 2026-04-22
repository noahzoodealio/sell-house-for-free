"use client";

import { useId, useRef } from "react";
import { cn } from "@/lib/cn";
import {
  ACTIVE_STATUS_RAW_KEYS,
  canonicalizeStatus,
  normalizeListingStatus,
} from "@/lib/enrichment/normalize";
import {
  CURRENT_LISTING_STATUS_VALUES,
  HAS_AGENT_VALUES,
  type CurrentListingStatus,
  type HasAgent,
} from "@/lib/seller-form/schema";

export const LISTED_REASON_VALUES = CURRENT_LISTING_STATUS_VALUES;

export type ListedReason = CurrentListingStatus;
export type { HasAgent };

type ChipCopy<T extends string> = { value: T; label: string };

const CHIPS: readonly ChipCopy<ListedReason>[] = [
  { value: "second-opinion", label: "Second opinion" },
  { value: "ready-to-switch", label: "Ready to switch" },
  { value: "just-exploring", label: "Just exploring" },
];

const AGENT_OPTIONS: readonly ChipCopy<HasAgent>[] = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
  { value: "not-sure", label: "Not sure" },
];

// Sanity check — keeps AGENT_OPTIONS in sync with the schema enum.
if (AGENT_OPTIONS.length !== HAS_AGENT_VALUES.length) {
  throw new Error("AGENT_OPTIONS must mirror HAS_AGENT_VALUES");
}

export type MlsStatusNoticeProps = {
  mlsRecordId: string | undefined;
  rawListingStatus: string | undefined;
  listingStatusDisplay: string | undefined;
  value: ListedReason | undefined;
  onChange: (reason: ListedReason) => void;
  hasAgent: HasAgent | undefined;
  onHasAgentChange: (value: HasAgent) => void;
  className?: string;
};

function useRovingKeydown<T extends string>(
  options: readonly ChipCopy<T>[],
  focusIdx: number,
  onSelect: (value: T) => void,
  refs: React.MutableRefObject<Array<HTMLButtonElement | null>>,
) {
  return (event: React.KeyboardEvent<HTMLButtonElement>) => {
    const isForward = event.key === "ArrowRight" || event.key === "ArrowDown";
    const isBackward = event.key === "ArrowLeft" || event.key === "ArrowUp";
    if (!isForward && !isBackward) return;
    event.preventDefault();
    const delta = isForward ? 1 : -1;
    const next = (focusIdx + delta + options.length) % options.length;
    onSelect(options[next].value);
    refs.current[next]?.focus();
  };
}

export function MlsStatusNotice({
  mlsRecordId,
  rawListingStatus,
  listingStatusDisplay,
  value,
  onChange,
  hasAgent,
  onHasAgentChange,
  className,
}: MlsStatusNoticeProps) {
  const groupId = useId();
  const chipRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const agentRefs = useRef<Array<HTMLButtonElement | null>>([]);

  if (!mlsRecordId) return null;
  const canonical = canonicalizeStatus(rawListingStatus);
  if (!ACTIVE_STATUS_RAW_KEYS.has(canonical)) return null;
  if (!listingStatusDisplay) return null;

  const showChips =
    normalizeListingStatus(rawListingStatus) === "currently-listed" &&
    (canonical === "active" || canonical === "activeundercontract");

  const chipSelectedIdx = CHIPS.findIndex((c) => c.value === value);
  const chipFocusIdx = chipSelectedIdx === -1 ? 0 : chipSelectedIdx;
  const agentSelectedIdx = AGENT_OPTIONS.findIndex((o) => o.value === hasAgent);
  const agentFocusIdx = agentSelectedIdx === -1 ? 0 : agentSelectedIdx;

  const handleChipKeyDown = useRovingKeydown(CHIPS, chipFocusIdx, onChange, chipRefs);
  const handleAgentKeyDown = useRovingKeydown(
    AGENT_OPTIONS,
    agentFocusIdx,
    onHasAgentChange,
    agentRefs,
  );

  const wrapperClass = cn(
    "flex flex-col gap-3 rounded-md border border-border bg-surface p-4",
    className,
  );

  const chipSubcopyId = `${groupId}-chip-subcopy`;
  const agentLabelId = `${groupId}-agent-label`;

  return (
    <section className={wrapperClass}>
      <h3 className="text-[16px] leading-[22px] font-semibold text-ink-title">
        We see your home is {listingStatusDisplay}.
      </h3>

      {showChips && (
        <>
          <p id={chipSubcopyId} className="text-[14px] leading-[20px] text-ink-body">
            We can still help &mdash; are you exploring a second opinion, or
            ready to switch representation?
          </p>
          <div
            role="radiogroup"
            aria-labelledby={chipSubcopyId}
            className="flex flex-col gap-2 sm:flex-row sm:flex-wrap"
          >
            {CHIPS.map((chip, idx) => {
              const isSelected = value === chip.value;
              const isTabTarget = idx === chipFocusIdx;
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
                  onKeyDown={handleChipKeyDown}
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
        </>
      )}

      <p id={agentLabelId} className="text-[14px] leading-[20px] text-ink-body">
        Are you currently working with an agent on this sale?
      </p>
      <div
        role="radiogroup"
        aria-labelledby={agentLabelId}
        className="flex flex-col gap-2 sm:flex-row sm:flex-wrap"
      >
        {AGENT_OPTIONS.map((option, idx) => {
          const isSelected = hasAgent === option.value;
          const isTabTarget = idx === agentFocusIdx;
          return (
            <button
              key={option.value}
              ref={(el) => {
                agentRefs.current[idx] = el;
              }}
              type="button"
              role="radio"
              aria-checked={isSelected}
              tabIndex={isTabTarget ? 0 : -1}
              onClick={() => {
                if (hasAgent !== option.value) onHasAgentChange(option.value);
              }}
              onKeyDown={handleAgentKeyDown}
              className={cn(
                "inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border px-4 py-2 text-[14px] leading-[20px]",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
                isSelected
                  ? "border-brand bg-[color:color-mix(in_srgb,var(--color-brand)_12%,transparent)] text-ink-title font-medium"
                  : "border-border bg-surface text-ink-body hover:border-[color:color-mix(in_srgb,var(--color-brand)_40%,transparent)]",
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}
