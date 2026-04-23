"use client";

import type { Ref } from "react";
import type { EnrichmentHookStatus } from "@/lib/enrichment/use-address-enrichment";
import type { AddressFields } from "@/lib/seller-form/types";

type AddressStepProps = {
  data: Partial<AddressFields>;
  errors?: Record<string, string[]>;
  onChange: (partial: Partial<AddressFields>) => void;
  headingRef: Ref<HTMLHeadingElement>;
  enrichmentStatus: EnrichmentHookStatus;
  isMultiUnit: boolean;
};

function firstError(
  errors: Record<string, string[]> | undefined,
  field: string,
): string | undefined {
  return errors?.[field]?.[0];
}

function enrichmentCopy(status: EnrichmentHookStatus): string | undefined {
  switch (status) {
    case "loading":
      return "Scanning county records for your property…";
    case "ok":
      return "Matched in county records — property facts prefilled on the next step.";
    case "no-match":
      return "No public-records match — you’ll enter facts yourself on the next step.";
    case "out-of-area":
      return "We currently serve Arizona only.";
    case "timeout":
      return "Records lookup is slow — we’ll keep trying in the background.";
    case "error":
      return "Records lookup failed — you’ll enter facts yourself on the next step.";
    default:
      return undefined;
  }
}

export function AddressStep({
  data,
  errors,
  onChange,
  headingRef,
  enrichmentStatus,
  isMultiUnit,
}: AddressStepProps) {
  const unitLabel = isMultiUnit
    ? "Apt, suite, unit #"
    : "Apt, suite, etc. (optional)";
  const unitHint = isMultiUnit
    ? "This address is part of a multi-unit building — please enter your unit number."
    : undefined;

  const statusLine = enrichmentCopy(enrichmentStatus);

  return (
    <div>
      <span className="eyebrow" style={{ marginBottom: 16, display: "block" }}>
        Address
      </span>
      <h2
        ref={headingRef}
        tabIndex={-1}
        className="flow-page-title"
        style={{ outline: "none" }}
      >
        Where’s the property?
      </h2>
      <p className="flow-page-lede">
        Enter the address you want to sell. We’ll pull public-records and MLS
        data in the background so you don’t have to re-type it.
      </p>

      <div className="field">
        <label htmlFor="street1">Street address</label>
        <input
          id="street1"
          name="street1"
          type="text"
          autoComplete="street-address"
          maxLength={120}
          placeholder="123 Main St"
          value={data.street1 ?? ""}
          onChange={(e) => onChange({ street1: e.target.value })}
          onBlur={(e) => {
            const trimmed = e.target.value.trim();
            if (trimmed !== e.target.value) onChange({ street1: trimmed });
          }}
          aria-invalid={firstError(errors, "street1") ? true : undefined}
        />
        {firstError(errors, "street1") && (
          <p className="field-error">{firstError(errors, "street1")}</p>
        )}
      </div>

      <div className="field">
        <label htmlFor="street2">{unitLabel}</label>
        <input
          id="street2"
          name="street2"
          type="text"
          autoComplete="address-line2"
          maxLength={60}
          placeholder="e.g. 4B"
          value={data.street2 ?? ""}
          onChange={(e) => onChange({ street2: e.target.value })}
          onBlur={(e) => {
            const trimmed = e.target.value.trim();
            if (trimmed !== e.target.value) onChange({ street2: trimmed });
          }}
          aria-invalid={
            firstError(errors, "street2") || (isMultiUnit && !data.street2?.trim())
              ? true
              : undefined
          }
        />
        {unitHint && <p className="field-help">{unitHint}</p>}
        {firstError(errors, "street2") && (
          <p className="field-error">{firstError(errors, "street2")}</p>
        )}
      </div>

      <div className="field-row-3">
        <div className="field">
          <label htmlFor="city">City</label>
          <input
            id="city"
            name="city"
            type="text"
            autoComplete="address-level2"
            maxLength={60}
            value={data.city ?? ""}
            onChange={(e) => onChange({ city: e.target.value })}
            onBlur={(e) => {
              const trimmed = e.target.value.trim();
              if (trimmed !== e.target.value) onChange({ city: trimmed });
            }}
            aria-invalid={firstError(errors, "city") ? true : undefined}
          />
          {firstError(errors, "city") && (
            <p className="field-error">{firstError(errors, "city")}</p>
          )}
        </div>
        <div className="field">
          <label htmlFor="state">State</label>
          <select
            id="state"
            name="state"
            value="AZ"
            disabled
            aria-disabled="true"
            onChange={() => {
              /* AZ-only for MVP */
            }}
          >
            <option value="AZ">AZ</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="zip">ZIP</label>
          <input
            id="zip"
            name="zip"
            type="text"
            inputMode="numeric"
            pattern="[0-9]{5}"
            maxLength={5}
            autoComplete="postal-code"
            placeholder="85001"
            value={data.zip ?? ""}
            onChange={(e) => {
              const cleaned = e.target.value.replace(/\D/g, "").slice(0, 5);
              onChange({ zip: cleaned });
            }}
            aria-invalid={firstError(errors, "zip") ? true : undefined}
          />
          {firstError(errors, "zip") && (
            <p className="field-error">{firstError(errors, "zip")}</p>
          )}
        </div>
      </div>

      {statusLine && <p className="field-help">{statusLine}</p>}
      <p className="field-help">We currently serve Arizona only.</p>
    </div>
  );
}
