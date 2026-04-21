"use client";

/**
 * <AddressField> — the E4 integration seam.
 *
 * **Prop contract is a HARD contract with E4.** E4 will swap the MVP
 * <input> implementation for a SmartyStreets/MLS-backed Combobox without
 * changing these props. Do NOT add props here that E4 wouldn't need.
 */

import { useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import type { AddressFields } from "@/lib/seller-form/types";

export type AddressFieldProps = {
  value: string;
  onChange: (next: string) => void;
  onAddressComplete?: (addr: AddressFields) => void;
  currentAddress?: Partial<AddressFields>;
  inputMode?: "text";
  autoComplete?: string;
  name?: string;
  id?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
  placeholder?: string;
  maxLength?: number;
};

const AZ_ZIP_REGEX = /^8[5-6]\d{3}$/;

function isAddressComplete(addr: Partial<AddressFields>): addr is AddressFields {
  return (
    typeof addr.street1 === "string" &&
    addr.street1.trim().length >= 3 &&
    typeof addr.city === "string" &&
    addr.city.trim().length > 0 &&
    addr.state === "AZ" &&
    typeof addr.zip === "string" &&
    AZ_ZIP_REGEX.test(addr.zip.trim())
  );
}

export function AddressField({
  value,
  onChange,
  onAddressComplete,
  currentAddress,
  inputMode = "text",
  autoComplete = "street-address",
  name = "street1",
  id,
  placeholder,
  maxLength,
  ...aria
}: AddressFieldProps) {
  const lastCompleteRef = useRef<string | null>(null);

  useEffect(() => {
    if (!onAddressComplete || !currentAddress) return;
    const candidate: Partial<AddressFields> = {
      ...currentAddress,
      street1: value,
    };
    if (isAddressComplete(candidate)) {
      const signature = `${candidate.street1}|${candidate.city}|${candidate.state}|${candidate.zip}`;
      if (lastCompleteRef.current !== signature) {
        lastCompleteRef.current = signature;
        onAddressComplete(candidate);
      }
    } else {
      lastCompleteRef.current = null;
    }
  }, [value, currentAddress, onAddressComplete]);

  return (
    <Input
      id={id}
      name={name}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={(e) => {
        const trimmed = e.target.value.trim();
        if (trimmed !== e.target.value) onChange(trimmed);
      }}
      inputMode={inputMode}
      autoComplete={autoComplete}
      placeholder={placeholder}
      maxLength={maxLength}
      {...aria}
    />
  );
}
