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
import { mapOffersV2ToPortal } from "@/lib/offervana/map-offers";
import {
  assignPmAndNotify,
  type AssignInput,
  type AssignInputOffer,
} from "@/lib/pm-service";
import { validateAll } from "@/lib/seller-form/schema";
import type { SellerFormDraft, SubmitState } from "@/lib/seller-form/types";
import type { SubmissionOfferPath } from "@/lib/supabase/schema";

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
    let offersPayload: unknown[] = [];
    if (submitResult.kind === "ok" && submitResult.payload.propertyId != null) {
      offersPayload =
        (await fetchAndLogOffers(
          submitResult.payload.propertyId,
          submissionId,
          submitResult.payload.referralCode,
        )) ?? [];
    } else if (submitResult.kind === "ok") {
      logAudit("offervana.offers.skipped_no_property_id", {
        submissionId,
        customerId: submitResult.payload.customerId,
      });
    }

    // E6: hand off to PM service. Runs after Offervana success + offers
    // fetch so assignPmAndNotify receives both the referral code and
    // the per-path offer rows in one call. Orchestrator never throws;
    // failures surface via Sentry event pm_assignment_failed / pm_email_failed.
    if (submitResult.kind === "ok") {
      await runPmHandoff(draft, submitResult.payload, offersPayload);
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
): Promise<unknown[] | null> {
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
      return result.offers;
    case "empty":
      logAudit("offervana.offers.empty", {
        submissionId,
        referralCode,
        propertyId,
        latencyMs: result.latencyMs,
      });
      return [];
    case "error":
      logAudit("offervana.offers.error", {
        submissionId,
        referralCode,
        propertyId,
        latencyMs: result.latencyMs,
        status: result.detail.status,
        message: result.detail.message,
      });
      return null;
  }
}

async function runPmHandoff(
  draft: SellerFormDraft,
  payload: Extract<SubmitResult, { kind: "ok" }>["payload"],
  offersPayload: unknown[],
): Promise<void> {
  const input = buildAssignInput(draft, payload, offersPayload);

  logAudit("[e6.assign].start", {
    submissionId: input.submissionId,
    referralCode: input.referralCode,
    pillarHint: input.pillarHint,
    offersCount: input.offers.length,
  });

  const result = await assignPmAndNotify(input);

  if (result.ok) {
    logAudit("[e6.assign].ok", {
      submissionId: input.submissionId,
      referralCode: input.referralCode,
      pmUserId: result.pmUserId,
      profileCreated: result.profileCreated,
      sellerEmailEnqueued: result.emailsEnqueued.seller,
      teamEmailEnqueued: result.emailsEnqueued.team,
    });
  } else {
    logAudit("[e6.assign].failed", {
      submissionId: input.submissionId,
      referralCode: input.referralCode,
      reason: result.reason,
      sentryEventId: result.sentryEventId,
    });
  }
}

function buildAssignInput(
  draft: SellerFormDraft,
  payload: Extract<SubmitResult, { kind: "ok" }>["payload"],
  offersPayload: unknown[],
): AssignInput {
  const address = draft.address;
  const property = draft.property;
  const consent = draft.consent;

  const seller = {
    fullName: draft.contact.name,
    email: draft.contact.email,
    phone: draft.contact.phone || undefined,
    address: address.street1,
    addressLine2: address.street2,
    city: address.city,
    state: address.state,
    zip: address.zip,
    beds: property.bedrooms,
    baths: property.bathrooms,
    sqft: property.squareFootage,
    yearBuilt: property.yearBuilt,
    timeline: draft.condition?.timeline,
    sellerPaths: draft.currentListingStatus ? [draft.currentListingStatus] : [],
    tcpaVersion: consent?.tcpa?.version,
    tcpaAcceptedAt: consent?.tcpa?.acceptedAt,
    termsVersion: consent?.terms?.version,
    termsAcceptedAt: consent?.terms?.acceptedAt,
  };

  return {
    submissionId: draft.submissionId,
    referralCode: payload.referralCode,
    customerId: payload.customerId,
    userId: null,
    propertyId: payload.propertyId,
    pillarHint: draft.pillarHint ?? null,
    seller,
    offers: offersFromPayload(offersPayload),
  };
}

const TILE_TO_PATH: Record<string, SubmissionOfferPath> = {
  cash: "cash",
  "cash-plus": "cash_plus",
  snml: "snml",
  list: "list",
};

function offersFromPayload(raw: unknown[]): AssignInputOffer[] {
  if (raw.length === 0) return [];
  const mapped = mapOffersV2ToPortal(raw);
  const out: AssignInputOffer[] = [];
  for (const m of mapped) {
    const path = TILE_TO_PATH[m.id];
    if (!path) continue;
    out.push({
      path,
      lowCents: Number.isFinite(m.low) ? Math.round(m.low * 100) : null,
      highCents: Number.isFinite(m.high) ? Math.round(m.high * 100) : null,
      rawPayload: { id: m.id, name: m.name, displayState: m.displayState },
    });
  }
  return out;
}
