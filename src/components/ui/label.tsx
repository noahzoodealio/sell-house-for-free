import type { ComponentPropsWithoutRef, Ref } from "react";
import { cn } from "@/lib/cn";

type NativeLabelProps = ComponentPropsWithoutRef<"label">;

type LabelProps = Omit<NativeLabelProps, "htmlFor"> & {
  htmlFor: string;
  ref?: Ref<HTMLLabelElement>;
};

export function Label({ className, ref, ...props }: LabelProps) {
  return (
    <label
      ref={ref}
      className={cn(
        "block text-[14px] leading-[20px] font-semibold font-[var(--font-inter)] text-ink-title md:text-[16px]",
        className,
      )}
      {...props}
    />
  );
}
