"use client";

import { useId, type Ref } from "react";
import { PRIVACY_CONSENT } from "@/content/consent/privacy";
import { TCPA_CONSENT } from "@/content/consent/tcpa";
import { TERMS_CONSENT } from "@/content/consent/terms";
import type {
  ConsentFields,
  ContactFields,
} from "@/lib/seller-form/types";

type ContactStepProps = {
  data: Partial<ContactFields>;
  consent: Partial<ConsentFields>;
  errors?: Record<string, string[]>;
  onChange: (partial: Partial<ContactFields>) => void;
  onConsentChange: (partial: Partial<ConsentFields>) => void;
  headingRef: Ref<HTMLHeadingElement>;
};

type ConsentKey = keyof ConsentFields;
type ConsentItem = {
  key: ConsentKey;
  label: string;
  constant: { version: string; isPlaceholder: boolean; text: string };
};

const CONSENT_ITEMS: ReadonlyArray<ConsentItem> = [
  { key: "tcpa", label: "I agree to phone + text contact", constant: TCPA_CONSENT },
  { key: "terms", label: "I agree to the Terms of Service", constant: TERMS_CONSENT },
  { key: "privacy", label: "I acknowledge the Privacy Policy", constant: PRIVACY_CONSENT },
];

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
  const groupId = useId();

  const toggleConsent = (item: ConsentItem, next: boolean) => {
    if (next) {
      onConsentChange({
        [item.key]: {
          version: item.constant.version,
          acceptedAt: new Date().toISOString(),
          isPlaceholder: item.constant.isPlaceholder,
        },
      } as Partial<ConsentFields>);
    } else {
      onConsentChange({ [item.key]: undefined } as Partial<ConsentFields>);
    }
  };

  return (
    <div>
      <span className="eyebrow" style={{ marginBottom: 12 }}>
        Step 5 · Your info
      </span>
      <h2 ref={headingRef} tabIndex={-1} style={{ outline: "none" }}>
        Where should we send your report?
      </h2>
      <p className="lede">
        We’ll email your full property report and connect you with a licensed
        Arizona Project Manager — no spam, no call center.
      </p>

      <div className="field-row">
        <div className="field">
          <label htmlFor="firstName">First name</label>
          <input
            id="firstName"
            name="firstName"
            type="text"
            autoComplete="given-name"
            maxLength={60}
            value={data.firstName ?? ""}
            onChange={(e) => onChange({ firstName: e.target.value })}
            onBlur={(e) => {
              const t = trim(e.target.value);
              if (t !== e.target.value) onChange({ firstName: t });
            }}
            aria-invalid={firstError(errors, "firstName") ? true : undefined}
          />
          {firstError(errors, "firstName") && (
            <p className="field-error">{firstError(errors, "firstName")}</p>
          )}
        </div>
        <div className="field">
          <label htmlFor="lastName">Last name</label>
          <input
            id="lastName"
            name="lastName"
            type="text"
            autoComplete="family-name"
            maxLength={60}
            value={data.lastName ?? ""}
            onChange={(e) => onChange({ lastName: e.target.value })}
            onBlur={(e) => {
              const t = trim(e.target.value);
              if (t !== e.target.value) onChange({ lastName: t });
            }}
            aria-invalid={firstError(errors, "lastName") ? true : undefined}
          />
          {firstError(errors, "lastName") && (
            <p className="field-error">{firstError(errors, "lastName")}</p>
          )}
        </div>
      </div>

      <div className="field">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          maxLength={254}
          placeholder="you@email.com"
          value={data.email ?? ""}
          onChange={(e) => onChange({ email: e.target.value })}
          onBlur={(e) => {
            const t = trim(e.target.value);
            if (t !== e.target.value) onChange({ email: t });
          }}
          aria-invalid={firstError(errors, "email") ? true : undefined}
        />
        {firstError(errors, "email") && (
          <p className="field-error">{firstError(errors, "email")}</p>
        )}
      </div>

      <div className="field">
        <label htmlFor="phone">Phone</label>
        <input
          id="phone"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          maxLength={20}
          placeholder="(555) 123-4567"
          value={data.phone ?? ""}
          onChange={(e) => onChange({ phone: e.target.value })}
          onBlur={(e) => {
            const formatted = formatPhone(e.target.value);
            if (formatted !== e.target.value) onChange({ phone: formatted });
          }}
          aria-invalid={firstError(errors, "phone") ? true : undefined}
        />
        {firstError(errors, "phone") && (
          <p className="field-error">{firstError(errors, "phone")}</p>
        )}
      </div>

      <div className="consent">
        {CONSENT_ITEMS.map((item) => {
          const id = `${groupId}-${item.key}`;
          const checked = Boolean(consent[item.key]?.acceptedAt);
          const err = firstError(errors, item.key);
          return (
            <div key={item.key} className="consent-item">
              <input
                id={id}
                type="checkbox"
                name={`consent.${item.key}`}
                checked={checked}
                onChange={(e) => toggleConsent(item, e.target.checked)}
                aria-invalid={err ? true : undefined}
              />
              <label htmlFor={id}>
                <strong>{item.label}</strong>
                {item.constant.text}
                {err && <span className="field-error"> {err}</span>}
              </label>
            </div>
          );
        })}
      </div>
    </div>
  );
}
