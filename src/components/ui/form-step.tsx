import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type FormStepProps = {
  currentStep: number;
  totalSteps: number;
  heading: string;
  description?: string | ReactNode;
  children: ReactNode;
  className?: string;
};

export function FormStep({
  currentStep,
  totalSteps,
  heading,
  description,
  children,
  className,
}: FormStepProps) {
  const safeCurrent = Math.max(1, Math.min(currentStep, totalSteps));
  const percent = Math.round((safeCurrent / totalSteps) * 100);
  const label = `Step ${safeCurrent} of ${totalSteps}`;

  return (
    <div className={cn("mx-auto w-full max-w-[var(--container-form)]", className)}>
      <div className="flex flex-col gap-2">
        <span className="text-[14px] leading-[20px] text-ink-muted">{label}</span>
        <div
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={totalSteps}
          aria-valuenow={safeCurrent}
          aria-label={label}
          className="h-1 w-full overflow-hidden rounded-full bg-surface-tint"
        >
          <div
            className="h-full rounded-full bg-brand"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      <h2 className="mt-6 text-[24px] leading-[32px] font-semibold font-[var(--font-inter)] text-ink-title">
        {heading}
      </h2>

      {description && (
        <p className="mt-4 text-[16px] leading-[24px] text-ink-body">
          {description}
        </p>
      )}

      <div className="mt-6">{children}</div>
    </div>
  );
}
