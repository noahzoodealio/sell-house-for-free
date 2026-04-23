"use server";

import { after } from "next/server";
import { redirect } from "next/navigation";

import {
  createOuterApiCustomer,
  fetchOffersV2,
} from "@/lib/offervana/client";
import { recordDeadLetter } from "@/lib/offervana/dead-letter";
import {
  lookupIdempotent,
  storeIdempotent,
  storeOffersV2Payload,
} from "@/lib/offervana/idempotency";
import { mapDraftToCreateCustomerDto } from "@/lib/offervana/mapper";
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
    redirect(buildPortalRedirect(submissionId, cached.referralCode));
  }

  const dto = mapDraftToCreateCustomerDto(draft);

  // Fire Offervana create-customer in the background; the user is redirected
  // to /portal/setup immediately and the setup page polls for completion.
  // after() runs after the redirect response is flushed but still within the
  // function's maxDuration — long enough for the 2-attempt retry budget.
  after(async () => {
    logAudit("offervana.submit.background_start", { submissionId });
    const submitResult: SubmitResult = await createOuterApiCustomer(dto, {
      submissionId,
    });
    const referralCode = resolveReferralCode(submitResult);
    await dispatchAfter(draft, dto, submitResult, referralCode);

    // Chain the OffersV2 fetch right after a successful customer create —
    // the upstream generates initial offer estimates during /openapi/Customers
    // so by the time that POST returns, OffersV2 has something to read.
    if (submitResult.kind === "ok" && submitResult.payload.propertyId != null) {
      await fetchAndLogOffers(
        submitResult.payload.propertyId,
        submissionId,
        submitResult.payload.referralCode,
      );
    } else if (submitResult.kind === "ok") {
      logAudit("offervana.offers.skipped_no_property_id", {
        submissionId,
        customerId: submitResult.payload.customerId,
      });
    }
  });

  redirect(buildPortalRedirect(submissionId));
}

function buildPortalRedirect(submissionId: string, referralCode?: string): string {
  const params = new URLSearchParams({ sid: submissionId });
  if (referralCode) params.set("ref", referralCode);
  return `/portal/setup?${params.toString()}`;
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
  dto: ReturnType<typeof mapDraftToCreateCustomerDto>,
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

async function fetchAndLogOffers(
  propertyId: number,
  submissionId: string,
  referralCode: string,
): Promise<void> {
  const result = await fetchOffersV2(propertyId, { submissionId });

  switch (result.kind) {
    case "ok":
      logAudit("offervana.offers.ok", {
        submissionId,
        referralCode,
        propertyId,
        count: result.rawCount,
        latencyMs: result.latencyMs,
      });
      await storeOffersV2Payload(submissionId, result.offers).catch(
        (err: Error) => {
          logAudit("offervana.offers.persist_failed", {
            submissionId,
            error: err.message,
          });
        },
      );
      return;
    case "empty":
      logAudit("offervana.offers.empty", {
        submissionId,
        referralCode,
        propertyId,
        latencyMs: result.latencyMs,
      });
      return;
    case "error":
      logAudit("offervana.offers.error", {
        submissionId,
        referralCode,
        propertyId,
        latencyMs: result.latencyMs,
        status: result.detail.status,
        message: result.detail.message,
      });
      return;
  }
}
