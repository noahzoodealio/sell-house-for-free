import type { Ref } from "react";
import type { StepSlug } from "@/lib/seller-form/types";

const STEP_LABELS: Record<StepSlug, string> = {
  address: "Address",
  property: "Property facts",
  condition: "Condition & timeline",
  contact: "Contact & consent",
};

const STEP_STORY: Record<StepSlug, string> = {
  address: "S4",
  property: "S5",
  condition: "S6",
  contact: "S7",
};

type PlaceholderStepProps = {
  slug: StepSlug;
  headingRef: Ref<HTMLHeadingElement>;
  errors?: Record<string, string[]>;
};

export function PlaceholderStep({ slug, headingRef, errors }: PlaceholderStepProps) {
  return (
    <div className="flex flex-col gap-4">
      <h2
        ref={headingRef}
        tabIndex={-1}
        className="text-[24px] leading-[32px] font-semibold font-[var(--font-inter)] text-ink-title outline-none"
      >
        {STEP_LABELS[slug]}
      </h2>
      <p className="text-[16px] leading-[24px] text-ink-body">
        [{slug} step — {STEP_STORY[slug]} fills this in]
      </p>
      {errors && Object.keys(errors).length > 0 && (
        <ul className="text-[14px] leading-[20px] text-error">
          {Object.entries(errors).map(([field, messages]) => (
            <li key={field}>
              {field}: {messages.join(", ")}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
