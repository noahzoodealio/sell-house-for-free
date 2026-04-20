import type { ComponentPropsWithoutRef, CSSProperties, Ref } from "react";
import { cn } from "@/lib/cn";

type SelectProps = ComponentPropsWithoutRef<"select"> & {
  ref?: Ref<HTMLSelectElement>;
};

const base =
  "block w-full h-12 md:h-[52px] pl-4 pr-10 rounded-md border " +
  "bg-surface text-ink-body " +
  "font-[var(--font-inter)] text-[16px] leading-[24px] " +
  "appearance-none bg-no-repeat " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 " +
  "disabled:cursor-not-allowed disabled:opacity-50";

const ok =
  "border-border focus-visible:outline-brand aria-[invalid=false]:border-border";

const invalid =
  "aria-[invalid=true]:border-[var(--color-error)] " +
  "aria-[invalid=true]:focus-visible:outline-[var(--color-error)]";

const chevronStyle: CSSProperties = {
  backgroundImage: "var(--chevron-down)",
  backgroundPosition: "right 12px center",
  backgroundSize: "20px 20px",
};

export function Select({ className, style, ref, ...props }: SelectProps) {
  return (
    <select
      ref={ref}
      className={cn(base, ok, invalid, className)}
      style={{ ...chevronStyle, ...style }}
      {...props}
    />
  );
}
