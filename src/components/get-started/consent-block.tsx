"use client";

import { useId } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { PRIVACY_CONSENT } from "@/content/consent/privacy";
import { TCPA_CONSENT } from "@/content/consent/tcpa";
import { TERMS_CONSENT } from "@/content/consent/terms";
import type { ConsentFields } from "@/lib/seller-form/types";

type ConsentKey = keyof ConsentFields;

type ConsentItem = {
  key: ConsentKey;
  label: string;
  constant: { version: string; isPlaceholder: boolean; text: string };
};

const ITEMS: ReadonlyArray<ConsentItem> = [
  { key: "tcpa", label: "I agree to TCPA phone contact", constant: TCPA_CONSENT },
  { key: "terms", label: "I agree to the Terms of Service", constant: TERMS_CONSENT },
  { key: "privacy", label: "I acknowledge the Privacy Policy", constant: PRIVACY_CONSENT },
];

type ConsentBlockProps = {
  data: Partial<ConsentFields>;
  errors?: Record<string, string[]>;
  onChange: (partial: Partial<ConsentFields>) => void;
};

function firstError(
  errors: Record<string, string[]> | undefined,
  field: string,
): string | undefined {
  return errors?.[field]?.[0];
}

export function ConsentBlock({ data, errors, onChange }: ConsentBlockProps) {
  const groupId = useId();

  return (
    <div className="rounded-md border border-border bg-surface-tint p-4 flex flex-col gap-4">
      <h3 className="text-[16px] leading-[24px] font-semibold text-ink-title">
        Your consent
      </h3>
      <ul className="flex flex-col gap-4">
        {ITEMS.map((item) => {
          const id = `${groupId}-${item.key}`;
          const checked = Boolean(data[item.key]?.acceptedAt);
          const error = firstError(errors, item.key);

          const handleToggle = (next: boolean) => {
            if (next) {
              onChange({
                [item.key]: {
                  version: item.constant.version,
                  acceptedAt: new Date().toISOString(),
                  isPlaceholder: item.constant.isPlaceholder,
                },
              } as Partial<ConsentFields>);
            } else {
              onChange({ [item.key]: undefined } as Partial<ConsentFields>);
            }
          };

          return (
            <li key={item.key} className="flex gap-3">
              <Checkbox
                id={id}
                name={`consent.${item.key}`}
                checked={checked}
                onChange={(e) => handleToggle(e.target.checked)}
                aria-invalid={error ? true : undefined}
                className="mt-1"
              />
              <label htmlFor={id} className="flex flex-col gap-1 cursor-pointer">
                <span className="text-[15px] leading-[22px] font-semibold text-ink-title">
                  {item.label}
                </span>
                <span className="text-[13px] leading-[20px] text-ink-body">
                  {item.constant.text}
                </span>
                {error && (
                  <span className="text-[13px] leading-[18px] text-[var(--color-error)]">
                    {error}
                  </span>
                )}
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
