"use server";

import { revalidatePath } from "next/cache";

import { createServerAuthClient } from "@/lib/supabase/server-auth";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { findTeamMemberByAuthUserId } from "@/lib/team/auth";
import {
  STATUS_ADVANCE_MAP,
  type SubmissionStatus,
} from "@/lib/team/submissions";

interface AuthorizedContext {
  authUserId: string;
  teamMemberId: string;
  isAdmin: boolean;
  pmUserId: string | null;
  status: SubmissionStatus;
}

async function authorize(
  submissionRowId: string,
): Promise<AuthorizedContext | null> {
  const supabase = await createServerAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const member = await findTeamMemberByAuthUserId(user.id);
  if (!member || !member.active) return null;

  const admin = getSupabaseAdmin();
  const { data: subRow } = await admin
    .from("submissions")
    .select("id, pm_user_id, status")
    .eq("id", submissionRowId)
    .maybeSingle();
  if (!subRow) return null;
  const sub = subRow as {
    id: string;
    pm_user_id: string | null;
    status: SubmissionStatus;
  };

  const isAssignee = sub.pm_user_id === member.id;
  if (!isAssignee && !member.isAdmin) return null;

  return {
    authUserId: user.id,
    teamMemberId: member.id,
    isAdmin: member.isAdmin,
    pmUserId: sub.pm_user_id,
    status: sub.status,
  };
}

export type AdvanceStatusResult =
  | { ok: true; status: SubmissionStatus }
  | {
      ok: false;
      reason: "unauthorized" | "invalid_transition" | "internal";
    };

export async function advanceStatus(
  submissionRowId: string,
  toStatus: SubmissionStatus,
  reason?: string,
): Promise<AdvanceStatusResult> {
  const ctx = await authorize(submissionRowId);
  if (!ctx) return { ok: false, reason: "unauthorized" };

  const allowed = STATUS_ADVANCE_MAP[ctx.status] ?? [];
  if (!allowed.includes(toStatus)) {
    return { ok: false, reason: "invalid_transition" };
  }

  const admin = getSupabaseAdmin();
  const { error: updateError } = await admin
    .from("submissions")
    .update({
      status: toStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", submissionRowId);
  if (updateError) {
    return { ok: false, reason: "internal" };
  }

  await admin.from("team_activity_events").insert({
    submission_id: submissionRowId,
    team_user_id: ctx.authUserId,
    event_type: "status_changed",
    event_data: {
      from: ctx.status,
      to: toStatus,
      reason: reason ?? null,
    },
  });

  revalidatePath(`/team/submissions/${submissionRowId}`);
  revalidatePath("/team");
  return { ok: true, status: toStatus };
}

const NOTE_MIN = 1;
const NOTE_MAX = 5_000;

export type AddNoteResult =
  | { ok: true }
  | { ok: false; reason: "unauthorized" | "validation" | "internal" };

export async function addNote(
  submissionRowId: string,
  body: string,
): Promise<AddNoteResult> {
  const ctx = await authorize(submissionRowId);
  if (!ctx) return { ok: false, reason: "unauthorized" };

  const trimmed = body.trim();
  if (trimmed.length < NOTE_MIN || trimmed.length > NOTE_MAX) {
    return { ok: false, reason: "validation" };
  }

  const admin = getSupabaseAdmin();
  const { error } = await admin.from("team_activity_events").insert({
    submission_id: submissionRowId,
    team_user_id: ctx.authUserId,
    event_type: "note_added",
    event_data: { body: trimmed },
  });
  if (error) return { ok: false, reason: "internal" };

  revalidatePath(`/team/submissions/${submissionRowId}`);
  return { ok: true };
}

export type UpdateOfferOverrideResult =
  | { ok: true }
  | { ok: false; reason: "unauthorized" | "validation" | "internal" };

export async function updateOfferOverride(
  offerId: string,
  note: string,
): Promise<UpdateOfferOverrideResult> {
  const trimmed = note.trim();
  if (trimmed.length > 2_000) {
    return { ok: false, reason: "validation" };
  }

  const admin = getSupabaseAdmin();
  const { data: offerRow } = await admin
    .from("submission_offers")
    .select("id, submission_id")
    .eq("id", offerId)
    .maybeSingle();
  if (!offerRow) return { ok: false, reason: "unauthorized" };
  const offer = offerRow as { id: string; submission_id: string };

  const ctx = await authorize(offer.submission_id);
  if (!ctx) return { ok: false, reason: "unauthorized" };

  const { error } = await admin
    .from("submission_offers")
    .update({ team_note: trimmed.length === 0 ? null : trimmed })
    .eq("id", offer.id);
  if (error) return { ok: false, reason: "internal" };

  await admin.from("team_activity_events").insert({
    submission_id: offer.submission_id,
    team_user_id: ctx.authUserId,
    event_type: "note_added",
    event_data: {
      target: "offer",
      offer_id: offer.id,
      preview: trimmed.slice(0, 200),
    },
  });

  revalidatePath(`/team/submissions/${offer.submission_id}`);
  return { ok: true };
}
