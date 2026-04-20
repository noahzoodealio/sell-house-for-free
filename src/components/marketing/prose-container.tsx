import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type As = "article" | "section" | "div";

export type ProseContainerProps = {
  children: ReactNode;
  as?: As;
  className?: string;
};

export function ProseContainer({
  children,
  as = "article",
  className,
}: ProseContainerProps) {
  const classes = cn(
    "prose-custom mx-auto w-full max-w-[var(--container-prose)] px-4 md:px-6 text-ink-body",
    className,
  );
  if (as === "section") {
    return <section className={classes}>{children}</section>;
  }
  if (as === "div") {
    return <div className={classes}>{children}</div>;
  }
  return <article className={classes}>{children}</article>;
}
