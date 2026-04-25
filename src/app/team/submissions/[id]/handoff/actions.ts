"use server";

import { revalidatePath } from "next/cache";

import { createServerAuthClient } from "@/lib/supabase/server-auth";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { findTeamMemberByAuthUserId } from "@/lib/team/auth";
import {
  callHandoffRpc,
  HANDOFF_REASONS,
  sendHandoffEmails,
  type HandoffReason,
} from "@/lib/team/handoff";
import { sendMessageFromTeam } from "@/lib/team/messages";

export interface InitiateHandoffInput {
  submissionRowId: string;
  toTeamMemberId: string;
  reason: HandoffReason;
  note: string | null;
  sendSellerReintro: boolean;
  adminOverride?: boolean;
}

export type InitiateHandoffResult =
  | { ok: true }
  | {
      ok: false;
      reason:
        | "unauthorized"
        | "validation"
        | "self_handoff"
        | "target_inactive"
        | "at_capacity"
        | "internal";
      detail?: string;
    };

function teamPortalUrl(submissionRowId: string): string {
  const base =
    process.env.TEAM_PORTAL_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/team/submissions/${submissionRowId}`;
}

export async function initiateHandoff(
  input: InitiateHandoffInput,
): Promise<InitiateHandoffResult> {
  const supabase = await createServerAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: "unauthorized" };

  const member = await findTeamMemberByAuthUserId(user.id);
  if (!member || !member.active) return { ok: false, reason: "unauthorized" };

  if (!HANDOFF_REASONS.includes(input.reason)) {
    return { ok: false, reason: "validation" };
  }
  const noteTrim = input.note?.trim() ?? "";
  if (input.reason === "other" && noteTrim.length === 0) {
    return { ok: false, reason: "validation" };
  }
  if (noteTrim.length > 500) {
    return { ok: false, reason: "validation" };
  }

  const admin = getSupabaseAdmin();
  const { data: subRow } = await admin
    .from("submissions")
    .select(
      "id, submission_id, pm_user_id, seller_id, address_line1, city, state",
    )
    .eq("id", input.submissionRowId)
    .maybeSingle();
  if (!subRow) return { ok: false, reason: "validation" };
  const submission = subRow as {
    id: string;
    submission_id: string;
    pm_user_id: string | null;
    seller_id: string;
    address_line1: string;
    city: string;
    state: string;
  };

  const isAssignee = submission.pm_user_id === member.id;
  if (!isAssignee && !member.isAdmin) {
    return { ok: false, reason: "unauthorized" };
  }

  const adminOverride = !!input.adminOverride && member.isAdmin;

  const rpc = await callHandoffRpc({
    submissionRowId: submission.id,
    toTeamMemberId: input.toTeamMemberId,
    actorAuthUserId: user.id,
    reason: input.reason,
    note: noteTrim.length > 0 ? noteTrim : null,
    adminOverride,
  });

  if (!rpc.ok) {
    if (rpc.reason.includes("E11_HANDOFF_SELF_HANDOFF")) {
      return { ok: false, reason: "self_handoff" };
    }
    if (rpc.reason.includes("E11_HANDOFF_TARGET_INACTIVE")) {
      return { ok: false, reason: "target_inactive" };
    }
    if (rpc.reason.includes("E11_HANDOFF_AT_CAPACITY")) {
      return { ok: false, reason: "at_capacity" };
    }
    return { ok: false, reason: "internal", detail: rpc.reason };
  }

  // Look up names + emails for notifications.
  const { data: outgoingRow } =
    rpc.result.outgoingTeamMemberId === null
      ? { data: null }
      : await admin
          .from("team_members")
          .select("first_name, last_name, email")
          .eq("id", rpc.result.outgoingTeamMemberId)
          .maybeSingle();

  const { data: incomingRow } = await admin
    .from("team_members")
    .select("first_name, last_name, email")
    .eq("id", input.toTeamMemberId)
    .maybeSingle();

  const { data: sellerRow } = await admin
    .from("profiles")
    .select("full_name, email")
    .eq("id", submission.seller_id)
    .maybeSingle();

  const outgoing = (outgoingRow as
    | { first_name: string; last_name: string; email: string }
    | null) ?? null;
  const incoming = (incomingRow as
    | { first_name: string; last_name: string; email: string }
    | null) ?? null;
  const seller = (sellerRow as
    | { full_name: string; email: string }
    | null) ?? null;

  const outgoingName = outgoing
    ? `${outgoing.first_name} ${outgoing.last_name}`.trim()
    : "the previous team member";
  const incomingName = incoming
    ? `${incoming.first_name} ${incoming.last_name}`.trim()
    : "your new team member";
  const sellerName = seller?.full_name ?? "the seller";
  const propertySummary = `${submission.address_line1}, ${submission.city} ${submission.state}`;

  await sendHandoffEmails({
    outgoingEmail: outgoing?.email ?? null,
    outgoingName,
    incomingEmail: incoming?.email ?? null,
    incomingName,
    sellerName,
    propertySummary,
    reason: input.reason,
    note: noteTrim || null,
  submissionUrl: teamPortalUrl(submission.id),
  });

  if (input.sendSellerReintro && seller && incoming?.email) {
    const reintroBody =
      `${incomingName} here — I'm taking over as your point of contact at Sell Free, ` +
      `same team and same approach as before.\n\nI'll be in touch soon. Reply to this email ` +
      `any time and your message will land in our portal thread.`;
    await sendMessageFromTeam({
      submission: {
        submissionRowId: submission.id,
        submissionId: submission.submission_id,
        sellerEmail: seller.email,
        sellerFirstName: seller.full_name.split(/\s+/)[0] ?? sellerName,
      },
      teamMember: {
        authUserId: rpc.result.incomingAuthUserId ?? user.id,
        fullName: incomingName,
        email: incoming.email,
      },
      subject: "Quick update from your Sell Free team",
      body: reintroBody,
    });
  }

  revalidatePath(`/team/submissions/${submission.id}`);
  revalidatePath(`/team/submissions/${submission.id}/handoff`);
  revalidatePath("/team");
  return { ok: true };
}
