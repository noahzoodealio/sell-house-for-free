import type { ComponentPropsWithoutRef, Ref } from "react";
import { cn } from "@/lib/cn";

type InputProps = ComponentPropsWithoutRef<"input"> & {
  ref?: Ref<HTMLInputElement>;
};

const base =
  "block w-full h-12 md:h-[52px] px-4 rounded-md border " +
  "bg-surface text-ink-body placeholder:text-ink-muted " +
  "font-[var(--font-inter)] text-[16px] leading-[24px] " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 " +
  "disabled:cursor-not-allowed disabled:opacity-50";

const ok =
  "border-border focus-visible:outline-brand aria-[invalid=false]:border-border";

const invalid =
  "aria-[invalid=true]:border-[var(--color-error)] " +
  "aria-[invalid=true]:focus-visible:outline-[var(--color-error)]";

export function Input({ className, type = "text", ref, ...props }: InputProps) {
  return (
    <input
      ref={ref}
      type={type}
      className={cn(base, ok, invalid, className)}
      {...props}
    />
  );
}
