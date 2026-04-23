"use server";

import { after } from "next/server";
import { redirect } from "next/navigation";

import { createHostAdminCustomer } from "@/lib/offervana/client";
import { recordDeadLetter } from "@/lib/offervana/dead-letter";
import {
  lookupIdempotent,
  storeIdempotent,
} from "@/lib/offervana/idempotency";
import { mapDraftToNewClientDto } from "@/lib/offervana/mapper";
import type { SubmitResult } from "@/lib/offervana/types";
import { validateAll } from "@/lib/seller-form/schema";
import type { SellerFormDraft, SubmitState } from "@/lib/seller-form/types";

import { parseFormData } from "./parse";

function logAudit(event: string, payload: Record<string, unknown>): void {
  console.log(
    JSON.stringify({
      event,
      ts: new Date().toISOString(),
      ...payload,
    }),
  );
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
  const submissionId = draft.submissionId;

  const cached = await lookupIdempotent(submissionId).catch((err: Error) => {
    logAudit("offervana.idempotency.lookup_failed", {
      submissionId,
      error: err.message,
    });
    return null;
  });

  if (cached) {
    logAudit("offervana.submit.idempotent_replay", {
      submissionId,
      referralCode: cached.referralCode,
    });
    redirect(buildPortalRedirect(cached.referralCode));
  }

  const dto = mapDraftToNewClientDto(draft);
  const submitResult: SubmitResult = await createHostAdminCustomer(dto, {
    submissionId,
  });

  const referralCode = resolveReferralCode(submitResult);

  after(async () => {
    await dispatchAfter(draft, dto, submitResult, referralCode);
  });

  redirect(buildPortalRedirect(referralCode));
}

function buildPortalRedirect(referralCode: string): string {
  return `/portal/setup?ref=${encodeURIComponent(referralCode)}`;
}

function resolveReferralCode(result: SubmitResult): string {
  switch (result.kind) {
    case "ok":
      return result.payload.referralCode;
    case "email-conflict":
      return "pending";
    case "permanent-failure":
    case "transient-exhausted":
    case "malformed-response":
      return "unassigned";
  }
}

async function dispatchAfter(
  draft: SellerFormDraft,
  dto: ReturnType<typeof mapDraftToNewClientDto>,
  result: SubmitResult,
  referralCode: string,
): Promise<void> {
  const submissionId = draft.submissionId;

  if (result.kind === "ok") {
    await storeIdempotent(submissionId, result.payload).catch((err: Error) => {
      logAudit("offervana.idempotency.store_failed", {
        submissionId,
        error: err.message,
      });
    });
    logAudit("offervana.submit.ok", {
      submissionId,
      customerId: result.payload.customerId,
      userId: result.payload.userId,
      referralCode: result.payload.referralCode,
      attempts: result.attempts,
    });
    // E6 owns the PM handoff write; stub for now.
    logAudit("offervana.pm_handoff.pending", {
      submissionId,
      referralCode: result.payload.referralCode,
    });
    return;
  }

  const reason =
    result.kind === "email-conflict"
      ? "email-conflict"
      : result.kind === "permanent-failure"
        ? "permanent"
        : result.kind === "transient-exhausted"
          ? "transient-exhausted"
          : "malformed-response";

  await recordDeadLetter({
    submissionId,
    reason,
    detail: { kind: result.kind, attempts: result.attempts, ...result.detail },
    draftJson: draft as unknown as Record<string, unknown>,
    dto,
  }).catch((err: Error) => {
    logAudit("offervana.dead_letter.write_failed", {
      submissionId,
      reason,
      error: err.message,
    });
  });

  logAudit("offervana.submit.dead_letter_scheduled", {
    submissionId,
    reason,
    referralCode,
  });
}
