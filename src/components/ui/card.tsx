import type { ComponentPropsWithoutRef, Ref } from "react";
import { cn } from "@/lib/cn";

type Variant = "default" | "elevated" | "outlined";

type CardProps = ComponentPropsWithoutRef<"div"> & {
  variant?: Variant;
  ref?: Ref<HTMLDivElement>;
};

const base = "bg-surface rounded-lg p-6";

const variantClass: Record<Variant, string> = {
  default: "",
  elevated: "shadow-[var(--shadow-elevated)]",
  outlined: "border border-border",
};

export function Card({
  variant = "default",
  className,
  ref,
  ...props
}: CardProps) {
  return (
    <div
      ref={ref}
      className={cn(base, variantClass[variant], className)}
      {...props}
    />
  );
}
