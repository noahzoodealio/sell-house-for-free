"use client";

import { useId, type Ref } from "react";
import { Field } from "@/components/ui/field";
import { Fieldset } from "@/components/ui/fieldset";
import { Radio } from "@/components/ui/radio";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
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
  showCashOffersPrenudge?: boolean;
};

const CONDITION_OPTIONS: Array<{
  value: (typeof CONDITION_VALUES)[number];
  label: string;
  description: string;
}> = [
  {
    value: "move-in",
    label: "Move-in ready",
    description: "No significant repairs needed.",
  },
  {
    value: "needs-work",
    label: "Needs some work",
    description: "Visible cosmetic or minor structural issues.",
  },
  {
    value: "major-reno",
    label: "Major renovation",
    description: "Significant repairs or partial rebuild.",
  },
];

const TIMELINE_OPTIONS: Array<{
  value: (typeof TIMELINE_VALUES)[number];
  label: string;
}> = [
  { value: "0-3mo", label: "Within 3 months" },
  { value: "3-6mo", label: "3–6 months" },
  { value: "6-12mo", label: "6–12 months" },
  { value: "exploring", label: "Just exploring right now" },
];

const MAX_MOTIVATION = 500;

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
  showCashOffersPrenudge = false,
}: ConditionStepProps) {
  const radioGroupId = useId();
  const motivationValue = data.motivation ?? "";
  const motivationOver = motivationValue.length > MAX_MOTIVATION - 50;
  const conditionError = firstError(errors, "currentCondition");
  const timelineError = firstError(errors, "timeline");
  const motivationError = firstError(errors, "motivation");

  return (
    <div className="flex flex-col gap-6">
      <h2
        ref={headingRef}
        tabIndex={-1}
        className="text-[24px] leading-[32px] font-semibold font-[var(--font-inter)] text-ink-title outline-none"
      >
        Step 3 of 4: Condition &amp; timeline
      </h2>

      {showCashOffersPrenudge && (
        <p className="text-[14px] leading-[20px] italic text-ink-muted">
          You mentioned you&apos;re currently listed &mdash; a cash offer can
          close without waiting for MLS days.
        </p>
      )}

      <Fieldset legend="What's your home's current condition?">
        <ul className="flex flex-col gap-2" role="radiogroup">
          {CONDITION_OPTIONS.map((opt) => {
            const radioId = `${radioGroupId}-${opt.value}`;
            const checked = data.currentCondition === opt.value;
            return (
              <li key={opt.value}>
                <label
                  htmlFor={radioId}
                  className="flex cursor-pointer items-start gap-3 rounded-md border border-border p-3 hover:bg-surface-tint"
                >
                  <Radio
                    id={radioId}
                    name="currentCondition"
                    value={opt.value}
                    checked={checked}
                    onChange={() => onChange({ currentCondition: opt.value })}
                    aria-invalid={conditionError ? true : undefined}
                    className="mt-1"
                  />
                  <span className="flex flex-col gap-0.5">
                    <span className="text-[16px] leading-[24px] font-semibold text-ink-title">
                      {opt.label}
                    </span>
                    <span className="text-[14px] leading-[20px] text-ink-muted">
                      {opt.description}
                    </span>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
        {conditionError && (
          <p className="text-[14px] leading-[20px] text-[var(--color-error)]">
            {conditionError}
          </p>
        )}
      </Fieldset>

      <Field label="Target timeline" errorText={timelineError}>
        <Select
          name="timeline"
          value={data.timeline ?? ""}
          onChange={(e) =>
            onChange({
              timeline: (e.target.value ||
                undefined) as ConditionFields["timeline"],
            })
          }
        >
          <option value="" disabled>
            Select your target timeline
          </option>
          {TIMELINE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
      </Field>

      <Field
        label="Anything we should know? (optional)"
        helpText="Moving for work, relocating, inherited property — any context helps your PM."
        errorText={motivationError}
      >
        <Textarea
          name="motivation"
          value={motivationValue}
          onChange={(e) => onChange({ motivation: e.target.value })}
          maxLength={MAX_MOTIVATION}
          rows={4}
        />
      </Field>
      <p
        aria-live="polite"
        className={
          motivationOver
            ? "text-right text-[13px] leading-[18px] text-[var(--color-error)]"
            : "text-right text-[13px] leading-[18px] text-ink-muted"
        }
      >
        {motivationValue.length} / {MAX_MOTIVATION}
      </p>
    </div>
  );
}
