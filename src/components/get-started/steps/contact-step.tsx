"use client";

import type { Ref } from "react";
import type {
  ContactFields,
  EnrichmentSlot,
} from "@/lib/seller-form/types";

type ContactStepProps = {
  data: Partial<ContactFields>;
  errors?: Record<string, string[]>;
  onChange: (partial: Partial<ContactFields>) => void;
  headingRef: Ref<HTMLHeadingElement>;
  enrichmentSlot: EnrichmentSlot | undefined;
};

// Pricing anchors for the est-savings callout (see landing-page TIERS.pro).
const SELLFREE_PRO_FEE = 2999;
const TRADITIONAL_COMMISSION_PCT = 0.06;

// Fallback Arizona-median home value when we have no MLS list price and no
// valuation signal. Keeps the Est-savings number meaningful on the no-match
// path without shipping an outright mock. Conservative so we don't oversell.
const AZ_MEDIAN_FALLBACK = 425_000;

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
  errors,
  onChange,
  headingRef,
  enrichmentSlot,
}: ContactStepProps) {
  const homeValue = enrichmentSlot?.listPrice ?? AZ_MEDIAN_FALLBACK;
  const estSavings = Math.max(
    0,
    Math.round(homeValue * TRADITIONAL_COMMISSION_PCT - SELLFREE_PRO_FEE),
  );

  return (
    <div>
      <span
        className="eyebrow"
        style={{ marginBottom: 16, display: "block" }}
      >
        Your info
      </span>
      <h2
        ref={headingRef}
        tabIndex={-1}
        className="flow-page-title"
        style={{ outline: "none" }}
      >
        Where should we send your report?
      </h2>
      <p className="flow-page-lede">
        We’ll email your full property report, estimated savings breakdown, and
        recommended plan — no spam, no call center.
      </p>

      <div className="field">
        <label htmlFor="name">Full name</label>
        <input
          id="name"
          name="name"
          type="text"
          autoComplete="name"
          maxLength={120}
          placeholder="First and last"
          value={data.name ?? ""}
          onChange={(e) => onChange({ name: e.target.value })}
          onBlur={(e) => {
            const t = trim(e.target.value);
            if (t !== e.target.value) onChange({ name: t });
          }}
          aria-invalid={firstError(errors, "name") ? true : undefined}
        />
        {firstError(errors, "name") && (
          <p className="field-error">{firstError(errors, "name")}</p>
        )}
      </div>

      <div className="field-row">
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
      </div>

      <div className="contact-savings">
        <div>
          <div className="contact-savings-k">
            Your savings report will include
          </div>
          <div className="contact-savings-v">
            Est. home value · Projected savings · Recommended plan · Sample
            listing preview
          </div>
        </div>
        <div className="contact-savings-num">
          <div className="n">${estSavings.toLocaleString()}</div>
          <div className="k">Est savings</div>
        </div>
      </div>

      <p className="field-help" style={{ marginTop: 16 }}>
        By continuing you agree to our Terms and Privacy Policy. We never share
        your data.
      </p>
    </div>
  );
}
