import type { ComponentPropsWithoutRef, Ref } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost";
type Size = "xs" | "sm" | "md" | "lg" | "xl";

const base =
  "inline-flex items-center justify-center rounded-lg font-semibold text-[18px] font-[var(--font-inter)] " +
  "transition-none select-none " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand " +
  "disabled:cursor-not-allowed disabled:opacity-50 disabled:pointer-events-none";

const variantClass: Record<Variant, string> = {
  primary:
    "bg-brand text-brand-foreground hover:brightness-110",
  secondary:
    "bg-transparent border-2 border-brand text-brand hover:bg-brand/5",
  ghost:
    "bg-transparent border-2 border-transparent text-ink-body hover:bg-surface-tint",
};

const sizeClass: Record<Size, string> = {
  xs: "h-[42px] px-4",
  sm: "h-[44px] px-5",
  md: "h-12 md:h-[52px] px-6",
  lg: "h-[56px] px-7",
  xl: "h-[64px] px-8",
};

type ButtonProps = ComponentPropsWithoutRef<"button"> & {
  variant?: Variant;
  size?: Size;
  ref?: Ref<HTMLButtonElement>;
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  disabled,
  type = "button",
  ref,
  ...props
}: ButtonProps) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled}
      aria-disabled={disabled || undefined}
      className={cn(base, variantClass[variant], sizeClass[size], className)}
      {...props}
    />
  );
}
