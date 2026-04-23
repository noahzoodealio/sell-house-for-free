import type { AttributionFields } from "@/lib/seller-form/types";

function safeJsonParse<T>(raw: FormDataEntryValue | null, fallback: T): T {
  if (typeof raw !== "string" || !raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function strOrUndefined(raw: FormDataEntryValue | null): string | undefined {
  if (typeof raw !== "string") return undefined;
  const trimmed = raw.trim();
  return trimmed ? trimmed : undefined;
}

export function parseFormData(formData: FormData): unknown {
  const draft = safeJsonParse<Record<string, unknown>>(
    formData.get("draftJson"),
    {},
  );
  const consent = safeJsonParse<Record<string, unknown>>(
    formData.get("consentJson"),
    {},
  );
  const attribution = safeJsonParse<AttributionFields>(
    formData.get("attribution"),
    {},
  );

  const submissionId = strOrUndefined(formData.get("submissionId"));
  const pillarHint = strOrUndefined(formData.get("pillarHint"));
  const cityHint = strOrUndefined(formData.get("cityHint"));
  const currentListingStatus = strOrUndefined(
    formData.get("currentListingStatus"),
  );
  const hasAgent = strOrUndefined(formData.get("hasAgent"));

  const candidate: Record<string, unknown> = {
    submissionId,
    schemaVersion: 1,
    address: draft.address,
    property: draft.property,
    condition: draft.condition,
    contact: draft.contact,
    consent,
    attribution,
  };
  if (pillarHint) candidate.pillarHint = pillarHint;
  if (cityHint) candidate.cityHint = cityHint;
  if (currentListingStatus) candidate.currentListingStatus = currentListingStatus;
  if (hasAgent) candidate.hasAgent = hasAgent;

  return candidate;
}
