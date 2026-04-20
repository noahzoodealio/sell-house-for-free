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
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

const variantClass: Record<Variant, string> = {
  primary: "bg-brand text-brand-foreground hover:brightness-110",
  secondary:
    "bg-transparent border-2 border-brand text-brand hover:bg-brand/5",
  quiet:
    "bg-transparent text-ink-title underline underline-offset-4 hover:text-brand",
};

const sizeClass: Record<Size, string> = {
  md: "h-12 px-6 text-[16px]",
  lg: "h-[56px] px-7 text-[18px]",
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
