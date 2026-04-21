"use server";

/**
 * Server Action for the seller submission.
 *
 * **SIGNATURE MUST NOT CHANGE.** E5 replaces only the happy-path body —
 * Zod call + return shape + redirect stay stable so the orchestrator
 * (S3) doesn't re-wire when E5 lands the real Offervana pipeline.
 */

import { redirect } from "next/navigation";
import { validateAll } from "@/lib/seller-form/schema";
import type {
  AttributionFields,
  SellerFormDraft,
  SubmitState,
} from "@/lib/seller-form/types";

function safeJsonParse<T>(raw: FormDataEntryValue | null, fallback: T): T {
  if (typeof raw !== "string" || !raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function strOrUndefined(raw: FormDataEntryValue | null): string | undefined {
  if (typeof raw !== "string") return undefined;
  const trimmed = raw.trim();
  return trimmed ? trimmed : undefined;
}

function parseFormData(formData: FormData): unknown {
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

  return candidate;
}

export async function submitSellerForm(
  _prevState: SubmitState,
  formData: FormData,
): Promise<SubmitState> {
  const candidate = parseFormData(formData);
  const result = validateAll(candidate);

  if (!result.success) {
    return { ok: false, errors: result.errors };
  }

  const draft = result.data as SellerFormDraft;
  const idempotencyKey =
    strOrUndefined(formData.get("idempotencyKey")) ?? draft.submissionId;

  // TODO(E8): before production launch, gate this log behind
  // `process.env.NODE_ENV !== 'production'` or redact `contact.*` first.
  // E5 replaces this block with the real Offervana HTTP call + retry.
  console.log("[submitSellerForm]", {
    idempotencyKey,
    submissionId: draft.submissionId,
    draft,
  });

  redirect(`/get-started/thanks?ref=${encodeURIComponent(draft.submissionId)}`);
}
