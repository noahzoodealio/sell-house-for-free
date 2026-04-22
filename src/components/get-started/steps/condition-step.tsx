"use client";

import type { Ref } from "react";
import {
  CONDITION_VALUES,
  TIMELINE_VALUES,
} from "@/lib/seller-form/schema";
import type { ConditionFields } from "@/lib/seller-form/types";

type ConditionStepProps = {
  data: Partial<ConditionFields>;
  errors?: Record<string, string[]>;
  onChange: (partial: Partial<ConditionFields>) => void;
  headingRef: Ref<HTMLHeadingElement>;
};

const CONDITION_CHIPS: ReadonlyArray<{
  value: (typeof CONDITION_VALUES)[number];
  label: string;
}> = [
  { value: "move-in", label: "Move-in ready" },
  { value: "needs-work", label: "Needs some work" },
  { value: "major-reno", label: "Major renovation" },
];

const TIMELINE_CHIPS: ReadonlyArray<{
  value: (typeof TIMELINE_VALUES)[number];
  label: string;
}> = [
  { value: "0-3mo", label: "ASAP · within 3 months" },
  { value: "3-6mo", label: "3–6 months" },
  { value: "6-12mo", label: "6–12 months" },
  { value: "exploring", label: "Just exploring" },
];

const REASON_CHIPS: ReadonlyArray<string> = [
  "Upsizing",
  "Downsizing",
  "Relocating",
  "Investment",
  "Life change",
  "Other",
];

function firstError(
  errors: Record<string, string[]> | undefined,
  field: string,
): string | undefined {
  return errors?.[field]?.[0];
}

export function ConditionStep({
  data,
  errors,
  onChange,
  headingRef,
}: ConditionStepProps) {
  const conditionError = firstError(errors, "currentCondition");
  const timelineError = firstError(errors, "timeline");

  return (
    <div>
      <span className="eyebrow" style={{ marginBottom: 12 }}>
        Step 4 · A few more details
      </span>
      <h2 ref={headingRef} tabIndex={-1} style={{ outline: "none" }}>
        Tell us about the home and timing.
      </h2>
      <p className="lede">
        Helps us recommend the right plan and pricing strategy.
      </p>

      <div className="field">
        <label>Overall condition</label>
        <div
          className="chip-group"
          role="radiogroup"
          aria-label="Home condition"
          aria-invalid={conditionError ? true : undefined}
        >
          {CONDITION_CHIPS.map((chip) => {
            const selected = data.currentCondition === chip.value;
            return (
              <button
                key={chip.value}
                type="button"
                role="radio"
                aria-checked={selected}
                className={"chip" + (selected ? " selected" : "")}
                onClick={() => onChange({ currentCondition: chip.value })}
              >
                {chip.label}
              </button>
            );
          })}
        </div>
        {conditionError && <p className="field-error">{conditionError}</p>}
      </div>

      <div className="field">
        <label>When do you want to sell?</label>
        <div
          className="chip-group"
          role="radiogroup"
          aria-label="Target timeline"
          aria-invalid={timelineError ? true : undefined}
        >
          {TIMELINE_CHIPS.map((chip) => {
            const selected = data.timeline === chip.value;
            return (
              <button
                key={chip.value}
                type="button"
                role="radio"
                aria-checked={selected}
                className={"chip" + (selected ? " selected" : "")}
                onClick={() => onChange({ timeline: chip.value })}
              >
                {chip.label}
              </button>
            );
          })}
        </div>
        {timelineError && <p className="field-error">{timelineError}</p>}
      </div>

      <div className="field">
        <label>Reason for selling (optional)</label>
        <div className="chip-group" role="radiogroup" aria-label="Reason">
          {REASON_CHIPS.map((reason) => {
            const selected = data.motivation === reason;
            return (
              <button
                key={reason}
                type="button"
                role="radio"
                aria-checked={selected}
                className={"chip" + (selected ? " selected" : "")}
                onClick={() =>
                  onChange({ motivation: selected ? undefined : reason })
                }
              >
                {reason}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
