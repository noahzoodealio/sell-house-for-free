import {
  Children,
  cloneElement,
  isValidElement,
  useId,
  type ReactElement,
  type ReactNode,
} from "react";
import { cn } from "@/lib/cn";
import { Label } from "./label";

type FieldProps = {
  label: string;
  children: ReactNode;
  helpText?: string;
  errorText?: string;
  className?: string;
};

type InteractiveProps = {
  id?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean | "true" | "false";
};

export function Field({
  label,
  children,
  helpText,
  errorText,
  className,
}: FieldProps) {
  const reactId = useId();
  const id = `f-${reactId}`;
  const helpId = helpText ? `${id}-help` : undefined;
  const errorId = errorText ? `${id}-err` : undefined;
  const describedBy = errorId ?? helpId;
  const invalid = Boolean(errorText);

  let control: ReactNode = children;

  try {
    const only = Children.only(children);
    if (isValidElement(only)) {
      const element = only as ReactElement<InteractiveProps>;
      control = cloneElement(element, {
        id,
        "aria-describedby": describedBy,
        "aria-invalid": invalid || undefined,
      });
    }
  } catch {
    if (process.env.NODE_ENV !== "production") {
      throw new Error(
        "Field expects a single interactive child (Input, Select, etc.)",
      );
    }
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Label htmlFor={id}>{label}</Label>
      {control}
      {helpText && !errorText && (
        <p id={helpId} className="text-[14px] leading-[20px] text-ink-muted">
          {helpText}
        </p>
      )}
      {errorText && (
        <p
          id={errorId}
          className="text-[14px] leading-[20px] text-[var(--color-error)]"
        >
          {errorText}
        </p>
      )}
    </div>
  );
}
