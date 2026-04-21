"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

type StepNavProps = {
  onBack: () => void;
  onNext: () => void;
  canAdvance: boolean;
  step: number;
  total: number;
};

export function StepNav({ onBack, onNext, canAdvance, step, total }: StepNavProps) {
  const isFinalStep = step === total;
  const isFirstStep = step === 1;

  return (
    <div className="mt-8 flex items-center justify-between gap-4">
      <Button
        type="button"
        variant="ghost"
        onClick={onBack}
        disabled={isFirstStep}
      >
        Back
      </Button>
      {isFinalStep ? (
        <SubmitButton disabled={!canAdvance} />
      ) : (
        <Button
          type="button"
          variant="primary"
          onClick={onNext}
          disabled={!canAdvance}
        >
          Next
        </Button>
      )}
    </div>
  );
}

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="primary" disabled={disabled || pending}>
      {pending ? "Submitting…" : "Submit"}
    </Button>
  );
}
