import { cn } from "@/lib/cn";

type ProgressProps = {
  current: number;
  total: number;
  labels: ReadonlyArray<string>;
  className?: string;
};

export function Progress({ current, total, labels, className }: ProgressProps) {
  const safeCurrent = Math.max(1, Math.min(current, total));
  const percent = Math.round((safeCurrent / total) * 100);
  const stepLabel = labels[safeCurrent - 1] ?? "";
  const ariaLabel = `Step ${safeCurrent} of ${total}: ${stepLabel}`;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <span className="sr-only">{ariaLabel}, in progress</span>
      <span
        aria-hidden="true"
        className="text-[14px] leading-[20px] text-ink-muted"
      >
        Step {safeCurrent} of {total}
      </span>
      <div
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={safeCurrent}
        aria-label={ariaLabel}
        className="h-1 w-full overflow-hidden rounded-full bg-surface-tint"
      >
        <div
          className="h-full rounded-full bg-brand transition-[width] duration-200"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
