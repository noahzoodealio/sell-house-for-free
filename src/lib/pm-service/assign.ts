import "server-only";

import {
  getSupabaseAdmin,
  type SupabaseAdminClient,
} from "@/lib/supabase/server";
import type { AssignNextPmResult } from "@/lib/supabase/schema";

import { RPC_TIMEOUT_MS, CONTACT_WINDOW_HOURS } from "./config";
import {
  sendSellerConfirmation,
  sendTeamMemberNotification,
} from "@/lib/email";

import {
  captureException,
  sanitizeSentryExtras,
} from "./observability";
import type { AssignInput, AssignResult, AssignResultReason } from "./types";

// Main entry point. Never throws — always returns AssignResult.
export async function assignPmAndNotify(
  input: AssignInput,
): Promise<AssignResult> {
  const supabase = getSupabaseAdmin();
  const baseExtras = sanitizeSentryExtras({
    submissionId: input.submissionId,
    referralCode: input.referralCode,
    customerId: input.customerId,
    userId: input.userId,
    propertyId: input.propertyId,
    pillarHint: input.pillarHint,
  });

  let profileCreated = false;
  let sellerId: string;
  try {
    const profile = await ensureSellerProfile(supabase, input);
    sellerId = profile.userId;
    profileCreated = profile.profileCreated;
  } catch (err) {
    const sentryEventId = captureException({
      event: "pm_assignment_failed",
      severity: "error",
      error: err,
      extras: { ...baseExtras, classification: "profile_failed" },
    });
    return { ok: false, reason: "profile_failed", sentryEventId };
  }

  let submissionRowId: string;
  try {
    submissionRowId = await upsertSubmissionAndOffers(
      supabase,
      input,
      sellerId,
    );
  } catch (err) {
    const sentryEventId = captureException({
      event: "pm_assignment_failed",
      severity: "error",
      error: err,
      extras: {
        ...baseExtras,
        profileCreated,
        classification: "submission_failed",
      },
    });
    return { ok: false, reason: "submission_failed", sentryEventId };
  }

  let rpc: AssignNextPmResult;
  try {
    rpc = await callAssignRpc(supabase, submissionRowId, RPC_TIMEOUT_MS);
  } catch (err) {
    const reason = classifyRpcError(err);
    const sentryEventId = captureException({
      event: "pm_assignment_failed",
      severity: reason === "no_active_pms" ? "critical" : "error",
      error: err,
      extras: {
        ...baseExtras,
        profileCreated,
        classification: reason,
      },
    });
    return { ok: false, reason, sentryEventId };
  }

  // Best-effort emails. Never block on failures.
  const sellerFirstName = firstNameFrom(input.seller.fullName);
  const emailResults = await Promise.allSettled([
    sendSellerConfirmation({
      submissionId: input.submissionId,
      referralCode: input.referralCode,
      to: input.seller.email,
      sellerFirstName,
      pm: { firstName: rpc.pm_first_name, photoUrl: rpc.pm_photo_url },
      contactWindowHours: CONTACT_WINDOW_HOURS,
      pillarHint: input.pillarHint,
    }),
    sendTeamMemberNotification({
      submissionId: input.submissionId,
      referralCode: input.referralCode,
      to: teamMemberContactPlaceholder(rpc.team_member_id),
      teamMemberFirstName: rpc.pm_first_name,
      seller: input.seller,
      pillarHint: input.pillarHint,
      offers: input.offers,
    }),
  ]);

  const sellerOk =
    emailResults[0].status === "fulfilled" && emailResults[0].value.ok;
  const teamOk =
    emailResults[1].status === "fulfilled" && emailResults[1].value.ok;

  if (!sellerOk) {
    captureException({
      event: "pm_email_failed",
      severity: "error",
      error:
        emailResults[0].status === "rejected"
          ? emailResults[0].reason
          : new Error(
              emailResults[0].status === "fulfilled"
                ? (emailResults[0].value.error ?? "unknown send failure")
                : "unknown",
            ),
      extras: {
        ...baseExtras,
        recipientType: "seller",
        templateKey: "seller_confirmation",
      },
    });
  }
  if (!teamOk) {
    captureException({
      event: "pm_email_failed",
      severity: "error",
      error:
        emailResults[1].status === "rejected"
          ? emailResults[1].reason
          : new Error(
              emailResults[1].status === "fulfilled"
                ? (emailResults[1].value.error ?? "unknown send failure")
                : "unknown",
            ),
      extras: {
        ...baseExtras,
        recipientType: "team_member",
        templateKey: "team_member_notification",
      },
    });
  }

  return {
    ok: true,
    pmUserId: rpc.team_member_id,
    pmFirstName: rpc.pm_first_name,
    pmPhotoUrl: rpc.pm_photo_url,
    profileCreated,
    emailsEnqueued: { seller: sellerOk, team: teamOk },
  };
}

// 1) Ensure a profile row exists for the seller. Returns the auth.users.id
//    (same as profiles.id). Idempotent on email — duplicate submissions
//    from the same seller reuse the existing auth.users row.
async function ensureSellerProfile(
  supabase: SupabaseAdminClient,
  input: AssignInput,
): Promise<{ userId: string; profileCreated: boolean }> {
  const email = input.seller.email;

  const { data: existing, error: lookupErr } = await supabase
    .from("profiles")
    .select("id")
    .ilike("email", email)
    .maybeSingle();
  if (lookupErr) throw lookupErr;
  if (existing) {
    return { userId: existing.id, profileCreated: false };
  }

  const { data: created, error: createErr } = await supabase.auth.admin
    .createUser({
      email,
      phone: input.seller.phone,
      email_confirm: false,
      user_metadata: { source: "sell-house-for-free.e6" },
    });

  if (createErr || !created?.user) {
    // Concurrent submitters racing; recover by re-reading profiles.
    const { data: retry } = await supabase
      .from("profiles")
      .select("id")
      .ilike("email", email)
      .maybeSingle();
    if (retry) return { userId: retry.id, profileCreated: false };
    throw createErr ?? new Error("auth.admin.createUser returned no user");
  }

  const userId = created.user.id;

  const { error: insertErr } = await supabase.from("profiles").insert({
    id: userId,
    full_name: input.seller.fullName,
    email,
    phone: input.seller.phone ?? null,
    tcpa_version: input.seller.tcpaVersion ?? null,
    tcpa_accepted_at: input.seller.tcpaAcceptedAt ?? null,
    terms_version: input.seller.termsVersion ?? null,
    terms_accepted_at: input.seller.termsAcceptedAt ?? null,
  });

  if (insertErr) {
    const { data: retry } = await supabase
      .from("profiles")
      .select("id")
      .ilike("email", email)
      .maybeSingle();
    if (retry) return { userId: retry.id, profileCreated: false };
    throw insertErr;
  }

  return { userId, profileCreated: true };
}

// 2) Upsert submission + per-path offers. Idempotent on submission_id
//    for the submissions row and on (submission_id, path) for each offer.
async function upsertSubmissionAndOffers(
  supabase: SupabaseAdminClient,
  input: AssignInput,
  sellerId: string,
): Promise<string> {
  const { data, error } = await supabase
    .from("submissions")
    .upsert(
      {
        submission_id: input.submissionId,
        seller_id: sellerId,
        referral_code: input.referralCode,
        address_line1: input.seller.address,
        address_line2: input.seller.addressLine2 ?? null,
        city: input.seller.city,
        state: input.seller.state,
        zip: input.seller.zip,
        beds: input.seller.beds ?? null,
        baths: input.seller.baths ?? null,
        sqft: input.seller.sqft ?? null,
        year_built: input.seller.yearBuilt ?? null,
        seller_paths: input.seller.sellerPaths,
        timeline: input.seller.timeline ?? null,
        pillar_hint: input.pillarHint,
      },
      { onConflict: "submission_id" },
    )
    .select("id")
    .single();

  if (error || !data) {
    throw error ?? new Error("submissions upsert returned no row");
  }

  const submissionRowId = data.id;

  if (input.offers.length > 0) {
    const rows = input.offers.map((o) => ({
      submission_id: submissionRowId,
      path: o.path,
      low_cents: o.lowCents,
      high_cents: o.highCents,
      raw_payload: o.rawPayload,
    }));
    const { error: offersErr } = await supabase
      .from("submission_offers")
      .upsert(rows, { onConflict: "submission_id,path" });
    if (offersErr) throw offersErr;
  }

  return submissionRowId;
}

// 3) Call the RPC with an AbortController timeout. 5s default.
async function callAssignRpc(
  supabase: SupabaseAdminClient,
  submissionRowId: string,
  timeoutMs: number,
): Promise<AssignNextPmResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const { data, error } = await supabase
      .rpc("assign_next_pm", { p_submission_id: submissionRowId })
      .abortSignal(controller.signal);

    if (error) throw error;
    const rows = Array.isArray(data) ? data : data ? [data] : [];
    if (rows.length === 0) {
      throw new Error("assign_next_pm returned no rows");
    }
    return rows[0] as AssignNextPmResult;
  } finally {
    clearTimeout(timer);
  }
}

function classifyRpcError(err: unknown): AssignResultReason {
  if (err instanceof Error && err.name === "AbortError") return "timeout";
  const pgErr = err as { code?: string; message?: string } | null | undefined;
  if (pgErr?.code === "P0001") return "no_active_pms";
  if (pgErr?.code === "P0002") return "db_error";
  if (pgErr?.message?.includes("E6_NO_ACTIVE_PMS")) return "no_active_pms";
  return "db_error";
}

function firstNameFrom(fullName: string): string {
  const trimmed = fullName.trim();
  if (trimmed.length === 0) return "there";
  const space = trimmed.indexOf(" ");
  return space === -1 ? trimmed : trimmed.slice(0, space);
}

// Until a team-portal routing email exists (E11), internal team notifications
// go to the shared ops mailbox via EMAIL_REPLY_TO. S4 will wire this to the
// env-backed address; this placeholder produces a stable target for the
// stub + makes the call site explicit.
function teamMemberContactPlaceholder(teamMemberId: string): string {
  return `team+${teamMemberId}@sellyourhousefree.internal`;
}
