"use server";

import type { SubmitState } from "@/lib/seller-form/types";

export async function submitSellerForm(
  _prevState: SubmitState,
  _formData: FormData,
): Promise<SubmitState> {
  // S8 replaces the happy-path body with real Zod re-validation + logging + redirect.
  return { ok: true, submissionId: "stub" };
}
