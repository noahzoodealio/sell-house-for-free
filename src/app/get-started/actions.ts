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
import type { SellerFormDraft, SubmitState } from "@/lib/seller-form/types";
import { parseFormData, strOrUndefined } from "./parse";

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

  // E5 replaces this block with the real Offervana HTTP call + retry.
  if (process.env.NODE_ENV !== "production") {
    const { contact: _contact, ...safeDraft } = draft;
    console.log("[submitSellerForm]", {
      idempotencyKey,
      submissionId: draft.submissionId,
      draft: safeDraft,
    });
  }

  // Post-submit: go straight to the portal-loading screen, which seeds the
  // portal localStorage fixture and then redirects to /portal. The old
  // /get-started/thanks page is kept as a no-op fallback for stale links.
  redirect(`/portal/setup?ref=${encodeURIComponent(draft.submissionId)}`);
}
