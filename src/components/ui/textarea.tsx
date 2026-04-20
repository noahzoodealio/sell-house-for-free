import type { ComponentPropsWithoutRef, Ref } from "react";
import { cn } from "@/lib/cn";

type TextareaProps = ComponentPropsWithoutRef<"textarea"> & {
  ref?: Ref<HTMLTextAreaElement>;
};

const base =
  "block w-full min-h-[112px] px-4 py-3 rounded-md border resize-y " +
  "bg-surface text-ink-body placeholder:text-ink-muted " +
  "font-[var(--font-inter)] text-[16px] leading-[24px] " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 " +
  "disabled:cursor-not-allowed disabled:opacity-50";

const ok =
  "border-border focus-visible:outline-brand aria-[invalid=false]:border-border";

const invalid =
  "aria-[invalid=true]:border-[var(--color-error)] " +
  "aria-[invalid=true]:focus-visible:outline-[var(--color-error)]";

export function Textarea({ className, rows = 4, ref, ...props }: TextareaProps) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      className={cn(base, ok, invalid, className)}
      {...props}
    />
  );
}
