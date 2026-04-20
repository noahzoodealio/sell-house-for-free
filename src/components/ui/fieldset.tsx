import type { ComponentPropsWithoutRef, ReactNode, Ref } from "react";
import { cn } from "@/lib/cn";

type FieldsetProps = Omit<ComponentPropsWithoutRef<"fieldset">, "children"> & {
  legend: string;
  children: ReactNode;
  ref?: Ref<HTMLFieldSetElement>;
};

export function Fieldset({
  legend,
  children,
  className,
  ref,
  ...props
}: FieldsetProps) {
  return (
    <fieldset
      ref={ref}
      className={cn("border-none p-0 m-0 flex flex-col gap-3", className)}
      {...props}
    >
      <legend className="mb-2 p-0 text-[16px] leading-[24px] font-semibold font-[var(--font-inter)] text-ink-title">
        {legend}
      </legend>
      {children}
    </fieldset>
  );
}
