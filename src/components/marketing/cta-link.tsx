import type { ComponentPropsWithoutRef } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "quiet";
type Size = "md" | "lg";

type CtaLinkProps = Omit<ComponentPropsWithoutRef<typeof Link>, "href"> & {
  href: string;
  variant?: Variant;
  size?: Size;
};

const base =
  "inline-flex items-center justify-center rounded-lg font-semibold font-[var(--font-inter)] " +
  "transition-colors duration-150 " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

const variantClass: Record<Variant, string> = {
  primary:
    "bg-brand text-brand-foreground shadow-[var(--shadow-card)] hover:bg-[#084fb8] active:bg-[#063f90]",
  secondary:
    "bg-white border border-brand-deep text-brand-deep hover:bg-brand-subtle hover:border-brand",
  quiet:
    "bg-transparent text-ink-title underline underline-offset-4 hover:text-brand",
};

const sizeClass: Record<Size, string> = {
  md: "h-11 px-5 text-[15px]",
  lg: "h-[52px] px-7 text-[16px]",
};

export function CtaLink({
  href,
  variant = "primary",
  size = "lg",
  className,
  ...props
}: CtaLinkProps) {
  return (
    <Link
      href={href}
      className={cn(
        base,
        variant === "quiet" ? "" : sizeClass[size],
        variantClass[variant],
        className,
      )}
      {...props}
    />
  );
}
