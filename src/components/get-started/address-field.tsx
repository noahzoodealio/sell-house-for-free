"use client";

/**
 * <AddressField> — E4-S4 Headless UI Combobox swap.
 *
 * Prop contract is a HARD contract with the E3-S4 consumer (address-step.tsx)
 * and is preserved verbatim. E4 only changes the body: the `<Input>` is now
 * wrapped in a Headless UI `<Combobox>` that calls `POST /api/enrich` with
 * `{kind: 'suggest', ...}` on 250ms-debounced keystrokes (min 4 chars) and
 * cancels in-flight requests via `AbortController`. Selecting a suggestion
 * fires `onAddressComplete` with the full structured address; manual-typed
 * path (typing street + city + state + zip) keeps its E3-S4 behavior.
 */

import { useEffect, useRef, useState } from "react";
import {
  Combobox,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
} from "@headlessui/react";
import { cn } from "@/lib/cn";
import type {
  SuggestEnvelope,
  SuggestedAddress,
} from "@/lib/enrichment/types";
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
const SUGGEST_MIN_CHARS = 4;
const SUGGEST_DEBOUNCE_MS = 250;
const SUGGEST_LIMIT = 5;

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

export function formatSuggestionLabel(s: SuggestedAddress): string {
  return s.street2 ? `${s.street1} ${s.street2}` : s.street1;
}

export function formatSuggestionSubLabel(
  s: SuggestedAddress,
  isListed: boolean,
): string {
  const base = `${s.city}, AZ ${s.zip}`;
  return isListed ? `${base} · Listed` : base;
}

const inputClasses =
  "block w-full h-12 md:h-[52px] px-4 rounded-md border " +
  "bg-surface text-ink-body placeholder:text-ink-muted " +
  "font-[var(--font-inter)] text-[16px] leading-[24px] " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 " +
  "border-border focus-visible:outline-brand " +
  "aria-[invalid=true]:border-[var(--color-error)] " +
  "aria-[invalid=true]:focus-visible:outline-[var(--color-error)] " +
  "disabled:cursor-not-allowed disabled:opacity-50";

const optionsClasses =
  "z-10 mt-1 w-[var(--input-width)] rounded-md border border-border " +
  "bg-surface shadow-lg overflow-auto max-h-80 focus:outline-none";

const optionClasses =
  "relative flex min-h-[44px] cursor-pointer select-none flex-col gap-0.5 " +
  "px-4 py-2 data-[focus]:bg-surface-alt";

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
  const [suggestions, setSuggestions] = useState<SuggestedAddress[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const query = value.trim();
    if (query.length < SUGGEST_MIN_CHARS) {
      abortRef.current?.abort();
      abortRef.current = null;
      setSuggestions([]);
      setIsLoading(false);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    debounceRef.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await fetch("/api/enrich", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kind: "suggest", query, limit: SUGGEST_LIMIT }),
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        const envelope = (await res.json()) as SuggestEnvelope;
        if (controller.signal.aborted) return;
        setSuggestions(envelope.status === "ok" ? envelope.results : []);
      } catch {
        if (!controller.signal.aborted) setSuggestions([]);
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }, SUGGEST_DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleSelect = (s: SuggestedAddress | null) => {
    if (!s) return;
    onChange(s.street1);
    if (onAddressComplete) {
      const fields: AddressFields = {
        street1: s.street1,
        street2: s.street2,
        city: s.city,
        state: "AZ",
        zip: s.zip,
      };
      lastCompleteRef.current = `${fields.street1}|${fields.city}|${fields.state}|${fields.zip}`;
      onAddressComplete(fields);
    }
  };

  const resultCount = suggestions.length;

  return (
    <div className="relative">
      <Combobox<SuggestedAddress | null>
        value={null}
        onChange={handleSelect}
        immediate
      >
        <ComboboxInput
          id={id}
          name={name}
          value={value}
          displayValue={() => value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={(e) => {
            const trimmed = e.target.value.trim();
            if (trimmed !== e.target.value) onChange(trimmed);
          }}
          inputMode={inputMode}
          autoComplete={autoComplete}
          placeholder={placeholder}
          maxLength={maxLength}
          aria-busy={isLoading || undefined}
          className={cn(inputClasses)}
          {...aria}
        />
        {resultCount > 0 && (
          <ComboboxOptions anchor="bottom start" className={cn(optionsClasses)}>
            {suggestions.map((s) => {
              const isListed = s.listingStatus === "currently-listed";
              return (
                <ComboboxOption
                  key={`${s.street1}|${s.city}|${s.zip}|${s.mlsRecordId ?? ""}`}
                  value={s}
                  className={optionClasses}
                >
                  <span className="flex items-center gap-2 text-[15px] font-medium text-ink-title">
                    {formatSuggestionLabel(s)}
                    {isListed && (
                      <span className="rounded-full bg-[var(--color-accent)] px-2 py-0.5 text-[11px] uppercase tracking-wide text-ink-title/80">
                        Listed
                      </span>
                    )}
                  </span>
                  <span className="text-[13px] text-ink-muted">
                    {formatSuggestionSubLabel(s, isListed)}
                  </span>
                </ComboboxOption>
              );
            })}
          </ComboboxOptions>
        )}
      </Combobox>
      <span role="status" aria-live="polite" className="sr-only">
        {resultCount > 0 ? `${resultCount} suggestions available` : ""}
      </span>
    </div>
  );
}
