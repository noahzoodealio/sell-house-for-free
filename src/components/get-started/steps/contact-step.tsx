"use client";

import type { Ref } from "react";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type {
  ConsentFields,
  ContactFields,
} from "@/lib/seller-form/types";
import { ConsentBlock } from "../consent-block";

type ContactStepProps = {
  data: Partial<ContactFields>;
  consent: Partial<ConsentFields>;
  errors?: Record<string, string[]>;
  onChange: (partial: Partial<ContactFields>) => void;
  onConsentChange: (partial: Partial<ConsentFields>) => void;
  headingRef: Ref<HTMLHeadingElement>;
};

function firstError(
  errors: Record<string, string[]> | undefined,
  field: string,
): string | undefined {
  return errors?.[field]?.[0];
}

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits.startsWith("1")) {
    return `1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return raw;
}

function trim(value: string): string {
  return value.trim();
}

export function ContactStep({
  data,
  consent,
  errors,
  onChange,
  onConsentChange,
  headingRef,
}: ContactStepProps) {
  return (
    <div className="flex flex-col gap-6">
      <h2
        ref={headingRef}
        tabIndex={-1}
        className="text-[24px] leading-[32px] font-semibold font-[var(--font-inter)] text-ink-title outline-none"
      >
        Step 4 of 4: Contact &amp; consent
      </h2>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <Field label="First name" errorText={firstError(errors, "firstName")}>
          <Input
            name="firstName"
            value={data.firstName ?? ""}
            onChange={(e) => onChange({ firstName: e.target.value })}
            onBlur={(e) => {
              const t = trim(e.target.value);
              if (t !== e.target.value) onChange({ firstName: t });
            }}
            autoComplete="given-name"
            maxLength={60}
          />
        </Field>

        <Field label="Last name" errorText={firstError(errors, "lastName")}>
          <Input
            name="lastName"
            value={data.lastName ?? ""}
            onChange={(e) => onChange({ lastName: e.target.value })}
            onBlur={(e) => {
              const t = trim(e.target.value);
              if (t !== e.target.value) onChange({ lastName: t });
            }}
            autoComplete="family-name"
            maxLength={60}
          />
        </Field>
      </div>

      <Field label="Email" errorText={firstError(errors, "email")}>
        <Input
          name="email"
          type="email"
          value={data.email ?? ""}
          onChange={(e) => onChange({ email: e.target.value })}
          onBlur={(e) => {
            const t = trim(e.target.value);
            if (t !== e.target.value) onChange({ email: t });
          }}
          autoComplete="email"
          inputMode="email"
          maxLength={254}
        />
      </Field>

      <Field label="Phone" errorText={firstError(errors, "phone")}>
        <Input
          name="phone"
          type="tel"
          value={data.phone ?? ""}
          onChange={(e) => onChange({ phone: e.target.value })}
          onBlur={(e) => {
            const formatted = formatPhone(e.target.value);
            if (formatted !== e.target.value) onChange({ phone: formatted });
          }}
          autoComplete="tel"
          inputMode="tel"
          maxLength={20}
        />
      </Field>

      <ConsentBlock
        data={consent}
        errors={errors}
        onChange={onConsentChange}
      />
    </div>
  );
}
