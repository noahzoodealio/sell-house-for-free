import type { ComponentPropsWithoutRef, Ref } from "react";
import { cn } from "@/lib/cn";

type CheckboxProps = Omit<ComponentPropsWithoutRef<"input">, "type"> & {
  ref?: Ref<HTMLInputElement>;
};

const base =
  "w-5 h-5 rounded-sm border border-border bg-surface " +
  "accent-[var(--color-brand)] " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand " +
  "aria-[invalid=true]:border-[var(--color-error)] " +
  "aria-[invalid=true]:focus-visible:outline-[var(--color-error)] " +
  "disabled:cursor-not-allowed disabled:opacity-50";

export function Checkbox({ className, ref, ...props }: CheckboxProps) {
  return (
    <input
      ref={ref}
      type="checkbox"
      className={cn(base, className)}
      {...props}
    />
  );
}
