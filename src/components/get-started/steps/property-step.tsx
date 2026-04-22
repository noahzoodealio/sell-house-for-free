"use client";

import { useState, type Ref } from "react";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { EnrichmentSlot, PropertyFields } from "@/lib/seller-form/types";
import {
  EnrichmentConfirm,
  type EnrichmentPhoto,
} from "../enrichment-confirm";
import {
  MlsStatusNotice,
  type HasAgent,
  type ListedReason,
} from "../mls-status-notice";

type EnrichmentDetails = NonNullable<EnrichmentSlot["details"]>;

type PropertyStepProps = {
  data: Partial<PropertyFields>;
  errors?: Record<string, string[]>;
  onChange: (partial: Partial<PropertyFields>) => void;
  headingRef: Ref<HTMLHeadingElement>;
  enrichmentDetails: EnrichmentDetails | undefined;
  photos: EnrichmentPhoto[] | undefined;
  mlsRecordId: string | undefined;
  rawListingStatus: string | undefined;
  listingStatusDisplay: string | undefined;
  listedReason: ListedReason | undefined;
  onListedReasonChange: (reason: ListedReason) => void;
  hasAgent: HasAgent | undefined;
  onHasAgentChange: (value: HasAgent) => void;
};

type PrefilledField =
  | "bedrooms"
  | "bathrooms"
  | "squareFootage"
  | "yearBuilt"
  | "lotSize";

type TypedFlags = Record<PrefilledField, boolean>;

const INITIAL_TYPED: TypedFlags = {
  bedrooms: false,
  bathrooms: false,
  squareFootage: false,
  yearBuilt: false,
  lotSize: false,
};

const PREFILL_HINT = "Filled from public records — edit if wrong";

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
  typed: boolean,
): string {
  if (draftValue !== undefined) return String(draftValue);
  if (!typed && enrichmentValue !== undefined) return String(enrichmentValue);
  return "";
}

export function PropertyStep({
  data,
  errors,
  onChange,
  headingRef,
  enrichmentDetails,
  photos,
  mlsRecordId,
  rawListingStatus,
  listingStatusDisplay,
  listedReason,
  onListedReasonChange,
  hasAgent,
  onHasAgentChange,
}: PropertyStepProps) {
  const currentYear = new Date().getFullYear();
  const [typed, setTyped] = useState<TypedFlags>(INITIAL_TYPED);

  const markTyped = (field: PrefilledField) => {
    setTyped((prev) => (prev[field] ? prev : { ...prev, [field]: true }));
  };

  const isPrefilled = (field: PrefilledField): boolean =>
    !typed[field] &&
    data[field] === undefined &&
    enrichmentDetails?.[field] !== undefined;

  return (
    <div className="flex flex-col gap-5">
      <EnrichmentConfirm photos={photos} />

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

      <MlsStatusNotice
        mlsRecordId={mlsRecordId}
        rawListingStatus={rawListingStatus}
        listingStatusDisplay={listingStatusDisplay}
        value={listedReason}
        onChange={onListedReasonChange}
        hasAgent={hasAgent}
        onHasAgentChange={onHasAgentChange}
      />

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <Field
          label="Bedrooms"
          errorText={firstError(errors, "bedrooms")}
          helpText={isPrefilled("bedrooms") ? PREFILL_HINT : undefined}
        >
          <Input
            name="bedrooms"
            type="number"
            inputMode="numeric"
            min={0}
            max={20}
            step={1}
            value={displayNumber(
              data.bedrooms,
              enrichmentDetails?.bedrooms,
              typed.bedrooms,
            )}
            data-prefilled={isPrefilled("bedrooms") || undefined}
            onChange={(e) => {
              markTyped("bedrooms");
              onChange({ bedrooms: parseIntOrUndefined(e.target.value) });
            }}
            className="property-number"
          />
        </Field>

        <Field
          label="Bathrooms"
          errorText={firstError(errors, "bathrooms")}
          helpText={isPrefilled("bathrooms") ? PREFILL_HINT : undefined}
        >
          <Input
            name="bathrooms"
            type="number"
            inputMode="decimal"
            min={0}
            max={20}
            step={0.5}
            value={displayNumber(
              data.bathrooms,
              enrichmentDetails?.bathrooms,
              typed.bathrooms,
            )}
            data-prefilled={isPrefilled("bathrooms") || undefined}
            onChange={(e) => {
              markTyped("bathrooms");
              onChange({ bathrooms: parseFloatOrUndefined(e.target.value) });
            }}
            className="property-number"
          />
        </Field>

        <Field
          label="Square footage"
          errorText={firstError(errors, "squareFootage")}
          helpText={isPrefilled("squareFootage") ? PREFILL_HINT : undefined}
        >
          <Input
            name="squareFootage"
            type="number"
            inputMode="numeric"
            min={100}
            max={50000}
            step={1}
            value={displayNumber(
              data.squareFootage,
              enrichmentDetails?.squareFootage,
              typed.squareFootage,
            )}
            data-prefilled={isPrefilled("squareFootage") || undefined}
            onChange={(e) => {
              markTyped("squareFootage");
              onChange({ squareFootage: parseIntOrUndefined(e.target.value) });
            }}
            className="property-number"
          />
        </Field>

        <Field
          label="Year built"
          errorText={firstError(errors, "yearBuilt")}
          helpText={isPrefilled("yearBuilt") ? PREFILL_HINT : undefined}
        >
          <Input
            name="yearBuilt"
            type="number"
            inputMode="numeric"
            min={1850}
            max={currentYear}
            step={1}
            value={displayNumber(
              data.yearBuilt,
              enrichmentDetails?.yearBuilt,
              typed.yearBuilt,
            )}
            data-prefilled={isPrefilled("yearBuilt") || undefined}
            onChange={(e) => {
              markTyped("yearBuilt");
              onChange({ yearBuilt: parseIntOrUndefined(e.target.value) });
            }}
            className="property-number"
          />
        </Field>

        <Field
          label="Lot size (sq ft)"
          errorText={firstError(errors, "lotSize")}
          helpText={isPrefilled("lotSize") ? PREFILL_HINT : undefined}
        >
          <Input
            name="lotSize"
            type="number"
            inputMode="numeric"
            min={0}
            max={5_000_000}
            step={1}
            value={displayNumber(
              data.lotSize,
              enrichmentDetails?.lotSize,
              typed.lotSize,
            )}
            data-prefilled={isPrefilled("lotSize") || undefined}
            onChange={(e) => {
              markTyped("lotSize");
              onChange({ lotSize: parseIntOrUndefined(e.target.value) });
            }}
            className="property-number"
          />
        </Field>
      </div>
    </div>
  );
}
