"use client";

import { useMemo, type Ref } from "react";
import type {
  AddressFields,
  EnrichmentSlot,
  PropertyFields,
} from "@/lib/seller-form/types";

type PropertyStepProps = {
  data: Partial<PropertyFields>;
  errors?: Record<string, string[]>;
  onChange: (partial: Partial<PropertyFields>) => void;
  headingRef: Ref<HTMLHeadingElement>;
  enrichmentSlot: EnrichmentSlot | undefined;
  address: Partial<AddressFields>;
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

function displayNumber(
  draftValue: number | undefined,
  enrichmentValue: number | undefined,
): string {
  if (draftValue !== undefined) return String(draftValue);
  if (enrichmentValue !== undefined) return String(enrichmentValue);
  return "";
}

const PROPERTY_TYPES: Array<{
  value: NonNullable<PropertyFields["propertyType"]>;
  label: string;
}> = [
  { value: "single-family", label: "Single Family" },
  { value: "condo", label: "Condo" },
  { value: "townhouse", label: "Townhouse" },
  { value: "multi-family", label: "Multi-family" },
  { value: "manufactured", label: "Manufactured" },
  { value: "land", label: "Land" },
  { value: "other", label: "Other" },
];

function formatDisplayAddress(address: Partial<AddressFields>): string {
  const parts: string[] = [];
  if (address.street1) parts.push(address.street1);
  if (address.street2) parts.push(address.street2);
  const cityStateZip = [address.city, address.state, address.zip]
    .filter(Boolean)
    .join(" ");
  if (cityStateZip) parts.push(cityStateZip);
  return parts.join(", ") || "Your property";
}

export function PropertyStep({
  data,
  errors,
  onChange,
  headingRef,
  enrichmentSlot,
  address,
}: PropertyStepProps) {
  const currentYear = new Date().getFullYear();
  const details = enrichmentSlot?.details;
  const sourceLabel = useMemo(() => {
    const sources = enrichmentSlot?.sources ?? [];
    if (sources.length === 0) return undefined;
    if (sources.includes("attom") && sources.includes("mls")) {
      return "county records + MLS";
    }
    if (sources.includes("attom")) return "county records";
    if (sources.includes("mls")) return "MLS";
    return undefined;
  }, [enrichmentSlot]);

  const displayAddr = formatDisplayAddress(address);

  return (
    <div>
      <span className="eyebrow" style={{ marginBottom: 16, display: "block" }}>
        Property details
      </span>
      <h2
        ref={headingRef}
        tabIndex={-1}
        className="flow-page-title"
        style={{ outline: "none" }}
      >
        Verify the details.
      </h2>
      <p className="flow-page-lede">
        We pulled these from public records and tax data. Edit anything that’s
        off — we’ll use it to set a pricing range.
      </p>

      {details && (
        <div className="autofill-card">
          <div className="autofill-head">
            <div>
              {sourceLabel && (
                <div className="src">Autofilled · Source: {sourceLabel}</div>
              )}
              <div className="addr">{displayAddr}</div>
            </div>
          </div>
          <div className="autofill-data">
            <div className="stat">
              <div className="k">Built</div>
              <div className="v">{details.yearBuilt ?? "—"}</div>
            </div>
            <div className="stat">
              <div className="k">Beds</div>
              <div className="v">{details.bedrooms ?? "—"}</div>
            </div>
            <div className="stat">
              <div className="k">Baths</div>
              <div className="v">{details.bathrooms ?? "—"}</div>
            </div>
            <div className="stat">
              <div className="k">Sq ft</div>
              <div className="v">
                {details.squareFootage
                  ? details.squareFootage.toLocaleString()
                  : "—"}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="field-row-3">
        <div className="field">
          <label htmlFor="propertyType">Property type</label>
          <select
            id="propertyType"
            name="propertyType"
            value={data.propertyType ?? ""}
            onChange={(e) =>
              onChange({
                propertyType:
                  (e.target.value || undefined) as PropertyFields["propertyType"],
              })
            }
          >
            <option value="">Select…</option>
            {PROPERTY_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          {firstError(errors, "propertyType") && (
            <p className="field-error">{firstError(errors, "propertyType")}</p>
          )}
        </div>
        <div className="field">
          <label htmlFor="bedrooms">Beds</label>
          <input
            id="bedrooms"
            name="bedrooms"
            type="number"
            inputMode="numeric"
            min={0}
            max={20}
            step={1}
            value={displayNumber(data.bedrooms, details?.bedrooms)}
            onChange={(e) =>
              onChange({ bedrooms: parseIntOrUndefined(e.target.value) })
            }
          />
          {firstError(errors, "bedrooms") && (
            <p className="field-error">{firstError(errors, "bedrooms")}</p>
          )}
        </div>
        <div className="field">
          <label htmlFor="bathrooms">Baths</label>
          <input
            id="bathrooms"
            name="bathrooms"
            type="number"
            inputMode="decimal"
            min={0}
            max={20}
            step={0.5}
            value={displayNumber(data.bathrooms, details?.bathrooms)}
            onChange={(e) =>
              onChange({ bathrooms: parseFloatOrUndefined(e.target.value) })
            }
          />
          {firstError(errors, "bathrooms") && (
            <p className="field-error">{firstError(errors, "bathrooms")}</p>
          )}
        </div>
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor="squareFootage">Square feet</label>
          <input
            id="squareFootage"
            name="squareFootage"
            type="number"
            inputMode="numeric"
            min={100}
            max={50000}
            step={1}
            value={displayNumber(data.squareFootage, details?.squareFootage)}
            onChange={(e) =>
              onChange({ squareFootage: parseIntOrUndefined(e.target.value) })
            }
          />
          {firstError(errors, "squareFootage") && (
            <p className="field-error">
              {firstError(errors, "squareFootage")}
            </p>
          )}
        </div>
        <div className="field">
          <label htmlFor="yearBuilt">Year built</label>
          <input
            id="yearBuilt"
            name="yearBuilt"
            type="number"
            inputMode="numeric"
            min={1850}
            max={currentYear}
            step={1}
            value={displayNumber(data.yearBuilt, details?.yearBuilt)}
            onChange={(e) =>
              onChange({ yearBuilt: parseIntOrUndefined(e.target.value) })
            }
          />
          {firstError(errors, "yearBuilt") && (
            <p className="field-error">{firstError(errors, "yearBuilt")}</p>
          )}
        </div>
      </div>

      <p className="field-help">
        Don’t worry about perfect numbers — you can refine these later.
      </p>
    </div>
  );
}
