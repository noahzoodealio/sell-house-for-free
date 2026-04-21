"use client";

import type { Ref } from "react";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { AddressFields } from "@/lib/seller-form/types";
import { AddressField } from "../address-field";

type AddressStepProps = {
  data: Partial<AddressFields>;
  errors?: Record<string, string[]>;
  onChange: (partial: Partial<AddressFields>) => void;
  onAddressComplete?: (addr: AddressFields) => void;
  headingRef: Ref<HTMLHeadingElement>;
};

function firstError(
  errors: Record<string, string[]> | undefined,
  field: string,
): string | undefined {
  return errors?.[field]?.[0];
}

export function AddressStep({
  data,
  errors,
  onChange,
  onAddressComplete,
  headingRef,
}: AddressStepProps) {
  return (
    <div className="flex flex-col gap-5">
      <h2
        ref={headingRef}
        tabIndex={-1}
        className="text-[24px] leading-[32px] font-semibold font-[var(--font-inter)] text-ink-title outline-none"
      >
        Step 1 of 4: Your property address
      </h2>

      <Field label="Street address" errorText={firstError(errors, "street1")}>
        <AddressField
          value={data.street1 ?? ""}
          onChange={(street1) => onChange({ street1 })}
          onAddressComplete={onAddressComplete}
          currentAddress={data}
          autoComplete="street-address"
          placeholder="123 Main St"
          maxLength={120}
        />
      </Field>

      <Field
        label="Apt, suite, etc. (optional)"
        errorText={firstError(errors, "street2")}
      >
        <Input
          name="street2"
          value={data.street2 ?? ""}
          onChange={(e) => onChange({ street2: e.target.value })}
          onBlur={(e) => {
            const trimmed = e.target.value.trim();
            if (trimmed !== e.target.value) onChange({ street2: trimmed });
          }}
          autoComplete="address-line2"
          maxLength={60}
        />
      </Field>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-[2fr_1fr_1fr]">
        <Field label="City" errorText={firstError(errors, "city")}>
          <Input
            name="city"
            value={data.city ?? ""}
            onChange={(e) => onChange({ city: e.target.value })}
            onBlur={(e) => {
              const trimmed = e.target.value.trim();
              if (trimmed !== e.target.value) onChange({ city: trimmed });
            }}
            autoComplete="address-level2"
            maxLength={60}
          />
        </Field>

        <Field label="State" errorText={firstError(errors, "state")}>
          <Select
            name="state"
            value="AZ"
            disabled
            aria-disabled="true"
            autoComplete="address-level1"
            onChange={() => {
              // AZ-only for MVP; disabled.
            }}
          >
            <option value="AZ">AZ</option>
          </Select>
        </Field>

        <Field label="ZIP code" errorText={firstError(errors, "zip")}>
          <Input
            name="zip"
            value={data.zip ?? ""}
            onChange={(e) => {
              const cleaned = e.target.value.replace(/\D/g, "").slice(0, 5);
              onChange({ zip: cleaned });
            }}
            inputMode="numeric"
            pattern="[0-9]{5}"
            maxLength={5}
            autoComplete="postal-code"
            placeholder="85001"
          />
        </Field>
      </div>

      <p className="text-[13px] leading-[18px] text-ink-muted">
        We currently serve Arizona only.
      </p>

      {/* Guarantee `state` ships in FormData even though the select is disabled. */}
      <input type="hidden" name="state" value="AZ" readOnly />
    </div>
  );
}
