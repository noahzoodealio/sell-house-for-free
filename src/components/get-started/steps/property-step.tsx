"use client";

import type { Ref } from "react";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { PropertyFields } from "@/lib/seller-form/types";

type PropertyStepProps = {
  data: Partial<PropertyFields>;
  errors?: Record<string, string[]>;
  onChange: (partial: Partial<PropertyFields>) => void;
  headingRef: Ref<HTMLHeadingElement>;
};

function firstError(
  errors: Record<string, string[]> | undefined,
  field: string,
): string | undefined {
  return errors?.[field]?.[0];
}

function parseIntOrUndefined(value: string): number | undefined {
  if (value.trim() === "") return undefined;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : undefined;
}

function parseFloatOrUndefined(value: string): number | undefined {
  if (value.trim() === "") return undefined;
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : undefined;
}

export function PropertyStep({
  data,
  errors,
  onChange,
  headingRef,
}: PropertyStepProps) {
  const currentYear = new Date().getFullYear();

  return (
    <div className="flex flex-col gap-5">
      <h2
        ref={headingRef}
        tabIndex={-1}
        className="text-[24px] leading-[32px] font-semibold font-[var(--font-inter)] text-ink-title outline-none"
      >
        Step 2 of 4: Tell us about your home
      </h2>

      <p className="text-[14px] leading-[20px] text-ink-muted">
        All fields optional — if you know them, enter now.
      </p>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <Field label="Bedrooms" errorText={firstError(errors, "bedrooms")}>
          <Input
            name="bedrooms"
            type="number"
            inputMode="numeric"
            min={0}
            max={20}
            step={1}
            value={data.bedrooms ?? ""}
            onChange={(e) =>
              onChange({ bedrooms: parseIntOrUndefined(e.target.value) })
            }
            className="property-number"
          />
        </Field>

        <Field label="Bathrooms" errorText={firstError(errors, "bathrooms")}>
          <Input
            name="bathrooms"
            type="number"
            inputMode="decimal"
            min={0}
            max={20}
            step={0.5}
            value={data.bathrooms ?? ""}
            onChange={(e) =>
              onChange({ bathrooms: parseFloatOrUndefined(e.target.value) })
            }
            className="property-number"
          />
        </Field>

        <Field
          label="Square footage"
          errorText={firstError(errors, "squareFootage")}
        >
          <Input
            name="squareFootage"
            type="number"
            inputMode="numeric"
            min={100}
            max={50000}
            step={1}
            value={data.squareFootage ?? ""}
            onChange={(e) =>
              onChange({ squareFootage: parseIntOrUndefined(e.target.value) })
            }
            className="property-number"
          />
        </Field>

        <Field label="Year built" errorText={firstError(errors, "yearBuilt")}>
          <Input
            name="yearBuilt"
            type="number"
            inputMode="numeric"
            min={1850}
            max={currentYear}
            step={1}
            value={data.yearBuilt ?? ""}
            onChange={(e) =>
              onChange({ yearBuilt: parseIntOrUndefined(e.target.value) })
            }
            className="property-number"
          />
        </Field>

        <Field
          label="Lot size (sq ft)"
          errorText={firstError(errors, "lotSize")}
        >
          <Input
            name="lotSize"
            type="number"
            inputMode="numeric"
            min={0}
            max={5_000_000}
            step={1}
            value={data.lotSize ?? ""}
            onChange={(e) =>
              onChange({ lotSize: parseIntOrUndefined(e.target.value) })
            }
            className="property-number"
          />
        </Field>
      </div>
    </div>
  );
}
