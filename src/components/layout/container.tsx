import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/cn";

type Size = "page" | "prose" | "form";
type As = "div" | "main" | "section" | "article";

type ContainerProps = Omit<ComponentPropsWithoutRef<"div">, "ref"> & {
  size?: Size;
  as?: As;
};

const base = "mx-auto w-full px-4 md:px-6 lg:px-8";

const sizeClass: Record<Size, string> = {
  page: "max-w-[var(--container-page)]",
  prose: "max-w-[var(--container-prose)]",
  form: "max-w-[var(--container-form)]",
};

export function Container({
  size = "page",
  as = "div",
  className,
  children,
  ...props
}: ContainerProps) {
  const classes = cn(base, sizeClass[size], className);

  if (as === "main") {
    return <main className={classes} {...props}>{children}</main>;
  }
  if (as === "section") {
    return <section className={classes} {...props}>{children}</section>;
  }
  if (as === "article") {
    return <article className={classes} {...props}>{children}</article>;
  }
  return <div className={classes} {...props}>{children}</div>;
}
